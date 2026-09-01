/**
 * The wording is a regulatory boundary, so it gets tested like one.
 *
 * A sentence that tells somebody what to do turns this engine from a diary
 * into clinical guidance, and clinical guidance is a regulated medical device
 * under the Swiss MepV exactly as it is under the EU MDR. That is not a risk
 * the project can absorb, and it is far too easy to cross by writing one
 * helpful-sounding sentence.
 *
 * So the check is mechanical rather than a matter of care.
 */

import { describe, expect, it } from "vitest";
import { ALL_PROFILES } from "../src/profiles/registry.js";
import { evaluateEpisode } from "../src/evaluate.js";
import { SCENARIOS, steadyRecovery } from "../src/fixtures.js";
import { ALL_MILESTONE_STATES, ALL_PROGRESS_BLOCKS, type Milestone } from "../src/progress.js";
import {
  BLOCKED_WORDING,
  EVIDENCE_WORDING,
  PROBLEM_WORDING,
  evidenceText,
  problemText,
  DISCLAIMER,
  SELF_COMPARISON,
  VERDICT_WORDING,
  blockedText,
  milestoneText,
  progressBlockText,
  verdictText,
  type Locale,
  type Phrase,
  CLAIM_WORDING,
  MILESTONE_WORDING,
  PROGRESS_BLOCK_WORDING,
} from "../src/wording.js";
import { ALL_PROBLEM_CODES } from "../src/validate.js";
import {
  ALL_BLOCKING_REASONS,
  ALL_REASON_CODES,
  type Config,
  type Flag,
} from "../src/types.js";

const LOCALES: Locale[] = ["de", "en"];

/**
 * Verbs that hand out instructions or predictions.
 *
 * The disclaimer is exempt from the recommendation words — it exists precisely
 * to say that no recommendations are given, and has to be able to use the word.
 */
const IMPERATIVE = [
  // German
  "solltest", "sollten", "solltet", "musst", "müssen", "darfst", "dürfen",
  "empfehl", "rate dir", "raten wir", "vermeide", "reduziere", "steigere",
  "pausiere", "belaste", "trainiere", "geh zum", "lass dich",
  // English
  "you should", "you must", "you need to", "we recommend", "recommended",
  "avoid ", "reduce ", "increase ", "rest for", "stop ", "continue ",
];

/**
 * The list grew after the proof test below caught it out.
 *
 * It held "you will" and "likelihood" but not "will likely" — so "this will
 * likely resolve in six weeks" walked straight through, which is as clean an
 * example of a prognosis as exists. A ban list is only as good as the sentence
 * somebody actually writes, and the sentence somebody actually writes is the
 * reassuring one.
 */
const PREDICTIVE = [
  // German
  "risiko liegt", "wahrscheinlichkeit", "wirst du", "wird sich verschlimmern",
  "prognose", "voraussichtlich", "dürfte", "wird wieder", "wird sich bessern",
  "wird heilen", "in wenigen wochen", "in einigen wochen", "damit zu rechnen",
  // English
  "you will", "likelihood", "probability", "risk of", "likely",
  "will improve", "will recover", "will resolve", "will heal",
  "expect to", "can expect", "should resolve", "should improve",
];

/**
 * Praise, and goal-setting.
 *
 * The third way a sentence in this engine can go wrong, and the one that only
 * appeared once progress had something to say.
 *
 * It is neither an instruction nor a prognosis, which is exactly why the other
 * two lists let it through. "Fast am Ziel" asserts that the remaining distance
 * will be covered — a prediction wearing encouragement as a disguise. "Nächster
 * Meilenstein" has the app authoring a goal, which is the one thing a
 * user-authored milestone exists not to be. "Gut gemacht" turns a record into a
 * verdict on a person.
 *
 * A diary that cheers is a diary that is no longer only recording.
 */
const ACHIEVEMENT = [
  // German
  "gut gemacht", "gut gemeistert", "geschafft!", "fast am ziel", "fast geschafft",
  "weiter so", "dranbleiben", "nächster meilenstein", "naechster meilenstein",
  "glückwunsch", "gratulation", "bravo", "sei stolz", "grossartig", "großartig",
  "nur noch", "auf gutem weg", "auf dem richtigen weg",
  // English
  "well done", "great job", "nice work", "almost there", "nearly there",
  "keep it up", "keep going", "next milestone", "on track", "congratulations",
  "to go", "you are doing", "you're doing", "proud",
];

