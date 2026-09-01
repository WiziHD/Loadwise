import { describe, expect, it } from "vitest";
import {
  measureKeyId,
  validateMeasurement,
  type KnownMeasure,
  type MeasurementPayload,
} from "@/lib/measurement-validation";

/**
 * Die Prüfregeln für eigene Masse.
 *
 * Zwei Fehler stehen hier im Mittelpunkt, und beide erzeugen einen Verlauf,
 * der plausibel aussieht und nichts bedeutet: dieselbe Zahl in zwei Einheiten,
 * und dasselbe Mass in zwei Schreibweisen.
 */

const HEUTE = "2026-08-30";

const messung = (patch: Partial<MeasurementPayload> = {}): MeasurementPayload => ({
  key: "Kniebeugen",
  unit: "reps",
  date: "2026-08-28",
  value: 15,
  note: null,
  ...patch,
});

const BEKANNT: KnownMeasure[] = [
  { key: "Kniebeugen", unit: "reps" },
  { key: "Stehen", unit: "min" },
];

describe("eine gültige Messung kommt durch", () => {
  it("nimmt ein neues Mass an", () => {
    expect(validateMeasurement(messung({ key: "Treppen" }), BEKANNT, HEUTE)).toBeNull();
  });

  it("nimmt ein bekanntes Mass in seiner Einheit an", () => {
    expect(validateMeasurement(messung(), BEKANNT, HEUTE)).toBeNull();
  });

  it("nimmt null als Wert an — null Kniebeugen ist eine Messung", () => {
    expect(validateMeasurement(messung({ value: 0 }), BEKANNT, HEUTE)).toBeNull();
  });

  it("nimmt einen Tag Vorsprung an — Zeitzonen, nicht Nachlässigkeit", () => {
    expect(validateMeasurement(messung({ date: "2026-08-31" }), BEKANNT, HEUTE)).toBeNull();
  });

  it("stört sich nicht an Leerzeichen um den Namen", () => {
    expect(validateMeasurement(messung({ key: "  Kniebeugen  " }), BEKANNT, HEUTE)).toBeNull();
  });
});

describe("die Einheit ist eingefroren", () => {
  /**
   * Der Fehler, den die Karte beim Namen nennt: »30 Minuten gegen 30 Sekunden
   * wäre still und falsch«. Beide Zahlen sind 30, beide Zeilen sehen richtig
   * aus, und der Verlauf zeigt entweder nichts oder das Sechzigfache.
   */
  it("lehnt dasselbe Mass in einer anderen Einheit ab", () => {
    expect(validateMeasurement(messung({ key: "Stehen", unit: "sec" }), BEKANNT, HEUTE)).toBe(
      "unit-conflict",
    );
  });

  it("nimmt dasselbe Mass in SEINER Einheit an", () => {
    // Die Gegenprobe: Ohne sie könnte die Prüfung schlicht jedes bekannte Mass
    // ablehnen und wäre trotzdem grün.
    expect(validateMeasurement(messung({ key: "Stehen", unit: "min" }), BEKANNT, HEUTE)).toBeNull();
  });

  it("lässt sich nicht mit einem grossen Anfangsbuchstaben umgehen", () => {
    // Sonst stünden zwei Reihen da, wo eine gemeint war — und auf dem
    // Bildschirm wäre der Unterschied nicht zu sehen.
    expect(validateMeasurement(messung({ key: "stehen", unit: "sec" }), BEKANNT, HEUTE)).toBe(
      "unit-conflict",
    );
    expect(validateMeasurement(messung({ key: "STEHEN", unit: "sec" }), BEKANNT, HEUTE)).toBe(
      "unit-conflict",
    );
  });

  it("und nicht mit einem Leerzeichen davor", () => {
    expect(validateMeasurement(messung({ key: " Stehen ", unit: "sec" }), BEKANNT, HEUTE)).toBe(
      "unit-conflict",
    );
  });

  it("lässt ein wirklich anderes Mass in einer anderen Einheit zu", () => {
    // Die zweite Gegenprobe. Der Konflikt hängt am NAMEN, nicht an der Einheit.
    expect(validateMeasurement(messung({ key: "Halten", unit: "sec" }), BEKANNT, HEUTE)).toBeNull();
  });

  it("kennt keine Einheit, die die Datenbank nicht kennt", () => {
    expect(validateMeasurement(messung({ unit: "kg" }), BEKANNT, HEUTE)).toBe("unknown-unit");
    expect(validateMeasurement(messung({ unit: "" }), BEKANNT, HEUTE)).toBe("unknown-unit");
  });
});

