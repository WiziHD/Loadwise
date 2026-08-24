/**
 * What the engine is allowed to say, in the words it is allowed to say it.
 *
 * ---------------------------------------------------------------------------
 * THIS FILE IS A SAFETY BOUNDARY, NOT A TRANSLATION TABLE.
 *
 * The whole legal position of this product rests on one distinction: it
 * DOCUMENTS and STRUCTURES, it does not treat, advise or predict. TECHNIK.md
 * 2.2 sets out why — software whose intended purpose is clinical guidance
 * becomes a regulated medical device, and the Swiss MepV is deliberately
 * aligned with the EU MDR, so a Swiss address makes that harder rather than
 * easier.
 *
 * That distinction lives or dies in these sentences. Every one of them
 * describes what was observed. None of them says what to do about it.
 *
 *   allowed:  "This week's volume has risen sharply against the weeks before."
 *   NOT:      "Reduce your training this week."
 *
 *   allowed:  "Still above the usual level 48 hours later."
 *   NOT:      "You are not ready to train yet."
 *
 * `test/wording.test.ts` enforces this mechanically: no phrase may contain an
 * imperative or a recommending verb. A sentence that fails that check is not a
 * style problem, it is a regulatory one.
 * ---------------------------------------------------------------------------
 *
 * Both maps are `Record<…, Phrase>` on purpose: a new verdict code without a
 * sentence is a compile error, not a blank line on someone's screen.
 */

import type { BlockingReason, ReasonCode } from "./types.js";
import type { MilestoneState, ProgressBlock } from "./progress.js";

export type Locale = "de" | "en";

export interface Phrase {
  de: string;
  en: string;
}

/** One sentence per verdict. Describes the observation, never the response. */
export const VERDICT_WORDING: Record<ReasonCode, Phrase> = {
  // --- 24-hour response ---
  "settled-within-24h": {
    de: "Die Belastung hat sich über Nacht wieder gelegt.",
    en: "The load had settled again by the next morning.",
  },
  "elevated-but-settled": {
    de: "Am Morgen danach erhöht, nach zwei Tagen wieder auf dem gewohnten Stand.",
    en: "Raised the next morning, back to the usual level after two days.",
  },
  "still-elevated-after-48h": {
    de: "Auch 48 Stunden später noch über dem gewohnten Stand.",
    en: "Still above the usual level 48 hours later.",
  },
  "large-reaction": {
    de: "Am Morgen danach deutlich stärker als sonst.",
    en: "Markedly stronger the next morning than usual.",
  },

  // --- Load spike ---
  steady: {
    de: "Der Wochenumfang liegt im Rahmen der Vorwochen.",
    en: "This week's volume is in line with the weeks before.",
  },
  "rising-fast": {
    de: "Der Wochenumfang ist gegenüber den Vorwochen spürbar gestiegen.",
    en: "This week's volume has risen noticeably against the weeks before.",
  },
  "sharp-increase": {
    de: "Der Wochenumfang ist gegenüber den Vorwochen stark gestiegen.",
    en: "This week's volume has risen sharply against the weeks before.",
  },
  detraining: {
    de: "Der Wochenumfang liegt deutlich unter den Vorwochen.",
    en: "This week's volume is well below the weeks before.",
  },
  "no-load-recorded": {
    de: "In diesem Zeitraum wurde keine Belastung erfasst.",
    en: "No load was recorded in this period.",
  },
  "return-from-zero": {
    de: "Nach einem Zeitraum ohne erfasste Belastung wurde wieder trainiert.",
    en: "Training resumed after a period with no recorded load.",
  },

  // --- Side-to-side ---
  symmetric: {
    de: "Beide Seiten liegen im Selbsttest nah beieinander.",
    en: "Both sides are close together in the self-test.",
  },
  "mild-deficit": {
    de: "Die betroffene Seite liegt im Selbsttest unter der anderen.",
    en: "The affected side is below the other in the self-test.",
  },
  "marked-deficit": {
    de: "Die betroffene Seite liegt im Selbsttest deutlich unter der anderen.",
    en: "The affected side is well below the other in the self-test.",
  },
  "widening-gap": {
    de: "Der Abstand zwischen den Seiten hat sich über mehrere Messungen vergrößert.",
    en: "The gap between the two sides has widened across several measurements.",
  },
  "reference-eroding": {
    de: "Auch die Vergleichsseite hat nachgelassen — der Seitenvergleich ist hier wenig aussagekräftig.",
    en: "The reference side has declined as well — the side-to-side comparison says little here.",
  },

  // --- Baseline drift ---
  "baseline-stable": {
    de: "Der Ausgangswert am Morgen ist über die letzten Wochen unverändert.",
    en: "The morning baseline is unchanged over recent weeks.",
  },
  "baseline-creeping": {
    de: "Der Ausgangswert am Morgen ist über mehrere Wochen langsam gestiegen.",
    en: "The morning baseline has risen slowly over several weeks.",
  },
  "baseline-rising": {
    de: "Der Ausgangswert am Morgen ist über die letzten Wochen deutlich gestiegen.",
    en: "The morning baseline has risen markedly over recent weeks.",
  },

  // --- Pain pattern ---
  "pattern-stable": {
    de: "Der Zeitpunkt der Beschwerden hat sich nicht verschoben.",
    en: "The timing of symptoms has not shifted.",
  },
  "pattern-easing": {
    de: "Die Beschwerden treten später im Verhältnis zur Belastung auf als zuvor.",
    en: "Symptoms occur later relative to the load than before.",
  },
  "pattern-worsening": {
    de: "Die Beschwerden treten näher an der Belastung auf als zuvor.",
    en: "Symptoms occur closer to the load than before.",
  },

  // --- Long view ---
  "progress-since-start": {
    de: "Der Ausgangswert liegt niedriger als zu Beginn des Verlaufs.",
    en: "The baseline is lower than at the start of this episode.",
  },
  "settled-near-zero": {
    // Claims only what the branch condition actually establishes: where the
    // level is NOW. It deliberately says nothing about the start, because this
    // verdict is reached precisely when the episode did NOT visibly improve.
    de: "Die Beschwerden liegen aktuell auf einem sehr niedrigen Niveau.",
    en: "Symptoms are currently at a very low level.",
  },
  "worse-than-start": {
    de: "Der Ausgangswert liegt höher als zu Beginn des Verlaufs.",
    en: "The baseline is higher than at the start of this episode.",
  },
  "no-progress-since-start": {
    de: "Der Ausgangswert liegt so hoch wie zu Beginn des Verlaufs.",
    en: "The baseline is as high as at the start of this episode.",
  },

  // --- Load distribution ---
  "load-spread-even": {
    de: "Die Wochenlast verteilt sich über mehrere Tage.",
    en: "The week's load is spread across several days.",
  },
  "load-concentrated": {
    de: "Die Wochenlast liegt auf sehr wenigen Tagen.",
    en: "The week's load sits on very few days.",
  },
};