const allPhrases = (): { key: string; locale: Locale; text: string }[] => {
  const out: { key: string; locale: Locale; text: string }[] = [];
  const collect = (map: Record<string, Phrase>, prefix: string): void => {
    for (const [key, phrase] of Object.entries(map)) {
      for (const locale of LOCALES) out.push({ key: `${prefix}:${key}`, locale, text: phrase[locale] });
    }
  };
  collect(VERDICT_WORDING, "verdict");
  collect(BLOCKED_WORDING, "blocked");

  // Die Zahlen hinter einem Urteil. Sie standen bis zu Karte 2.6 in
  // `report.ts` und damit AUSSERHALB dieser Listen — sichtbar nur in einer
  // Konsolenausgabe, also von niemandem geprüft. Seit sie im Produkt stehen,
  // gelten für sie dieselben drei Verbote wie für jeden anderen Satz des
  // Motors.
  collect(EVIDENCE_WORDING as Record<string, Phrase>, "evidence");

  // Was sich an einer Eingabe nicht lesen liess. Diese Sätze erreichen die
  // lesende Person über den Bericht, also gelten für sie dieselben drei
  // Verbote. Besonders die Versuchung ist hier gross: Der natürliche Satz für
  // einen zu hohen Morgenwert ist »trag einen Wert zwischen 0 und 10 ein«, und
  // das ist eine Anweisung.
  collect(PROBLEM_WORDING as Record<string, Phrase>, "problem");

  // Der Vorbehalt zum Seitenvergleich. Er trägt eine belegte Zahl (6 bis 70
  // Wiederholungen bei Gesunden) und steht damit genau dort, wo die Ban-Listen
  // gebraucht werden: Die natürliche Kurzfassung wäre »ein guter Wert sind 25«,
  // und das ist ein Massstab, den niemand verantworten kann.
  collect({ selfComparison: SELF_COMPARISON }, "note");

  // Profiles reach the user too, and an audit of this file found they were not
  // being checked at all. A red flag is the single likeliest place for the
  // boundary to slip: the natural sentence for "your calf is swollen and warm"
  // is "go and see someone today", and that is an instruction. Every one of
  // them has to say what is the case and let the reader draw the conclusion.
  for (const p of ALL_PROFILES) {
    for (const flag of p.redFlags) {
      for (const locale of LOCALES) {
        out.push({ key: `redflag:${p.key}/${flag.key}`, locale, text: flag.text[locale] });
      }
    }
    for (const locale of LOCALES) {
      out.push({ key: `limitations:${p.key}`, locale, text: p.limitations[locale] });
      if (p.horizon) {
        out.push({ key: `horizon:${p.key}`, locale, text: p.horizon.note[locale] });
      }
    }
  }

  // Everything the progress channel is allowed to say.
  collect(MILESTONE_WORDING as Record<string, Phrase>, "milestone");
  collect(CLAIM_WORDING, "claim");
  collect(PROGRESS_BLOCK_WORDING as Record<string, Phrase>, "progressblock");

  // A user's own milestone text is DELIBERATELY absent, and there is a test
  // below that keeps it absent. See the comment there.

  return out;
};

describe("every code has a sentence", () => {
  it("covers all verdict codes in both languages", () => {
    // Record<ReasonCode, Phrase> makes a missing entry a compile error; this
    // catches the other half — an entry that exists but is empty.
    for (const code of ALL_REASON_CODES) {
      for (const locale of LOCALES) {
        expect(VERDICT_WORDING[code][locale].trim().length, `${code}/${locale}`).toBeGreaterThan(10);
      }
    }
  });

  it("covers all blocking reasons in both languages", () => {
    for (const reason of ALL_BLOCKING_REASONS) {
      for (const locale of LOCALES) {
        expect(BLOCKED_WORDING[reason][locale].trim().length, `${reason}/${locale}`).toBeGreaterThan(10);
      }
    }
  });

  it("covers all problem codes in both languages", () => {
    // Dass jeder Code ERREICHBAR ist, prüft test/problems.test.ts mit einer
    // eigenen Provokation je Code. Hier steht die andere Hälfte: dass jeder
    // erreichbare Code auch einen Satz hat.
    //
    // Ohne diese Zeile könnte ein Eintrag existieren und leer sein — und der
    // Bericht zeigte an der Stelle, an der »was fehlt« stehen müsste, nichts.
    for (const code of ALL_PROBLEM_CODES) {
      for (const locale of LOCALES) {
        expect(PROBLEM_WORDING[code][locale].trim().length, `${code}/${locale}`).toBeGreaterThan(10);
        expect(problemText(code, locale)).toBe(PROBLEM_WORDING[code][locale]);
      }
    }
  });

  it("und kein Satz nennt einen Feldnamen aus dem Code", () => {
    // `morningScore` ist für die lesende Person kein Wort. Die technischen
    // Meldungen in `Problem.message` dürfen sie tragen — sie sind die Spur für
    // die Fehlersuche. Diese Sätze hier gehen auf den Bildschirm.
    const bezeichner = ["morningScore", "durationMin", "symptomScore", "rpe", "involved", "uninvolved"];
    for (const code of ALL_PROBLEM_CODES) {
      for (const locale of LOCALES) {
        for (const name of bezeichner) {
          expect(PROBLEM_WORDING[code][locale], `${code}/${locale}`).not.toContain(name);
        }
      }
    }
  });

  it("has no duplicated sentence — two verdicts saying the same thing is a design fault", () => {
    for (const locale of LOCALES) {
      const texts = ALL_REASON_CODES.map((c) => VERDICT_WORDING[c][locale]);
      expect(new Set(texts).size, `duplicate wording in ${locale}`).toBe(texts.length);
    }
  });
});

