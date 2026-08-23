/**
 * The oracle: what each scenario must say, regardless of what it currently says.
 *
 * This is the test the engine was missing. The golden file records behaviour
 * and can be regenerated away; these assertions record MEANING and cannot.
 * If a threshold change ever makes "one week at triple volume" stop reading as
 * a sharp increase, the suite goes red here — even if the golden file was
 * updated in the same commit.
 *
 * The checking itself lives in `src/expectations.ts` rather than here, so that
 * `npm run mutate` asks the identical question. If the harness and the test
 * drifted apart, "the suite would have caught this" would become a guess.
 */

import { describe, expect, it } from "vitest";
import { EXPECTATIONS, violations } from "../src/expectations.js";
import { SCENARIOS } from "../src/fixtures.js";
import { DEFAULT_CONFIG, type Config } from "../src/types.js";

describe("every scenario has an oracle", () => {
  it("leaves no scenario without a stated meaning", () => {
    // A scenario nobody wrote an expectation for is a scenario nobody has
    // decided the meaning of — it can only ever confirm current behaviour.
    const orphans = SCENARIOS.filter((s) => EXPECTATIONS[s.key] === undefined).map((s) => s.key);
    expect(orphans, `Scenarios with no expectation: ${orphans.join(", ")}`).toEqual([]);
  });

  it("has no expectation pointing at a scenario that does not exist", () => {
    const known = new Set(SCENARIOS.map((s) => s.key));
    const dangling = Object.keys(EXPECTATIONS).filter((k) => !known.has(k));
    expect(dangling, `Expectations for missing scenarios: ${dangling.join(", ")}`).toEqual([]);
  });

  it("states something checkable about every scenario", () => {
    // An expectation with only an `about` line is a comment, not an oracle.
    const empty = Object.entries(EXPECTATIONS)
      .filter(
        ([, e]) =>
          !e.mustSay?.length &&
          !e.mustNotSay?.length &&
          !e.mustNotReassure &&
          !e.mustReassure &&
          !e.mustBeInsufficient,
      )
      .map(([k]) => k);
    expect(empty, `Expectations that assert nothing: ${empty.join(", ")}`).toEqual([]);
  });
});

describe("scenarios say what they mean", () => {
  it("violates no expectation under the shipped configuration", () => {
    const found = violations();
    expect(found, `\n  ${found.join("\n  ")}\n`).toEqual([]);
  });
});

describe("the oracle can actually fail", () => {
  // A checker that has only ever returned an empty list has not been shown to
  // work. Each case below breaks one dial in a direction whose consequence is
  // predictable, and asserts that the corresponding expectation notices.

  const broken = (patch: (c: Config) => void): string[] => {
    const config: Config = structuredClone(DEFAULT_CONFIG);
    patch(config);
    return violations(config);
  };

  it("notices when a rule stops saying what a scenario is about", () => {
    // Raise the sharp-increase bar above the tripled week's actual ratio.
    const found = broken((c) => {
      c.spike.redAbove = 9;
      c.spike.amberAbove = 8;
    });
    expect(found.some((v) => v.startsWith("overload:"))).toBe(true);
  });

  it("notices when a clean course stops being cleared", () => {
    // Demand that every one of the seven rules speaks. Nothing can clear then.
    const found = broken((c) => {
      c.coverage.minRulesReporting = 7;
    });
    expect(found.some((v) => v.includes("entwarnt nicht"))).toBe(true);
  });

  it("notices when a thin record stops naming what it is missing", () => {
    // Two levers have to move together here, and finding that out was the
    // point of writing this test.
    //
    // Dropping the evidence GATES alone changes nothing: a five-day diary
    // still cannot fill a 28-day comparison window, so the rules keep
    // declining for structural reasons rather than configured ones. Only when
    // the WINDOWS shrink as well do the rules start pronouncing on data that
    // cannot support them — and the engine stops saying what it is missing.
    //
    // The structural half of that is a genuinely good property: refusing to
    // judge a short record is not something a misconfiguration can switch off.
    const found = broken((c) => {
      c.baseline.windowDays = 2;
      c.baseline.minEntries = 1;
      c.spike.chronicDays = 4;
      c.spike.acuteDays = 2;
      c.spike.minCoverage = 0.01;
      c.drift.windowDays = 1;
      c.drift.minEntriesPerWindow = 1;
      c.pattern.windowDays = 1;
      c.pattern.minReportsPerWindow = 1;
      c.spread.windowDays = 2;
      c.spread.minCoverage = 0.01;
      c.stagnation.minWeeks = 1;
      c.stagnation.windowDays = 1;
      c.stagnation.minEntriesPerWindow = 1;
    });
    expect(found.length).toBeGreaterThan(0);
  });

  it("notices when a scenario starts giving an all-clear it should not", () => {
    // Put the level at which stagnation is worth mentioning out of reach, and
    // the plateau — eight out of ten, unchanged for ten weeks — comes back as
    // progress. That is the exact failure this engine exists to prevent.
    const found = broken((c) => {
      c.stagnation.notableLevel = 10;
    });
    expect(found.some((v) => v.startsWith("plateau:"))).toBe(true);
  });

  it("cannot silence the grinder by moving thresholds, and that is deliberate", () => {
    // Worth pinning down, because it looks like a gap in the oracle and is not.
    // Pushing both drift thresholds out of reach does NOT quieten the slow
    // decline: the "three rising fortnights in a row" branch fires regardless
    // of magnitude. The two mechanisms cover different shapes on purpose, and
    // the streak is the one that cannot be tuned away.
    const found = broken((c) => {
      c.drift.amberRise = 9;
      c.drift.redRise = 10;
    });
    expect(found.some((v) => v.startsWith("grinder:"))).toBe(false);
  });
});
