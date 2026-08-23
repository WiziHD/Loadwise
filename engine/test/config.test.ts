import { describe, expect, it } from "vitest";
import { assertConfig, ConfigError } from "../src/config.js";
import { DEFAULT_CONFIG, type Config } from "../src/types.js";

const withChange = (patch: (c: Config) => void): Config => {
  const clone: Config = structuredClone(DEFAULT_CONFIG);
  patch(clone);
  return clone;
};

describe("configuration guard", () => {
  it("accepts the shipped defaults", () => {
    expect(() => assertConfig(DEFAULT_CONFIG)).not.toThrow();
  });

  it("rejects a coverage bar no episode could ever clear", () => {
    // Demanding more rules than exist would make every verdict "insufficient"
    // forever — the mirror image of the unreachable-branch bug: not a rule
    // that can never warn, but a summary that can never reassure.
    expect(() => assertConfig(withChange((c) => { c.coverage.minRulesReporting = 8; }))).toThrow(/cannot exceed/);
    expect(() => assertConfig(withChange((c) => { c.coverage.minRulesReporting = 0; }))).toThrow(/at least 1/);
  });

  it("rejects a coverage ratio outside zero to one", () => {
    expect(() => assertConfig(withChange((c) => { c.coverage.minResponseRatio = -0.1; }))).toThrow(/between 0 and 1/);
    expect(() => assertConfig(withChange((c) => { c.coverage.minResponseRatio = 1.2; }))).toThrow(/between 0 and 1/);
  });

  it("rejects thresholds that would make the red branch unreachable", () => {
    // The exact shape of the first real bug in this engine: a branch that can
    // never be taken, so the rule goes quiet instead of warning.
    const broken = withChange((c) => {
      c.response.greenMaxDelta = 5;
      c.response.redDeltaAlways = 4;
    });
    expect(() => assertConfig(broken)).toThrow(ConfigError);
    expect(() => assertConfig(broken)).toThrow(/unreachable/);
  });

  it("rejects a reference window that cannot exist", () => {
    const broken = withChange((c) => {
      c.spike.chronicDays = 7;
      c.spike.acuteDays = 7;
    });
    expect(() => assertConfig(broken)).toThrow(/must exceed/);
  });

  it("rejects spike thresholds that do not ascend", () => {
    const broken = withChange((c) => {
      c.spike.amberAbove = 2.0;
      c.spike.redAbove = 1.5;
    });
    expect(() => assertConfig(broken)).toThrow(/ascend/);
  });

  it("rejects a baseline that could never form", () => {
    const broken = withChange((c) => {
      c.baseline.windowDays = 7;
      c.baseline.minEntries = 10;
    });
    expect(() => assertConfig(broken)).toThrow(/cannot exceed/);
  });

  it("rejects an unreachable amber in the drift rule", () => {
    const broken = withChange((c) => {
      c.drift.amberRise = 3;
      c.drift.redRise = 2;
    });
    expect(() => assertConfig(broken)).toThrow(/unreachable/);
  });

  it("rejects asymmetry bands in the wrong order", () => {
    const broken = withChange((c) => {
      c.asymmetry.amberMinLsi = 95;
    });
    expect(() => assertConfig(broken)).toThrow(/below/);
  });

  it("rejects a coverage requirement outside zero to one", () => {
    expect(() => assertConfig(withChange((c) => { c.spike.minCoverage = 0; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.spike.minCoverage = 1.5; }))).toThrow();
  });

  it("rejects nonsensical window lengths", () => {
    expect(() => assertConfig(withChange((c) => { c.baseline.windowDays = 0; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.baseline.minEntries = 0; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.spike.acuteDays = 0; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.drift.windowDays = 0; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.pattern.windowDays = 0; }))).toThrow();
  });

  it("rejects a reference window that is not a whole number of acute windows", () => {
    const broken = withChange((c) => { c.spike.chronicDays = 30; });
    expect(() => assertConfig(broken)).toThrow(/whole number/);
  });

  it("rejects a settled band looser than the green band", () => {
    const broken = withChange((c) => { c.response.settledWithinDelta = 3; });
    expect(() => assertConfig(broken)).toThrow(/looser/);
  });

  it("rejects drift and pattern dials pointing the wrong way", () => {
    expect(() => assertConfig(withChange((c) => { c.drift.amberRise = 0; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.drift.minEntriesPerWindow = 99; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.pattern.worseningShift = -1; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.pattern.easingShift = 1; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.pattern.minReportsPerWindow = 0; }))).toThrow();
  });

  it("rejects an asymmetry window where no trend could ever be both long enough and fresh enough", () => {
    // If a trend must span 30 days but a test older than 10 is discarded, the
    // trend branch is unreachable — the same bug wearing new clothes.
    const broken = withChange((c) => {
      c.asymmetry.minSpanDays = 30;
      c.asymmetry.maxAgeDays = 10;
    });
    expect(() => assertConfig(broken)).toThrow(/at least/);
  });

  it("rejects nonsensical asymmetry ages and decline percentages", () => {
    expect(() => assertConfig(withChange((c) => { c.asymmetry.maxAgeDays = 0; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.asymmetry.minSpanDays = -1; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.asymmetry.referenceDeclinePct = 0; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.asymmetry.referenceDeclinePct = 100; }))).toThrow();
  });

  it("rejects stagnation dials that could never fire", () => {
    expect(() => assertConfig(withChange((c) => { c.stagnation.minWeeks = 0; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.stagnation.windowDays = 0; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.stagnation.minImprovement = 0; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.stagnation.notableLevel = -1; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.stagnation.minEntriesPerWindow = 99; }))).toThrow();
  });

  it("rejects a spread threshold that makes one of its verdicts unreachable", () => {
    // At or below 1 effective day, "concentrated" can never fire — a week
    // always has at least one. Above the window length, "even" can never fire.
    // Both are the unreachable-branch bug in a new costume.
    expect(() => assertConfig(withChange((c) => { c.spread.minEffectiveDays = 1; }))).toThrow(/unreachable/);
    expect(() => assertConfig(withChange((c) => { c.spread.minEffectiveDays = 9; }))).toThrow(/unreachable/);
  });

  it("rejects a spread window with no distribution to measure", () => {
    expect(() => assertConfig(withChange((c) => { c.spread.windowDays = 1; }))).toThrow(/at least 2/);
    expect(() => assertConfig(withChange((c) => { c.spread.minCoverage = 0; }))).toThrow();
    expect(() => assertConfig(withChange((c) => { c.spread.minCoverage = 2; }))).toThrow();
  });

  it("reports every problem at once, not just the first", () => {
    const broken = withChange((c) => {
      c.response.greenMaxDelta = 9;
      c.spike.minCoverage = 3;
      c.asymmetry.trendTestCount = 1;
    });
    try {
      assertConfig(broken);
      throw new Error("should have thrown");
    } catch (error) {
      const message = (error as Error).message;
      expect(message.split("\n  - ").length).toBeGreaterThanOrEqual(4);
    }
  });
});
