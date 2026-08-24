"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  profileByKey,
  type BodyRegion,
  type EverydayLoad,
  type Locale,
  type Session,
  type Side,
} from "loadwise-engine";
import {
  utcToday,
  validateEntry,
  type EntryPayload,
  type EntryProblem,
} from "@/lib/entry-validation";
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
 * Die Regeln liegen in `lib/entry-validation.ts`, als reine Funktion.
 *
 * Hier stehen sie deshalb nicht mehr: In einer Server-Aktion sind sie nur mit
 * Attrappen für `next/cache` und den Supabase-Client prüfbar, und eine Suite,
 * die Attrappen mitprüft, belegt vor allem, dass der Code zu sich selbst passt.
 */
export type { EntryPayload } from "@/lib/entry-validation";

export type SaveEntryResult =
  | { ok: true }
  | { ok: false; reason: EntryProblem | "failed" };

export async function saveEntryAction(
  locale: Locale,
  episodeId: string,
  input: EntryPayload,
): Promise<SaveEntryResult> {
  const problem = validateEntry(input, utcToday());
  if (problem !== null) return { ok: false, reason: problem };

  try {
    await saveEntry(episodeId, {
      date: input.date,
      // Die Zusicherungen hier sind erlaubt, weil `validateEntry` oben genau
      // diese Formen geprüft hat und sonst schon zurückgekehrt wäre. Sie
      // stehen zusammen an einer Stelle statt verstreut, damit sichtbar bleibt,
      // worauf sie sich stützen.
      morningScore: input.morningScore as number,
      sessions: input.sessions as unknown as Session[],
      everydayLoad: input.everydayLoad as EverydayLoad | null,
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
