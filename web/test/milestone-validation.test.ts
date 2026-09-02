import { describe, expect, it } from "vitest";
import type { TestType } from "loadwise-engine";
import { validateMilestone, type MilestonePayload } from "@/lib/milestone-validation";

/**
 * Die Prüfregeln für eigene Ziele.
 *
 * ---------------------------------------------------------------------------
 * DER ERSTE ABSCHNITT PRÜFT, DASS NICHTS GEPRÜFT WIRD.
 *
 * Der Zieltext läuft durch keinen Filter. Die drei Ban-Listen des Motors regeln,
 * was der MOTOR sagt; auf dieses Feld angewandt verböten sie einem Menschen, im
 * eigenen Tagebuch über das eigene Ziel zu sprechen.
 *
 * Die Sätze in der Fixtur unten sind deshalb bewusst solche, die als MOTORTEXT
 * verboten wären: Sie enthalten Imperative, Vorhersagen und Lob. Genau das ist
 * der Punkt — ein Mensch darf all das über sich selbst sagen.
 * ---------------------------------------------------------------------------
 */

const ACHILLES: TestType[] = ["calf_raise", "single_hop", "rom"];
const MASSE = ["kniebeugen", "stehen"];

const ziel = (patch: Partial<MilestonePayload> = {}): MilestonePayload => ({
  label: "Wieder dreissig Minuten schmerzfrei gehen",
  locale: "de",
  createdOn: "2026-08-28",
  all: [],
  onDistinctDays: 1,
  withinDays: null,
  ...patch,
});

const bedingung = (patch: Record<string, unknown> = {}) => ({
  measure: { source: "morning_score" },
  direction: "at_most",
  value: 2,
  unit: "score_0_10",
  ...patch,
});

describe("der Zieltext wird nicht gefiltert", () => {
  /**
   * Jeder dieser Sätze würde als Satz DES MOTORS an einer der drei Ban-Listen
   * scheitern — Imperativ, Vorhersage, Lob. Als Ziel eines Menschen über sich
   * selbst muss jeder einzelne durchkommen.
   */
  const eigeneWorte = [
    "Ich will in sechs Wochen wieder laufen",
    "Endlich wieder Treppen steigen, ohne zu fluchen",
    "Du schaffst das — 30 Minuten am Stück",
    "Wieder joggen gehen, weiter so",
    "Ich sollte bis Weihnachten schmerzfrei sein",
    "Das wird sich bessern",
    "Fast am Ziel: nur noch die letzten Meter",
    "You should be able to run again",
    "🏃",
    "keine ahnung, einfach weniger aua",
  ];

  for (const label of eigeneWorte) {
    it(`nimmt »${label.slice(0, 32)}« an`, () => {
      expect(validateMilestone(ziel({ label }), ACHILLES, MASSE)).toBeNull();
    });
  }

  it("prüft nur, dass überhaupt etwas dasteht", () => {
    expect(validateMilestone(ziel({ label: "" }), ACHILLES, MASSE)).toBe("label-missing");
    expect(validateMilestone(ziel({ label: "   " }), ACHILLES, MASSE)).toBe("label-missing");
  });

  it("und dass es in das Feld passt", () => {
    expect(validateMilestone(ziel({ label: "x".repeat(201) }), ACHILLES, MASSE)).toBe(
      "label-too-long",
    );
    expect(validateMilestone(ziel({ label: "x".repeat(200) }), ACHILLES, MASSE)).toBeNull();
  });
});

describe("ein Ziel ohne Bedingung ist zulässig", () => {
  it("nimmt eine leere Bedingungsliste an", () => {
    // »Wieder ohne Angst die Treppe runter« kann kein Tagebuch prüfen. Ein
    // Formular, das eine Bedingung erzwingt, liesse genau die Ziele draussen,
    // die Menschen tatsächlich haben.
    expect(validateMilestone(ziel({ all: [] }), ACHILLES, MASSE)).toBeNull();
  });
});