/** One sentence per "I could not judge this". Says what is missing, nothing more. */
export const BLOCKED_WORDING: Record<BlockingReason, Phrase> = {
  "baseline-unavailable": {
    de: "Für einen Vergleichswert fehlen noch Einträge.",
    en: "Not enough entries yet for a reference value.",
  },
  "next-day-missing": {
    de: "Für den Folgetag fehlt ein Eintrag.",
    en: "No entry for the following day.",
  },
  "second-day-missing": {
    de: "Für den übernächsten Tag fehlt ein Eintrag.",
    en: "No entry for the day after next.",
  },
  "history-too-short": {
    de: "Der Verlauf ist dafür noch zu kurz.",
    en: "The record is still too short for this.",
  },
  "history-too-sparse": {
    de: "Im betrachteten Zeitraum fehlen zu viele Tage.",
    en: "Too many days are missing from the period in question.",
  },
  "no-tests": {
    de: "Es liegen noch keine Selbsttests vor.",
    en: "No self-tests recorded yet.",
  },
  "tests-stale": {
    de: "Die letzten Selbsttests liegen zu lange zurück.",
    en: "The most recent self-tests are too old.",
  },
  "too-few-symptom-reports": {
    de: "Es liegen zu wenige Angaben zum Zeitpunkt der Beschwerden vor.",
    en: "Too few entries include the timing of symptoms.",
  },
  // Beschreibt, was der Fall ist, und deutet ihn nicht. »Deine Besserung könnte
  // an den Tabletten liegen« wäre eine klinische Aussage; »in diesen Tagen
  // wurde ein Schmerzmittel genommen« ist eine Tatsache aus dem Tagebuch.
  "medication-in-window": {
    de: "In den betrachteten Tagen wurde ein Schmerzmittel genommen.",
    en: "A painkiller was taken on some of the days in question.",
  },
};

/**
 * Carried by every rendered output. Not decoration — it is the sentence that
 * states the intended purpose, and the intended purpose is what decides
 * whether this is a medical device.
 */
/**
 * Where a self-set goal stands. One sentence per state, and not one of them
 * congratulates anybody.
 *
 * ---------------------------------------------------------------------------
 * A THIRD KIND OF SENTENCE, WITH A THIRD WAY OF GOING WRONG.
 *
 * The verdict wording must not INSTRUCT and must not PREDICT. Progress wording
 * has a failure mode of its own: praise, and goal-setting.
 *
 * "Fast am Ziel" is a prediction wearing encouragement as a disguise — it
 * asserts that the remaining distance will be covered. "Nächster Meilenstein"
 * is the app authoring a goal, which is the one thing tier one exists not to
 * do. "Gut gemacht" turns a record into a verdict on a person.
 *
 * So these say what is in the book and stop. test/wording.test.ts carries an
 * ACHIEVEMENT ban list alongside the other two.
 * ---------------------------------------------------------------------------
 */
