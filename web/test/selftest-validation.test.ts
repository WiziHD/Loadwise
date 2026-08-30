import { describe, expect, it } from "vitest";
import type { TestType } from "loadwise-engine";
import { validateSelfTest, type SelfTestPayload } from "@/lib/selftest-validation";

/**
 * Die Prüfregeln des Seitenvergleichs.
 *
 * Reine Funktion, also ohne eine einzige Attrappe prüfbar — derselbe Grund, aus
 * dem `validateEntry` nicht in der Server-Aktion steht.
 */

const HEUTE = "2026-08-30";
const ACHILLES: TestType[] = ["calf_raise", "single_hop", "rom"];

const messung = (patch: Partial<SelfTestPayload> = {}): SelfTestPayload => ({
  type: "calf_raise",
  date: "2026-08-28",
  involved: 12,
  uninvolved: 20,
  note: null,
  ...patch,
});

describe("eine gültige Messung kommt durch", () => {
  it("nimmt eine gewöhnliche Paarung an", () => {
    expect(validateSelfTest(messung(), ACHILLES, HEUTE)).toBeNull();
  });

  it("nimmt heute an", () => {
    expect(validateSelfTest(messung({ date: HEUTE }), ACHILLES, HEUTE)).toBeNull();
  });

  it("nimmt einen Tag Vorsprung an — Zeitzonen, nicht Nachlässigkeit", () => {
    // Kein bewohnter Zeitversatz liegt mehr als vierzehn Stunden von UTC
    // entfernt. Dieselbe Grenze wie beim Tageseintrag.
    expect(validateSelfTest(messung({ date: "2026-08-31" }), ACHILLES, HEUTE)).toBeNull();
  });

  it("nimmt eine Notiz an", () => {
    expect(validateSelfTest(messung({ note: "Schuhe an" }), ACHILLES, HEUTE)).toBeNull();
  });
});

describe("null auf der verletzten Seite ist eine Messung, kein Fehler", () => {
  /**
   * Die wichtigste Zeile dieser Datei.
   *
   * Wer auf der verletzten Seite keine einzige Wiederholung schafft, ist an
   * Tag eins einer Reha — Index 0, ein echtes und deutliches Urteil. Eine
   * frühere Fassung des Schemas hat genau diese Messung als Eingabefehler
   * abgewiesen, also ausgerechnet die aussagekräftigste.
   */
  it("nimmt involved = 0 an", () => {
    expect(validateSelfTest(messung({ involved: 0 }), ACHILLES, HEUTE)).toBeNull();
  });

  it("lehnt uninvolved = 0 ab, und zwar mit eigenem Grund", () => {
    // Nicht »ungültig«: Sonst suchte jemand, was an einer 0 ungültig ist, wo
    // die andere 0 gerade erlaubt war.
    expect(validateSelfTest(messung({ uninvolved: 0 }), ACHILLES, HEUTE)).toBe(
      "reference-side-zero",
    );
  });
});

describe("eine halbe Paarung wird verworfen, nicht ergänzt", () => {
  it("lehnt eine fehlende verletzte Seite ab", () => {
    expect(validateSelfTest(messung({ involved: null }), ACHILLES, HEUTE)).toBe("half-pairing");
  });

  it("lehnt eine fehlende gesunde Seite ab", () => {
    expect(validateSelfTest(messung({ uninvolved: null }), ACHILLES, HEUTE)).toBe("half-pairing");
  });

  it("meldet die fehlende Seite, bevor es über den Bereich urteilt", () => {
    // Reihenfolge mit Absicht: Ein leeres Feld soll »es braucht beide Seiten«
    // sagen, nicht »ausserhalb des Bereichs«. Die zweite Meldung schickte
    // jemanden auf die Suche nach einem Zahlenfehler in einem leeren Feld.
    const beides = messung({ involved: null, uninvolved: 9999 });
    expect(validateSelfTest(beides, ACHILLES, HEUTE)).toBe("half-pairing");
  });
});

describe("nur Testarten, die das Profil führt", () => {
  it("lehnt einen Fersenheber bei einem Profil ohne ihn ab", () => {
    // Die Schulter zeigt nur Beweglichkeit. Ein Wadenheber ergäbe dort eine
    // Zahl, ein Verhältnis und ein Urteil — und nichts davon bedeutete etwas.
    const nurRom: TestType[] = ["rom"];
    expect(validateSelfTest(messung(), nurRom, HEUTE)).toBe("test-not-in-profile");
  });

  it("lehnt eine Testart ab, die es überhaupt nicht gibt", () => {
    expect(validateSelfTest(messung({ type: "squat" }), ACHILLES, HEUTE)).toBe("unknown-test");
  });

  it("prüft die Existenz vor der Profilzugehörigkeit", () => {
    // Sonst hiesse ein Tippfehler »gehört nicht zu diesem Profil«, was nach
    // einer Profilfrage klingt, wo eine Testart gemeint war.
    expect(validateSelfTest(messung({ type: "squat" }), ["rom"], HEUTE)).toBe("unknown-test");
  });

  it("lässt eine leere Profilliste nichts durch", () => {
    // Kein Selbsttest im Profil heisst: kein Selbsttest. Nicht »dann eben alle«.
    for (const art of ACHILLES) {
      expect(validateSelfTest(messung({ type: art }), [], HEUTE)).toBe("test-not-in-profile");
    }
  });
});

