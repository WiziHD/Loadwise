import { describe, expect, it } from "vitest";
import { addDays } from "../src/dates.js";
import { buildIndex } from "../src/episode.js";
import {
  allRest,
  detrained,
  gentleIncrease,
  overloadWeek,
  returnFromRest,
  sparse,
  START,
  steadyRecovery,
  tooShort,
  session,
} from "../src/fixtures.js";
import { evaluateLoadSpike } from "../src/rules/loadSpike.js";
import { DEFAULT_CONFIG, type DateStr, type Entry } from "../src/types.js";

const cfg = DEFAULT_CONFIG;
const run = (entries: Entry[], date: DateStr) =>
  evaluateLoadSpike(buildIndex(entries), date, cfg);
const lastDate = (entries: Entry[]): DateStr => entries[entries.length - 1]!.date;

describe("load spike rule", () => {
  it("declines to judge without four weeks of history", () => {
    const result = run(tooShort(), addDays(START, 4));
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("history-too-short");
  });

  it("declines to judge when the four weeks are full of holes", () => {
    const entries = sparse();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") {
      expect(["history-too-short", "history-too-sparse"]).toContain(result.reason);
    }
  });

  it("stays green on a steady, gradual build", () => {
    const entries = steadyRecovery(56);
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("green");
      expect(result.reason).toBe("steady");
      expect(result.detail.ratio).toBeGreaterThan(cfg.spike.amberBelow);
      expect(result.detail.ratio).toBeLessThan(cfg.spike.amberAbove);
    }
  });

  it("warns on a moderate step up", () => {
    const entries = gentleIncrease();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("amber");
      expect(result.reason).toBe("rising-fast");
    }
  });

  it("goes red after a week at triple the usual volume", () => {
    const entries = overloadWeek();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("red");
      expect(result.reason).toBe("sharp-increase");
      expect(result.detail.ratio!).toBeGreaterThan(1.5);
    }
  });

  it("flags a sudden return after complete rest", () => {
    const entries = returnFromRest();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("red");
      expect(result.reason).toBe("return-from-zero");
      expect(result.detail.ratio).toBeNull();
    }
  });

  it("stays quiet when there was never any load at all", () => {
    const entries = allRest();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("green");
      expect(result.reason).toBe("no-load-recorded");
    }
  });

  it("keeps the two windows separate", () => {
    // Regression guard. When the reference period contains the current week,
    // this ratio collapses toward 1 and a genuine spike gets hidden. That was
    // the first real bug in this engine.
    const entries: Entry[] = [];
    for (let i = 0; i < 28; i++) {
      const inLastWeek = i >= 21;
      entries.push({
        date: addDays(START, i),
        morningScore: 2,
        sessions: [session(inLastWeek ? 6 : 2, inLastWeek ? 60 : 10)],
      });
    }
    const result = run(entries, addDays(START, 27));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.detail.ratio!).toBeGreaterThan(10);
      expect(result.severity).toBe("red");
    }
  });

  it("does not read a patchy reference period as a spike", () => {
    // The reference total used to be divided by a fixed three weeks no matter
    // how many of those days existed. A month with holes in the earlier weeks
    // therefore looked quieter than it was, and an unchanged current week came
    // back as `sharp-increase`.
    const full: Entry[] = [];
    for (let i = 0; i < 28; i++) {
      full.push({ date: addDays(START, i), morningScore: 2, sessions: [session(5, 40)] });
    }
    // Same training, but a handful of reference days were never written down —
    // just enough to stay above the coverage bar, which is where the bias used
    // to live unnoticed.
    const patchy = full.filter((e, i) => i >= 21 || i % 4 !== 1);

    const a = run(full, addDays(START, 27));
    const b = run(patchy, addDays(START, 27));

    expect(a.status).toBe("ok");
    expect(b.status).toBe("ok");
    if (a.status === "ok" && b.status === "ok") {
      expect(b.detail.ratio!).toBeCloseTo(a.detail.ratio!, 6);
      expect(b.severity).toBe("green");
      expect(b.reason).toBe("steady");
    }
  });

  it("does not read a patchy current week as detraining", () => {
    // The mirror image, and the more dangerous direction: missing a couple of
    // entries would have looked like backing off, quietly reassuring somebody
    // whose load had not changed at all.
    const full: Entry[] = [];
    for (let i = 0; i < 28; i++) {
      full.push({ date: addDays(START, i), morningScore: 2, sessions: [session(5, 40)] });
    }
    const patchy = full.filter((e, i) => i < 21 || i % 4 !== 0);

    const result = run(patchy, addDays(START, 27));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.reason).not.toBe("detraining");
      expect(result.severity).toBe("green");
    }
  });

  it("declines when a single window is too thin, even if the month looks full", () => {
    // Twenty-six of twenty-eight days present clears any whole-month bar — but
    // if five of the seven missing-adjacent days fall in one week, that week
    // cannot be compared with anything.
    const entries: Entry[] = [];
    for (let i = 0; i < 28; i++) {
      if (i >= 21 && i % 7 < 5) continue; // gut the current week
      entries.push({ date: addDays(START, i), morningScore: 2, sessions: [session(5, 40)] });
    }
    const result = run(entries, addDays(START, 27));
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("history-too-sparse");
  });

  it("calls a sharp drop in load detraining, not success", () => {
    const entries = detrained();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("amber");
      expect(result.reason).toBe("detraining");
    }
  });
});