export const MILESTONE_WORDING: Record<MilestoneState, Phrase> = {
  recorded: {
    de: "Im Tagebuch steht ein Tag, der das erfüllt.",
    en: "The diary holds a day that meets this.",
  },
  "partly-recorded": {
    de: "Einzelne Tage erfüllen das, noch nicht so viele wie verlangt.",
    en: "Some days meet this, not yet as many as asked for.",
  },
  "not-in-record": {
    de: "Im Tagebuch steht bisher kein Tag, der das erfüllt.",
    en: "So far the diary holds no day that meets this.",
  },
  "not-measurable": {
    de: "Zu diesem Mass steht im Tagebuch nichts.",
    en: "The diary holds nothing about this measure.",
  },
  untracked: {
    de: "Das kann ein Tagebuch nicht sehen — das weisst nur du selbst.",
    en: "A diary cannot see this — only you know.",
  },
  "marked-by-user": {
    de: "Von dir selbst als erreicht eingetragen.",
    en: "Entered by you as reached.",
  },
};

/**
 * What may be said about the distance between two readings.
 *
 * The whole point of the type is that the first entry is the shipped answer
 * today, for every test in every profile, and it has to be said out loud
 * rather than left as a silence somebody fills in for themselves.
 */
export const CLAIM_WORDING: Record<string, Phrase> = {
  "no-mdc-established": {
    de: "Aufgezeichnet. Wie weit zwei Messungen dieses Tests allein durch Zufall auseinanderliegen, ist nicht belegt — der Abstand zwischen diesen Zahlen lässt sich deshalb nicht einordnen.",
    en: "Recorded. How far two measurements of this test lie apart by chance alone is not established, so the distance between these numbers cannot be placed.",
  },
  "mdc-contested": {
    de: "Aufgezeichnet. Zur Messgenauigkeit dieses Tests nennen gleichrangige Quellen verschiedene Zahlen; der Abstand lässt sich deshalb nicht einordnen.",
    en: "Recorded. Sources of equal standing give different figures for this test's measurement accuracy, so the distance cannot be placed.",
  },
  "mdc-not-graded": {
    de: "Aufgezeichnet. Für die Messgenauigkeit dieses Tests liegt nur eine Schätzung vor, und eine Schätzung reicht dafür nicht.",
    en: "Recorded. Only an estimate exists for this test's measurement accuracy, and an estimate is not enough for this.",
  },
  "not-a-standardised-test": {
    de: "Aufgezeichnet. Das ist kein genormter Test, sondern dein eigenes Mass — die Zahlen stehen für sich.",
    en: "Recorded. This is not a standardised test but a measure of your own; the numbers stand as they are.",
  },
  "beyond-measurement-error": {
    de: "Der Abstand ist grösser als die Streuung, die für zwei Messungen dieses Tests berichtet wird.",
    en: "The distance is larger than the variation reported between two measurements of this test.",
  },
  "within-measurement-error": {
    de: "Der Abstand ist kleiner als die Streuung, die für zwei Messungen dieses Tests berichtet wird.",
    en: "The distance is smaller than the variation reported between two measurements of this test.",
  },
};

/** One sentence per "I could not follow this". Same discipline as BLOCKED_WORDING. */
export const PROGRESS_BLOCK_WORDING: Record<ProgressBlock, Phrase> = {
  "measure-never-recorded": {
    de: "Zu diesem Mass steht im Tagebuch noch keine einzige Zahl.",
    en: "The diary holds not one number for this measure yet.",
  },
  "no-measurements": {
    de: "Es liegen noch keine eigenen Messungen vor.",
    en: "There are no self-recorded measurements yet.",
  },
  "no-mdc-established": {
    de: "Für die verwendeten Tests ist nicht belegt, wie weit zwei Messungen allein durch Zufall auseinanderliegen.",
    en: "For the tests in use it is not established how far two measurements lie apart by chance alone.",
  },
};

export function milestoneText(state: MilestoneState, locale: Locale = "de"): string {
  return MILESTONE_WORDING[state][locale];
}

export function progressBlockText(reason: ProgressBlock, locale: Locale = "de"): string {
  return PROGRESS_BLOCK_WORDING[reason][locale];
}

export const DISCLAIMER: Phrase = {
  de: "Loadwise dokumentiert und ordnet. Es behandelt nicht und gibt keine Empfehlungen. Bei anhaltenden, neuen oder ungewöhnlichen Beschwerden gehört die Einschätzung zu einer Fachperson.",
  en: "Loadwise documents and structures. It does not treat and gives no recommendations. Persistent, new or unusual symptoms belong with a health professional.",
};

export function verdictText(reason: ReasonCode, locale: Locale = "de"): string {
  return VERDICT_WORDING[reason][locale];
}

export function blockedText(reason: BlockingReason, locale: Locale = "de"): string {
  return BLOCKED_WORDING[reason][locale];
}