describe("nothing instructs, nothing predicts", () => {
  it("would catch an instruction if one reached a profile", () => {
    // Proof that the two checks below have teeth rather than passing because
    // they look at nothing. The natural sentence for a swollen, warm calf IS
    // an instruction — "that needs looking at today" — and a filter that did
    // not fire on one would make the whole boundary decoration.
    const planted = [
      "Eine geschwollene Wade — du solltest damit zu einer Ärztin.",
      "Wir empfehlen, die Belastung zu reduzieren.",
      "You should stop running until this settles.",
    ];
    for (const text of planted) {
      expect(
        IMPERATIVE.some((word) => text.toLowerCase().includes(word)),
        `not caught: "${text}"`,
      ).toBe(true);
    }
  });

  it("would catch a prognosis if one reached a profile", () => {
    const planted = [
      "Dein Risiko liegt bei 34 Prozent.",
      "This will likely resolve in six weeks.",
    ];
    for (const text of planted) {
      expect(
        PREDICTIVE.some((word) => text.toLowerCase().includes(word)),
        `not caught: "${text}"`,
      ).toBe(true);
    }
  });

  it("contains no imperative or recommending verb", () => {
    const offenders = allPhrases().filter(({ text }) =>
      IMPERATIVE.some((word) => text.toLowerCase().includes(word)),
    );
    expect(
      offenders.map((o) => `${o.key}/${o.locale}: "${o.text}"`),
      "A sentence that instructs turns this into clinical guidance",
    ).toEqual([]);
  });

  it("contains no praise and sets no goals", () => {
    const offenders = allPhrases().filter(({ text }) =>
      ACHIEVEMENT.some((word) => text.toLowerCase().includes(word)),
    );
    expect(
      offenders.map((o) => `${o.key}/${o.locale}: "${o.text}"`),
      "A diary that cheers is a diary that is no longer only recording",
    ).toEqual([]);
  });

  it("would catch praise or a goal if one reached the progress wording", () => {
    const planted = [
      "Fast am Ziel — nur noch zwei Tage!",
      "Gut gemacht, weiter so.",
      "Well done. Two more to go before the next milestone.",
      "You are doing great — keep it up.",
    ];
    for (const text of planted) {
      expect(
        ACHIEVEMENT.some((word) => text.toLowerCase().includes(word)),
        `not caught: "${text}"`,
      ).toBe(true);
    }
  });

  it("does not police what the user writes in their own diary", () => {
    // The converse, and it matters as much as the ban lists themselves.
    //
    // These lists govern what the ENGINE says. Somebody will eventually extend
    // allPhrases() to cover a milestone's label "for consistency", and the app
    // will then refuse to save "Ich will in sechs Wochen wieder laufen" —
    // forbidding a person from speaking in their own diary, in their own words,
    // about their own goal.
    //
    // The mechanism is the type: a milestone's label is a plain `string` where
    // every engine sentence is a `Phrase`. This test is what stops that being
    // undone by a helpful refactor.
    const goal: Milestone = {
      id: "own",
      origin: "user",
      // Every one of these would fail all three ban lists, and none of them is
      // the engine's business.
      label: { text: "Ich will fast am Ziel bleiben, weiter so, nur noch sechs Wochen", locale: "de" },
      createdOn: "2026-03-02",
      all: [],
      onDistinctDays: 1,
    };

    const result = evaluateEpisode({ entries: steadyRecovery(28), milestones: [goal] });
    expect(result.progress.milestones.length).toBe(1);

    const collected = allPhrases().map((p) => p.text);
    expect(
      collected.some((t) => t.includes("weiter so")),
      "the user's own words have been pulled into the engine's ban lists",
    ).toBe(false);
  });

  it("contains no prediction or risk statement", () => {
    const offenders = allPhrases().filter(({ text }) =>
      PREDICTIVE.some((word) => text.toLowerCase().includes(word)),
    );
    expect(
      offenders.map((o) => `${o.key}/${o.locale}: "${o.text}"`),
      "A prognosis is the clearest way into medical device territory",
    ).toEqual([]);
  });

  it("describes in the past or present, never in the future", () => {
    // A future-tense sentence about somebody's body is a prediction wearing
    // grammar as a disguise.
    const german = ALL_REASON_CODES.map((c) => VERDICT_WORDING[c].de);
    for (const text of german) {
      expect(text, `future tense in: ${text}`).not.toMatch(/\bwird\b(?!.*gestiegen)/);
    }
  });
});

