/**
 * Core types for the Loadwise rule engine.
 *
 * Design rule: a diary day is a plain calendar date string (YYYY-MM-DD),
 * never a timestamp. The date is determined on the user's device in their
 * local timezone and never derived from UTC. See TECHNIK.md, risk 3.
 */

/** Calendar date in the user's local timezone. Format: YYYY-MM-DD. */
export type DateStr = string;

/**
 * When symptoms were felt in relation to the session.
 * Ordered deliberately: closer to the load means worse. See rules/painPattern.
 */
export type SymptomTiming = "during" | "after" | "evening";

export type ActivityKind =
  | "run"
  | "walk"
  | "hike"
  | "cycle"
  | "swim"
  | "row"
  | "strength_lower"
  | "strength_upper"
  | "plyometric"
  | "court_sport"
  | "other";

export type BodyRegion =
  | "achilles"
  | "calf"
  | "patella"
  | "knee"
  | "hamstring"
  | "hip"
  | "foot"
  | "shoulder"
  | "elbow"
  | "back"
  | "other";

export type Side = "left" | "right" | "both" | "n/a";

/**
 * What the rules need to know about the episode they are judging.
 * Deliberately minimal — this is not episode management, only the context
 * a rule cannot do without. The body region drives the tissue factor.
 */
export interface EpisodeContext {
  bodyRegion: BodyRegion;
  side?: Side;
  /**
   * A named profile, when the region alone does not say which injury.
   *
   * Patellofemoral pain and a reconstructed cruciate ligament are both
   * `knee`. Without this the engine could only ever offer one of them.
   */
  profileKey?: string;
  startedOn?: DateStr;
  endedOn?: DateStr | null;
  /**
   * Tissue factors this injury sets differently from its region default.
   *
   * Filled from the active profile. Empty for every generic profile, which is
   * what keeps the profile mechanism a no-op until real knowledge arrives.
   */
  tissueOverride?: Partial<Record<ActivityKind, number>>;
}

/** Used when no context is supplied: every tissue factor falls back to 1.0. */
export const NEUTRAL_CONTEXT: EpisodeContext = { bodyRegion: "other" };

/** One diary day. Exactly one per episode per date. */
/**
 * Eine Trainingseinheit. Alle drei Angaben gehören zusammen oder gar nicht.
 *
 * ---------------------------------------------------------------------------
 * DIESER TYP MACHT EINEN GANZEN FEHLER UNMÖGLICH.
 *
 * Vorher standen `activityKind`, `durationMin` und `rpe` einzeln und nullbar
 * auf `Entry`. Damit war eine halbe Einheit darstellbar — Anstrengung ohne
 * Minuten —, und gegen diesen Zustand kämpften vier Stellen gleichzeitig an:
 * eine Prüfung im Motor, eine Bedingung in der Datenbank, eine im Formular und
 * ein Problemcode für den Import. Er hat trotzdem echten Schaden angerichtet.
 *
 * Als eigener Typ mit drei Pflichtfeldern kann es die halbe Einheit nicht mehr
 * geben. Was von aussen hereinkommt — eine CSV-Datei — kann sie weiterhin
 * enthalten, und genau dort wird sie gemeldet: beim Einlesen, nicht danach.
 * ---------------------------------------------------------------------------
 */
export interface Session {
  activityKind: ActivityKind;
  /** Minuten. Grösser als null, sonst ist es keine Einheit. */
  durationMin: number;
  /** Anstrengung der Einheit, 1–10. */
  rpe: number;
}

/**
 * Wie viel jemand an diesem Tag ausserhalb des Trainings auf den Beinen war.
 *
 * ---------------------------------------------------------------------------
 * AUFGEZEICHNET, ABER NOCH NICHT VERRECHNET — und das ist eine Entscheidung.
 *
 * Der Untertitel des Produkts ist »die anderen 167 Stunden«, und genau die
 * fehlten: Ein Ruhetag mit 18 000 Schritten auf Asphalt war für den Motor
 * dasselbe wie ein Tag im Bett.
 *
 * Verrechnen liesse sich das nur mit einem Umrechnungsfaktor — wie viel Last
 * ein »viel auf den Beinen«-Tag in denselben Einheiten trägt wie eine
 * Trainingseinheit. Diesen Faktor gibt es nicht belegt, und ihn zu schätzen ist
 * hier gefährlicher als anderswo: Er landet im Zähler UND im Nenner des
 * Belastungsverhältnisses. Ein zu grosser Wert zieht jedes Verhältnis gegen 1,
 * und die Lastspitzen-Regel wird still stumm. Ein zu kleiner ändert nichts.
 *
 * Deshalb dieselbe Bauform wie bei `Protocol` und der Bezahlschranke: erfasst,
 * typisiert, gespeichert, angezeigt — und von keiner Regel gelesen, bis der
 * Faktor belegt ist. Aufzeichnen kann man nachholen, Daten nicht.
 * ---------------------------------------------------------------------------
 */
