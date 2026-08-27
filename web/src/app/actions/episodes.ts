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
import { evaluateAndStore } from "@/lib/db/verdicts";

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

  // ---------------------------------------------------------------------
  // Ab hier ist der Tag gespeichert, und nichts darf das mehr in Frage stellen.
  //
  // Beide Schritte unten stehen ausserhalb des try oben und in je eigenen:
  // Der Schreibvorgang hat stattgefunden. Ein Fehlschlag danach als »konnte
  // nicht gespeichert werden« zu melden, schickte jemanden dazu, den Tag ein
  // zweites Mal einzutippen — auf eine Zeile, die schon stimmt.
  // ---------------------------------------------------------------------

  // Das Urteil neu rechnen. Ein neuer Tag ändert es fast immer: Die
  // 24-Stunden-Regel vergleicht Nachbartage, und ohne diesen Lauf bliebe das
  // gespeicherte Urteil auf dem Stand von gestern stehen.
  try {
    await evaluateAndStore(episodeId);
  } catch {
    // Der Eintrag steht, das Urteil ist älter als er. Was hier NICHT passiert:
    // eine Meldung an dieses Formular. »Nicht gespeichert« wäre falsch, und
    // »gespeichert, aber das Urteil hinkt« ist ein Satz für die Seite, die das
    // Urteil zeigt — die Auswertung trägt `last_date` und `computed_at`, damit
    // sie das selbst erkennen kann. Karte 2.3 rendert es.
  }

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

  // ---------------------------------------------------------------------
  // EIN PROFILWECHSEL VERÄNDERT VERGANGENE URTEILE. GENAU DESHALB HIER.
  //
  // Die Schwellen sind andere, die Selbsttests sind andere, der Gewebefaktor
  // ist ein anderer — ein rotes Flag von letzter Woche kann grün werden, ohne
  // dass sich ein einziger Tagebuchtag geändert hat. Der Warnsatz im Formular
  // sagt das vorher.
  //
  // Ohne diesen Lauf bliebe im Bericht stehen, was unter dem ALTEN Profil
  // geurteilt wurde, während die Überschrift schon das neue nennt. Beides sähe
  // richtig aus, und niemand könnte den Widerspruch sehen.
  //
  // Der alte Lauf bleibt liegen; ein Bericht löscht nichts. Was den Sprung
  // erklärt, steht in `episode_profile_changes`, geschrieben vom Trigger in
  // derselben Transaktion wie das UPDATE.
  //
  // Auch bei Seite und Beginn, nicht nur beim Profil: `startedOn` entscheidet,
  // ob zeitbasierte Prüfungen überhaupt greifen. Zu unterscheiden, was ein
  // Urteil bewegt und was nicht, wäre eine vierte Stelle, die das wissen muss.
  // ---------------------------------------------------------------------
  try {
    await evaluateAndStore(episodeId);
  } catch {
    // Wie beim Tageseintrag: Die Korrektur steht. Das Urteil ist dann älter
    // als das Profil, unter dem es gelesen wird — sichtbar über `computed_at`
    // gegen den Wechsel in `episode_profile_changes`.
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
