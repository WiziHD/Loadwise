import { describe, expect, it } from "vitest";
import { isRestDay, loadOf, mean, median } from "../src/load.js";
import { tissueFactor, TISSUE_MATRIX } from "../src/tissue.js";
import type { ActivityKind, BodyRegion, Entry, EpisodeContext } from "../src/types.js";

const day = (over: Partial<Entry>): Entry => ({
  date: "2026-03-02",
  morningScore: 2,
  ...over,
});

const achilles: EpisodeContext = { bodyRegion: "achilles" };
const shoulder: EpisodeContext = { bodyRegion: "shoulder" };

describe("session load", () => {
  it("multiplies effort by duration", () => {
    expect(loadOf(day({ rpe: 6, durationMin: 40 }))).toBe(240);
    expect(loadOf(day({ rpe: 8, durationMin: 50 }))).toBe(400);
  });

  it("treats a missing half as no load", () => {
    expect(loadOf(day({ rpe: 6 }))).toBe(0);
    expect(loadOf(day({ durationMin: 40 }))).toBe(0);
    expect(loadOf(day({}))).toBe(0);
  });

  it("recognises rest days", () => {
    expect(isRestDay(day({}))).toBe(true);
    expect(isRestDay(day({ rpe: 5, durationMin: 30 }))).toBe(false);
  });

  it("weights the same session differently per injured tissue", () => {
    const session = day({ rpe: 6, durationMin: 40, activityKind: "run" });
    // Sixty minutes of running is everything to an Achilles and almost
    // nothing to a shoulder. The whole point of the tissue factor.
    expect(loadOf(session, achilles)).toBeGreaterThan(loadOf(session, shoulder) * 5);
  });

  it("inverts that ranking for swimming", () => {
    const swim = day({ rpe: 6, durationMin: 40, activityKind: "swim" });
    expect(loadOf(swim, shoulder)).toBeGreaterThan(loadOf(swim, achilles) * 5);
  });
});

describe("median and mean", () => {
  it("handles odd and even counts", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });

  it("is not dragged by a single outlier", () => {
    // The whole reason for choosing median over mean.
    expect(median([2, 2, 2, 2, 9])).toBe(2);
    expect(mean([2, 2, 2, 2, 9])).toBeGreaterThan(3);
  });

  it("returns null on empty input rather than a number", () => {
    expect(median([])).toBeNull();
    expect(mean([])).toBeNull();
  });
});
