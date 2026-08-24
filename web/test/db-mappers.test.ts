/**
 * Die Übersetzer zwischen Datenbankzeile und Motortyp.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIESE DREI FUNKTIONEN TESTS VERDIENEN, SO KLEIN SIE SIND.
 *
 * Sie sind die einzige Stelle, an der `snake_case` aus der Datenbank auf
 * `camelCase` im Motor trifft. Zwei vertauschte Felder gleichen Typs — `rpe`
 * und `morning_score`, `involved` und `uninvolved`, `value` und irgendeine
 * andere Zahl — ergeben Code, der kompiliert, läuft, plausible Zahlen liefert
 * und **jedes Urteil des Produkts verfälscht**.
 *
 * Genau diese Klasse Fehler fängt kein Typsystem: Beide Seiten sind `number`.
 *
 * Bei `involved`/`uninvolved` wäre es besonders bitter. Der Motor rechnet
 * daraus ein Verhältnis; vertauscht kommt der Kehrwert heraus, und aus einem
 * deutlichen Defizit wird ein Überschuss. Der Test darauf ist deshalb
 * asymmetrisch aufgebaut: Jedes Feld trägt einen anderen Wert.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import {
  toEntry,
  toMeasurement,
  toSelfTest,
  type EntryRow,
  type MeasureKeyRow,
  type MeasurementRow,
  type SelfTestRow,
} from "@/lib/db/types";

describe("toEntry", () => {
  // Jeder Zahlenwert verschieden, damit ein Tausch auffällt.
  // Ohne `as`: So prüft der Typ die Testdaten mit. Die erste Fassung hatte ein
  // `created_at` erfunden, das es in keiner dieser Zeilen gibt — die Zusicherung
  // hätte das verdeckt, der Typecheck hat es gefunden.
  const row: EntryRow = {
    id: "e1",
    episode_id: "ep1",
    entry_date: "2026-08-22",
    morning_score: 2,
    activity_kind: "cycle",
    duration_min: 75,
    rpe: 4,
    symptom_score: 6,
    symptom_timing: "after",
    note: "Auf Asphalt",
  };

  it("legt jedes Feld auf das richtige Gegenstück", () => {
    expect(toEntry(row)).toEqual({
      date: "2026-08-22",
      morningScore: 2,
      activityKind: "cycle",
      durationMin: 75,
      rpe: 4,
      symptomScore: 6,
      symptomTiming: "after",
      note: "Auf Asphalt",
    });
  });

  it("verwechselt Morgenwert, Anstrengung und Beschwerden nicht", () => {
    const e = toEntry(row);
    expect(e.morningScore).toBe(2);
    expect(e.rpe).toBe(4);
    expect(e.symptomScore).toBe(6);
  });

  it("reicht null durch, statt es zu einer Null zu machen", () => {
    // Ein Ruhetag hat keine Anstrengung. Würde daraus eine 0, hielte der Motor
    // sie für eine erfasste Einheit mit Anstrengung null.
    const ruhetag = toEntry({
      ...row,
      activity_kind: null,
      duration_min: null,
      rpe: null,
      symptom_score: null,
      symptom_timing: null,
      note: null,
    });

    expect(ruhetag.activityKind).toBeNull();
    expect(ruhetag.durationMin).toBeNull();
    expect(ruhetag.rpe).toBeNull();
    expect(ruhetag.symptomScore).toBeNull();
    expect(ruhetag.note).toBeNull();
    // Der Morgenwert bleibt: Er ist Pflicht, und 0 ist dort ein echter Wert.
    expect(ruhetag.morningScore).toBe(2);
  });
});

describe("toSelfTest", () => {
  const row: SelfTestRow = {
    id: "t1",
    episode_id: "ep1",
    test_type: "calf_raise",
    test_date: "2026-08-20",
    involved: 8,
    uninvolved: 20,
    note: null,
  };

  it("hält die verletzte und die gesunde Seite auseinander", () => {
    // Der Motor rechnet daraus ein Verhältnis. Vertauscht käme der Kehrwert
    // heraus — aus einem deutlichen Defizit würde ein Überschuss, und das
    // Urteil kippte ins Gegenteil.
    const test = toSelfTest(row);
    expect(test.involved).toBe(8);
    expect(test.uninvolved).toBe(20);
    expect(test.involved).toBeLessThan(test.uninvolved);
  });

  it("übernimmt Art und Datum", () => {
    expect(toSelfTest(row)).toEqual({
      type: "calf_raise",
      date: "2026-08-20",
      involved: 8,
      uninvolved: 20,
    });
  });

  it("lässt null Wiederholungen auf der verletzten Seite durch", () => {
    // Die aussagekräftigste Messung überhaupt, und die Prüfung im Motor ist
    // genau deshalb asymmetrisch: involved >= 0, uninvolved > 0.
    expect(toSelfTest({ ...row, involved: 0 }).involved).toBe(0);
  });
});

describe("toMeasurement", () => {
  const key: MeasureKeyRow = {
    id: "k1",
    episode_id: "ep1",
    key: "kniebeugen",
    unit: "reps",
  };

  const row: MeasurementRow = {
    id: "m1",
    measure_key_id: "k1",
    measured_on: "2026-08-19",
    value: 12,
    note: null,
  };

  it("holt die Einheit vom Schlüssel, nicht von der Messung", () => {
    // Die Einheit gehört zum Mass und nicht zum einzelnen Wert — sonst liesse
    // sich dasselbe Mass in Minuten UND Sekunden führen, still und plausibel.
    // Die Datenbank sperrt das über measure_keys; hier wird gelesen, was dort
    // festgehalten ist.
    expect(toMeasurement(row, key)).toEqual({
      key: "kniebeugen",
      date: "2026-08-19",
      value: 12,
      unit: "reps",
      note: null,
    });
  });

  it("nimmt die Einheit auch dann vom Schlüssel, wenn zwei Masse sich ähneln", () => {
    // Zwei Masse mit demselben Zahlenwert und verschiedener Einheit: Nur der
    // Schlüssel unterscheidet sie. Läse der Übersetzer die Einheit anderswo,
    // wäre »12« einmal Wiederholungen und einmal Zentimeter — beides plausibel.
    const inCm: MeasureKeyRow = { id: "k2", episode_id: "ep1", key: "hüpfweite", unit: "cm" };

    expect(toMeasurement(row, key).unit).toBe("reps");
    expect(toMeasurement(row, inCm).unit).toBe("cm");
    expect(toMeasurement(row, inCm).key).toBe("hüpfweite");
  });
});
