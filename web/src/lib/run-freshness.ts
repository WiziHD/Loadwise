import { compareDates, type DateStr } from "loadwise-engine";
import type { StoredRun } from "@/lib/db/types";

/**
 * Deckt dieser gespeicherte Lauf den neuesten Tag ab?
 *
 * ---------------------------------------------------------------------------
 * DIESER SATZ WAR EIN VERSPRECHEN IN EINEM KOMMENTAR.
 *
 * `saveEntryAction` rechnet nach jedem Eintrag neu und **schluckt einen
 * Fehlschlag dabei** — mit gutem Grund: Der Tag ist zu diesem Zeitpunkt
 * gespeichert, und »konnte nicht gespeichert werden« würde jemanden dazu
 * bringen, ihn ein zweites Mal einzutippen.
 *
 * Die Begründung dort lautete weiter: *»gespeichert, aber das Urteil hinkt« ist
 * ein Satz für die Seite, die das Urteil zeigt — die Auswertung trägt
 * `last_date` und `computed_at`, damit sie das selbst erkennen kann. Karte 2.3
 * rendert es.*
 *
 * **Karte 2.3 hat es nicht gerendert.** Der Kommentar rechtfertigte damit ein
 * Schweigen mit einem Renderer, den es nicht gab — und das Ergebnis wäre genau
 * der Fall gewesen, den dieses Projekt sonst überall verfolgt: ein Urteil auf
 * dem Bildschirm, das den neuesten Tag nicht kennt, und nichts, was das sagt.
 *
 * ---------------------------------------------------------------------------
 * VERGLICHEN WIRD DER TAG, NICHT DIE UHRZEIT.
 *
 * `computed_at` sagt, WANN gerechnet wurde; `last_date` sagt, BIS WOHIN. Nur
 * das zweite beantwortet die Frage. Ein Lauf von heute Morgen über ein Tagebuch
 * bis gestern ist aktuell, solange heute nichts erfasst wurde — und veraltet in
 * der Sekunde, in der es das wird, ohne dass sich `computed_at` bewegt.
 * ---------------------------------------------------------------------------
 */
export function runIsBehind(run: StoredRun, newestEntry: DateStr | null): boolean {
  if (newestEntry === null) return false;
  // Ein Lauf ohne `lastDate` hat über ein leeres Tagebuch gerechnet. Gibt es
  // inzwischen einen Eintrag, kennt er ihn nicht.
  if (run.lastDate === null) return true;
  return compareDates(newestEntry, run.lastDate) > 0;
}
