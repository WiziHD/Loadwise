import { describe, expect, it } from "vitest";
import { session } from "../src/fixtures.js";
import { isRestDay, loadOf, mean, median } from "../src/load.js";
import type { Entry, EpisodeContext } from "../src/types.js";

const day = (over: Partial<Entry> = {}): Entry => ({
  date: "2026-03-02",
  morningScore: 2,
  sessions: [],
  ...over,
});

const achilles: EpisodeContext = { bodyRegion: "achilles" };
const shoulder: EpisodeContext = { bodyRegion: "shoulder" };

describe("session load", () => {
  it("multiplies effort by duration", () => {
    expect(loadOf(day({ sessions: [session(6, 40)] }))).toBe(240);
    expect(loadOf(day({ sessions: [session(8, 50)] }))).toBe(400);
  });

  it("adds every session of the day together", () => {
    // Der Grund, warum `sessions` eine Liste ist: Wer morgens läuft und abends
    // Kraft macht, hatte vorher nur eine der beiden Einheiten in der Rechnung —
    // und zwar an genau den Tagen mit der höchsten Last.
    expect(loadOf(day({ sessions: [session(6, 40), session(5, 30)] }))).toBe(240 + 150);
  });

  it("has no load without a session", () => {
    // Eine HALBE Einheit — Anstrengung ohne Minuten — ist seit `Session` nicht
    // mehr darstellbar; der Typ verbietet sie. Aus einer CSV-Datei kann sie
    // trotzdem kommen, und dort wird sie gemeldet: siehe import.test.ts.
    expect(loadOf(day({ sessions: [] }))).toBe(0);
    expect(loadOf(day())).toBe(0);
  });

  it("recognises rest days", () => {
    expect(isRestDay(day({}))).toBe(true);
    expect(isRestDay(day({ sessions: [session(5, 30)] }))).toBe(false);
  });

  it("weights the same session differently per injured tissue", () => {
    const lauf = day({ sessions: [session(6, 40, "run")] });
    // Sixty minutes of running is everything to an Achilles and almost
    // nothing to a shoulder. The whole point of the tissue factor.
    expect(loadOf(lauf, achilles)).toBeGreaterThan(loadOf(lauf, shoulder) * 5);
  });

  it("inverts that ranking for swimming", () => {
    const swim = day({ sessions: [session(6, 40, "swim")] });
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
