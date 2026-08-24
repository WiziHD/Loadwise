/**
 * Two properties nobody had ever checked, both named by the audit.
 *
 * Neither is about a single rule. Both are about how the engine behaves when
 * the diary itself changes underneath it — which is what happens in real use
 * and what synthetic scenarios never exercise.
 *
 * Both tests below are CHARACTERISATIONS. They record what the engine actually
 * does, including where it does something undesirable, because a weakness that
 * is written down and pinned by a test cannot quietly get worse.
 */

import { describe, expect, it } from "vitest";
import { addDays } from "../src/dates.js";
import { evaluateEpisode } from "../src/evaluate.js";
import { build, poorResponse, START, steadyRecovery } from "../src/fixtures.js";
import type { Entry } from "../src/types.js";

type Result = ReturnType<typeof evaluateEpisode>;

const severityOf = (r: Result): string =>
  r.overall.status === "judged" ? r.overall.severity : r.overall.status;

const baselineAt = (r: Result, date: string): number | null => {
  const f = r.flags.find((x) => x.kind === "response_24h" && x.forDate === date);
  return f && f.kind === "response_24h" ? f.detail.baseline : null;
};

describe("filling in a forgotten day", () => {
  it("usually changes nothing, because the reference is a median", () => {
    // The median was chosen to stop one bad morning from redefining "normal".
    // It turns out to buy something that was never designed for: on a diary
    // whose values sit close together, adding or removing a single day leaves
    // the reference exactly where it was, so a backfill does not rewrite
    // verdicts that were already issued.
    const full = steadyRecovery(40);
    const target = full[30]!.date;
    const withHole = full.filter((e) => e.date !== addDays(target, -3));

    expect(baselineAt(evaluateEpisode({ entries: withHole }), target)).toBe(
      baselineAt(evaluateEpisode({ entries: full }), target),
    );
  });

  it("but can move the reference when the fortnight is lopsided", () => {
    // Seven good days and seven bad ones put the median on the boundary
    // between them, and one backfilled row is then enough to move it from 6 to
    // 3.5 — which changes the verdict of a day that had already been judged.
    //
    // This is why TECHNIK.md stores flags instead of recomputing them. Phase 2
    // must SERVE the stored verdict, never recalculate history on the fly.
    const skewed = build([
      ...Array.from({ length: 7 }, () => ({ morningScore: 1 })),
      ...Array.from({ length: 7 }, () => ({ morningScore: 6 })),
      { rpe: 6, durationMin: 40, morningScore: 3 },
      { morningScore: 5 },
      { morningScore: 5 },
    ]);
    const judged = addDays(START, 14);
    const withHole = skewed.filter((e) => e.date !== addDays(START, 3));

    const before = baselineAt(evaluateEpisode({ entries: withHole }), judged);
    const after = baselineAt(evaluateEpisode({ entries: skewed }), judged);

    expect(before).not.toBe(after);
  });
});

describe("leaving out a bad day", () => {
  it("does improve the verdict, and nothing in the engine can prevent it", () => {
    // The audit's sharpest behavioural finding, confirmed rather than fixed.
    //
    // Every input comes from the person being judged. Hiding the worst day
    // pays twice: the red finding vanishes with the row, and the high morning
    // score leaves the rolling median, lowering the reference for the days
    // around it as well.
    //
    // The coverage machinery does NOT defend against this. It counts days a
    // rule was blocked on, and a removed day whose neighbours are rest days
    // blocks nothing — measured here: seven blocked days before and after.
    //
    // No mechanism can observe a day that was never written down. That is a
    // property of self-reported data, not a defect to be engineered away, and
    // it belongs in the product's honest limitations rather than in a backlog.
    const entries = poorResponse();
    const withAll = evaluateEpisode({ entries });

    const worstDay = withAll.flags.filter((f) => f.severity === "red")[0]?.forDate;
    expect(worstDay, "fixture no longer contains a red day").toBeDefined();

    const hidden = evaluateEpisode({ entries: entries.filter((e) => e.date !== worstDay) });

    expect(severityOf(withAll)).toBe("red");
    expect(severityOf(hidden)).not.toBe("red");
    expect(hidden.coverage.blockedDays).toBe(withAll.coverage.blockedDays);
  });

  it("still cannot turn a compromised record into an all-clear on its own", () => {
    // The one thing that does hold: the remaining rules keep looking. Hiding
    // the worst day removed the red verdict but not the amber one underneath
    // it, because a different rule was reading a different dimension.
    //
    // That is the actual argument for having seven rules rather than one.
    const entries = poorResponse();
    const worstDay = evaluateEpisode({ entries }).flags.filter((f) => f.severity === "red")[0]!
      .forDate;
    const hidden = evaluateEpisode({ entries: entries.filter((e) => e.date !== worstDay) });

    expect(severityOf(hidden)).not.toBe("green");
  });
});

describe("growing the diary", () => {
  it("never invents a verdict for a day that has no entry", () => {
    const base = steadyRecovery(30);
    const grown: Entry[] = [...base, { date: addDays(START, 30), morningScore: 2, sessions: [] }];
    const result = evaluateEpisode({ entries: grown });
    const dates = new Set(grown.map((e) => e.date));

    for (const flag of result.flags) {
      if (flag.kind === "asymmetry") continue;
      expect(dates.has(flag.forDate), `flag for unrecorded ${flag.forDate}`).toBe(true);
    }
  });
});