describe("der Name", () => {
  it("darf nicht leer sein", () => {
    expect(validateMeasurement(messung({ key: "" }), BEKANNT, HEUTE)).toBe("key-missing");
  });

  it("darf nicht nur aus Leerzeichen bestehen", () => {
    // Sonst wäre »   « ein gültiges Mass, und das zweite träfe auf den Index
    // aus 0010 — mit einer Meldung über Eindeutigkeit statt über ein leeres
    // Feld.
    expect(validateMeasurement(messung({ key: "    " }), BEKANNT, HEUTE)).toBe("key-missing");
  });

  it("darf nicht endlos sein", () => {
    expect(validateMeasurement(messung({ key: "x".repeat(61) }), BEKANNT, HEUTE)).toBe(
      "key-too-long",
    );
  });

  it("darf an der Grenze stehen", () => {
    expect(validateMeasurement(messung({ key: "x".repeat(60) }), BEKANNT, HEUTE)).toBeNull();
  });

  it("wird inhaltlich NICHT geprüft", () => {
    /**
     * Die wichtigste Prüfung dieser Datei, und sie prüft eine Abwesenheit.
     *
     * `MeasureKey` ist im Motor absichtlich ein offener String: Eine Liste
     * dessen, was zu messen sich lohnt, wäre ein klinisches Kriterium. Diese
     * Funktion darf deshalb nie eine Erlaubnisliste führen — sie prüft die
     * FORM eines Namens und niemals seinen Inhalt.
     */
    const eigenwillig = [
      "Wie weit bis zum Briefkasten",
      "Treppen ohne Geländer",
      "🦵",
      "Zeit bis es zwickt",
      "asdf",
    ];
    for (const key of eigenwillig) {
      expect(validateMeasurement(messung({ key }), BEKANNT, HEUTE), key).toBeNull();
    }
  });
});

describe("Zahlen, die keine Messung sein können", () => {
  it("meldet einen fehlenden Wert als fehlend, nicht als ungültig", () => {
    expect(validateMeasurement(messung({ value: null }), BEKANNT, HEUTE)).toBe("value-missing");
  });

  it("lehnt eine negative Zahl ab", () => {
    expect(validateMeasurement(messung({ value: -1 }), BEKANNT, HEUTE)).toBe("out-of-range");
  });

  it("lehnt eine halbe Wiederholung ab", () => {
    expect(validateMeasurement(messung({ value: 15.5 }), BEKANNT, HEUTE)).toBe("out-of-range");
  });

  it("erlaubt eine Nachkommastelle bei Zentimetern", () => {
    expect(validateMeasurement(messung({ key: "Wand", unit: "cm", value: 9.5 }), BEKANNT, HEUTE)).toBeNull();
  });

  it("lehnt eine 12 auf einer Null-bis-Zehn-Skala ab", () => {
    // Keine schlimmere Zahl, sondern keine: Die Skala hat elf Werte.
    const skala = messung({ key: "Steifigkeit", unit: "score_0_10", value: 12 });
    expect(validateMeasurement(skala, BEKANNT, HEUTE)).toBe("out-of-range");
  });

  it("nimmt die 10 auf derselben Skala an", () => {
    const skala = messung({ key: "Steifigkeit", unit: "score_0_10", value: 10 });
    expect(validateMeasurement(skala, BEKANNT, HEUTE)).toBeNull();
  });

  it("lehnt NaN und Unendlich ab", () => {
    expect(validateMeasurement(messung({ value: Number.NaN }), BEKANNT, HEUTE)).toBe("out-of-range");
    expect(validateMeasurement(messung({ value: Number.POSITIVE_INFINITY }), BEKANNT, HEUTE)).toBe(
      "out-of-range",
    );
  });

  it("lehnt ein Datum in der Zukunft ab", () => {
    expect(validateMeasurement(messung({ date: "2026-09-05" }), BEKANNT, HEUTE)).toBe("future-date");
  });
});

describe("was über das Netz kommt, ist nichts davon zwangsläufig", () => {
  it("lehnt einen Namen ab, der kein String ist", () => {
    const boese = messung({ key: 7 as unknown as string });
    expect(validateMeasurement(boese, BEKANNT, HEUTE)).toBe("invalid");
  });

  it("lehnt einen Wert ab, der ein String ist", () => {
    const boese = messung({ value: "15" as unknown as number });
    expect(validateMeasurement(boese, BEKANNT, HEUTE)).toBe("invalid");
  });

  it("lehnt ein kaputtes Datum ab", () => {
    expect(validateMeasurement(messung({ date: "gestern" }), BEKANNT, HEUTE)).toBe("invalid");
  });

  it("lehnt eine zu lange Notiz ab", () => {
    expect(validateMeasurement(messung({ note: "x".repeat(2001) }), BEKANNT, HEUTE)).toBe("invalid");
  });
});

describe("die Vergleichsform eines Namens", () => {
  it("ignoriert Rand und Schreibweise", () => {
    expect(measureKeyId("  Kniebeugen  ")).toBe(measureKeyId("kniebeugen"));
    expect(measureKeyId("STEHEN")).toBe(measureKeyId("stehen"));
  });

  it("wirft nicht zusammen, was verschieden ist", () => {
    // Die Gegenprobe: Eine Normalisierung, die alles gleich macht, bestünde
    // die Zeile darüber ebenfalls.
    expect(measureKeyId("Stehen")).not.toBe(measureKeyId("Gehen"));
    expect(measureKeyId("Kniebeugen tief")).not.toBe(measureKeyId("Kniebeugen"));
  });
});
