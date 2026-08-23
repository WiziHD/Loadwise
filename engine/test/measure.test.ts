/**
 * Units, and the one property that lets the engine live without them.
 */

import { describe, expect, it } from "vitest";
import { ALL_UNITS, TEST_UNIT, unitOf, type Measure } from "../src/measure.js";
import { limbSymmetryIndex } from "../src/rules/asymmetry.js";
import type { SelfTest, TestType } from "../src/types.js";

const TEST_TYPES: TestType[] = ["calf_raise", "single_hop", "rom"];

describe("every test type declares its unit", () => {
  it("covers all of them", () => {
    // `Record<TestType, Unit>` makes a missing entry a compile error. This
    // catches the other half: an entry that exists but is empty or bogus.
    for (const type of TEST_TYPES) {
      expect(ALL_UNITS, type).toContain(TEST_UNIT[type]);
    }
  });

  it("does not put two different procedures in one unit by accident", () => {
    // Not a rule of nature — two tests could share a unit — but today they do
    // not, and if that ever changes it should be a decision rather than a
    // typo. Repetitions, centimetres and degrees are three different things
    // that shared one bare `number` until this table existed.
    const units = TEST_TYPES.map((t) => TEST_UNIT[t]);
    expect(new Set(units).size).toBe(units.length);
  });
});

describe("the symmetry index does not need a unit, and that is the point", () => {
  it("gives the same answer whatever the two sides are measured in", () => {
    // The reason `SelfTest` carries no unit and never will. Both sides of a
    // paired test are necessarily in the same unit, so the ratio is free of
    // it — 18 of 20 repetitions and 18 of 20 centimetres are the same 90%.
    //
    // Putting a unit on the reading would create a second source of truth for
    // something `type` already determines, and the two could then disagree.
    const reps: SelfTest = { type: "calf_raise", date: "2026-03-02", involved: 18, uninvolved: 20 };
    const cm: SelfTest = { type: "single_hop", date: "2026-03-02", involved: 18, uninvolved: 20 };
    expect(limbSymmetryIndex(reps)).toBe(limbSymmetryIndex(cm));
  });
});

describe("unitOf", () => {
  it("knows the unit of everything whose kind determines it", () => {
    const cases: [Measure, string][] = [
      [{ source: "self_test", type: "calf_raise", side: "involved" }, "reps"],
      [{ source: "self_test", type: "single_hop", side: "uninvolved" }, "cm"],
      [{ source: "self_test", type: "rom", side: "involved" }, "deg"],
      [{ source: "morning_score" }, "score_0_10"],
      [{ source: "symptom_score" }, "score_0_10"],
      [{ source: "session_minutes" }, "min"],
    ];
    for (const [measure, expected] of cases) {
      expect(unitOf(measure), JSON.stringify(measure)).toBe(expected);
    }
  });

  it("refuses to guess for a measure the user named", () => {
    // A user-defined measure could be minutes, metres or kilos, and the engine
    // has no business assuming. Only the recorded data can say, and it is
    // frozen at first sight so the same key can never mean two things.
    expect(unitOf({ source: "measurement", key: "kniebeugen" })).toBeNull();
  });
});
