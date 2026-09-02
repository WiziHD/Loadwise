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

import type { BlockingReason, Config, Flag, ReasonCode } from "./types.js";
import type { ChangeClaim, MilestoneState, ProgressBlock } from "./progress.js";
import type { ProblemCode } from "./validate.js";

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
/**
 * Die Schlüssel, unter denen ein `ChangeClaim` seinen Satz findet.
 *
 * ---------------------------------------------------------------------------
 * ABGELEITET AUS DEM TYP, NICHT DANEBEN GESCHRIEBEN.
 *
 * `CLAIM_WORDING` stand als `Record<string, Phrase>` da. Damit war ein
 * fehlender Satz kein Übersetzungsfehler, sondern eine leere Zeile auf einem
 * Bildschirm — und zwar ausgerechnet an der Stelle, an der der Motor sagt,
 * dass er den Abstand zwischen zwei Zahlen NICHT einordnen kann.
 *
 * Ein stummer Vorbehalt ist schlimmer als gar keiner: Die Zahlen stünden
 * nebeneinander, und nichts sagte, dass ihr Abstand nichts bedeutet.
 *
 * Der Typ zieht die Schlüssel jetzt aus `ChangeClaim` selbst. Eine neue
 * Variante ist damit ein Compilerfehler, hier wie überall sonst in dieser
 * Datei.
 * ---------------------------------------------------------------------------
 */
export type ClaimKey =
  | Extract<ChangeClaim, { level: "recorded-only" }>["why"]
  | Exclude<ChangeClaim["level"], "recorded-only">;