export type EverydayLoad = "sitting" | "normal" | "on-feet" | "very-active";

export interface Entry {
  date: DateStr;
  /**
   * How the affected area felt on waking THIS morning (0 = nothing, 10 = worst).
   * Describes the reaction to the PREVIOUS day. This offset is what makes the
   * 24-hour rule a comparison between two neighbouring rows.
   */
  morningScore: number;
  /**
   * Jede Einheit dieses Tages. Leer heisst Ruhetag — Ruhetage zählen mit, sie
   * tragen die Basislinie.
   *
   * Eine Liste, weil ein Tag mehr als eine Einheit haben kann. Vorher ging nur
   * eine: Wer morgens läuft und abends Kraft macht, konnte nur eines eintragen,
   * und die Last des Tages wurde zu niedrig gerechnet — ausgerechnet an den
   * Tagen mit der höchsten.
   */
  sessions: Session[];
  /** Siehe EverydayLoad: erfasst, von keiner Regel gelesen. */
  everydayLoad?: EverydayLoad | null;
  /**
   * Wie lange die Steifigkeit am Morgen anhielt, in Minuten.
   *
   * -------------------------------------------------------------------------
   * DER STANDARDMARKER FÜR SEHNEN, DEN DIESER MOTOR BISHER NICHT KANNTE.
   *
   * Erfasst war nur die STÄRKE der Beschwerden am Morgen. Bei einer Sehne ist
   * die DAUER der Steifigkeit der klassische Verlaufsmarker: Sehnenschmerz
   * bessert sich beim Einlaufen, und wie lange die Steifigkeit anhält, bildet
   * den Reizzustand oft besser ab als eine Zahl auf einer Skala.
   *
   * Beleg: Der VISA-A, das Standardinstrument für die Achillessehne, stellt
   * genau das als ERSTE seiner acht Fragen — »For how many minutes do you have
   * stiffness in the Achilles region on first getting up?«, mit 0 Minuten als
   * bestem und 100 Minuten als schlechtestem Wert.
   * Robinson et al., Br J Sports Med 2001. Evidenzgrad A.
   *
   * GRENZE DER ÜBERTRAGBARKEIT: Das gilt für die Achillessehne. Der VISA-P für
   * die Patellasehne fragt an erster Stelle nach etwas anderem. Das Feld steht
   * allen Profilen offen, seine klinische Verankerung aber nicht.
   *
   * KEINE REGEL LIEST ES. Eine Regel bräuchte eine Schwelle — »ab wie vielen
   * Minuten Veränderung bedeutet das etwas« —, und genau dort steckt dasselbe
   * Problem, das dieses Projekt beim VISA-A schon dokumentiert hat: Der
   * kleinste messbare Unterschied liegt ÜBER dem kleinsten bedeutsamen. Eine
   * Schwelle zu erfinden hiesse, Genauigkeit zu behaupten, die die Messung
   * nicht hergibt.
   * -------------------------------------------------------------------------
   */
  morningStiffnessMin?: number | null;
  /**
   * Ob an diesem Tag ein Schmerzmittel genommen wurde.
   *
   * -------------------------------------------------------------------------
   * DER EINZIGE WERT HIER, DER EIN URTEIL VERÄNDERT — UND ZWAR NUR IN EINE
   * RICHTUNG.
   *
   * Wer ein entzündungshemmendes Schmerzmittel nimmt, hat einen chemisch
   * gesenkten Morgenwert. VIER der sieben Regeln lesen diesen Wert:
   * 24-Stunden-Reaktion, Basisdrift, Schmerzmuster, Stagnation. Der Motor kann
   * das nicht wissen und hat keine Möglichkeit, es zu bemerken — »Schmerz
   * sinkt« bei gleichzeitig steigender Medikation ist keine Besserung, und die
   * App sagte bisher das Gegenteil.
   *
   * Was daraus folgt, ist bewusst KEINE Deutung. »Deine Besserung könnte an den
   * Tabletten liegen« wäre eine klinische Aussage und damit auf der Linie, die
   * dieses Projekt sonst überall meidet.
   *
   * Stattdessen wirken Tage mit Medikation wie eine Abdeckungslücke: Der Motor
   * verweigert die ENTWARNUNG, statt sie zu erklären. Eine Warnung geht
   * weiterhin durch — Abdeckung begrenzt die Entwarnung, nie die Warnung.
   * -------------------------------------------------------------------------
   */
  painMedication?: boolean | null;
  /** Symptoms felt in connection with the session itself, 0-10. */
  symptomScore?: number | null;
  symptomTiming?: SymptomTiming | null;
  /** Free text. Deliberately never read by any rule. See TECHNIK.md, risk 4. */
  note?: string | null;
}

