/**
 * How much a given activity loads a given tissue.
 *
 * Session RPE alone treats sixty minutes of cycling like sixty minutes of
 * running. For an Achilles tendon those are worlds apart; for a shoulder the
 * comparison inverts. Load is therefore scaled by a factor that depends on
 * BOTH the activity and the injured region.
 *
 * ---------------------------------------------------------------------------
 * HONESTY NOTE, read before trusting any number below.
 *
 * These factors are informed estimates, not measured values. No published
 * matrix of this kind exists with enough authority to cite. They encode the
 * broad, uncontroversial shape of the thing — running loads the Achilles,
 * swimming does not; swimming loads the shoulder, running does not — and
 * nothing finer than that.
 *
 * They are therefore gathered in one place, never presented to a user as
 * science, and guarded by `test/tissue.test.ts` — which checks the ORDERINGS
 * that are not in dispute (running loads an Achilles, swimming does not)
 * rather than the values, so a transposed row fails loudly while the numbers
 * themselves stay free to move.
 *
 * NOT swept by the calibration run. An earlier version of this comment claimed
 * they were; `calibrate.ts` never imported this table. They become tunable
 * alongside the thresholds when the injury profiles arrive, because that is
 * where the evidence for them will come from — see PROTOKOLLE.md.
 * ---------------------------------------------------------------------------
 *
 * Reference point: running on an Achilles tendon is 1.0.
 */

import type { ActivityKind, BodyRegion } from "./types.js";

type ActivityFactors = Record<ActivityKind, number>;

/** Used for regions with no specific profile, and as the shape reference. */
const NEUTRAL: ActivityFactors = {
  run: 1.0,
  walk: 1.0,
  hike: 1.0,
  cycle: 1.0,
  swim: 1.0,
  row: 1.0,
  strength_lower: 1.0,
  strength_upper: 1.0,
  plyometric: 1.0,
  court_sport: 1.0,
  other: 1.0,
};

const ACHILLES: ActivityFactors = {
  run: 1.0,
  walk: 0.3,
  hike: 0.5,
  cycle: 0.2,
  swim: 0.1,
  row: 0.2,
  strength_lower: 0.8,
  strength_upper: 0.05,
  plyometric: 1.5,
  court_sport: 1.2,
  other: 0.5,
};

const PATELLA: ActivityFactors = {
  run: 0.9,
  walk: 0.3,
  hike: 0.7, // descending is the demanding part
  cycle: 0.5,
  swim: 0.1,
  row: 0.4,
  strength_lower: 1.0,
  strength_upper: 0.05,
  plyometric: 1.4,
  court_sport: 1.2,
  other: 0.5,
};

const HAMSTRING: ActivityFactors = {
  run: 1.0, // rises steeply with speed
  walk: 0.2,
  hike: 0.3,
  cycle: 0.3,
  swim: 0.2,
  row: 0.6,
  strength_lower: 0.9,
  strength_upper: 0.05,
  plyometric: 1.2,
  court_sport: 1.1,
  other: 0.5,
};

const HIP: ActivityFactors = {
  run: 0.8,
  walk: 0.4,
  hike: 0.6,
  cycle: 0.5,
  swim: 0.3,
  row: 0.5,
  strength_lower: 0.9,
  strength_upper: 0.05,
  plyometric: 1.0,
  court_sport: 1.0,
  other: 0.5,
};

const FOOT: ActivityFactors = {
  run: 1.0,
  walk: 0.5,
  hike: 0.7,
  cycle: 0.1,
  swim: 0.05,
  row: 0.1,
  strength_lower: 0.6,
  strength_upper: 0.05,
  plyometric: 1.4,
  court_sport: 1.2,
  other: 0.5,
};

const SHOULDER: ActivityFactors = {
  run: 0.1,
  walk: 0.05,
  hike: 0.1,
  cycle: 0.2,
  swim: 1.2,
  row: 1.0,
  strength_lower: 0.1,
  strength_upper: 1.0,
  plyometric: 0.3,
  court_sport: 0.8,
  other: 0.5,
};

const ELBOW: ActivityFactors = {
  run: 0.05,
  walk: 0.05,
  hike: 0.1,
  cycle: 0.2,
  swim: 0.6,
  row: 0.9,
  strength_lower: 0.1,
  strength_upper: 1.0,
  plyometric: 0.2,
  court_sport: 0.9,
  other: 0.5,
};

const BACK: ActivityFactors = {
  run: 0.5,
  walk: 0.3,
  hike: 0.6,
  cycle: 0.5,
  swim: 0.4,
  row: 0.9,
  strength_lower: 0.9,
  strength_upper: 0.7,
  plyometric: 0.8,
  court_sport: 0.7,
  other: 0.5,
};

const MATRIX: Record<BodyRegion, ActivityFactors> = {
  achilles: ACHILLES,
  calf: ACHILLES, // same mechanical chain
  patella: PATELLA,
  knee: PATELLA,
  hamstring: HAMSTRING,
  hip: HIP,
  foot: FOOT,
  shoulder: SHOULDER,
  elbow: ELBOW,
  back: BACK,
  other: NEUTRAL,
};

/**
 * Falls back to 1.0, never to 0. An activity we do not recognise must stay
 * visible in the load curve — silently discounting it to nothing would hide
 * exactly the sessions we know least about.
 */
export function tissueFactor(
  activity: ActivityKind | null | undefined,
  region: BodyRegion,
): number {
  if (!activity) return 1.0;
  const profile = MATRIX[region] ?? NEUTRAL;
  return profile[activity] ?? 1.0;
}

/** Exposed for the calibration run and for tests that check the table itself. */
export const TISSUE_MATRIX = MATRIX;
