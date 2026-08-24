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
  type SessionRow,
  type SelfTestRow,
} from "@/lib/db/types";

describe("toEntry", () => {
  // Jeder Zahlenwert verschieden, damit ein Tausch auffällt.
  const row: EntryRow = {
    id: "e1",
    episode_id: "ep1",
    entry_date: "2026-08-22",
    morning_score: 2,
    everyday_load: "on-feet",
    symptom_score: 6,
    symptom_timing: "after",
    note: "Auf Asphalt",
  };

  const einheiten: SessionRow[] = [
    { id: "s2", entry_id: "e1", position: 1, activity_kind: "strength_lower", duration_min: 30, rpe: 5 },
    { id: "s1", entry_id: "e1", position: 0, activity_kind: "cycle", duration_min: 75, rpe: 4 },
  ];

  it("legt jedes Feld auf das richtige Gegenstück", () => {
    expect(toEntry(row, [einheiten[1]!])).toEqual({
      date: "2026-08-22",
      morningScore: 2,
      sessions: [{ activityKind: "cycle", durationMin: 75, rpe: 4 }],
      everydayLoad: "on-feet",
      symptomScore: 6,
      symptomTiming: "after",
      note: "Auf Asphalt",
    });
  });

  it("sortiert die Einheiten nach ihrer Position, nicht nach dem Zufall der Abfrage", () => {
    // Ein Bericht soll den Tag in der Reihenfolge zeigen, in der er
    // stattgefunden hat. Die Datenbank gibt keine Reihenfolge zu, wenn man
    // keine verlangt — hier kommen sie absichtlich verkehrt herein.
    const e = toEntry(row, einheiten);
    expect(e.sessions.map((s) => s.activityKind)).toEqual(["cycle", "strength_lower"]);
  });

  it("verwechselt Morgenwert, Anstrengung und Beschwerden nicht", () => {
    const e = toEntry(row, [einheiten[1]!]);
    expect(e.morningScore).toBe(2);
    expect(e.sessions[0]!.rpe).toBe(4);
    expect(e.symptomScore).toBe(6);
  });

  it("macht aus einem Tag ohne Einheiten einen Ruhetag, nicht eine Null", () => {
    const ruhetag = toEntry({ ...row, symptom_score: null, symptom_timing: null, note: null }, []);
    expect(ruhetag.sessions).toEqual([]);
    expect(ruhetag.symptomScore).toBeNull();
    // Der Morgenwert bleibt: Er ist Pflicht, und 0 ist dort ein echter Wert.
    expect(ruhetag.morningScore).toBe(2);
  });

  it("reicht eine fehlende Alltagsbelastung als null durch", () => {
    // Wer die App vor dieser Änderung benutzt hat, hat für jeden alten Tag
    // keinen Wert. Daraus »sitzend« zu machen wäre eine erfundene Angabe.
    expect(toEntry({ ...row, everyday_load: null }, []).everydayLoad).toBeNull();
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