export type TestType = "calf_raise" | "single_hop" | "rom";

/** One paired self-test, both sides measured on the same day. */
export interface SelfTest {
  type: TestType;
  date: DateStr;
  /** Injured / affected side. */
  involved: number;
  /** Healthy side, used as the reference. */
  uninvolved: number;
}

export type Severity = "green" | "amber" | "red";

/**
 * Every verdict a rule can reach.
 *
 * A closed union rather than free strings, for two reasons: a typo becomes a
 * compile error, and translation coverage can be checked by the compiler.
 * `test/invariants.test.ts` additionally proves every code here is reachable —
 * an unreachable branch is how the first real bug in this engine hid.
 */
export type ReasonCode =
  // response24h
  | "settled-within-24h"
  | "elevated-but-settled"
  | "still-elevated-after-48h"
  | "large-reaction"
  // loadSpike
  | "steady"
  | "rising-fast"
  | "sharp-increase"
  | "detraining"
  | "no-load-recorded"
  | "return-from-zero"
  // asymmetry
  | "symmetric"
  | "mild-deficit"
  | "marked-deficit"
  | "widening-gap"
  | "reference-eroding"
  // baselineDrift
  | "baseline-stable"
  | "baseline-creeping"
  | "baseline-rising"
  // painPattern
  | "pattern-stable"
  | "pattern-easing"
  | "pattern-worsening"
  // stagnation — the long view over the whole episode
  | "progress-since-start"
  | "no-progress-since-start"
  | "worse-than-start"
  | "settled-near-zero"
  // loadSpread — how the week's load sits across its days
  | "load-spread-even"
  | "load-concentrated";

/**
 * Resolves to T when the array covers every member of the union, and to `never`
 * otherwise — which turns a forgotten entry into a compile error rather than a
 * silently weaker test.
 *
 * The previous declaration was `readonly ReasonCode[]`, which accepts any
 * SUBSET. A twenty-first code could have been added to the union and left out
 * of the array, and the reachability test — which walks exactly this array —
 * would simply never have looked for it.
 */
type Exhaustive<U extends string, T extends readonly U[]> =
  [Exclude<U, T[number]>] extends [never] ? T : never;

export const ALL_REASON_CODES = [
  "settled-within-24h",
  "elevated-but-settled",
  "still-elevated-after-48h",
  "large-reaction",
  "steady",
  "rising-fast",
  "sharp-increase",
  "detraining",
  "no-load-recorded",
  "return-from-zero",
  "symmetric",
  "mild-deficit",
  "marked-deficit",
  "widening-gap",
  "reference-eroding",
  "baseline-stable",
  "baseline-creeping",
  "baseline-rising",
  "pattern-stable",
  "pattern-easing",
  "pattern-worsening",
  "progress-since-start",
  "no-progress-since-start",
  "worse-than-start",
  "settled-near-zero",
  "load-spread-even",
  "load-concentrated",
] as const satisfies readonly ReasonCode[];

