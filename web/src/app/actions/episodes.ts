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
import {
  validateEpisodePatch,
  type EpisodePatch,
  type EpisodeProblem,
} from "@/lib/episode-validation";
import { createEpisode, setArchived, updateEpisode } from "@/lib/db/episodes";
import { saveEntry } from "@/lib/db/entries";

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
      morningStiffnessMin: input.morningStiffnessMin,
      painMedication: input.painMedication,
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

export type EpisodeEditResult = { ok: true } | { ok: false; reason: EpisodeProblem | "failed" };

/**
 * Eine Episode korrigieren.
 *
 * ---------------------------------------------------------------------------
 * DIE KÖRPERREGION KOMMT AUS DEM PROFIL, NICHT AUS DEM FORMULAR.
 *
 * Genau wie beim Anlegen. Zwei Profile teilen sich `knee`; liesse man das
 * Formular beides schicken, könnten sie sich widersprechen — und die Episode
 * liefe unter einer Region, die zu ihrem Profil nicht passt. Eine zweite Tür
 * darf nicht weiter sein als die erste.
 *
 * Den Profilwechsel hält ein Trigger fest, in derselben Transaktion wie das
 * UPDATE. Hier steht dazu nichts, und das ist Absicht.
 * ---------------------------------------------------------------------------
 */
export async function updateEpisodeAction(
  locale: Locale,
  episodeId: string,
  patch: EpisodePatch,
): Promise<EpisodeEditResult> {
  const problem = validateEpisodePatch(patch, utcToday());
  if (problem !== null) return { ok: false, reason: problem };

  // Zulässig, weil `validateEpisodePatch` oben genau diese Formen geprüft hat
  // und sonst schon zurückgekehrt wäre.
  const profileKey = patch.profileKey as string;
  const profile = profileByKey(profileKey);
  if (profile === undefined) return { ok: false, reason: "unknown-profile" };

  try {
    await updateEpisode(episodeId, {
      profileKey,
      bodyRegion: profile.bodyRegion as BodyRegion,
      side: patch.side as Side,
      startedOn: patch.startedOn as string | null,
      label: patch.label as string | null,
    });
  } catch {
    return { ok: false, reason: "failed" };
  }

  revalidate(locale, episodeId);
  return { ok: true };
}

/**
 * Ins Archiv und zurück.
 *
 * Kein Löschen. Endgültiges Löschen gehört zu Datenexport und Kontolöschung —
 * löschen darf nur, wer vorher exportieren konnte.
 */
export async function setEpisodeArchivedAction(
  locale: Locale,
  episodeId: string,
  archived: boolean,
): Promise<EpisodeEditResult> {
  try {
    await setArchived(episodeId, archived);
  } catch {
    return { ok: false, reason: "failed" };
  }

  revalidate(locale, episodeId);
  return { ok: true };
}

/**
 * Beide Seiten, die sich geändert haben — und in einem eigenen try.
 *
 * Der Schreibvorgang ist zu diesem Zeitpunkt durch. Eine Neuberechnung, die
 * fehlschlägt, darf nicht als »konnte nicht gespeichert werden« ankommen; diese
 * Zeile würde jemanden dazu bringen, eine Korrektur ein zweites Mal
 * einzutragen, die längst steht.
 */
function revalidate(locale: Locale, episodeId: string): void {
  try {
    revalidatePath(`/${locale}/episodes/${episodeId}`);
    revalidatePath(`/${locale}`);
  } catch {
    // Die Seite ist bis zur nächsten Navigation veraltet. Kein Wort wert.
  }
}
