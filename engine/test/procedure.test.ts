import { describe, expect, it } from "vitest";
import { TEST_PROCEDURE, type Procedure } from "../src/procedure.js";
import { TEST_UNIT } from "../src/measure.js";
import type { TestType } from "../src/types.js";

/**
 * Die eigene Disziplin für Messanleitungen.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIESE DATEI EXISTIERT, OBWOHL ES `wording.test.ts` SCHON GIBT.
 *
 * `TEST_PROCEDURE` steht bewusst ausserhalb der Ban-Listen: Eine Anleitung muss
 * sagen, wie gemessen wird, und das klingt zwangsläufig nach einer Anweisung.
 * Der Kopf von `procedure.ts` begründet das.
 *
 * Eine Ausnahme ohne eigene Regel ist aber nur ein Loch. Was drüben verboten
 * ist, weil es ein Urteil wäre, ist hier verboten, weil es KEINE Messung mehr
 * beschreibt: eine Deutung des Ergebnisses, ein Normwert, ein Ziel, ein Lob,
 * ein Zeitpunkt. Die Anleitung endet in dem Moment, in dem eine Zahl dasteht.
 *
 * Jede Liste unten hat ihren Gegenbeweis — einen gepflanzten Satz, der greifen
 * MUSS. Ein Wächter, der nie ausgelöst hat, ist in diesem Projekt Dekoration.
 * ---------------------------------------------------------------------------
 */

const TESTARTEN: TestType[] = ["calf_raise", "single_hop", "rom"];
const LOCALES = ["de", "en"] as const;

/**
 * Das Ergebnis deuten. Der eigentliche Grenzübertritt.
 *
 * Eine Anleitung, die »normal sind 28 Wiederholungen« sagt, ist keine
 * Anleitung mehr — sie ordnet einen Menschen ein, und zwar an der Stelle, an
 * der niemand mehr hinschaut, weil dort ja nur steht, wie man misst.
 */
const DEUTUNG = [
  // Deutsch
  "normal", "normwert", "durchschnitt", "median", "bedeutet", "sollte erreichen",
  "zu wenig", "zu viel", "genug", "ausreichend", "defizit", "auffällig",
  "richtwert", "gut ", "schlecht", "besser als", "schlechter als",
  // Englisch
  "normal", "average", "median", "means that", "should reach", "not enough",
  "too few", "too many", "deficit", "benchmark", "good ", "bad ",
  "better than", "worse than",
];

/**
 * Ein Ziel setzen oder loben. Dieselbe Grenze wie in `wording.test.ts`, nur
 * an einem Ort, den jene Datei nicht sieht.
 */
const LOB_UND_ZIEL = [
  // Deutsch
  "ziel", "gut gemacht", "geschafft", "weiter so", "dranbleiben", "schaffst",
  "fast ", "nur noch",
  // Englisch
  "goal", "target", "well done", "keep going", "almost", "you can",
];

/**
 * Sagen, WANN gemessen wird. Der Schritt von der Anleitung zur Vorgabe.
 *
 * »Alle vier Wochen wiederholen« ist ein Belastungsplan in einem Satz. Die App
 * bietet den Test an; ob und wann er stattfindet, entscheidet der Mensch.
 */
const ZEITPUNKT = [
  // Deutsch
  "täglich", "wöchentlich", "jede woche", "alle vier wochen", "alle zwei wochen",
  "regelmässig", "regelmäßig", "einmal im monat", "jeden monat",
  // Englisch
  "daily", "weekly", "every week", "every four weeks", "every two weeks",
  "regularly", "once a month", "each month",
];

/** Vorhersagen. Auch hier, auch wenn es hier besonders abwegig klingt. */
const VORHERSAGE = [
  "wirst du", "wird sich bessern", "prognose", "voraussichtlich",
  "you will", "likely", "will improve", "expect to",
];