describe("the disclaimer", () => {
  it("states the intended purpose in both languages", () => {
    expect(DISCLAIMER.de).toContain("dokumentiert");
    expect(DISCLAIMER.de).toContain("keine Empfehlungen");
    expect(DISCLAIMER.en).toContain("documents");
    expect(DISCLAIMER.en).toContain("no recommendations");
  });

  it("points at a human being", () => {
    expect(DISCLAIMER.de).toContain("Fachperson");
    expect(DISCLAIMER.en).toContain("health professional");
  });
});

describe("lookup helpers", () => {
  it("defaults to German and honours an explicit locale", () => {
    expect(verdictText("steady")).toBe(VERDICT_WORDING.steady.de);
    expect(verdictText("steady", "en")).toBe(VERDICT_WORDING.steady.en);
    expect(blockedText("no-tests")).toBe(BLOCKED_WORDING["no-tests"].de);
    expect(blockedText("no-tests", "en")).toBe(BLOCKED_WORDING["no-tests"].en);
  });
});

describe("every state a person can be shown has words for it", () => {
  /**
   * `milestoneText` and `progressBlockText` were reached by no test at all.
   *
   * The ban lists above walk the wording RECORDS directly, so a forbidden
   * sentence would have been caught — but the two functions that look a state
   * up in those records were never called. A typo in either, or a record
   * missing an entry the union allows, would have shipped and only failed in
   * front of somebody using the app.
   *
   * Walking the exhaustive lists rather than a handful of examples: adding a
   * tenth milestone state without wording is then a failing test, not a blank
   * line on a screen.
   */
  it("gives every milestone state a sentence in both languages", () => {
    for (const state of ALL_MILESTONE_STATES) {
      for (const locale of ["de", "en"] as const) {
        const text = milestoneText(state, locale);
        expect(text, `${state}/${locale}`).toBeTruthy();
        expect(text.trim(), `${state}/${locale} is blank`).not.toBe("");
      }
      // Two languages that returned the same string would mean one of them was
      // never translated — every one of these sentences is prose, not a symbol.
      expect(milestoneText(state, "de"), `${state} is untranslated`)
        .not.toBe(milestoneText(state, "en"));
    }
  });

  it("gives every progress block a sentence in both languages", () => {
    for (const reason of ALL_PROGRESS_BLOCKS) {
      for (const locale of ["de", "en"] as const) {
        const text = progressBlockText(reason, locale);
        expect(text, `${reason}/${locale}`).toBeTruthy();
        expect(text.trim(), `${reason}/${locale} is blank`).not.toBe("");
      }
      expect(progressBlockText(reason, "de"), `${reason} is untranslated`)
        .not.toBe(progressBlockText(reason, "en"));
    }
  });

  it("defaults to German, the language the wording was written in", () => {
    expect(milestoneText(ALL_MILESTONE_STATES[0]!)).toBe(
      milestoneText(ALL_MILESTONE_STATES[0]!, "de"),
    );
    expect(progressBlockText(ALL_PROGRESS_BLOCKS[0]!)).toBe(
      progressBlockText(ALL_PROGRESS_BLOCKS[0]!, "de"),
    );
  });
});