// Compile error if any ReasonCode is missing from the array above.
const _reasonCodesExhaustive: Exhaustive<ReasonCode, typeof ALL_REASON_CODES> = ALL_REASON_CODES;
void _reasonCodesExhaustive;

/**
 * Every activity a person can record, in the order a form should offer them.
 *
 * Exists because the union alone is not enumerable at runtime, and anything
 * that renders a list of activities would otherwise keep its own copy. A copy
 * drifts silently: add a twelfth kind here and the form keeps offering eleven,
 * with nothing to notice. Same discipline as ALL_REASON_CODES.
 *
 * Ordered by how commonly they appear, not alphabetically — "other" last
 * because it is the fallback, never the choice.
 */
export const ALL_ACTIVITY_KINDS = [
  "run",
  "walk",
  "hike",
  "cycle",
  "swim",
  "row",
  "strength_lower",
  "strength_upper",
  "plyometric",
  "court_sport",
  "other",
] as const satisfies readonly ActivityKind[];

export const ALL_EVERYDAY_LOADS = [
  "sitting",
  "normal",
  "on-feet",
  "very-active",
] as const satisfies readonly EverydayLoad[];

const _everydayExhaustive: Exhaustive<EverydayLoad, typeof ALL_EVERYDAY_LOADS> =
  ALL_EVERYDAY_LOADS;
void _everydayExhaustive;

// Compile error if any ActivityKind is missing from the array above.
const _activityKindsExhaustive: Exhaustive<ActivityKind, typeof ALL_ACTIVITY_KINDS> =
  ALL_ACTIVITY_KINDS;
void _activityKindsExhaustive;

/**
 * "Nothing to judge here, and that is entirely normal."
 *
 * A rest day carries no reaction to assess; a date with no entry is simply not
 * a diary day. These are internal control flow and are deliberately NOT
 * surfaced to the user — reporting them would bury the reasons that matter.
 */
export type BenignReason = "no-entry" | "rest-day";

/**
 * "I wanted to judge this and could not."
 *
 * Every one of these MUST reach the user. The difference between "your
 * reactions settle within 24 hours" and "I have never once been able to check"
 * is the difference this product lives or dies on.
 *
 * test/invariants.test.ts proves each of these actually surfaces in at least
 * one scenario's `pending` list.
 */
export type BlockingReason =
  | "baseline-unavailable"
  | "next-day-missing"
  | "second-day-missing"
  | "history-too-short"
  | "history-too-sparse"
  | "no-tests"
  | "tests-stale"
  | "too-few-symptom-reports"
  | "medication-in-window";

export type InsufficientReason = BenignReason | BlockingReason;

export const ALL_BENIGN_REASONS = ["no-entry", "rest-day"] as const satisfies readonly BenignReason[];

export const ALL_BLOCKING_REASONS = [
  "baseline-unavailable",
  "next-day-missing",
  "second-day-missing",
  "history-too-short",
  "history-too-sparse",
  "no-tests",
  "tests-stale",
  "too-few-symptom-reports",
  "medication-in-window",
] as const satisfies readonly BlockingReason[];

export const ALL_INSUFFICIENT_REASONS: readonly InsufficientReason[] = [
  ...ALL_BENIGN_REASONS,
  ...ALL_BLOCKING_REASONS,
];

// Compile errors if either union grows without its array following.
const _benignExhaustive: Exhaustive<BenignReason, typeof ALL_BENIGN_REASONS> = ALL_BENIGN_REASONS;
const _blockingExhaustive: Exhaustive<BlockingReason, typeof ALL_BLOCKING_REASONS> = ALL_BLOCKING_REASONS;
void _benignExhaustive;
void _blockingExhaustive;

const BENIGN_SET: ReadonlySet<string> = new Set(ALL_BENIGN_REASONS);

export function isBlocking(reason: InsufficientReason): reason is BlockingReason {
  return !BENIGN_SET.has(reason);
}

/**
 * Every rule returns either a verdict with its numbers, or an explicit
 * "not enough data". The engine never guesses and never fills gaps.
 */
export type RuleResult<D> =
  | { status: "ok"; severity: Severity; reason: ReasonCode; detail: D }
  | { status: "insufficient"; reason: InsufficientReason };

export interface Response24hDetail {
  load: number;
  baseline: number;
  nextMorning: number;
  delta: number;
  /** Morning score two days later, when it was needed and available. */
  followUpMorning: number | null;
}

