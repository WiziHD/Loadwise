/**
 * Turning very different activities into one comparable number.
 *
 *   load = RPE x minutes x tissueFactor(activity, injured region)
 *
 * Session RPE is established in sport science and deliberately crude: it
 * ignores how a movement actually stresses tissue. The tissue factor repairs
 * the worst of that — sixty minutes of cycling no longer counts the same as
 * sixty minutes of running for an Achilles tendon.
 *
 * It stays an approximation. We only ever read the SHAPE of the curve over
 * time, never the absolute value. See TECHNIK.md, section 4.1.
 */

import { tissueFactor } from "./tissue.js";
import { NEUTRAL_CONTEXT, type Entry, type EpisodeContext } from "./types.js";

export function loadOf(entry: Entry, context: EpisodeContext = NEUTRAL_CONTEXT): number {
  const rpe = entry.rpe ?? 0;
  const minutes = entry.durationMin ?? 0;
  if (rpe <= 0 || minutes <= 0) return 0;

  // A profile may know better than the region default — an insertional Achilles
  // problem tolerates flat running very differently from a mid-portion one.
  // Where it says nothing, the shared matrix stands.
  const override = entry.activityKind ? context.tissueOverride?.[entry.activityKind] : undefined;
  const factor = override ?? tissueFactor(entry.activityKind, context.bodyRegion);

  return rpe * minutes * factor;
}

export function isRestDay(entry: Entry, context: EpisodeContext = NEUTRAL_CONTEXT): boolean {
  return loadOf(entry, context) === 0;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
