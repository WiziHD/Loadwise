/**
 * One row per calendar day.
 *
 * Every window in this engine measures its evidence by counting entries in
 * range. An audit found `entries` and `byDate` disagreeing, so a duplicated row
 * both inflated the coverage gates and had its load counted twice, and an
 * invalid date could reach a rule and come back out as a flag for a day that
 * never existed. These tests hold that door shut.
 */

import { describe, expect, it } from "vitest";
import { addDays } from "../src/dates.js";
import { buildIndex, daysCovered, entriesBetween, loadAt, loadBetween } from "../src/episode.js";
import { evaluateEpisode } from "../src/evaluate.js";
import { START, steadyRecovery, session } from "../src/fixtures.js";
import type { Entry } from "../src/types.js";

const day = (offset: number, over: Partial<Entry> = {}): Entry => ({
  date: addDays(START, offset),
  morningScore: 2,
  sessions: [],
  ...over,
});

describe("the index holds one row per day", () => {
  it("collapses a duplicated date instead of carrying it twice", () => {
    const index = buildIndex([
      day(0),
      day(1, { sessions: [session(6, 40)] }),
      day(1, { sessions: [session(6, 40)] }),
      day(2),
    ]);
    expect(index.entries).toHaveLength(3);
    expect(index.discarded.duplicateDates).toEqual([addDays(START, 1)]);
  });

  it("does not count a duplicated session's load twice", () => {
    const single = buildIndex([day(0, { sessions: [session(6, 40)] })]);
    const doubled = buildIndex([
      day(0, { sessions: [session(6, 40)] }),
      day(0, { sessions: [session(6, 40)] }),
    ]);
    const range = { from: START, to: START };
    expect(loadBetween(doubled, range.from, range.to)).toBe(
      loadBetween(single, range.from, range.to),
    );
  });

  it("does not let a duplicate fill a coverage window", () => {
    // The audit reproduced `daysCovered: 29` inside a 28-day window this way.
    const entries: Entry[] = [];
    for (let i = 0; i < 28; i++) entries.push(day(i));
    entries.push(day(14)); // one day recorded twice

    const index = buildIndex(entries);
    expect(daysCovered(index, START, addDays(START, 27))).toBe(28);
  });

  it("drops an impossible date at the door", () => {
    const index = buildIndex([
      day(0),
      { date: "2026-03-32", morningScore: 3, sessions: [] },
      day(1),
    ]);
    expect(index.entries.map((e) => e.date)).not.toContain("2026-03-32");
    expect(index.discarded.invalidDates).toEqual(["2026-03-32"]);
  });

  it("never lets an impossible date come back out as a flag", () => {
    // Date arithmetic silently rolls 2026-03-32 into April, so a rule that saw
    // one could emit a verdict for a day nobody ever lived.
    const entries: Entry[] = [
      ...steadyRecovery(40),
      { date: "2026-03-32", morningScore: 3, sessions: [session(6, 40)] },
    ];
    const result = evaluateEpisode({ entries });
    expect(result.flags.map((f) => f.forDate)).not.toContain("2026-03-32");
    expect(result.problems.some((p) => p.code === "invalid-date")).toBe(true);
  });

  it("keeps entries sorted and the endpoints honest", () => {
    const index = buildIndex([day(5), day(1), day(3)]);
    expect(index.entries.map((e) => e.date)).toEqual([
      addDays(START, 1),
      addDays(START, 3),
      addDays(START, 5),
    ]);
    expect(index.first).toBe(addDays(START, 1));
    expect(index.last).toBe(addDays(START, 5));
  });

  it("reports nothing discarded for clean input", () => {
    const index = buildIndex(steadyRecovery(28));
    expect(index.discarded.invalidDates).toEqual([]);
    expect(index.discarded.duplicateDates).toEqual([]);
  });

  it("survives an index with no usable rows at all", () => {
    const index = buildIndex([{ date: "nonsense", morningScore: 3, sessions: [] }]);
    expect(index.entries).toEqual([]);
    expect(index.first).toBeNull();
    expect(index.last).toBeNull();
    expect(loadAt(index, START)).toBe(0);
    expect(entriesBetween(index, START, addDays(START, 10))).toEqual([]);
  });
});