export interface LoadSpikeDetail {
  /** Tissue-weighted. What this injury actually felt. */
  acute: number;
  chronic: number;
  ratio: number | null;
  /** Unweighted — what the person did, regardless of which tissue it loaded. */
  rawAcute: number;
  rawChronic: number;
  rawRatio: number | null;
  daysCovered: number;
}

export interface AsymmetryDetail {
  type: TestType;
  /**
   * Der Tag der NEUESTEN Messung, die in dieses Urteil eingegangen ist.
   *
   * Nicht der Tag der neuesten Messung dieses Typs überhaupt. Eine Messung
   * ohne brauchbaren Index — die gesunde Seite bei null, also kein Divisor —
   * wird von der Regel verworfen, und ein Flag darauf zu datieren würde auf
   * eine Zahl zeigen, die das Urteil nie gesehen hat.
   */
  measuredOn: DateStr;
  lsi: number;
  history: number[];
  /** Absolute values of the reference side, so a shrinking reference is visible. */
  uninvolvedHistory: number[];
  widening: boolean;
  /** The healthy side is itself losing ground — the ratio has stopped meaning much. */
  referenceDeclining: boolean;
}

export interface BaselineDriftDetail {
  recent: number;
  previous: number;
  change: number;
  /** Consecutive fortnights in which the baseline rose. */
  risingWindows: number;
}

export interface PainPatternDetail {
  /** Weighted mean of the ordinal timing, recent window. Higher is worse. */
  recent: number;
  previous: number;
  change: number;
  recentReports: number;
  previousReports: number;
}

export interface StagnationDetail {
  /** Median morning score over the first window of the episode. */
  startBaseline: number;
  /** Median over the most recent window. */
  currentBaseline: number;
  change: number;
  weeks: number;
}

export interface LoadSpreadDetail {
  /**
   * Inverse Simpson index over the week's daily loads: 1 / sum(share^2).
   * Seven equal days give 7.0; everything on one day gives 1.0. Never shown
   * as a number — see report.ts, which turns it into a sentence.
   */
  effectiveDays: number;
  /** Days that actually carried load. */
  trainingDays: number;
  weeklyLoad: number;
  /** Share of the week's load on its heaviest single day. */
  heaviestShare: number;
}

export type FlagKind =
  | "response_24h"
  | "load_spike"
  | "asymmetry"
  | "baseline_drift"
  | "pain_pattern"
  | "stagnation"
  | "load_spread";

export type FlagDetail =
  | Response24hDetail
  | LoadSpikeDetail
  | AsymmetryDetail
  | BaselineDriftDetail
  | PainPatternDetail
  | StagnationDetail
  | LoadSpreadDetail;

interface FlagBase {
  forDate: DateStr;
  severity: Severity;
  reason: ReasonCode;
  ruleVersion: string;
  /**
   * Which profile produced this.
   *
   * A verdict is only reproducible if BOTH halves are recorded: the rules that
   * ran and the values they ran on. Improving a profile must not silently
   * rewrite what somebody was told last month.
   */
  profileVersion: string;
}

/**
 * A stored, explainable result. Persisted so yesterday's warning stays
 * reproducible.
 *
 * `kind` and `detail` are bound to each other rather than declared side by
 * side. Before this, nothing stopped a rule from attaching the wrong detail
 * object to a flag, and every reader had to assert its way back to a usable
 * type — five casts in report.ts alone, each one a place where a mismatch
 * would have surfaced as nonsense on screen instead of as a compile error.
 */
export type Flag =
  | (FlagBase & { kind: "response_24h"; detail: Response24hDetail })
  | (FlagBase & { kind: "load_spike"; detail: LoadSpikeDetail })
  | (FlagBase & { kind: "asymmetry"; detail: AsymmetryDetail })
  | (FlagBase & { kind: "baseline_drift"; detail: BaselineDriftDetail })
  | (FlagBase & { kind: "pain_pattern"; detail: PainPatternDetail })
  | (FlagBase & { kind: "stagnation"; detail: StagnationDetail })
  | (FlagBase & { kind: "load_spread"; detail: LoadSpreadDetail });

/** The flag variant belonging to one rule. */
export type FlagOf<K extends FlagKind> = Extract<Flag, { kind: K }>;

