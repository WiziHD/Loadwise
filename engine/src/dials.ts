/**
 * Every tunable threshold in the engine, in one list.
 *
 * Shared by two tools that ask opposite questions of the same dials:
 *
 *   calibrate.ts  — how far can this move before any verdict changes?
 *                   (a dial nothing depends on is untested, not robust)
 *
 *   mutate.ts     — if I break this on purpose, does the suite notice?
 *                   (a mutation that survives means the tests do not
 *                    actually constrain that number)
 *
 * Keeping one list means a new threshold cannot be added to the engine and
 * quietly escape both checks.
 */

import type { Config } from "./types.js";

export interface Dial {
  key: string;
  get: (c: Config) => number;
  set: (c: Config, v: number) => void;
  values: number[];
  unit?: string;
}

const range = (from: number, to: number, step: number): number[] => {
  const out: number[] = [];
  // Rounded to avoid floating point dust in the printed labels.
  for (let v = from; v <= to + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
};

export const DIALS: Dial[] = [
  {
    key: "baseline.windowDays",
    get: (c) => c.baseline.windowDays,
    set: (c, v) => { c.baseline.windowDays = v; c.baseline.minEntries = Math.min(c.baseline.minEntries, v); },
    values: range(7, 28, 7),
    unit: "Tage",
  },
  {
    key: "response.greenMaxDelta",
    get: (c) => c.response.greenMaxDelta,
    set: (c, v) => { c.response.greenMaxDelta = v; c.response.settledWithinDelta = Math.min(c.response.settledWithinDelta, v); },
    values: range(0, 3, 1),
  },
  {
    key: "response.redDeltaAlways",
    get: (c) => c.response.redDeltaAlways,
    set: (c, v) => { c.response.redDeltaAlways = v; },
    values: range(2, 7, 1),
  },
  {
    key: "spike.redAbove",
    get: (c) => c.spike.redAbove,
    set: (c, v) => { c.spike.redAbove = v; },
    values: range(1.35, 2.2, 0.05),
  },
  {
    key: "spike.amberAbove",
    get: (c) => c.spike.amberAbove,
    set: (c, v) => { c.spike.amberAbove = v; },
    values: range(1.05, 1.45, 0.05),
  },
  {
    key: "spike.amberBelow",
    get: (c) => c.spike.amberBelow,
    set: (c, v) => { c.spike.amberBelow = v; },
    values: range(0.5, 1.0, 0.05),
  },
  {
    key: "spike.minCoverage",
    get: (c) => c.spike.minCoverage,
    set: (c, v) => { c.spike.minCoverage = v; },
    values: range(0.4, 1.0, 0.05),
  },
  {
    key: "asymmetry.greenMinLsi",
    get: (c) => c.asymmetry.greenMinLsi,
    set: (c, v) => { c.asymmetry.greenMinLsi = v; },
    values: range(84, 96, 2),
    unit: "%",
  },
  {
    key: "asymmetry.amberMinLsi",
    get: (c) => c.asymmetry.amberMinLsi,
    set: (c, v) => { c.asymmetry.amberMinLsi = v; },
    values: range(70, 88, 2),
    unit: "%",
  },
  {
    key: "drift.amberRise",
    get: (c) => c.drift.amberRise,
    set: (c, v) => { c.drift.amberRise = v; },
    values: range(0.5, 2.0, 0.25),
  },
  {
    key: "drift.redRise",
    get: (c) => c.drift.redRise,
    set: (c, v) => { c.drift.redRise = v; },
    values: range(1.5, 4.0, 0.5),
  },
  {
    key: "pattern.worseningShift",
    get: (c) => c.pattern.worseningShift,
    set: (c, v) => { c.pattern.worseningShift = v; },
    values: range(0.1, 1.2, 0.1),
  },
  {
    key: "stagnation.minImprovement",
    get: (c) => c.stagnation.minImprovement,
    set: (c, v) => { c.stagnation.minImprovement = v; },
    values: range(0.5, 3, 0.5),
  },
  {
    key: "stagnation.notableLevel",
    get: (c) => c.stagnation.notableLevel,
    set: (c, v) => { c.stagnation.notableLevel = v; },
    values: range(0, 6, 1),
  },
  {
    key: "stagnation.minWeeks",
    get: (c) => c.stagnation.minWeeks,
    set: (c, v) => { c.stagnation.minWeeks = v; },
    values: range(3, 12, 1),
    unit: " Wo",
  },
  {
    key: "spread.minEffectiveDays",
    get: (c) => c.spread.minEffectiveDays,
    set: (c, v) => { c.spread.minEffectiveDays = v; },
    values: range(1.2, 4, 0.2),
  },
  // ---- Evidence gates: the dials that decide whether a rule speaks at all.
  // Silence is this project's signature failure, so these matter at least as
  // much as the verdict thresholds — and none of them was swept before.
  {
    key: "coverage.minResponseRatio",
    get: (c) => c.coverage.minResponseRatio,
    set: (c, v) => { c.coverage.minResponseRatio = v; },
    values: range(0.3, 1, 0.05),
  },
  {
    key: "coverage.minRulesReporting",
    get: (c) => c.coverage.minRulesReporting,
    set: (c, v) => { c.coverage.minRulesReporting = v; },
    values: range(1, 7, 1),
  },
  {
    key: "baseline.minEntries",
    get: (c) => c.baseline.minEntries,
    set: (c, v) => { c.baseline.minEntries = v; },
    values: range(4, 14, 1),
  },
  {
    key: "drift.minEntriesPerWindow",
    get: (c) => c.drift.minEntriesPerWindow,
    set: (c, v) => { c.drift.minEntriesPerWindow = v; },
    values: range(4, 14, 1),
  },
  {
    key: "pattern.minReportsPerWindow",
    get: (c) => c.pattern.minReportsPerWindow,
    set: (c, v) => { c.pattern.minReportsPerWindow = v; },
    values: range(2, 14, 1),
  },
  {
    key: "asymmetry.maxAgeDays",
    get: (c) => c.asymmetry.maxAgeDays,
    set: (c, v) => { c.asymmetry.maxAgeDays = v; },
    values: range(14, 90, 7),
    unit: "Tage",
  },
  {
    key: "asymmetry.minSpanDays",
    get: (c) => c.asymmetry.minSpanDays,
    set: (c, v) => { c.asymmetry.minSpanDays = v; },
    values: range(0, 35, 7),
    unit: "Tage",
  },
  {
    key: "asymmetry.referenceDeclinePct",
    get: (c) => c.asymmetry.referenceDeclinePct,
    set: (c, v) => { c.asymmetry.referenceDeclinePct = v; },
    values: range(4, 30, 2),
    unit: "%",
  },
  {
    key: "asymmetry.trendTestCount",
    get: (c) => c.asymmetry.trendTestCount,
    set: (c, v) => { c.asymmetry.trendTestCount = v; },
    values: range(2, 6, 1),
  },
];

export const DIALS_COUNT = DIALS.length;
