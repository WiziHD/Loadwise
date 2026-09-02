import type { Measure, TestType } from "loadwise-engine";
import type { Strings } from "@/i18n/dictionary";

/**
 * Wie eine Messquelle auf dem Bildschirm heisst.
 *
 * ---------------------------------------------------------------------------
 * EINE STELLE, WEIL ES SONST ZWEI WÄREN.
 *
 * `MilestoneForm` baut daraus seine Auswahlliste, `ProgressRecords` beschriftet
 * damit die Zahlenreihen. Zweimal geschrieben hiesse: Ein Ziel steht unter
 * »Fersenheber — verletzte Seite« in der Auswahl und unter etwas anderem im
 * Verlauf, und niemand könnte den Zusammenhang sehen.
 *
 * ---------------------------------------------------------------------------
 * DER NAME EINES EIGENEN MASSES WIRD DURCHGEREICHT, NICHT ÜBERSETZT.
 *
 * »Kniebeugen« hat der Nutzer geschrieben. Ihn zu übersetzen wäre so falsch wie
 * einen Zieltext zu filtern — es sind seine Worte über seine eigenen Daten.
 * ---------------------------------------------------------------------------
 */
export function measureLabel(measure: Measure, strings: Strings["goal"]): string {
  const testName: Record<TestType, string> = {
    calf_raise: strings.calfRaise,
    single_hop: strings.singleHop,
    rom: strings.rom,
  };

  switch (measure.source) {
    case "morning_score":
      return strings.measureMorning;
    case "symptom_score":
      return strings.measureSymptom;
    case "session_minutes":
      return strings.measureSessionMinutes;
    case "self_test": {
      const seite =
        measure.side === "involved" ? strings.sideInvolved : strings.sideUninvolved;
      return `${testName[measure.type]} — ${seite}`;
    }
    case "measurement":
      // Unverändert. Siehe Kopf.
      return measure.key;
  }
}
