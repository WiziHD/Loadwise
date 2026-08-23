/**
 * Guarding the thresholds against themselves.
 *
 * The first real bug in this engine was an unreachable branch: a condition
 * that could never be true, so the rule silently said nothing in exactly the
 * case it existed for. Nothing crashed, no test failed, the code just went
 * quiet.
 *
 * Badly ordered thresholds create that same class of bug. If greenMaxDelta
 * were ever raised above redDeltaAlways, the red branch would become dead and
 * severe reactions would pass as fine. These checks make that impossible.
 */

import type { Config } from "./types.js";

/** Rules that can contribute a verdict. Kept in step with RULE_KINDS in evaluate.ts. */
const RULE_COUNT = 7;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function assertConfig(config: Config): void {
  const problems: string[] = [];

  const { coverage, baseline, response, spike, asymmetry, drift, pattern, stagnation, spread } = config;

  if (coverage.minResponseRatio < 0 || coverage.minResponseRatio > 1) {
    problems.push("coverage.minResponseRatio must lie between 0 and 1");
  }
  if (coverage.minRulesReporting < 1) {
    problems.push("coverage.minRulesReporting must be at least 1");
  }
  if (coverage.minRulesReporting > RULE_COUNT) {
    problems.push(
      `coverage.minRulesReporting cannot exceed the number of rules (${RULE_COUNT}) — no episode could ever be judged`,
    );
  }

  if (baseline.windowDays < 1) problems.push("baseline.windowDays must be at least 1");
  if (baseline.minEntries < 1) problems.push("baseline.minEntries must be at least 1");
  if (baseline.minEntries > baseline.windowDays) {
    problems.push("baseline.minEntries cannot exceed baseline.windowDays — no baseline could ever form");
  }

  if (response.greenMaxDelta >= response.redDeltaAlways) {
    problems.push("response.greenMaxDelta must stay below response.redDeltaAlways — otherwise the red branch is unreachable");
  }
  if (response.settledWithinDelta > response.greenMaxDelta) {
    problems.push("response.settledWithinDelta must not exceed response.greenMaxDelta — 'settled' would be looser than 'never elevated'");
  }

  if (spike.acuteDays < 1) problems.push("spike.acuteDays must be at least 1");
  if (spike.chronicDays <= spike.acuteDays) {
    problems.push("spike.chronicDays must exceed spike.acuteDays — the reference window would be empty");
  }
  if ((spike.chronicDays - spike.acuteDays) % spike.acuteDays !== 0) {
    problems.push("spike.chronicDays minus spike.acuteDays must be a whole number of acute windows");
  }
  if (!(spike.amberBelow < spike.amberAbove && spike.amberAbove < spike.redAbove)) {
    problems.push("spike thresholds must ascend: amberBelow < amberAbove < redAbove");
  }
  if (spike.minCoverage <= 0 || spike.minCoverage > 1) {
    problems.push("spike.minCoverage must be greater than 0 and at most 1");
  }

  if (asymmetry.amberMinLsi >= asymmetry.greenMinLsi) {
    problems.push("asymmetry.amberMinLsi must stay below asymmetry.greenMinLsi");
  }
  if (asymmetry.trendTestCount < 2) {
    problems.push("asymmetry.trendTestCount must be at least 2 — a trend needs more than one point");
  }
  if (asymmetry.maxAgeDays < 1) problems.push("asymmetry.maxAgeDays must be at least 1");
  if (asymmetry.minSpanDays < 0) problems.push("asymmetry.minSpanDays cannot be negative");
  if (asymmetry.maxAgeDays < asymmetry.minSpanDays) {
    problems.push(
      "asymmetry.maxAgeDays must be at least asymmetry.minSpanDays — otherwise a trend long enough to count is always too old to use",
    );
  }
  if (asymmetry.referenceDeclinePct <= 0 || asymmetry.referenceDeclinePct >= 100) {
    problems.push("asymmetry.referenceDeclinePct must lie between 0 and 100");
  }

  if (drift.windowDays < 1) problems.push("drift.windowDays must be at least 1");
  if (drift.amberRise <= 0) problems.push("drift.amberRise must be positive");
  if (drift.redRise <= drift.amberRise) {
    problems.push("drift.redRise must exceed drift.amberRise — otherwise amber is unreachable");
  }
  if (drift.minEntriesPerWindow > drift.windowDays) {
    problems.push("drift.minEntriesPerWindow cannot exceed drift.windowDays");
  }

  if (pattern.windowDays < 1) problems.push("pattern.windowDays must be at least 1");
  if (pattern.worseningShift <= 0) problems.push("pattern.worseningShift must be positive");
  if (pattern.easingShift >= 0) problems.push("pattern.easingShift must be negative");
  if (pattern.minReportsPerWindow < 1) {
    problems.push("pattern.minReportsPerWindow must be at least 1");
  }

  if (stagnation.minWeeks < 1) problems.push("stagnation.minWeeks must be at least 1");
  if (stagnation.windowDays < 1) problems.push("stagnation.windowDays must be at least 1");
  if (stagnation.minImprovement <= 0) problems.push("stagnation.minImprovement must be positive");
  if (stagnation.notableLevel < 0) problems.push("stagnation.notableLevel cannot be negative");
  if (stagnation.minEntriesPerWindow > stagnation.windowDays) {
    problems.push("stagnation.minEntriesPerWindow cannot exceed stagnation.windowDays");
  }

  if (spread.windowDays < 2) {
    problems.push("spread.windowDays must be at least 2 — a single day has no distribution");
  }
  if (spread.minEffectiveDays <= 1 || spread.minEffectiveDays > spread.windowDays) {
    problems.push(
      "spread.minEffectiveDays must lie above 1 and at most spread.windowDays — outside that range one of its two verdicts is unreachable",
    );
  }
  if (spread.minCoverage <= 0 || spread.minCoverage > 1) {
    problems.push("spread.minCoverage must be greater than 0 and at most 1");
  }

  if (problems.length > 0) {
    throw new ConfigError(`Invalid rule configuration:\n  - ${problems.join("\n  - ")}`);
  }
}