export const CLAIM_WORDING: Record<ClaimKey, Phrase> = {
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

/**
 * Der Satz zu einer Zahlenreihe — und warum die App ihn nicht selbst bilden darf.
 *
 * ---------------------------------------------------------------------------
 * DIESE FUNKTION IST DER GRUND, WARUM »BESSER« NIRGENDS STEHT.
 *
 * Für keinen Test dieser neun Profile ist belegt, wie weit zwei Messungen
 * allein durch Zufall auseinanderliegen. Ohne diese Zahl lässt sich »acht,
 * dann fünfzehn« nicht von Messrauschen trennen — und jede Formulierung mit
 * einem Verb der Veränderung behauptete genau das.
 *
 * Wie ernst das ist, zeigt der VISA-A-Fragebogen: Eine Arbeit nennt 6,5 Punkte
 * als klinisch bedeutsamen Unterschied, bei einer Messgenauigkeit von
 * mindestens 7. Die kleinste Änderung, die etwas bedeutet, liegt dort UNTER
 * der Genauigkeit der Messung.
 *
 * Der Motor sagt deshalb, was der Fall ist — »Aufgezeichnet« — und benennt in
 * demselben Satz, warum er nicht mehr sagt. Eine Ansicht, die daraus »+7« oder
 * »Bestwert« machte, hätte die Genauigkeit erfunden, die die Messung nicht
 * hergibt.
 * ---------------------------------------------------------------------------
 */
export function claimText(claim: ChangeClaim, locale: Locale = "de"): string {
  const key: ClaimKey = claim.level === "recorded-only" ? claim.why : claim.level;
  return CLAIM_WORDING[key][locale];
}

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

/**
 * Warum der Seitenvergleich gegen die eigene andere Seite läuft und nicht
 * gegen einen Normwert.
 *
 * ---------------------------------------------------------------------------
 * EIN MOTORSATZ, WEIL ER EINE BELEGTE AUSSAGE TRÄGT.
 *
 * Im App-Wörterbuch stünde er ausserhalb der drei Ban-Listen, und die
 * Versuchung ist hier greifbar: Die natürliche Kurzfassung lautet »ein guter
 * Wert sind 25 Wiederholungen«, und das wäre ein Massstab, den niemand
 * verantworten kann.
 *
 * Die Zahl dahinter steht in `profiles/achilles.ts` unter
 * `asymmetry.selfComparison`, Grad B: Gesunde zwischen 20 und 59 erreichten im
 * UBC-Toolkit **6 bis 70** Wiederholungen. Eine Spannweite, die fast nichts
 * ausschliesst — genau deshalb kann ein absoluter Normwert hier kein Urteil
 * tragen, und genau deshalb steht in dieser App nirgends einer.
 *
 * Der Satz sagt, WAS DER FALL IST, und zieht keinen Schluss für die lesende
 * Person. Ein Balken gegen 100 % wäre die Bildfassung des verbotenen Satzes:
 * Der Index ist ein Verhältnis, kein Ziel.
 * ---------------------------------------------------------------------------
 */
export const SELF_COMPARISON: Phrase = {
  de:
    "Verglichen wird mit deiner eigenen anderen Seite, nicht mit einem Normwert. " +
    "Gesunde zwischen 20 und 59 erreichen beim Fersenheber zwischen 6 und 70 Wiederholungen — eine Spannweite, aus der sich für einen einzelnen Menschen nichts ablesen lässt.",
  en:
    "The comparison is with your own other side, not with a norm. " +
    "Healthy adults aged 20 to 59 reach between 6 and 70 heel raises — a range from which nothing follows for any one person.",
};

export function verdictText(reason: ReasonCode, locale: Locale = "de"): string {
  return VERDICT_WORDING[reason][locale];
}

export function blockedText(reason: BlockingReason, locale: Locale = "de"): string {
  return BLOCKED_WORDING[reason][locale];
}

// ---------------------------------------------------------------------------
// Die Zahlen hinter einem Urteil
//
// ---------------------------------------------------------------------------
// DIESE SÄTZE STANDEN IN `report.ts` UND WAREN NUR AUF DEUTSCH DA.
//
// Der Konsolenbericht hat sie seit jeher; die App konnte sie nicht zeigen. Sie
// dorthin zu kopieren verbietet `check:boundary` zu Recht — und der Grund ist
// nicht Formalismus: In diesen Zeilen steckt Begründung, keine Formatierung.
//
// Der Lastspitzen-Zweig entscheidet anhand von URTEILSUNEINIGKEIT zwischen dem
// gewebegewichteten und dem rohen Verhältnis, ob er den zweiten Halbsatz
// überhaupt sagt. Ein früherer fester Abstand von 0,3 blieb beim ersten echten
// Sechzig-Tage-Verlauf stumm — 1,41 gegen 1,24, gelb gegen grün, also genau der
// Fall, für den die Aufteilung existiert. Eine Kopie in der App stünde
// ausserhalb der drei Sperrlisten, und die erste gutgemeinte Umformulierung
// nähme diesen Vorbehalt heraus.
//
// ---------------------------------------------------------------------------
// EIN SATZ JE VARIANTE, NICHT DREI BRUCHSTÜCKE.
//
// »Verhältnis nicht berechenbar« ist eine eigene Zeile und nicht ein
// eingesetztes Wort. Zusammengestückelte Sätze sind die Bauform, an der
// Übersetzungen zerbrechen: Im Englischen steht die Zahl anderswo, und wer die
// Reihenfolge ändern muss, kann es nicht.
//
// Die einzige Ausnahme ist `{base}` bei der Lastspitze — dort wird ein ganzer
// Satz in einen anderen eingesetzt. Beide Sprachen stellen den Nachsatz
// hintenan, also trägt die Einschränkung nichts weg.
// ---------------------------------------------------------------------------

export type EvidenceKey =
  | "response_24h"
  | "response_24h_follow"
  | "load_spike"
  | "load_spike_incalculable"
  | "load_spike_same_total"
  | "load_spike_moved_total"
  | "asymmetry"
  | "asymmetry_declining"
  | "baseline_drift"
  | "pain_pattern"
  | "stagnation"
  | "load_spread"
  | "load_spread_none"
  | "load_spread_single";

export const EVIDENCE_WORDING: Record<EvidenceKey, Phrase> = {
  response_24h: {
    de: "Last {load}, Ausgangswert {baseline}, am Morgen danach {nextMorning}",
    en: "Load {load}, baseline {baseline}, next morning {nextMorning}",
  },
  response_24h_follow: {
    de: "Last {load}, Ausgangswert {baseline}, am Morgen danach {nextMorning}, 48 h: {followUp}",
    en: "Load {load}, baseline {baseline}, next morning {nextMorning}, 48 h: {followUp}",
  },

  load_spike: {
    de: "Woche {acute} gegen Norm {chronic}, Verhältnis {ratio}",
    en: "This week {acute} against baseline {chronic}, ratio {ratio}",
  },
  load_spike_incalculable: {
    de: "Woche {acute} gegen Norm {chronic}, Verhältnis nicht berechenbar",
    en: "This week {acute} against baseline {chronic}, ratio not computable",
  },
  /**
   * Der Vorbehalt, den es nur gibt, wenn die beiden Verhältnisse sich über das
   * Urteil uneinig sind. Wer Rad fährt statt zu laufen, hat genauso viel
   * trainiert — was sich geändert hat, ist das Gewebe, das es getragen hat.
   * Nur die gewichtete Zahl zu nennen läse sich für die Person, die die Woche
   * erlebt hat, falsch.
   */
  load_spike_same_total: {
    de: "{base} — dein Gesamttraining ist dabei praktisch gleich geblieben; der Unterschied liegt in der Wahl der Aktivität",
    en: "{base} — your overall training stayed practically the same; the difference lies in the choice of activity",
  },
  load_spike_moved_total: {
    de: "{base} — dein Gesamttraining hat sich dabei um Faktor {rawRatio} verändert; der Unterschied liegt in der Wahl der Aktivität",
    en: "{base} — your overall training changed by a factor of {rawRatio}; the difference lies in the choice of activity",
  },

  asymmetry: {
    de: "{test}: {history}",
    en: "{test}: {history}",
  },
  asymmetry_declining: {
    de: "{test}: {history}, Vergleichsseite {reference}",
    en: "{test}: {history}, uninvolved side {reference}",
  },

  baseline_drift: {
    de: "vorletzte {window} Tage {previous}, letzte {window} Tage {recent} ({change})",
    en: "previous {window} days {previous}, last {window} days {recent} ({change})",
  },

  pain_pattern: {
    de: "Lage {previous} → {recent} ({change}) auf der Skala Abend 1 / danach 2 / während 3",
    en: "position {previous} → {recent} ({change}) on the scale evening 1 / after 2 / during 3",
  },

  /**
   * Beide Zahlen sind Mediane über ein Fenster, und die Zeile muss das sagen.
   *
   * Sie las sich einmal »zu Beginn 3, jetzt 1«. Beim ersten fremden Verlauf, den
   * dieser Motor gelesen hat, startete die Person bei 6 von 10 und bekam gesagt,
   * ihr Anfang sei eine 3 gewesen — weil die ersten vierzehn Tage schon die
   * schnelle frühe Besserung enthielten und der Median sie schluckte.
   */
  stagnation: {
    de: "erste {window} Tage {start}, letzte {window} Tage {current}, nach {weeks} Wochen",
    en: "first {window} days {start}, last {window} days {current}, after {weeks} weeks",
  },

  load_spread: {
    de: "effektiv {effectiveDays} Trainingstage bei {sessions} Einheiten, schwerster Tag {share} % der Wochenlast",
    en: "effectively {effectiveDays} training days across {sessions} sessions, heaviest day {share} % of the week's load",
  },
  load_spread_none: {
    de: "keine Belastung erfasst",
    en: "no load recorded",
  },
  load_spread_single: {
    de: "die gesamte Wochenlast lag auf einem einzigen Tag",
    en: "the whole week's load fell on a single day",
  },
};

/**
 * Eine Zahl, wie die jeweilige Sprache sie schreibt.
 *
 * ---------------------------------------------------------------------------
 * DER KONSOLENBERICHT WAR HIER MIT SICH SELBST UNEINIG.
 *
 * »Verhältnis 1.41« stand direkt neben »effektiv 3,2 Trainingstage« — Punkt und
 * Komma im selben deutschen Absatz. In einer Konsolenausgabe fiel das nicht
 * auf. Sobald diese Zeilen im Produkt stehen, ist es das, was jemand sieht.
 * ---------------------------------------------------------------------------
 */
function zahl(value: number, digits: number, locale: Locale): string {
  const text = value.toFixed(digits);
  return locale === "de" ? text.replace(".", ",") : text;
}

/** `{name}` durch Werte ersetzen. Ein unbekannter Platzhalter bleibt stehen. */
function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}

