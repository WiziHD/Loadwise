import { describe, expect, it } from "vitest";
import { addDays } from "../src/dates.js";
import { buildIndex } from "../src/episode.js";
import { allRest, build, START, steadyRecovery, tooShort, weekendWarrior } from "../src/fixtures.js";
import { evaluateLoadSpike } from "../src/rules/loadSpike.js";
import { evaluateLoadSpread } from "../src/rules/loadSpread.js";
import { DEFAULT_CONFIG, type DateStr, type Entry } from "../src/types.js";

const cfg = DEFAULT_CONFIG;
const run = (entries: Entry[], date: DateStr) =>
  evaluateLoadSpread(buildIndex(entries), date, cfg);
const lastDate = (entries: Entry[]): DateStr => entries[entries.length - 1]!.date;

/** Seven days whose loads follow the given minutes, one entry each. */
const week = (minutes: number[]): Entry[] =>
  build(
    minutes.map((m) => (m > 0 ? { rpe: 5, durationMin: m, morningScore: 2 } : { morningScore: 2 })),
  );

describe("load spread rule", () => {
  it("waits until a whole week exists", () => {
    const entries = tooShort();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("history-too-short");
  });

  it("declines when too much of the week is missing", () => {
    const entries = week([30, 0, 30, 0, 30, 0, 30]).filter((_, i) => i === 0 || i > 4);
    const result = run(entries, addDays(START, 6));
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("history-too-sparse");
  });

  it("counts seven equal days as seven effective days", () => {
    const result = run(week([30, 30, 30, 30, 30, 30, 30]), addDays(START, 6));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.detail.effectiveDays).toBeCloseTo(7, 6);
      expect(result.detail.trainingDays).toBe(7);
      expect(result.severity).toBe("green");
      expect(result.reason).toBe("load-spread-even");
    }
  });

  it("counts one heavy day as one effective day", () => {
    const result = run(week([0, 0, 0, 0, 0, 120, 0]), addDays(START, 6));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.detail.effectiveDays).toBeCloseTo(1, 6);
      expect(result.detail.heaviestShare).toBeCloseTo(1, 6);
      expect(result.severity).toBe("amber");
      expect(result.reason).toBe("load-concentrated");
    }
  });

  it("is a distribution measure, not a look at the heaviest day", () => {
    // Both weeks have the same single heaviest share. Only a measure that
    // reads the whole week can tell them apart, which is the reason this rule
    // uses one.
    const twoDays = run(week([60, 60, 0, 0, 0, 0, 0]), addDays(START, 6));
    const fourDays = run(week([60, 60, 60, 60, 0, 0, 0]), addDays(START, 6));
    expect(twoDays.status).toBe("ok");
    expect(fourDays.status).toBe("ok");
    if (twoDays.status === "ok" && fourDays.status === "ok") {
      expect(twoDays.detail.effectiveDays).toBeCloseTo(2, 6);
      expect(fourDays.detail.effectiveDays).toBeCloseTo(4, 6);
      expect(twoDays.severity).toBe("green"); // exactly at the bar
      expect(fourDays.severity).toBe("green");
    }
  });

  it("catches the weekend warrior every other rule waves through", () => {
    // Two hours of court sport every Saturday and nothing else. Each week is
    // identical to the last, so the ratio rule sees a perfectly steady athlete.
    const entries = weekendWarrior();
    const last = lastDate(entries);
    const index = buildIndex(entries);

    const spike = evaluateLoadSpike(index, last, cfg);
    expect(spike.status).toBe("ok");
    if (spike.status === "ok") {
      expect(spike.severity).toBe("green");
      expect(spike.reason).toBe("steady");
    }

    const spread = run(entries, last);
    expect(spread.status).toBe("ok");
    if (spread.status === "ok") {
      expect(spread.severity).toBe("amber");
      expect(spread.reason).toBe("load-concentrated");
      expect(spread.detail.trainingDays).toBe(1);
    }
  });

  it("says so plainly when the week carried no load at all", () => {
    const entries = allRest();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.reason).toBe("no-load-recorded");
      expect(result.severity).toBe("green");
      expect(result.detail.trainingDays).toBe(0);
      expect(result.detail.effectiveDays).toBe(0);
    }
  });

  it("is unaffected by scaling the whole week", () => {
    // Shares are ratios, so doubling every session must change nothing.
    const a = run(week([20, 40, 0, 60, 0, 0, 30]), addDays(START, 6));
    const b = run(week([40, 80, 0, 120, 0, 0, 60]), addDays(START, 6));
    if (a.status === "ok" && b.status === "ok") {
      expect(b.detail.effectiveDays).toBeCloseTo(a.detail.effectiveDays, 10);
      expect(b.severity).toBe(a.severity);
    }
  });

  it("stays quiet on an ordinary well-spread week", () => {
    const entries = steadyRecovery(56);
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("green");
      expect(result.detail.effectiveDays).toBeGreaterThanOrEqual(cfg.spread.minEffectiveDays);
    }
  });
});
