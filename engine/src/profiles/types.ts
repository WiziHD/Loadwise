/**
 * What varies between injuries — as data, not as code.
 *
 * ---------------------------------------------------------------------------
 * THE ARCHITECTURE, AND WHY IT IS THIS SHAPE.
 *
 * The starting proposal was one engine per injury. Seventy codebases, each with
 * its own tests and calibration, and every bug found once fixed seventy times.
 * The agreed compromise is three layers:
 *
 *   Kernel      the seven rules, orchestration, coverage, validation.
 *               One codebase, identical for every injury.
 *
 *   Profile     THIS FILE. Which self-tests mean anything here, how each
 *               activity loads this tissue, which thresholds shift, what the
 *               red flags are, and what the profile does not know.
 *
 *   Extra rules an optional slot for an injury that genuinely needs its own
 *               logic — a hop-test battery that exists only after an ACL
 *               reconstruction, say. Expected to stay empty for most.
 *
 * A profile is a file of values. That is what makes "thousands of iterations"
 * possible at all: you iterate data, and a kernel fix lands everywhere at once.
 * ---------------------------------------------------------------------------
 */

import type {
  ActivityKind,
  BodyRegion,
  Config,
  TestType,
} from "../types.js";
import type { Unit } from "../measure.js";
import type { Phrase } from "../wording.js";

/**
 * Where a number came from.
 *
 * Extends the honesty note in tissue.ts into a rule: no tunable value without
 * a stated provenance. A profile made mostly of D is allowed — it just has to
 * say so, and the calibration then knows where to look first.
 */
export type EvidenceGrade =
  /** From a guideline or systematic review. */
  | "A"
  /** From individual studies, consistent with each other. */
  | "B"
  /** Professional consensus, no defensible number. */
  | "C"
  /** Reasoned estimate — like every tissue factor today. */
  | "D";

/**
 * Where one value came from, in enough detail to argue with later.
 *
 * A bare letter turned out not to be enough. Six months from now, "walk is
 * grade C" says nothing about whether the number may be moved, but "C, because
 * peak force per step would put it near 0.6 and only the per-minute impulse
 * reading gets it to 0.3" says exactly what would have to change first.
 *
 * PROTOKOLLE.md §5 asks the research step to record the source, the year and
 * whether the claim is contested. This carries all three into the shipped
 * artefact, because the research document and the code will drift apart and
 * only one of them is what actually runs.
 */
export interface Provenance {
  grade: EvidenceGrade;
  /** Source and year. Required above grade D — a graded claim needs a citation. */
  source?: string;
  /** True when sources of equal rank disagree. Never smoothed over. */
  contested?: boolean;
}

/**
 * The time course reported for this injury — as data, never as a forecast.
 *
 * It exists to make one decision auditable. `stagnation.minWeeks` says how long
 * an episode must run before the engine may observe that nothing has changed,
 * and picking that number by feel is exactly the circularity this project keeps
 * finding. Against a reported horizon it becomes checkable: the rule has to be
 * able to speak WELL BEFORE the injury is expected to resolve, or it only ever
 * confirms what the person already knows.
 *
 * `test/profiles.test.ts` enforces that. It is the reason this is a field and
 * not a paragraph in a markdown file.
 *
 * NOT rendered anywhere. Showing a person "studies report 12 to 52 weeks" is a
 * wording and regulatory decision that has not been taken.
 */
export interface Horizon {
  /** Reported range in weeks. A range, never a mean — PROTOKOLLE.md §5. */
  typicalWeeks: [number, number];
  /** Share still symptomatic at long-term follow-up, with the follow-up length. */
  persistent?: { share: number; afterYears: number };
  note: Phrase;
}

/**
 * How far two measurements of the same test differ by chance.
 *
 * Without one the engine cannot tell a real change from repeat-measurement
 * variation, and must therefore say so rather than call a difference an
 * improvement. Today no test carries one at a usable grade — see the
 * ChangeClaim gate in progress.ts.
 *
 * The gate refuses grade C and D outright. A guessed noise floor is worse than
 * an absent one, because it manufactures the very precision this project keeps
 * declining to invent.
 */
export interface MeasurementError {
  mdc: number;
  unit: Unit;
  provenance: Provenance;
}

/**
 * A situation no diary handles.
 *
 * My own addition to the programme, and not optional. A tool that names its own
 * limits is taken more seriously about everything else — and some of these are
 * the difference between a sore calf and a clot.
 *
 * Phrased descriptively, like every other sentence in this engine: "calf pain
 * with swelling and warmth is not a case for a diary", never "go and see
 * someone". The referral is implied and the imperative check in
 * test/wording.test.ts stays satisfied.
 */