/** In welches Urteilsband ein Lastverhältnis fällt — worüber die zwei Zahlen sich uneinig sein können. */
function band(ratio: number, config: Config): string {
  if (ratio > config.spike.redAbove) return "sharp";
  if (ratio > config.spike.amberAbove) return "rising";
  if (ratio < config.spike.amberBelow) return "falling";
  return "steady";
}

/**
 * Die Zahlen hinter einem Urteil. Beleg für den Satz, nie sein Ersatz.
 *
 * Braucht die Konfiguration, unter der das Urteil ENTSTANDEN ist — nicht die
 * heutige. Deshalb trägt jede gespeicherte Auswertung ihre eigene mit sich
 * (Migration 0007): Ein Bericht, der gegen andere Schwellen erklärt als die, nach
 * denen geurteilt wurde, erfindet eine Begründung.
 */
export function evidenceText(flag: Flag, config: Config, locale: Locale = "de"): string {
  const say = (key: EvidenceKey, values: Record<string, string | number> = {}): string =>
    fill(EVIDENCE_WORDING[key][locale], values);

  switch (flag.kind) {
    case "response_24h": {
      const d = flag.detail;
      const werte = {
        load: Math.round(d.load),
        baseline: d.baseline,
        nextMorning: d.nextMorning,
        followUp: d.followUpMorning ?? 0,
      };
      return d.followUpMorning === null
        ? say("response_24h", werte)
        : say("response_24h_follow", werte);
    }

    case "load_spike": {
      const d = flag.detail;
      const grund = { acute: Math.round(d.acute), chronic: Math.round(d.chronic) };
      const base =
        d.ratio === null
          ? say("load_spike_incalculable", grund)
          : say("load_spike", { ...grund, ratio: zahl(d.ratio, 2, locale) });

      // Der Nachsatz kommt nur, wenn die gewichtete und die rohe Zahl sich über
      // das URTEIL uneinig sind — nicht bei einem beliebigen Abstand.
      if (d.ratio !== null && d.rawRatio !== null && band(d.ratio, config) !== band(d.rawRatio, config)) {
        return d.rawRatio >= 0.85 && d.rawRatio <= 1.15
          ? say("load_spike_same_total", { base })
          : say("load_spike_moved_total", { base, rawRatio: zahl(d.rawRatio, 2, locale) });
      }
      return base;
    }

    case "asymmetry": {
      const d = flag.detail;
      const history = d.history.map((v) => `${v.toFixed(0)}%`).join(" → ");
      if (!d.referenceDeclining) return say("asymmetry", { test: d.type, history });
      return say("asymmetry_declining", {
        test: d.type,
        history,
        reference: d.uninvolvedHistory.map((v) => v.toFixed(0)).join(" → "),
      });
    }

    case "baseline_drift": {
      const d = flag.detail;
      return say("baseline_drift", {
        // Aus der Konfiguration, nicht als feste 14. Die Zahl stand hier
        // fest verdrahtet, während die Regel `config.drift.windowDays` benutzt.
        // Heute sind beide 14, also war nichts falsch — das erste Profil, das
        // das Fenster verschiebt, hätte einen Satz bekommen, der über die
        // eigene Rechnung lügt. Dieselbe schlafende Sorte Fehler, wegen der
        // jede Auswertung ihre `config` mitspeichert.
        window: config.drift.windowDays,
        previous: d.previous,
        recent: d.recent,
        change: `${d.change > 0 ? "+" : ""}${d.change}`,
      });
    }

    case "pain_pattern": {
      const d = flag.detail;
      return say("pain_pattern", {
        previous: zahl(d.previous, 2, locale),
        recent: zahl(d.recent, 2, locale),
        change: `${d.change > 0 ? "+" : ""}${zahl(d.change, 2, locale)}`,
      });
    }

    case "stagnation": {
      const d = flag.detail;
      return say("stagnation", {
        window: config.stagnation.windowDays,
        start: d.startBaseline,
        current: d.currentBaseline,
        weeks: d.weeks,
      });
    }

    case "load_spread": {
      const d = flag.detail;
      if (d.trainingDays === 0) return say("load_spread_none");
      if (d.trainingDays === 1) return say("load_spread_single");
      // Der Streuungsindex wird nie als Zahl gezeigt. »Effektive Trainingstage«
      // ist eine Grösse, die man sich vorstellen kann; 1,31 auf einer Skala nicht.
      return say("load_spread", {
        effectiveDays: zahl(d.effectiveDays, 1, locale),
        sessions: d.trainingDays,
        share: Math.round(d.heaviestShare * 100),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Was sich an einer Eingabe nicht lesen liess
//
// ---------------------------------------------------------------------------
// `Problem.message` WAR IN SICH UNEINHEITLICH.
//
// Die Meldungen aus dem Import sind deutsch und an eine lesende Person
// gerichtet: »Zeile 4: »Radfahrn« ist unbekannt.« Die aus der Eingabeprüfung
// sind englische Entwicklerprosa: »morningScore must be between 0 and 10, got
// 14«. Beide stehen im selben Feld, und der Bericht hätte entscheiden müssen,
// welche er zeigt.
//
// Deshalb hier dasselbe wie bei den Urteilen: ein Satz je Code, in beiden
// Sprachen, unter denselben drei Sperrlisten. `message` bleibt, was es war —
// die technische Spur mit Zeilennummer und Rohwert, für Protokolle und
// Fehlersuche. Auf den Bildschirm kommt der Satz von hier.
//
// ---------------------------------------------------------------------------
// SIE BESCHREIBEN, WAS FEHLT — SIE FORDERN NICHTS.
//
// »Der Morgenwert liegt ausserhalb der Skala« und nicht »Trag einen Wert
// zwischen 0 und 10 ein«. Der Unterschied ist derselbe wie bei den Urteilen,
// und die drei Sperrlisten laufen auch über diese Sätze.
//
// Kein Satz nennt einen Feldnamen aus dem Code. `morningScore` ist für die
// lesende Person kein Wort.
// ---------------------------------------------------------------------------

export const PROBLEM_WORDING: Record<ProblemCode, Phrase> = {
  "invalid-date": {
    de: "Ein Datum liess sich nicht lesen.",
    en: "A date could not be read.",
  },
  "duplicate-date": {
    de: "Für denselben Tag liegen zwei Einträge vor. Ein Kalendertag ist eine Zeile.",
    en: "Two entries fall on the same day. One calendar day is one row.",
  },
  "morning-out-of-range": {
    de: "Der Morgenwert liegt ausserhalb der Skala von 0 bis 10.",
    en: "The morning score lies outside the scale of 0 to 10.",
  },
  "stiffness-out-of-range": {
    de: "Die Morgensteifigkeit liegt ausserhalb des erfassbaren Bereichs von 0 bis 1440 Minuten.",
    en: "The morning stiffness lies outside the recordable range of 0 to 1440 minutes.",
  },
  "rpe-out-of-range": {
    de: "Die Anstrengung einer Einheit liegt ausserhalb der Skala von 1 bis 10.",
    en: "The effort of a session lies outside the scale of 1 to 10.",
  },
  "duration-not-positive": {
    de: "Eine Einheit trägt keine Dauer über null. Ohne Dauer entsteht keine Last.",
    en: "A session carries no duration above zero. Without duration there is no load.",
  },
  "load-incomplete": {
    de: "Zu einer Einheit fehlt die Dauer oder die Anstrengung. Eine Last entsteht nur aus beidem.",
    en: "A session is missing its duration or its effort. Load comes from both together.",
  },
  "symptom-out-of-range": {
    de: "Der Beschwerdewert liegt ausserhalb der Skala von 0 bis 10.",
    en: "The symptom score lies outside the scale of 0 to 10.",
  },
  "symptom-timing-without-score": {
    de: "Zu einem Zeitpunkt fehlt der Beschwerdewert. Ein Zeitpunkt allein lässt sich nicht gewichten.",
    en: "A symptom timing has no symptom score with it. A timing alone carries no weight.",
  },
  "test-value-not-positive": {
    de: "Ein Selbsttest trägt einen Wert, aus dem sich kein Seitenverhältnis bilden lässt.",
    en: "A self-test carries a value from which no side ratio can be formed.",
  },

  "empty-file": {
    de: "Die Datei enthält keine Zeilen.",
    en: "The file contains no rows.",
  },
  "missing-column": {
    de: "In der Datei fehlt eine Spalte, ohne die sich die Zeilen nicht zuordnen lassen.",
    en: "The file is missing a column without which the rows cannot be assigned.",
  },
  "not-a-number": {
    de: "An dieser Stelle stand keine Zahl.",
    en: "There was no number in this place.",
  },
  "unknown-activity": {
    de: "Diese Aktivität ist keine der erfassbaren.",
    en: "This activity is not one of the recordable ones.",
  },
  "unknown-timing": {
    de: "Dieser Zeitpunkt ist keiner der erfassbaren: während, danach oder abends.",
    en: "This timing is not one of the recordable ones: during, after or evening.",
  },

  "measure-unit-conflict": {
    de: "Dasselbe Mass kam vorher in einer anderen Einheit. Zwei Einheiten für eine Grösse sind nicht vergleichbar.",
    en: "The same measure arrived earlier in a different unit. Two units for one quantity are not comparable.",
  },
  "measure-value-not-finite": {
    de: "Zu diesem Mass stand keine Zahl.",
    en: "There was no number for this measure.",
  },

  "unknown-test-type": {
    de: "Dieser Selbsttest ist keiner der bekannten.",
    en: "This self-test is not one of the known ones.",
  },
  "unknown-unit": {
    de: "Diese Einheit ist keine der bekannten. Ohne sie ist die Zahl nicht vergleichbar.",
    en: "This unit is not one of the known ones. Without it the number is not comparable.",
  },
  "test-side-missing": {
    de: "Zu diesem Selbsttest fehlt eine Seite. Eine allein lässt sich nicht vergleichen.",
    en: "This self-test is missing a side. One alone cannot be compared.",
  },
  "unit-mismatch": {
    de: "Dieser Selbsttest wird in einer anderen Einheit gemessen als der, die hier steht.",
    en: "This self-test is measured in a different unit from the one given here.",
  },

  "start-after-first-entry": {
    de: "Der angegebene Beginn der Episode liegt nach ihrem ersten Eintrag.",
    en: "The declared start of the episode falls after its own first entry.",
  },
};

/** Der Satz zu einem Eingabefund. Nie `Problem.message` — die ist die technische Spur. */
export function problemText(code: ProblemCode, locale: Locale = "de"): string {
  return PROBLEM_WORDING[code][locale];
}