/** Jeder Satz aus jeder Anleitung, mit seiner Herkunft für die Fehlermeldung. */
const alleSaetze = (): { key: string; text: string }[] => {
  const out: { key: string; text: string }[] = [];
  for (const art of TESTARTEN) {
    const p: Procedure = TEST_PROCEDURE[art];
    for (const locale of LOCALES) {
      p.steps[locale].forEach((s, i) => out.push({ key: `${art}.steps.${locale}[${i}]`, text: s }));
      out.push({ key: `${art}.fixed.${locale}`, text: p.fixed[locale] });
    }
  }
  return out;
};

const treffer = (liste: string[], text: string) =>
  liste.some((wort) => text.toLowerCase().includes(wort));

describe("Messanleitungen sind vollständig", () => {
  it("kennt jede Testart, die eine Einheit hat", () => {
    // Bindet die beiden Tabellen aneinander. Eine neue Testart ohne Anleitung
    // wäre sonst ein Formular, das eine Zahl verlangt, ohne zu sagen, wovon.
    expect(Object.keys(TEST_PROCEDURE).sort()).toEqual(Object.keys(TEST_UNIT).sort());
  });

  it("hat in beiden Sprachen gleich viele Schritte", () => {
    // Ein fehlender Schritt in einer Sprache ist eine andere Messung, nicht
    // eine kürzere Übersetzung.
    for (const art of TESTARTEN) {
      expect(TEST_PROCEDURE[art].steps.de.length, art).toBe(TEST_PROCEDURE[art].steps.en.length);
    }
  });

  it("hat keinen leeren und keinen unfertigen Satz", () => {
    for (const { key, text } of alleSaetze()) {
      expect(text.trim().length, key).toBeGreaterThan(10);
      expect(text.trim().endsWith("."), `${key}: "${text}"`).toBe(true);
    }
  });

  it("nennt in jeder Anleitung die Einheit, in der gemessen wird", () => {
    // Ohne sie ist die Anleitung unvollständig genau an der Stelle, an der die
    // Zahl entsteht — und das Formular verlangt dann eine Zahl von etwas.
    const einheitenwort: Record<TestType, { de: string; en: string }> = {
      calf_raise: { de: "wiederholung", en: "repetition" },
      single_hop: { de: "zentimeter", en: "centimetre" },
      rom: { de: "grad", en: "degree" },
    };
    for (const art of TESTARTEN) {
      for (const locale of LOCALES) {
        const ganzeAnleitung = TEST_PROCEDURE[art].steps[locale].join(" ").toLowerCase();
        expect(ganzeAnleitung, `${art}/${locale}`).toContain(einheitenwort[art][locale]);
      }
    }
  });
});

