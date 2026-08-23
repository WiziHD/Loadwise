import { describe, expect, it } from "vitest";
import {
  erodingReference,
  improvingAsymmetry,
  symmetricTests,
  wideningAsymmetry,
  wideningWhileStillGreen,
} from "../src/fixtures.js";
import { evaluateAsymmetry, limbSymmetryIndex, worstOf } from "../src/rules/asymmetry.js";
import { DEFAULT_CONFIG, type SelfTest } from "../src/types.js";

const cfg = DEFAULT_CONFIG;

describe("limb symmetry index", () => {
  it("expresses the injured side as a percentage of the healthy one", () => {
    expect(limbSymmetryIndex({ type: "calf_raise", date: "2026-03-02", involved: 18, uninvolved: 20 })).toBe(90);
  });

  it("refuses to divide by zero", () => {
    expect(limbSymmetryIndex({ type: "calf_raise", date: "2026-03-02", involved: 5, uninvolved: 0 })).toBeNull();
  });
});

describe("asymmetry rule", () => {
  it("says nothing without tests", () => {
    const result = evaluateAsymmetry([], "calf_raise", cfg);
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("no-tests");
  });

  it("declines to judge when every measurement is unusable", () => {
    // A healthy side of zero makes the ratio meaningless. Validation normally
    // catches this first, but the rule must not fall over if it slips through.
    const broken: SelfTest[] = [
      { type: "calf_raise", date: "2026-03-02", involved: 18, uninvolved: 0 },
      { type: "calf_raise", date: "2026-03-16", involved: 19, uninvolved: 0 },
    ];
    const result = evaluateAsymmetry(broken, "calf_raise", cfg);
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("no-tests");
  });

  it("passes a symmetric athlete", () => {
    const result = evaluateAsymmetry(symmetricTests(), "calf_raise", cfg);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("green");
      expect(result.detail.widening).toBe(false);
    }
  });

  it("makes the trend the headline while every value is still in the green band", () => {
    // 98, 94, 92 percent. Nothing here is a deficit yet — the pattern is the
    // whole point, and this is the cascade warning the product exists for.
    const result = evaluateAsymmetry(wideningWhileStillGreen(), "calf_raise", cfg);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.detail.widening).toBe(true);
      expect(result.reason).toBe("widening-gap");
      expect(result.severity).toBe("amber");
    }
  });

  it("makes the deficit the headline once the value itself drops", () => {
    // 92, 88, 84. Still widening, but "marked/mild deficit" is now the more
    // important thing to say. Overwriting the reason here made marked-deficit
    // unreachable in the worst combination there is, and would have written
    // "the gap is widening" to the person who least needed to hear that.
    const result = evaluateAsymmetry(wideningAsymmetry(), "calf_raise", cfg);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.detail.widening).toBe(true);
      expect(result.reason).toBe("mild-deficit");
      expect(result.severity).toBe("amber");
    }
  });

  it("does not mistake improvement for a widening gap", () => {
    const result = evaluateAsymmetry(improvingAsymmetry(), "calf_raise", cfg);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.detail.widening).toBe(false);
      expect(result.severity).toBe("green");
    }
  });

  it("needs three measurements before claiming a trend", () => {
    const two: SelfTest[] = wideningAsymmetry().slice(0, 2);
    const result = evaluateAsymmetry(two, "calf_raise", cfg);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.detail.widening).toBe(false);
  });

  it("keeps red when the deficit is marked and also widening", () => {
    const falling: SelfTest[] = [
      { type: "calf_raise", date: "2026-03-02", involved: 20, uninvolved: 25 }, // 80%
      { type: "calf_raise", date: "2026-03-16", involved: 18, uninvolved: 25 }, // 72%
      { type: "calf_raise", date: "2026-03-30", involved: 15, uninvolved: 25 }, // 60%
    ];
    const result = evaluateAsymmetry(falling, "calf_raise", cfg);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.severity).toBe("red");
  });

  it("says so when the healthy side is losing ground too", () => {
    // Hop distance falls by a sixth on BOTH legs. The ratio barely moves, so
    // every symmetry verdict looks fine while the person is measurably weaker
    // on both sides — the case that made this rule contradict its own premise.
    const result = evaluateAsymmetry(erodingReference(), "single_hop", cfg);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.reason).toBe("reference-eroding");
      expect(result.severity).not.toBe("green");
      expect(result.detail.uninvolvedHistory).toEqual([150, 138, 126]);
      // The thing that hid it: the index itself is essentially unchanged.
      expect(Math.abs(result.detail.lsi - result.detail.history[0]!)).toBeLessThan(1);
    }
  });

  it("refuses to judge on measurements that are months old", () => {
    // Three tests from March say nothing about a body in June.
    const result = evaluateAsymmetry(symmetricTests(), "calf_raise", cfg, "2026-06-30");
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("tests-stale");
  });

  it("still judges when the newest measurement is recent enough", () => {
    const result = evaluateAsymmetry(symmetricTests(), "calf_raise", cfg, "2026-04-05");
    expect(result.status).toBe("ok");
  });

  it("does not call three tests in one week a trend", () => {
    // Same falling numbers, taken three days apart. That is one measurement
    // with noise, not a six-week pattern.
    const crammed: SelfTest[] = [
      { type: "calf_raise", date: "2026-03-02", involved: 49, uninvolved: 50 },
      { type: "calf_raise", date: "2026-03-04", involved: 47, uninvolved: 50 },
      { type: "calf_raise", date: "2026-03-06", involved: 46, uninvolved: 50 },
    ];
    const result = evaluateAsymmetry(crammed, "calf_raise", cfg);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.detail.widening).toBe(false);
      expect(result.reason).toBe("symmetric");
    }
  });

  it("does not call a two-day drop in the reference an erosion", () => {
    const crammed: SelfTest[] = [
      { type: "single_hop", date: "2026-03-02", involved: 132, uninvolved: 150 },
      { type: "single_hop", date: "2026-03-03", involved: 122, uninvolved: 138 },
      { type: "single_hop", date: "2026-03-04", involved: 111, uninvolved: 126 },
    ];
    const result = evaluateAsymmetry(crammed, "single_hop", cfg);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.detail.referenceDeclining).toBe(false);
  });

  it("orders severities correctly", () => {
    expect(worstOf("green", "amber")).toBe("amber");
    expect(worstOf("red", "amber")).toBe("red");
    expect(worstOf("green", "green")).toBe("green");
  });

  it("uses only the latest measurement for the absolute verdict", () => {
    const result = evaluateAsymmetry(improvingAsymmetry(), "calf_raise", cfg);
    if (result.status === "ok") {
      expect(result.detail.lsi).toBeCloseTo(92, 5);
      expect(result.detail.history).toHaveLength(3);
    }
  });
});
