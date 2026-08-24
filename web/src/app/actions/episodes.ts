"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ALL_ACTIVITY_KINDS,
  diffDays,
  isDateStr,
  profileByKey,
  type ActivityKind,
  type BodyRegion,
  type DateStr,
  type Locale,
  type Side,
  type SymptomTiming,
} from "loadwise-engine";
import { createEpisode } from "@/lib/db/episodes";
import { saveEntry } from "@/lib/db/entries";

/** A number a form gave us, or null. Empty is not zero — it means "not recorded". */
function optionalNumber(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function optionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}

export async function createEpisodeAction(locale: Locale, formData: FormData): Promise<never> {
  const profileKey = String(formData.get("profileKey") ?? "");
  const profile = profileByKey(profileKey);
  if (profile === undefined) throw new Error("unknown-profile");

  const { id } = await createEpisode({
    // The region comes from the profile rather than from the form. Two profiles
    // share `knee`; letting a form send both invites them to disagree.
    bodyRegion: profile.bodyRegion as BodyRegion,
    profileKey,
    side: (optionalText(formData.get("side")) ?? "n/a") as Side,
    startedOn: optionalText(formData.get("startedOn")),
    label: optionalText(formData.get("label")),
  });

  redirect(`/${locale}/episodes/${id}`);
}

/**
 * One diary day, as the form holds it.
 *
 * A plain object rather than FormData, so the shape is checked at the call site
 * and the action can be tested without building a fake form. It is still a
 * public endpoint, so nothing here is trusted — see `validate` below.
 */
export type EntryPayload = {
  date: string;
  /**
   * Nullable on purpose. `Number("")` is 0, and 0 on this scale means "nothing
   * at all" — the best possible morning. A blank field must therefore arrive as
   * null and be refused, never arrive as the most flattering value there is.
   */
  morningScore: number | null;
  activityKind: ActivityKind | null;
  durationMin: number | null;
  rpe: number | null;
  symptomScore: number | null;
  symptomTiming: SymptomTiming | null;
  note: string | null;
};

export type SaveEntryResult =
  | { ok: true }
  | { ok: false; reason: "load-incomplete" | "symptom-incomplete" | "future-date" | "invalid" | "failed" };

const TIMINGS: readonly string[] = ["during", "after", "evening"];
const NOTE_LIMIT = 2000;

/**
 * The latest date this host can accept, and why it is not simply "today".
 *
 * The server does not know what day it is where the person is standing — that
 * is the whole point of the timezone fix — so it cannot reject "tomorrow"
 * exactly. What it CAN do is bound the answer: no inhabited offset is more than
 * fourteen hours from UTC, so a genuine local date is never more than one day
 * past the host's.
 *
 * That bound matters because a date in the future is destructive, not merely
 * odd: `saveEntry` upserts on (episode_id, entry_date), so a row written a day
 * ahead is a row that will later be silently overwritten — or will overwrite —
 * when that day actually arrives. The browser sets an exact `max`; this is the
 * backstop for everything that does not come from the browser.
 */
function tooFarAhead(date: string): boolean {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const hostToday = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
  return diffDays(hostToday as DateStr, date as DateStr) > 1;
}

const wholeNumberInRange = (n: unknown, low: number, high: number): boolean =>
  typeof n === "number" && Number.isInteger(n) && n >= low && n <= high;

/**
 * Everything the database and the engine would refuse, refused here first.
 *
 * ---------------------------------------------------------------------------
 * A SERVER ACTION IS A PUBLIC ENDPOINT.
 *
 * It looks like a function call because Next makes it look like one, but
 * anything on the network can invoke it with any payload. The previous version
 * did `Number(formData.get("morningScore"))` with no check at all: a missing
 * field became NaN and went straight at the database.
 *
 * The checks are duplicated rather than deferred on purpose — the database also
 * enforces them, and so does the engine. Three places sounds like two too many
 * until one of them is bypassed, and the one closest to the wire is the one
 * that must not be.
 * ---------------------------------------------------------------------------
 */
function validate(input: EntryPayload): SaveEntryResult | null {
  if (typeof input.date !== "string" || !isDateStr(input.date)) return { ok: false, reason: "invalid" };
  if (!wholeNumberInRange(input.morningScore, 0, 10)) return { ok: false, reason: "invalid" };
  if (tooFarAhead(input.date)) return { ok: false, reason: "future-date" };

  // The same pairing the engine enforces and the database checks. Caught here
  // too so the person gets a sentence instead of a constraint violation.
  if ((input.rpe === null) !== (input.durationMin === null)) {
    return { ok: false, reason: "load-incomplete" };
  }
  if (input.rpe !== null && !wholeNumberInRange(input.rpe, 1, 10)) {
    return { ok: false, reason: "invalid" };
  }
  if (input.durationMin !== null && !wholeNumberInRange(input.durationMin, 1, 1440)) {
    return { ok: false, reason: "invalid" };
  }

  // An activity without a session is allowed — "I walked" without minutes is a
  // fact. A session without an activity is not, because the tissue factor has
  // nothing to look up and the load would be computed against a default.
  if (input.activityKind !== null && !ALL_ACTIVITY_KINDS.includes(input.activityKind)) {
    return { ok: false, reason: "invalid" };
  }
  if (input.durationMin !== null && input.activityKind === null) {
    return { ok: false, reason: "invalid" };
  }

  if (input.symptomScore !== null && !wholeNumberInRange(input.symptomScore, 0, 10)) {
    return { ok: false, reason: "invalid" };
  }
  if (input.symptomTiming !== null && !TIMINGS.includes(input.symptomTiming)) {
    return { ok: false, reason: "invalid" };
  }
  // A timing with no score describes nothing. This used to be dropped in
  // silence: the save reported success, and since no page renders timing, the
  // loss was unobservable. Now it is said out loud, the same way the effort and
  // minutes pairing is.
  if (input.symptomTiming !== null && input.symptomScore === null) {
    return { ok: false, reason: "symptom-incomplete" };
  }
  if (input.note !== null && (typeof input.note !== "string" || input.note.length > NOTE_LIMIT)) {
    return { ok: false, reason: "invalid" };
  }

  return null;
}

export async function saveEntryAction(
  locale: Locale,
  episodeId: string,
  input: EntryPayload,
): Promise<SaveEntryResult> {
  const problem = validate(input);
  if (problem !== null) return problem;

  try {
    await saveEntry(episodeId, {
      date: input.date,
      morningScore: input.morningScore as number,
      activityKind: input.activityKind,
      durationMin: input.durationMin,
      rpe: input.rpe,
      symptomScore: input.symptomScore,
      symptomTiming: input.symptomTiming,
      note: input.note,
    });
  } catch {
    return { ok: false, reason: "failed" };
  }

  // Outside the try above, and deliberately in its own: the write has already
  // happened. A revalidation that throws must not be reported as "could not be
  // saved" — that sentence would send somebody to type the day in again on top
  // of a row that is already correct.
  try {
    revalidatePath(`/${locale}/episodes/${episodeId}`);
  } catch {
    // The page will be stale until the next navigation. Not worth a word.
  }

  return { ok: true };
}
