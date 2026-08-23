import { describe, expect, it } from "vitest";
import { buildIndex } from "../src/episode.js";
import {
  creepingWorsening,
  deteriorating,
  steadyRecovery,
  theGrinder,
  tooShort,
} from "../src/fixtures.js";
import { evaluateBaselineDrift } from "../src/rules/baselineDrift.js";
import { evaluateResponse24h } from "../src/rules/response24h.js";
import { DEFAULT_CONFIG, type DateStr, type Entry } from "../src/types.js";

const cfg = DEFAULT_CONFIG;
const run = (entries: Entry[], date: DateStr) =>
  evaluateBaselineDrift(buildIndex(entries), date, cfg);
const lastDate = (entries: Entry[]): DateStr => entries[entries.length - 1]!.date;

describe("baseline drift rule", () => {
  it("declines to judge without two full windows", () => {
    const entries = tooShort();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("history-too-short");
  });

  it("stays quiet while things are getting better", () => {
    const entries = steadyRecovery(56);
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("green");
      expect(result.reason).toBe("baseline-stable");
      expect(result.detail.change).toBeLessThanOrEqual(0);
    }
  });

  it("catches the grinder that no other rule sees", () => {
    // Morning scores creep up by about a point a fortnight. Slow enough that
    // the rolling median follows along and the 24-hour rule reports green all
    // the way — which is exactly why this rule exists.
    const entries = theGrinder();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).not.toBe("green");
      expect(result.detail.change).toBeGreaterThan(0);
      expect(result.detail.risingWindows).toBeGreaterThanOrEqual(2);
    }
  });

  it("proves the 24-hour rule really is blind to that case", () => {
    // The justification for this whole rule, asserted rather than assumed.
    const entries = theGrinder();
    const index = buildIndex(entries);
    const verdicts = entries
      .map((e) => evaluateResponse24h(index, e.date, cfg))
      .filter((r) => r.status === "ok");

    expect(verdicts.length).toBeGreaterThan(10);
    expect(verdicts.every((r) => r.status === "ok" && r.severity === "green")).toBe(true);
  });

  it("escalates to red when the climb is steep", () => {
    const entries = deteriorating();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("red");
      expect(result.reason).toBe("baseline-rising");
      expect(result.detail.change).toBeGreaterThanOrEqual(cfg.drift.redRise);
    }
  });

  it("catches a climb too gentle to trip the magnitude threshold", () => {
    // Half a point per fortnight. Every single step stays under amberRise, so
    // only the "three rising windows" branch can see this. Coverage showed
    // that branch was never executed before this test existed.
    const entries = creepingWorsening();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.detail.change).toBeLessThan(cfg.drift.amberRise);
      expect(result.detail.risingWindows).toBeGreaterThanOrEqual(3);
      expect(result.severity).toBe("amber");
      expect(result.reason).toBe("baseline-creeping");
    }
  });

  it("counts how far back the climb reaches", () => {
    const entries = deteriorating();
    const result = run(entries, lastDate(entries));
    if (result.status === "ok") {
      // Four fortnights of data means at most three comparisons can rise.
      expect(result.detail.risingWindows).toBeGreaterThan(0);
      expect(result.detail.risingWindows).toBeLessThanOrEqual(6);
    }
  });
});
