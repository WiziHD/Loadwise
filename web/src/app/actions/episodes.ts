"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActivityKind, BodyRegion, Locale, Side, SymptomTiming } from "loadwise-engine";
import { profileByKey } from "loadwise-engine";
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

export type SaveEntryResult = { ok: true } | { ok: false; reason: "load-incomplete" | "failed" };

export async function saveEntryAction(
  locale: Locale,
  episodeId: string,
  formData: FormData,
): Promise<SaveEntryResult> {
  const rpe = optionalNumber(formData.get("rpe"));
  const durationMin = optionalNumber(formData.get("durationMin"));

  // The same pairing the engine enforces and the database checks. Caught here
  // too so the person gets a sentence instead of a constraint violation.
  if ((rpe === null) !== (durationMin === null)) return { ok: false, reason: "load-incomplete" };

  const symptomScore = optionalNumber(formData.get("symptomScore"));
  const symptomTiming = optionalText(formData.get("symptomTiming")) as SymptomTiming | null;

  try {
    await saveEntry(episodeId, {
      date: String(formData.get("date") ?? ""),
      morningScore: Number(formData.get("morningScore")),
      activityKind: (optionalText(formData.get("activityKind")) ?? null) as ActivityKind | null,
      durationMin,
      rpe,
      symptomScore,
      // A timing without a score describes nothing, so it is dropped rather
      // than sent on to be rejected.
      symptomTiming: symptomScore === null ? null : symptomTiming,
      note: optionalText(formData.get("note")),
    });
  } catch {
    return { ok: false, reason: "failed" };
  }

  revalidatePath(`/${locale}/episodes/${episodeId}`);
  return { ok: true };
}
