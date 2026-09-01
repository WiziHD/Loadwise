"use server";

import { revalidatePath } from "next/cache";
import type { Locale, Unit } from "loadwise-engine";
import { utcToday } from "@/lib/entry-validation";
import {
  validateMeasurement,
  type MeasurementPayload,
  type MeasurementProblem,
} from "@/lib/measurement-validation";
import { getEpisode } from "@/lib/db/episodes";
import { listMeasureKeys, saveMeasurement, UnitConflictError } from "@/lib/db/measurements";
import { evaluateAndStore } from "@/lib/db/verdicts";

export type SaveMeasurementResult =
  | { ok: true }
  | { ok: false; reason: MeasurementProblem | "no-episode" | "failed" };

/**
 * Eine eigene Messung speichern.
 *
 * ---------------------------------------------------------------------------
 * DIE BEKANNTEN MASSE KOMMEN AUS DER DATENBANK, NICHT AUS DEM FORMULAR.
 *
 * Derselbe Grund wie bei den Testarten in `saveSelfTestAction`: Was das
 * Formular mitschickt, ist eine Bequemlichkeit für den Menschen davor. Eine
 * Server-Aktion sieht aus wie ein Funktionsaufruf und ist ein öffentlicher
 * Endpunkt — sie kann mit `unit: "sec"` aufgerufen werden, während das Mass
 * seit Wochen in Minuten geführt wird.
 *
 * Der Schaden wäre eine Zahl im Verlauf, die niemand mehr als falsch erkennen
 * kann. »30« neben »30«, einmal Sekunden, einmal Minuten, und der Verlauf
 * zeigt eine Verschlechterung um das Sechzigfache oder gar nichts — je
 * nachdem, welche zuerst kam.
 *
 * ---------------------------------------------------------------------------
 * DIE APP SCHLÄGT NICHTS VOR, UND DAS GILT AUCH HIER.
 *
 * Nirgends in dieser Datei steht eine Liste dessen, was zu messen sich lohnt.
 * Der Kommentar an `MeasureKey` im Motor sagt, warum: Eine solche Liste wäre
 * ein klinisches Kriterium. Angeboten werden nur die Masse, die der Nutzer
 * SELBST schon benannt hat.
 * ---------------------------------------------------------------------------
 */
export async function saveMeasurementAction(
  locale: Locale,
  episodeId: string,
  input: MeasurementPayload,
): Promise<SaveMeasurementResult> {
  const episode = await getEpisode(episodeId);
  if (episode === null) return { ok: false, reason: "no-episode" };

  const bekannt = (await listMeasureKeys(episodeId)).map((k) => ({ key: k.key, unit: k.unit }));

  const problem = validateMeasurement(input, bekannt, utcToday());
  if (problem !== null) return { ok: false, reason: problem };

  try {
    await saveMeasurement(episodeId, {
      // Zulässig, weil `validateMeasurement` oben genau diese Formen geprüft
      // hat und sonst schon zurückgekehrt wäre.
      key: input.key.trim(),
      unit: input.unit as Unit,
      date: input.date,
      value: input.value as number,
      note: input.note,
    });
  } catch (fehler) {
    // Das Rennen zwischen zwei Reitern: Zwischen der Prüfung oben und dem
    // Schreiben liegt eine Abfrage, und in dieser Lücke kann jemand dasselbe
    // Mass in einer anderen Einheit angelegt haben. Der Satz dafür steht
    // schon bereit — »konnte nicht gespeichert werden« wäre hier irreführend,
    // weil ein zweiter Versuch dasselbe ergäbe.
    if (fehler instanceof UnitConflictError) return { ok: false, reason: "unit-conflict" };
    return { ok: false, reason: "failed" };
  }

  // ---------------------------------------------------------------------
  // Ab hier steht die Messung. Nichts unten darf das mehr in Frage stellen.
  //
  // Neu gerechnet wird, weil eigene Messungen in den Fortschrittskanal
  // eingehen (`evaluateProgress`) — ohne diesen Lauf bliebe der Stand der
  // Meilensteine auf dem von gestern. Ein Urteil ändern sie NICHT: Ein
  // Meilenstein trägt keine Severity und zählt nicht in die Abdeckung, sonst
  // schaltete ein erreichtes Ziel eine Entwarnung frei, die es nicht belegt.
  // ---------------------------------------------------------------------
  try {
    await evaluateAndStore(episodeId);
  } catch {
    // Die Messung steht, der Lauf ist älter als sie. `RunBehindNotice` sagt
    // das auf der Ansicht, die ihn zeigt.
  }

  try {
    revalidatePath(`/${locale}/episodes/${episodeId}`);
    revalidatePath(`/${locale}`);
  } catch {
    // Die Seite ist bis zur nächsten Navigation veraltet. Kein Wort wert.
  }

  return { ok: true };
}
