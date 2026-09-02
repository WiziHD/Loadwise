"use server";

import { revalidatePath } from "next/cache";
import type { Locale, Threshold } from "loadwise-engine";
import {
  validateMilestone,
  type MilestonePayload,
  type MilestoneProblem,
} from "@/lib/milestone-validation";
import { measureKeyId } from "@/lib/measurement-validation";
import { getEpisode } from "@/lib/db/episodes";
import { listMeasureKeys } from "@/lib/db/measurements";
import { deleteMilestone, markMilestone, saveMilestone } from "@/lib/db/milestones";
import { profileOf } from "@/lib/profile-view";
import { evaluateAndStore } from "@/lib/db/verdicts";

export type SaveMilestoneResult =
  | { ok: true }
  | { ok: false; reason: MilestoneProblem | "no-episode" | "failed" };

export type MarkMilestoneResult = { ok: true } | { ok: false; reason: "failed" };

/**
 * Ein eigenes Ziel anlegen.
 *
 * ---------------------------------------------------------------------------
 * DER ZIELTEXT WIRD NICHT GEFILTERT — HIER SO WENIG WIE SONST WO.
 *
 * `validateMilestone` prüft Länge und Vorhandensein. Kein Wortfilter, keine
 * Erlaubnisliste, kein Abgleich gegen die Ban-Listen des Motors. Die regeln,
 * was der MOTOR sagt; auf dieses Feld angewandt verböten sie einem Menschen,
 * im eigenen Tagebuch über das eigene Ziel zu sprechen.
 *
 * ---------------------------------------------------------------------------
 * WAS GEPRÜFT WIRD, KOMMT AUS DER EPISODE — NICHT AUS DEM FORMULAR.
 *
 * Zwei Dinge: die Testarten, die das Profil führt, und die Masse, die diese
 * Episode kennt. Ein Ziel auf einen Fersenheber bei einer Schulter wäre eine
 * Bedingung, die nie eintreten kann und dabei aussieht, als warte sie nur.
 *
 * Dieselbe Begründung wie bei 3.1 und 3.2: Eine Server-Aktion sieht aus wie
 * ein Funktionsaufruf und ist ein öffentlicher Endpunkt.
 * ---------------------------------------------------------------------------
 */
export async function saveMilestoneAction(
  locale: Locale,
  episodeId: string,
  input: MilestonePayload,
): Promise<SaveMilestoneResult> {
  const episode = await getEpisode(episodeId);
  if (episode === null) return { ok: false, reason: "no-episode" };

  const { profile } = profileOf(episode);
  const masse = (await listMeasureKeys(episodeId)).map((k) => measureKeyId(k.key));

  const problem = validateMilestone(input, profile.tests, masse);
  if (problem !== null) return { ok: false, reason: problem };

  try {
    await saveMilestone(episodeId, {
      // Zulässig, weil `validateMilestone` oben genau diese Formen geprüft hat
      // und sonst schon zurückgekehrt wäre.
      label: input.label,
      locale: input.locale as "de" | "en",
      createdOn: input.createdOn,
      all: input.all as unknown as Threshold[],
      onDistinctDays: input.onDistinctDays as number,
      withinDays: input.withinDays,
    });
  } catch {
    return { ok: false, reason: "failed" };
  }

  // Ab hier steht das Ziel. Neu gerechnet wird, weil der Fortschrittskanal es
  // erst dadurch sieht — ein Ziel, das auf schon erfasste Tage zeigt, kann
  // sofort als »im Tagebuch belegt« dastehen. Ein Urteil ändert es nicht:
  // Ein Meilenstein trägt keine Severity und zählt nicht in die Abdeckung.
  try {
    await evaluateAndStore(episodeId);
  } catch {
    // Das Ziel steht, der Lauf ist älter als es. `RunBehindNotice` sagt das.
  }

  revalidate(locale, episodeId);
  return { ok: true };
}

/**
 * Ein Ziel ohne prüfbare Bedingung selbst abhaken — oder das zurücknehmen.
 *
 * Die Datenbank setzt durch, dass das nur bei Zielen ohne Bedingung geht
 * (`manual_tick_only_when_untracked`). Hier wird es deshalb nicht noch einmal
 * geprüft, sondern der Fehlschlag gemeldet: Eine zweite Prüfung an dieser
 * Stelle wäre eine zweite Stelle, an der die Regel steht.
 */
export async function markMilestoneAction(
  locale: Locale,
  episodeId: string,
  milestoneId: string,
  reachedOn: string | null,
): Promise<MarkMilestoneResult> {
  try {
    await markMilestone(milestoneId, reachedOn);
  } catch {
    return { ok: false, reason: "failed" };
  }

  try {
    await evaluateAndStore(episodeId);
  } catch {
    // Siehe oben.
  }

  revalidate(locale, episodeId);
  return { ok: true };
}

/** Ein Ziel zurücknehmen. Siehe `deleteMilestone` — hier wird wirklich gelöscht. */
export async function deleteMilestoneAction(
  locale: Locale,
  episodeId: string,
  milestoneId: string,
): Promise<MarkMilestoneResult> {
  try {
    await deleteMilestone(milestoneId);
  } catch {
    return { ok: false, reason: "failed" };
  }

  try {
    await evaluateAndStore(episodeId);
  } catch {
    // Siehe oben.
  }

  revalidate(locale, episodeId);
  return { ok: true };
}

function revalidate(locale: Locale, episodeId: string): void {
  try {
    revalidatePath(`/${locale}/episodes/${episodeId}`);
    revalidatePath(`/${locale}`);
  } catch {
    // Die Seite ist bis zur nächsten Navigation veraltet. Kein Wort wert.
  }
}