describe("Zahlen, die keine Messung sein können", () => {
  it("lehnt eine Zukunft ab, die mehr als einen Tag voraus ist", () => {
    expect(validateSelfTest(messung({ date: "2026-09-05" }), ACHILLES, HEUTE)).toBe("future-date");
  });

  it("lehnt eine negative Zahl ab", () => {
    expect(validateSelfTest(messung({ involved: -1 }), ACHILLES, HEUTE)).toBe("out-of-range");
  });

  it("lehnt Wiederholungen mit Nachkommastelle ab", () => {
    // Eine halbe Wiederholung gibt es nicht. Zentimeter und Grad dürfen eine.
    expect(validateSelfTest(messung({ involved: 12.5 }), ACHILLES, HEUTE)).toBe("out-of-range");
  });

  it("nimmt eine Nachkommastelle bei Zentimetern an", () => {
    const hop = messung({ type: "single_hop", involved: 112.5, uninvolved: 130.5 });
    expect(validateSelfTest(hop, ACHILLES, HEUTE)).toBeNull();
  });

  it("lehnt zwei Nachkommastellen bei Zentimetern ab", () => {
    const hop = messung({ type: "single_hop", involved: 112.55, uninvolved: 130 });
    expect(validateSelfTest(hop, ACHILLES, HEUTE)).toBe("out-of-range");
  });

  it("lehnt einen Winkel über 90 Grad ab — das ist Geometrie, keine Bewertung", () => {
    const rom = messung({ type: "rom", involved: 30, uninvolved: 95 });
    expect(validateSelfTest(rom, ACHILLES, HEUTE)).toBe("out-of-range");
  });

  it("nimmt eine hohe, aber mögliche Wiederholungszahl an", () => {
    // Gesunde zwischen 20 und 59 erreichten im Toolkit 6 bis 70. Wer 90
    // schafft, soll 90 eintragen können — die Grenze wehrt Tippfehler ab, nicht
    // Menschen.
    expect(validateSelfTest(messung({ uninvolved: 90 }), ACHILLES, HEUTE)).toBeNull();
  });

  it("lehnt eine offensichtlich vertippte Zahl ab", () => {
    expect(validateSelfTest(messung({ uninvolved: 2000 }), ACHILLES, HEUTE)).toBe("out-of-range");
  });

  it("lehnt NaN ab — ein Feld mit Buchstaben darin", () => {
    expect(validateSelfTest(messung({ involved: Number.NaN }), ACHILLES, HEUTE)).toBe(
      "out-of-range",
    );
  });

  it("lehnt Unendlich ab", () => {
    expect(validateSelfTest(messung({ uninvolved: Number.POSITIVE_INFINITY }), ACHILLES, HEUTE)).toBe(
      "out-of-range",
    );
  });
});

describe("was über das Netz kommt, ist nichts davon zwangsläufig", () => {
  /**
   * Eine Server-Aktion sieht aus wie ein Funktionsaufruf und ist ein
   * öffentlicher Endpunkt. Alles hier kann so ankommen.
   */
  it("lehnt ein kaputtes Datum ab", () => {
    expect(validateSelfTest(messung({ date: "gestern" }), ACHILLES, HEUTE)).toBe("invalid");
  });

  it("lehnt einen Typ ab, der kein String ist", () => {
    const boese = messung({ type: 7 as unknown as string });
    expect(validateSelfTest(boese, ACHILLES, HEUTE)).toBe("invalid");
  });

  it("lehnt eine Zahl ab, die ein String ist", () => {
    const boese = messung({ involved: "12" as unknown as number });
    expect(validateSelfTest(boese, ACHILLES, HEUTE)).toBe("invalid");
  });

  it("lehnt eine zu lange Notiz ab", () => {
    expect(validateSelfTest(messung({ note: "x".repeat(2001) }), ACHILLES, HEUTE)).toBe("invalid");
  });

  it("nimmt eine Notiz an der Grenze an", () => {
    expect(validateSelfTest(messung({ note: "x".repeat(2000) }), ACHILLES, HEUTE)).toBeNull();
  });
});