/**
 * Die Zahlen hinter einem Urteil.
 *
 * ---------------------------------------------------------------------------
 * ZWEI FRAGEN, UND DIE ZWEITE IST DIE UNGEWÖHNLICHE.
 *
 * Erstens: Ist jede Variante erreichbar? Dieselbe Disziplin wie bei
 * `ALL_REASON_CODES` und `ALL_BLOCKING_REASONS` — eine Formulierung, die kein
 * Szenario erzeugt, ist eine Formulierung, die niemand je gelesen hat, und in
 * diesem Motor war unerreichbarer Code sechsmal der Fund.
 *
 * Zweitens: Passt jede Ausgabe auf genau eine Vorlage? Das prüft die
 * Gegenrichtung — dass nichts an den Vorlagen VORBEI zusammengesetzt wird. Ein
 * von Hand gebauter Satz stünde ausserhalb der drei Sperrlisten, obwohl er aus
 * demselben Modul käme. Genau so haben diese Sätze bis Karte 2.6 gelebt.
 * ---------------------------------------------------------------------------
 */
describe("die Zahlen hinter einem Urteil", () => {
  /** Eine Vorlage als Muster: Sonderzeichen entschärfen, Platzhalter zu ".+?". */
  const muster = (vorlage: string): RegExp =>
    new RegExp(
      "^" +
        vorlage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{(\w+)\\\}/g, "[\\s\\S]+?") +
        "$",
    );

  const keys = Object.keys(EVIDENCE_WORDING) as (keyof typeof EVIDENCE_WORDING)[];

  /** Jede Flag aus der Szenarienbibliothek, mit der Konfiguration ihres Laufs. */
  const alleFlags = (): { flag: Flag; config: Config }[] => {
    const out: { flag: Flag; config: Config }[] = [];
    for (const s of SCENARIOS) {
      const r = evaluateEpisode({ entries: s.entries, tests: s.tests, context: s.context });
      for (const flag of r.flags) out.push({ flag, config: r.config });
    }
    return out;
  };

  for (const locale of LOCALES) {
    it(`jede Variante wird von einem Szenario erzeugt (${locale})`, () => {
      const gesehen = new Set<string>();
      for (const { flag, config } of alleFlags()) {
        const text = evidenceText(flag, config, locale);
        const treffer = keys.filter((k) => muster(EVIDENCE_WORDING[k][locale]).test(text));
        // Die längste Vorlage gewinnt: `load_spike` passt auch auf den Anfang
        // von `load_spike_same_total`; der Nachsatz macht die andere spezifischer.
        const beste = treffer.sort(
          (a, b) => EVIDENCE_WORDING[b][locale].length - EVIDENCE_WORDING[a][locale].length,
        )[0];
        if (beste !== undefined) gesehen.add(beste);
      }
      const fehlend = keys.filter((k) => !gesehen.has(k));
      expect(fehlend, `nie erzeugt: ${fehlend.join(", ")}`).toEqual([]);
    });

    it(`und jede Ausgabe kommt aus einer Vorlage (${locale})`, () => {
      const fremd: string[] = [];
      for (const { flag, config } of alleFlags()) {
        const text = evidenceText(flag, config, locale);
        if (!keys.some((k) => muster(EVIDENCE_WORDING[k][locale]).test(text))) fremd.push(text);
      }
      expect(fremd, `passt auf keine Vorlage: ${fremd.slice(0, 3).join(" | ")}`).toEqual([]);
    });
  }

  it("und die Zahlen werden geschrieben, wie die Sprache es tut", () => {
    // Der Konsolenbericht war hier mit sich selbst uneinig: »Verhältnis 1.41«
    // stand neben »effektiv 3,2 Trainingstage«, Punkt und Komma im selben
    // deutschen Absatz. In einer Konsolenausgabe fiel das nicht auf; im Produkt
    // ist es das, was jemand sieht.
    const mitVerhaeltnis = alleFlags().filter(({ flag }) => flag.kind === "load_spike");
    expect(mitVerhaeltnis.length).toBeGreaterThan(0);

    const de = mitVerhaeltnis.map(({ flag, config }) => evidenceText(flag, config, "de"));
    const en = mitVerhaeltnis.map(({ flag, config }) => evidenceText(flag, config, "en"));

    expect(de.some((t) => /\d,\d\d/.test(t)), "kein deutsches Komma gefunden").toBe(true);
    expect(de.some((t) => /\d\.\d\d/.test(t)), "ein deutscher Dezimalpunkt").toBe(false);
    expect(en.some((t) => /\d\.\d\d/.test(t)), "kein englischer Punkt gefunden").toBe(true);
  });
});
