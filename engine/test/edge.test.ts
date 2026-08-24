/**
 * The ugly inputs. Nothing here should crash, and nothing here should produce
 * a confident verdict out of nothing.
 */

import { describe, expect, it } from "vitest";
import { addDays, diffDays } from "../src/dates.js";
import { buildIndex, entriesBetween, loadAt } from "../src/episode.js";
import { evaluateEpisode } from "../src/evaluate.js";
import { build, START, steadyRecovery, session } from "../src/fixtures.js";
import { evaluateAsymmetry } from "../src/rules/asymmetry.js";
import { DEFAULT_CONFIG, type Entry, type SelfTest } from "../src/types.js";

describe("empty and tiny inputs", () => {
  it("survives an empty episode", () => {
    const result = evaluateEpisode({ entries: [] });
    expect(result.flags).toEqual([]);
    expect(result.overall.status).toBe("no-data");
    expect(result.problems).toEqual([]);
  });

  it("survives a single entry", () => {
    const result = evaluateEpisode({
      entries: [{ date: START, morningScore: 3, sessions: [session(5, 30)] }],
    });
    expect(result.flags).toEqual([]);
    expect(result.pending.length).toBeGreaterThan(0);
  });

  it("survives an episode with tests but no entries", () => {
    const tests: SelfTest[] = [
      { type: "calf_raise", date: START, involved: 18, uninvolved: 20 },
    ];
    const result = evaluateEpisode({ entries: [], tests });
    expect(result.flags.some((f) => f.kind === "asymmetry")).toBe(true);
    expect(() => evaluateEpisode({ entries: [], tests })).not.toThrow();
  });
});

describe("extreme values", () => {
  it("handles a diary that is nothing but zeros", () => {
    const entries = build(Array.from({ length: 60 }, () => ({ morningScore: 0 })));
    const result = evaluateEpisode({ entries });
    expect(result.overall.status).not.toBe("no-data");
    expect(result.flags.every((f) => f.severity !== "red")).toBe(true);
  });

  it("handles a diary that is nothing but tens", () => {
    // Constantly awful is not the same as getting worse. Drift must stay calm.
    const entries = build(Array.from({ length: 60 }, () => ({ morningScore: 10 })));
    const result = evaluateEpisode({ entries });
    const drift = result.flags.find((f) => f.kind === "baseline_drift");
    expect(drift?.severity).toBe("green");
  });

  it("handles the injured side outperforming the healthy one", () => {
    const tests: SelfTest[] = [
      { type: "calf_raise", date: START, involved: 26, uninvolved: 20 },
    ];
    const result = evaluateAsymmetry(tests, "calf_raise", DEFAULT_CONFIG);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.detail.lsi).toBe(130);
      expect(result.severity).toBe("green");
    }
  });
});

describe("gaps and boundaries", () => {
  it("handles a gap of a full year without inventing anything", () => {
    const before = steadyRecovery(28);
    const after = build(
      Array.from({ length: 28 }, () => ({ sessions: [session(5, 30)], morningScore: 3 })),
      addDays(START, 400),
    );
    const entries: Entry[] = [...before, ...after];
    expect(() => evaluateEpisode({ entries })).not.toThrow();

    const index = buildIndex(entries);
    expect(diffDays(index.first!, index.last!)).toBeGreaterThan(400);
  });

  it("spans a year boundary correctly", () => {
    const entries = build(
      Array.from({ length: 40 }, () => ({ sessions: [session(5, 30)], morningScore: 2 })),
      "2026-12-10",
    );
    const index = buildIndex(entries);
    expect(index.last).toBe("2027-01-18");
    expect(entriesBetween(index, "2026-12-30", "2027-01-02")).toHaveLength(4);
  });

  it("spans a leap day correctly", () => {
    const entries = build(
      Array.from({ length: 5 }, () => ({ morningScore: 2 })),
      "2028-02-27",
    );
    const index = buildIndex(entries);
    expect(index.entries.map((e) => e.date)).toContain("2028-02-29");
    expect(index.last).toBe("2028-03-02");
  });

  it("reports zero load for a date that was never recorded", () => {
    const index = buildIndex(steadyRecovery(28));
    expect(loadAt(index, "1999-01-01")).toBe(0);
  });
});

describe("bad input is reported, not swallowed", () => {
  it("surfaces problems alongside whatever verdicts were still possible", () => {
    const entries: Entry[] = [
      ...steadyRecovery(30),
      { date: "2026-02-30", morningScore: 3, sessions: [] },
    ];
    const result = evaluateEpisode({ entries });
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.problems[0]!.code).toBe("invalid-date");
  });

  it("still returns verdicts so the caller can decide what to do", () => {
    const entries: Entry[] = [
      ...steadyRecovery(40),
      { date: addDays(START, 41), morningScore: 99, sessions: [] },
    ];
    const result = evaluateEpisode({ entries });
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.flags.length).toBeGreaterThan(0);
  });
});