describe("eine Anleitung misst und deutet nicht", () => {
  it("deutet das Ergebnis nicht", () => {
    const verstoesse = alleSaetze().filter(({ text }) => treffer(DEUTUNG, text));
    expect(
      verstoesse.map((v) => `${v.key}: "${v.text}"`),
      "Eine Anleitung, die einordnet, ist ein Urteil an der Stelle, an der niemand eines erwartet",
    ).toEqual([]);
  });

  it("würde eine Deutung fangen, wenn eine hineinkäme", () => {
    const gepflanzt = [
      "Normal sind in diesem Alter 28 Wiederholungen.",
      "Weniger als zwanzig ist ein deutliches Defizit.",
      "The average for this age is 28 repetitions.",
    ];
    for (const text of gepflanzt) {
      expect(treffer(DEUTUNG, text), `nicht gefangen: "${text}"`).toBe(true);
    }
  });

  it("setzt kein Ziel und lobt nicht", () => {
    const verstoesse = alleSaetze().filter(({ text }) => treffer(LOB_UND_ZIEL, text));
    expect(verstoesse.map((v) => `${v.key}: "${v.text}"`)).toEqual([]);
  });

  it("würde ein Ziel oder ein Lob fangen, wenn eines hineinkäme", () => {
    const gepflanzt = [
      "Ziel sind 25 Wiederholungen auf beiden Seiten.",
      "Gut gemacht — das war die schwierigste Messung.",
      "Target: 25 repetitions on both sides.",
      "Well done, that is the hard one.",
    ];
    for (const text of gepflanzt) {
      expect(treffer(LOB_UND_ZIEL, text), `nicht gefangen: "${text}"`).toBe(true);
    }
  });

  it("sagt nicht, wann gemessen werden soll", () => {
    const verstoesse = alleSaetze().filter(({ text }) => treffer(ZEITPUNKT, text));
    expect(
      verstoesse.map((v) => `${v.key}: "${v.text}"`),
      "Wann gemessen wird, entscheidet der Mensch — alles andere ist ein Plan",
    ).toEqual([]);
  });

  it("würde eine Zeitvorgabe fangen, wenn eine hineinkäme", () => {
    const gepflanzt = [
      "Die Messung alle vier Wochen wiederholen.",
      "Am besten wöchentlich messen.",
      "Repeat this measurement every four weeks.",
    ];
    for (const text of gepflanzt) {
      expect(treffer(ZEITPUNKT, text), `nicht gefangen: "${text}"`).toBe(true);
    }
  });

  it("sagt nichts voraus", () => {
    const verstoesse = alleSaetze().filter(({ text }) => treffer(VORHERSAGE, text));
    expect(verstoesse.map((v) => `${v.key}: "${v.text}"`)).toEqual([]);
  });

  it("würde eine Vorhersage fangen, wenn eine hineinkäme", () => {
    for (const text of ["Die Zahl wird sich bessern.", "You will manage more next time."]) {
      expect(treffer(VORHERSAGE, text), `nicht gefangen: "${text}"`).toBe(true);
    }
  });
});

describe("der Fersenheber-Takt ist festgelegt und steht dort, wo er gilt", () => {
  /**
   * Diese drei Prüfungen sind der Grund, warum die Karte den Takt überhaupt
   * erwähnt. 60 gegen 30 ist in `PROFIL-ACHILLES.md` §8.3 als strittig
   * vermerkt; entschieden wurde 60, weil die Normwerte dieses Projekts unter
   * 60 erhoben wurden.
   *
   * Ein Kommentar allein hielte das nicht. Wer den Takt später auf 30 ändert,
   * ändert die Bedeutung jeder gespeicherten Verlaufszahl — und würde es an
   * einer Zeile Prosa nicht merken.
   */
  it("nennt 60 Schläge pro Minute in beiden Sprachen", () => {
    for (const locale of LOCALES) {
      const ganz = [
        ...TEST_PROCEDURE.calf_raise.steps[locale],
        TEST_PROCEDURE.calf_raise.fixed[locale],
      ].join(" ");
      expect(ganz, locale).toContain("60");
    }
  });

  it("nennt 30 nirgends — der verworfene Takt darf nicht danebenstehen", () => {
    // Zwei Takte in einer Anleitung sind schlimmer als gar keiner: Dann wählt
    // jede Person selbst, und genau das macht zwei Messungen unvergleichbar.
    for (const locale of LOCALES) {
      const ganz = [
        ...TEST_PROCEDURE.calf_raise.steps[locale],
        TEST_PROCEDURE.calf_raise.fixed[locale],
      ].join(" ");
      expect(/\b30\b/.test(ganz), `${locale}: "${ganz}"`).toBe(false);
    }
  });

  it("führt den Takt als den Parameter, an dem die Vergleichbarkeit hängt", () => {
    // Nicht nur irgendwo in den Schritten. `fixed` ist die Stelle, die eine
    // Ansicht hervorheben kann, ohne die ganze Anleitung zu zeigen.
    for (const locale of LOCALES) {
      expect(TEST_PROCEDURE.calf_raise.fixed[locale], locale).toContain("60");
    }
  });
});
