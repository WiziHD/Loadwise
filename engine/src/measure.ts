/**
 * What is being measured, in what unit, and against what number.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS ONE FILE AND NOT TWO.
 *
 * A user's own milestone ("fifteen heel raises") and a published clearance
 * criterion ("quadriceps at ninety per cent of the other side") are the same
 * SHAPE: a measure, a direction, a number, a unit. They differ entirely in
 * who authored them and whether the engine may act on them — not in how they
 * are expressed.
 *
 * Writing them as two types would mean two evaluators, and a second evaluator
 * is a second place for the regulatory boundary to slip. So the shape is
 * shared and the AUTHORSHIP is what the types keep apart.
 * ---------------------------------------------------------------------------
 */

import type { ActivityKind, DateStr, TestType } from "./types.js";

export type Unit = "reps" | "cm" | "deg" | "min" | "sec" | "score_0_10";

type Exhaustive<U extends string, T extends readonly U[]> =
  [Exclude<U, T[number]>] extends [never] ? T : never;

export const ALL_UNITS = ["reps", "cm", "deg", "min", "sec", "score_0_10"] as const;

const _unitsExhaustive: Exhaustive<Unit, typeof ALL_UNITS> = ALL_UNITS;
void _unitsExhaustive;

/**
 * The unit of each paired self-test.
 *
 * A property of the PROCEDURE, not of the reading — which is exactly why
 * `SelfTest` needs no unit field. Both sides of a paired test are necessarily
 * in the same unit, and that is the reason the symmetry index can be computed
 * without one at all. A unit on `SelfTest` would be a second source of truth
 * for a fact `type` already determines, and the two could disagree.
 *
 * Until now repetitions, centimetres and degrees shared one bare `number`.
 * Nothing was wrong with the arithmetic — a ratio does not care — but nothing
 * could be rendered or compared against a goal either. "Fifteen" is not a
 * quantity until it says fifteen of what.
 */
export const TEST_UNIT: Record<TestType, Unit> = {
  calf_raise: "reps",
  single_hop: "cm",
  rom: "deg",
};

/**
 * A single self-recorded number with no reference side.
 *
 * Deliberately NOT a fourth `TestType`. A squat count has no healthy side to
 * compare against, so forcing it into `SelfTest` would mean inventing an
 * `uninvolved` value — which validation requires to be positive, and which
 * would then feed the symmetry index a number nobody measured.
 *
 * It lives here rather than in types.ts so the dependency runs one way:
 * measure.ts knows about types.ts, never the reverse. types.ts is the root of
 * the type graph and importing back into it would invert that for no gain.
 *
 * This is what a user's own milestone is measured against — "fifteen squats"
 * is a Measurement, not a paired test.
 */
export interface Measurement {
  /** Named by the user. The engine groups by it and never branches on it. */
  key: MeasureKey;
  date: DateStr;
  value: number;
  /** Frozen at first sight: the same key may never arrive in two units. */
  unit: Unit;
  note?: string | null;
}

/**
 * A measure the user named themselves.
 *
 * A deliberate departure from this project's closed-union discipline, and the
 * reason it is safe: the engine does exactly two things with a key — group by
 * it, and compare numbers inside a group. It never BRANCHES on one. The closed
 * unions exist to stop dead branches; where there is no branch there is no
 * dead branch to hide.
 *
 * Closing this union would also mean the app shipping a list of what is worth
 * measuring, and a list of what is worth measuring is a clinical criterion.
 * That is precisely what a user-authored milestone must not contain.
 */
export type MeasureKey = string;

/** Where a number comes from. */
export type Measure =
  | { source: "self_test"; type: TestType; side: "involved" | "uninvolved" }
  | { source: "measurement"; key: MeasureKey }
  | { source: "morning_score" }
  | { source: "symptom_score" }
  | { source: "session_minutes"; activityKind?: ActivityKind };

/**
 * Which way is better.
 *
 * Repetitions go up and pain goes down. Without this, "at most 2 out of 10"
 * has to be written as a negative threshold, and that is how a nought-to-ten
 * scale ends up with a minus three in it.
 */
export type Direction = "at_least" | "at_most";

export interface Threshold {
  measure: Measure;
  direction: Direction;
  value: number;
  /** Declared alongside the value, and checked against the measure's own unit. */
  unit: Unit;
}

/** The unit a measure is necessarily in, where that is determined by its kind. */
export function unitOf(measure: Measure): Unit | null {
  switch (measure.source) {
    case "self_test":
      return TEST_UNIT[measure.type];
    case "morning_score":
    case "symptom_score":
      return "score_0_10";
    case "session_minutes":
      return "min";
    case "measurement":
      // Only the data can say. Frozen at first sight — see validate.ts.
      return null;
  }
}