/**
 * How much of the episode the engine was actually able to judge.
 *
 * Without this, a verdict of "green" is ambiguous between "I checked and all is
 * well" and "I checked nothing". Those must never look the same.
 */
export interface Coverage {
  /** Loaded days where a 24-hour verdict was both expected and possible. */
  judgedDays: number;
  /** Loaded days where a verdict was expected and could not be reached. */
  blockedDays: number;
  /** judgedDays / (judgedDays + blockedDays); 1 when nothing was expected. */
  responseRatio: number;
  /** Rules that produced at least one verdict. */
  rulesReporting: number;
  rulesTotal: number;
}

/**
 * A rule that wanted to speak and could not, with what it was waiting for.
 *
 * `kind` is typed, not a free string: Phase 1 has to turn each of these into a
 * sentence, and the compiler should catch a missing one.
 */
export interface Pending {
  kind: FlagKind;
  reason: BlockingReason;
  /** For the per-day rule: how many days this actually blocked. */
  affectedDays?: number;
  /** For the per-day rule: how many days a verdict was expected on. */
  expectedDays?: number;
}

/**
 * The single token an interface would put on screen.
 *
 * Deliberately shaped so a severity cannot be read without passing through
 * `status === "judged"`. The dangerous consumer pattern is `overall !== "red"`,
 * and this makes it impossible to write by accident.
 */
export type Overall =
  | { status: "judged"; severity: Severity }
  | { status: "insufficient"; blocking: BlockingReason[] }
  | { status: "no-data" };

export interface Config {
  /** How much must be judged before a verdict is allowed to stand at all. */
  coverage: {
    /** Share of expected 24-hour days that must have produced a verdict. */
    minResponseRatio: number;
    /** How many distinct rules must speak before an overall verdict counts. */
    minRulesReporting: number;
  };
  baseline: {
    windowDays: number;
    /** Minimum entries inside the window before a baseline is trusted. */
    minEntries: number;
  };
  response: {
    /** Delta at or below this counts as settled. */
    greenMaxDelta: number;
    /** Delta at or above this is red regardless of what happens next. */
    redDeltaAlways: number;
    /** Two days later, delta at or below this counts as back to normal. */
    settledWithinDelta: number;
  };
  spike: {
    acuteDays: number;
    chronicDays: number;
    redAbove: number;
    amberAbove: number;
    amberBelow: number;
    /** Fraction of days in the chronic window that must have entries. */
    minCoverage: number;
  };
  asymmetry: {
    greenMinLsi: number;
    amberMinLsi: number;
    /** How many consecutive tests are inspected for a widening trend. */
    trendTestCount: number;
    /** Beyond this age the newest test no longer describes the current body. */
    maxAgeDays: number;
    /** A trend must span at least this much real time to count as a trend. */
    minSpanDays: number;
    /** Decline of the reference side, in percent, that counts as eroding. */
    referenceDeclinePct: number;
  };
  drift: {
    /** Length of each comparison window, in days. */
    windowDays: number;
    /** Rise at or above this is amber. */
    amberRise: number;
    /** Rise at or above this is red. */
    redRise: number;
    minEntriesPerWindow: number;
  };
  pattern: {
    windowDays: number;
    /** Shift of the weighted timing mean that counts as worsening. */
    worseningShift: number;
    /** Shift in the other direction that counts as easing. */
    easingShift: number;
    minReportsPerWindow: number;
  };
  stagnation: {
    /** Nothing is said before an episode has run this long. */
    minWeeks: number;
    /** Length of the two windows being compared, in days. */
    windowDays: number;
    /** Drop in the baseline that counts as genuine progress. */
    minImprovement: number;
    /**
     * Below this the level is indistinguishable from having no complaints, and
     * there is nothing left to improve. NOT a clinical threshold — it only
     * separates "essentially nothing" from "something".
     */
    notableLevel: number;
    minEntriesPerWindow: number;
  };
  spread: {
    /** Days of the week examined. Matches spike.acuteDays. */
    windowDays: number;
    /** Below this many effective training days, the week counts as concentrated. */
    minEffectiveDays: number;
    minCoverage: number;
  };
}

export const RULE_VERSION = "2026-08-20.3";