export interface RedFlag {
  key: string;
  text: Phrase;
}

/** Threshold overrides, one level deep — the exact shape of Config. */
export type ConfigOverride = {
  [K in keyof Config]?: Partial<Config[K]>;
};

/**
 * The prescriptive layer: phases, clearance criteria, load prescriptions.
 *
 * DESIGNED AND SWITCHED OFF. TECHNIK.md 2.2 and the regulatory finding in
 * PROTOKOLLE.md set out why — software whose intended purpose is clinical
 * guidance becomes a regulated medical device, the Swiss MepV is deliberately
 * aligned with the EU MDR, and Switzerland is a third country on top of that.
 *
 * Same construction as the paywall: built, versioned, tested, and inert until
 * somebody qualified has looked at the intended purpose.
 */
/**
 * One published criterion for leaving a phase.
 *
 * Deliberately the SAME shape a user's own milestone uses — a measure, a
 * direction, a number, a unit. Two shapes would mean two evaluators, and a
 * second evaluator is a second place for the boundary to slip when this layer
 * is eventually switched on.
 *
 * The last variant is the honest one and it is not optional. "Effusion no more
 * than a trace", "full range of motion", "no pain on single-leg hopping" are
 * real, published, load-bearing criteria that NO DIARY CAN CHECK. Leaving them
 * out would make the catalogue look more complete than it is, and a catalogue
 * that hides what it cannot see is worse than none.
 */
export type Criterion =
  | { kind: "test-lsi"; test: TestType; minPercent: number; provenance: Provenance }
  | {
      kind: "test-value";
      test: TestType;
      min?: number;
      max?: number;
      unit: Unit;
      provenance: Provenance;
    }
  | { kind: "time-since-start"; minWeeks: number; provenance: Provenance }
  | { kind: "observation"; statement: Phrase; provenance: Provenance };

export interface ProtocolPhase {
  key: string;
  order: number;
  label: Phrase;
  exitCriteria: Criterion[];
  /** That this phase exists, in this position, under this name. */
  provenance: Provenance;
}

export interface Protocol {
  /** Never true in shipped code. Guarded by test/profiles.test.ts. */
  enabled: false;
  phases: ProtocolPhase[];
  /** Which guideline, which year, whether contested. */
  provenance: Provenance;
}

export type ProfileKey = string;

export interface Profile {
  key: ProfileKey;
  /** Bumped whenever a value in here changes. Stamped on every flag. */
  version: string;
  label: Phrase;
  bodyRegion: BodyRegion;

  /**
   * Self-tests that mean something for THIS injury.
   *
   * The reason the whole programme exists: a calf raise says everything about
   * an Achilles tendon and nothing about a tennis elbow, and until now the
   * engine ran all three test types against every injury alike.
   */
  tests: TestType[];

  /** Thresholds that differ from the shipped defaults. */
  config?: ConfigOverride;

  /** Tissue factors that differ from the region defaults. */
  tissue?: Partial<Record<ActivityKind, number>>;

  /** Situations that belong with a person, not a diary. */
  redFlags: RedFlag[];

  /** Mandatory. What this profile cannot tell you. */
  limitations: Phrase;

  /** What the literature reports about the time course. See Horizon. */
  horizon?: Horizon;

  /** Repeat-measurement variation, per test. See MeasurementError. */
  measurementError?: Partial<Record<TestType, MeasurementError>>;

  /** Provenance for every value above that could have been otherwise. */
  evidence: Record<string, Provenance>;

  /** Built, off. See Protocol. */
  protocol?: Protocol;
}

/**
 * A published criterion is structurally incapable of becoming a user's goal.
 *
 * Not a convention and not a test — a type-level fact, in the same idiom
 * `types.ts` uses for its exhaustiveness guards. `Criterion` has no `id`, no
 * `createdOn`, no `origin: "user"`, and its prose is a `Phrase` where a
 * milestone's label is a plain `string`. Four separate deliberate acts would
 * be needed to convert one into the other, and every one of them is greppable.
 *
 * If this line ever fails to compile, somebody has made the two assignable and
 * the wall between "what the app knows" and "what the user wants" is gone.
 */
type _CriterionIsNotAMilestone = Criterion extends { origin: "user" } ? never : true;
const _criterionIsNotAMilestone: _CriterionIsNotAMilestone = true;
void _criterionIsNotAMilestone;
