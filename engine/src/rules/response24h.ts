/**
 * The 24-hour rule.
 *
 * The established clinical heuristic in tendon rehabilitation: what matters is
 * not the pain during the session but whether things settle within 24 hours.
 *
 * Applies only to days that carried load. On a rest day there is nothing to
 * react to, so the rule returns "insufficient" rather than a green verdict —
 * a green light nobody earned is worse than no light at all.
 */

import { rollingBaseline } from "../baseline.js";
import { addDays } from "../dates.js";
import { entryAt, loadAt, type EntryIndex } from "../episode.js";
import type { Config, DateStr, Response24hDetail, RuleResult } from "../types.js";

export function evaluateResponse24h(
  index: EntryIndex,
  forDate: DateStr,
  config: Config,
): RuleResult<Response24hDetail> {
  const day = entryAt(index, forDate);
  if (!day) return { status: "insufficient", reason: "no-entry" };

  const load = loadAt(index, forDate);
  if (load === 0) return { status: "insufficient", reason: "rest-day" };

  const baseline = rollingBaseline(index, forDate, config);
  if (baseline === null) return { status: "insufficient", reason: "baseline-unavailable" };

  const next = entryAt(index, addDays(forDate, 1));
  if (!next) return { status: "insufficient", reason: "next-day-missing" };

  const delta = next.morningScore - baseline;
  const base = { load, baseline, nextMorning: next.morningScore, delta };

  if (delta <= config.response.greenMaxDelta) {
    return {
      status: "ok",
      severity: "green",
      reason: "settled-within-24h",
      detail: { ...base, followUpMorning: null },
    };
  }

  // A very large reaction stands on its own — no need to wait another day.
  if (delta >= config.response.redDeltaAlways) {
    const after = entryAt(index, addDays(forDate, 2));
    return {
      status: "ok",
      severity: "red",
      reason: "large-reaction",
      detail: { ...base, followUpMorning: after?.morningScore ?? null },
    };
  }

  // Mild reaction: the verdict depends on whether it is gone the day after.
  const after = entryAt(index, addDays(forDate, 2));
  if (!after) return { status: "insufficient", reason: "second-day-missing" };

  const settled = after.morningScore - baseline <= config.response.settledWithinDelta;

  return {
    status: "ok",
    severity: settled ? "amber" : "red",
    reason: settled ? "elevated-but-settled" : "still-elevated-after-48h",
    detail: { ...base, followUpMorning: after.morningScore },
  };
}