/**
 * Thresholds live in one place so they can be tuned against real data
 * without touching the rules themselves. `npm run calibrate` reports which
 * of these are knife-edge and which are robust.
 */
export const DEFAULT_CONFIG: Config = {
  // Not clinical numbers — they answer "how much of the picture must be
  // visible before the engine is allowed to call it clear?". Two thirds of the
  // loaded days, and a majority of the rules.
  coverage: {
    minResponseRatio: 0.67,
    minRulesReporting: 3,
  },
  baseline: {
    windowDays: 14,
    minEntries: 10,
  },
  response: {
    greenMaxDelta: 1,
    redDeltaAlways: 4,
    settledWithinDelta: 1,
  },
  spike: {
    acuteDays: 7,
    chronicDays: 28,
    redAbove: 1.5,
    amberAbove: 1.3,
    amberBelow: 0.8,
    minCoverage: 0.7,
  },
  asymmetry: {
    greenMinLsi: 90,
    amberMinLsi: 80,
    trendTestCount: 3,
    maxAgeDays: 42,
    minSpanDays: 14,
    referenceDeclinePct: 10,
  },
  drift: {
    windowDays: 14,
    amberRise: 1,
    redRise: 2,
    minEntriesPerWindow: 8,
  },
  pattern: {
    windowDays: 21,
    worseningShift: 0.4,
    easingShift: -0.4,
    minReportsPerWindow: 4,
  },
  stagnation: {
    minWeeks: 6,
    windowDays: 14,
    minImprovement: 1,
    notableLevel: 2,
    minEntriesPerWindow: 8,
  },
  spread: {
    windowDays: 7,
    minEffectiveDays: 2,
    minCoverage: 0.7,
  },
};

/**
 * Welche Urteile eine Genesung beschreiben.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIESE LISTE IM MOTOR LIEGT UND NICHT IN DER OBERFLÄCHE.
 *
 * Ob »Der Ausgangswert liegt niedriger als zu Beginn« eine Genesungsaussage ist
 * oder bloss eine Beobachtung, ist eine Frage über die BEDEUTUNG eines
 * Urteilscodes — dieselbe Sorte Wissen wie der Satz selbst. Eine Liste in der
 * App wäre eine zweite Stelle, an der über Urteile entschieden wird, und sie
 * liefe beim nächsten neuen Code auseinander, ohne dass etwas rot wird.
 *
 * ---------------------------------------------------------------------------
 * SIE IST BEWUSST KURZ.
 *
 * Aufgenommen ist nur, was eine VERÄNDERUNG zum Besseren oder einen erreichten
 * Zustand beschreibt. Nicht aufgenommen sind die vielen unauffälligen Urteile —
 * `steady`, `baseline-stable`, `settled-within-24h`, `load-spread-even`. Die
 * sagen »nichts Besonderes«, und daraus eine Genesungsmeldung zu machen wäre
 * genau die Sorte Ermutigung, die E8 und die Sperrliste ACHIEVEMENT verbieten:
 * eine Behauptung über einen Verlauf, die aus einem einzelnen ruhigen Tag folgt.
 *
 * `symmetric` steht drin und ist heute unerreichbar: Es braucht Selbsttests,
 * und dafür gibt es keine Oberfläche. Das ist kein toter Code, sondern ein
 * bekanntes Loch mit einer Karte daran — und der Tag, an dem die Oberfläche
 * kommt, soll nicht der Tag sein, an dem jemand diese Liste erst sucht.
 * ---------------------------------------------------------------------------
 */
export const RECOVERY_REASONS = [
  /** Der Ausgangswert liegt niedriger als zu Beginn — die Geschichte in Zahlen. */
  "progress-since-start",
  /** Die Beschwerden treten später im Verhältnis zur Belastung auf. */
  "pattern-easing",
  /** Angekommen: die Beschwerden liegen auf sehr niedrigem Niveau. */
  "settled-near-zero",
  /** Braucht Selbsttests. Siehe oben. */
  "symmetric",
] as const satisfies readonly ReasonCode[];

/** Beschreibt dieses Urteil eine Genesung? */
export function isRecovery(reason: ReasonCode): boolean {
  return (RECOVERY_REASONS as readonly ReasonCode[]).includes(reason);
}