describe("die Bedingung, wenn es eine gibt", () => {
  it("nimmt eine Bedingung auf den Morgenwert an", () => {
    expect(validateMilestone(ziel({ all: [bedingung()] }), ACHILLES, MASSE)).toBeNull();
  });

  it("nimmt eine Bedingung auf einen Selbsttest des Profils an", () => {
    const b = bedingung({
      measure: { source: "self_test", type: "calf_raise", side: "involved" },
      direction: "at_least",
      value: 15,
      unit: "reps",
    });
    expect(validateMilestone(ziel({ all: [b] }), ACHILLES, MASSE)).toBeNull();
  });

  it("lehnt einen Selbsttest ab, den das Profil nicht führt", () => {
    // Sonst wartete das Ziel auf eine Zahl, die nie kommt — und sähe dabei aus,
    // als warte es nur.
    const b = bedingung({
      measure: { source: "self_test", type: "calf_raise", side: "involved" },
      direction: "at_least",
      value: 15,
      unit: "reps",
    });
    expect(validateMilestone(ziel({ all: [b] }), ["rom"], MASSE)).toBe("measure-not-in-profile");
  });

  it("nimmt eine Bedingung auf ein eigenes Mass an", () => {
    const b = bedingung({
      measure: { source: "measurement", key: "Kniebeugen" },
      direction: "at_least",
      value: 15,
      unit: "reps",
    });
    expect(validateMilestone(ziel({ all: [b] }), ACHILLES, MASSE)).toBeNull();
  });

  it("lehnt ein eigenes Mass ab, das es noch nicht gibt", () => {
    const b = bedingung({
      measure: { source: "measurement", key: "Klimmzuege" },
      direction: "at_least",
      value: 5,
      unit: "reps",
    });
    expect(validateMilestone(ziel({ all: [b] }), ACHILLES, MASSE)).toBe("unknown-measure-key");
  });

  it("erkennt das eigene Mass unabhängig von der Schreibweise", () => {
    const b = bedingung({
      measure: { source: "measurement", key: "  KNIEBEUGEN " },
      direction: "at_least",
      value: 15,
      unit: "reps",
    });
    expect(validateMilestone(ziel({ all: [b] }), ACHILLES, MASSE)).toBeNull();
  });

  it("lehnt eine Einheit ab, die zum Mass nicht passt", () => {
    /**
     * »Höchstens 3« auf einer Null-bis-Zehn-Skala und »höchstens 3« in Minuten
     * sind zwei verschiedene Ziele. Stillschweigend das eine ins andere zu
     * verwandeln wäre derselbe Fehler, den Karte 3.2 eine Ebene tiefer
     * verhindert — deshalb wird abgelehnt statt überschrieben.
     */
    const b = bedingung({ measure: { source: "morning_score" }, unit: "min" });
    expect(validateMilestone(ziel({ all: [b] }), ACHILLES, MASSE)).toBe("unit-mismatch");
  });

  it("lehnt einen fehlenden Wert als fehlend ab, nicht als ungültig", () => {
    expect(validateMilestone(ziel({ all: [bedingung({ value: null })] }), ACHILLES, MASSE)).toBe(
      "value-missing",
    );
  });

  it("lehnt eine 12 auf einer Null-bis-Zehn-Skala ab", () => {
    expect(validateMilestone(ziel({ all: [bedingung({ value: 12 })] }), ACHILLES, MASSE)).toBe(
      "invalid",
    );
  });

  it("lehnt eine unbekannte Messquelle ab", () => {
    const b = bedingung({ measure: { source: "mondphase" } });
    expect(validateMilestone(ziel({ all: [b] }), ACHILLES, MASSE)).toBe("unknown-measure");
  });

  it("lehnt eine unbekannte Aktivitätsart ab", () => {
    const b = bedingung({
      measure: { source: "session_minutes", activityKind: "quidditch" },
      unit: "min",
    });
    expect(validateMilestone(ziel({ all: [b] }), ACHILLES, MASSE)).toBe("unknown-measure");
  });

  it("nimmt Minuten ohne Aktivitätsart an — dann zählt der ganze Tag", () => {
    const b = bedingung({ measure: { source: "session_minutes" }, direction: "at_least", value: 30, unit: "min" });
    expect(validateMilestone(ziel({ all: [b] }), ACHILLES, MASSE)).toBeNull();
  });

  it("lehnt mehr Bedingungen ab, als ein Ziel fasst", () => {
    const fuenf = Array.from({ length: 5 }, () => bedingung());
    expect(validateMilestone(ziel({ all: fuenf }), ACHILLES, MASSE)).toBe("too-many-thresholds");
  });
});

describe("wie oft, und in welchem Fenster", () => {
  it("verlangt mindestens einen Tag", () => {
    expect(validateMilestone(ziel({ onDistinctDays: 0 }), ACHILLES, MASSE)).toBe("days-out-of-range");
    expect(validateMilestone(ziel({ onDistinctDays: null }), ACHILLES, MASSE)).toBe(
      "days-out-of-range",
    );
  });

  it("nimmt ein Fenster an, das gross genug ist", () => {
    expect(
      validateMilestone(ziel({ onDistinctDays: 3, withinDays: 14 }), ACHILLES, MASSE),
    ).toBeNull();
  });

  it("lehnt ein Fenster ab, das kürzer ist als die verlangten Tage", () => {
    /**
     * Drei verschiedene Tage passen nicht in zwei. Der Motor meldete dafür nie
     * etwas — das Ziel bliebe schlicht für immer offen und sähe dabei aus, als
     * warte es. Genau die Sorte stiller Zustand, die dieses Projekt verfolgt.
     */
    expect(validateMilestone(ziel({ onDistinctDays: 3, withinDays: 2 }), ACHILLES, MASSE)).toBe(
      "window-too-short",
    );
  });

  it("nimmt ein Fenster genau in der Grösse der Tage an", () => {
    // Die Grenze selbst ist erfüllbar: drei Tage in drei Tagen.
    expect(
      validateMilestone(ziel({ onDistinctDays: 3, withinDays: 3 }), ACHILLES, MASSE),
    ).toBeNull();
  });

  it("nimmt kein Fenster an", () => {
    expect(validateMilestone(ziel({ withinDays: null }), ACHILLES, MASSE)).toBeNull();
  });
});

describe("was über das Netz kommt, ist nichts davon zwangsläufig", () => {
  it("lehnt einen Zieltext ab, der kein String ist", () => {
    expect(validateMilestone(ziel({ label: 7 as unknown as string }), ACHILLES, MASSE)).toBe(
      "invalid",
    );
  });

  it("lehnt eine unbekannte Sprache ab", () => {
    expect(validateMilestone(ziel({ locale: "fr" }), ACHILLES, MASSE)).toBe("invalid");
  });

  it("lehnt ein kaputtes Datum ab", () => {
    expect(validateMilestone(ziel({ createdOn: "gestern" }), ACHILLES, MASSE)).toBe("invalid");
  });

  it("lehnt eine Bedingungsliste ab, die keine Liste ist", () => {
    expect(
      validateMilestone(ziel({ all: {} as unknown as MilestonePayload["all"] }), ACHILLES, MASSE),
    ).toBe("invalid");
  });

  it("lehnt eine unbekannte Richtung ab", () => {
    expect(
      validateMilestone(ziel({ all: [bedingung({ direction: "genau" })] }), ACHILLES, MASSE),
    ).toBe("invalid");
  });
});
