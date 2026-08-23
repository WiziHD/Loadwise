/**
 * How the week's load sits across its days.
 *
 * Every other load rule in this engine sums. Whether a week's entire training
 * load fell on one Saturday or spread across four days is, to all of them,
 * exactly the same week — the audit reproduced this with a scenario doing two
 * hours of court sport every Saturday and nothing else, graded green across
 * the board because each week looked identical to the last.
 *
 * ---------------------------------------------------------------------------
 * THE MEASURE: effective training days, via the inverse Simpson index.
 *
 *     effectiveDays = 1 / sum(share_i^2)
 *
 * where share_i is day i's fraction of the week's load. Seven equal days give
 * 7.0. Four equal days give 4.0. Everything on one day gives 1.0.
 *
 * It is a real dispersion measure over the whole week rather than a look at
 * the single heaviest day — which is what was asked for. Its usual drawback is
 * that the number means nothing to a reader, and this product cannot afford an
 * unexplainable verdict. The answer is that the number is never shown: it
 * converts directly into a sentence, because "effective training days" is a
 * quantity a person can picture.
 *
 *     "Your week amounts to 1.3 effective training days, although you
 *      trained on 4 of them."
 * ---------------------------------------------------------------------------
 */

import { addDays, diffDays } from "../dates.js";
import { daysCovered, entriesBetween, loadAt, type EntryIndex } from "../episode.js";
import type { Config, DateStr, LoadSpreadDetail, RuleResult } from "../types.js";

export function evaluateLoadSpread(
  index: EntryIndex,
  forDate: DateStr,
  config: Config,
): RuleResult<LoadSpreadDetail> {
  const { windowDays, minEffectiveDays, minCoverage } = config.spread;
  const from = addDays(forDate, -(windowDays - 1));

  // The whole week has to exist before its shape means anything. Judging the
  // distribution of a week the diary only caught the tail of would call a
  // three-day-old record "concentrated" for no better reason than that it is
  // three days old.
  if (index.first === null || diffDays(index.first, from) < 0) {
    return { status: "insufficient", reason: "history-too-short" };
  }
  if (daysCovered(index, from, forDate) < Math.ceil(windowDays * minCoverage)) {
    return { status: "insufficient", reason: "history-too-sparse" };
  }

  const loads = entriesBetween(index, from, forDate)
    .map((e) => loadAt(index, e.date))
    .filter((l) => l > 0);

  const weeklyLoad = loads.reduce((sum, l) => sum + l, 0);

  if (weeklyLoad === 0) {
    return {
      status: "ok",
      severity: "green",
      reason: "no-load-recorded",
      detail: { effectiveDays: 0, trainingDays: 0, weeklyLoad: 0, heaviestShare: 0 },
    };
  }

  const shares = loads.map((l) => l / weeklyLoad);
  const effectiveDays = 1 / shares.reduce((sum, s) => sum + s * s, 0);
  const heaviestShare = Math.max(...shares);

  const detail: LoadSpreadDetail = {
    effectiveDays,
    trainingDays: loads.length,
    weeklyLoad,
    heaviestShare,
  };

  if (effectiveDays < minEffectiveDays) {
    return { status: "ok", severity: "amber", reason: "load-concentrated", detail };
  }
  return { status: "ok", severity: "green", reason: "load-spread-even", detail };
}
