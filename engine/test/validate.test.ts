import { describe, expect, it } from "vitest";
import { validateAll, validateEntries, validateTests } from "../src/validate.js";
import { evaluateAsymmetry } from "../src/rules/asymmetry.js";
import { DEFAULT_CONFIG } from "../src/types.js";
import { steadyRecovery, symmetricTests } from "../src/fixtures.js";
import type { Entry, SelfTest } from "../src/types.js";

const codesOf = (problems: { code: string }[]): string[] => problems.map((p) => p.code);

describe("entry validation", () => {
  it("passes clean data", () => {
    expect(validateEntries(steadyRecovery(28)).ok).toBe(true);
  });

  it("rejects an impossible date", () => {
    const result = validateEntries([{ date: "2026-02-30", morningScore: 2 }]);
    expect(codesOf(result.problems)).toContain("invalid-date");
  });

  it("rejects two entries for the same day", () => {
    // Before this check, the later row silently won and the earlier one
    // vanished from the baseline without a trace.
    const entries: Entry[] = [
      { date: "2026-03-02", morningScore: 2 },
      { date: "2026-03-02", morningScore: 8 },
    ];
    expect(codesOf(validateEntries(entries).problems)).toContain("duplicate-date");
  });

  it("rejects a morning score outside zero to ten", () => {
    expect(codesOf(validateEntries([{ date: "2026-03-02", morningScore: 47 }]).problems))
      .toContain("morning-out-of-range");
    expect(codesOf(validateEntries([{ date: "2026-03-02", morningScore: -1 }]).problems))
      .toContain("morning-out-of-range");
  });

  it("rejects an effort rating outside one to ten", () => {
    const entries: Entry[] = [{ date: "2026-03-02", morningScore: 2, rpe: 12, durationMin: 30 }];
    expect(codesOf(validateEntries(entries).problems)).toContain("rpe-out-of-range");
  });

  it("rejects half a session", () => {
    // Effort without duration would score as a rest day and quietly bend the
    // load curve downward.
    const onlyRpe: Entry[] = [{ date: "2026-03-02", morningScore: 2, rpe: 6 }];
    const onlyDuration: Entry[] = [{ date: "2026-03-02", morningScore: 2, durationMin: 40 }];
    expect(codesOf(validateEntries(onlyRpe).problems)).toContain("load-incomplete");
    expect(codesOf(validateEntries(onlyDuration).problems)).toContain("load-incomplete");
  });

  it("rejects a zero-length session", () => {
    const entries: Entry[] = [{ date: "2026-03-02", morningScore: 2, rpe: 6, durationMin: 0 }];
    expect(codesOf(validateEntries(entries).problems)).toContain("duration-not-positive");
  });

  it("rejects a symptom score outside zero to ten", () => {
    const entries: Entry[] = [
      { date: "2026-03-02", morningScore: 2, symptomScore: 15, symptomTiming: "during" },
    ];
    expect(codesOf(validateEntries(entries).problems)).toContain("symptom-out-of-range");
  });

  it("rejects a symptom timing with no score to weight it", () => {
    const entries: Entry[] = [
      { date: "2026-03-02", morningScore: 2, symptomTiming: "during" },
    ];
    expect(codesOf(validateEntries(entries).problems)).toContain("symptom-timing-without-score");
  });

  it("names the day and the field, not just the fact", () => {
    const result = validateEntries([{ date: "2026-03-02", morningScore: 47 }]);
    const problem = result.problems[0]!;
    expect(problem.date).toBe("2026-03-02");
    expect(problem.field).toBe("morningScore");
    expect(problem.message).toContain("47");
  });

  it("stops looking at a row whose date is unusable", () => {
    // Findings on an unanchored row could not be shown anywhere sensible.
    const result = validateEntries([{ date: "not-a-date", morningScore: 99 }]);
    expect(codesOf(result.problems)).toEqual(["invalid-date"]);
  });
});

describe("self-test validation", () => {
  it("passes clean data", () => {
    expect(validateTests(symmetricTests()).ok).toBe(true);
  });

  it("rejects an impossible test date and stops looking at that row", () => {
    const tests: SelfTest[] = [
      { type: "calf_raise", date: "2026-13-01", involved: -5, uninvolved: 0 },
    ];
    expect(codesOf(validateTests(tests).problems)).toEqual(["invalid-date"]);
  });

  it("rejects a reference side of zero — it is the divisor", () => {
    const tests: SelfTest[] = [
      { type: "calf_raise", date: "2026-03-02", involved: 5, uninvolved: 0 },
    ];
    expect(codesOf(validateTests(tests).problems)).toContain("test-value-not-positive");
  });

  it("accepts nought on the involved side, because that is a real reading", () => {
    // The defect this replaced: both sides were checked with the same
    // `<= 0`, so the single most meaningful measurement the engine can be
    // given was reported as bad input.
    //
    // Somebody who cannot manage one heel raise on the injured side is at the
    // start of a rehabilitation, or has just had a tendon repaired. That is
    // not a typo. It is the reading that matters most, and the engine has an
    // answer for it — LSI 0, marked-deficit — which nobody could ever reach.
    const tests: SelfTest[] = [
      { type: "calf_raise", date: "2026-03-02", involved: 0, uninvolved: 22 },
    ];
    expect(validateTests(tests).ok).toBe(true);
  });

  it("still refuses a negative count on either side", () => {
    // Nought is a measurement. Minus three is not.
    for (const test of [
      { type: "calf_raise", date: "2026-03-02", involved: -3, uninvolved: 22 },
      { type: "calf_raise", date: "2026-03-02", involved: 5, uninvolved: -1 },
    ] as SelfTest[]) {
      expect(codesOf(validateTests([test]).problems)).toContain("test-value-not-positive");
    }
  });

  it("carries a zero reading all the way to a verdict", () => {
    // Validation accepting it would be worthless if the rule then said nothing.
    const tests: SelfTest[] = [
      { type: "calf_raise", date: "2026-03-02", involved: 0, uninvolved: 20 },
      { type: "calf_raise", date: "2026-03-16", involved: 0, uninvolved: 20 },
      { type: "calf_raise", date: "2026-03-30", involved: 0, uninvolved: 20 },
    ];
    const result = evaluateAsymmetry(tests, "calf_raise", DEFAULT_CONFIG);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.detail.lsi).toBe(0);
      expect(result.reason).toBe("marked-deficit");
      expect(result.severity).toBe("red");
    }
  });
});

describe("combined validation", () => {
  it("collects findings from both sources", () => {
    const result = validateAll(
      [{ date: "2026-03-02", morningScore: 47 }],
      [{ type: "calf_raise", date: "2026-03-02", involved: 5, uninvolved: -1 }],
    );
    expect(result.ok).toBe(false);
    expect(codesOf(result.problems)).toEqual(
      expect.arrayContaining(["morning-out-of-range", "test-value-not-positive"]),
    );
  });
});
