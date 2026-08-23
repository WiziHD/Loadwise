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
import { steadyRecovery } from "../src/fixtures.js";
import type { Milestone } from "../src/progress.js";
import {
  BLOCKED_WORDING,
  DISCLAIMER,
  VERDICT_WORDING,
  blockedText,
  verdictText,
  type Locale,
  type Phrase,
  CLAIM_WORDING,
  MILESTONE_WORDING,
  PROGRESS_BLOCK_WORDING,
} from "../src/wording.js";
import { ALL_BLOCKING_REASONS, ALL_REASON_CODES } from "../src/types.js";

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
