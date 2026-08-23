/**
 * Reading a hand-kept self-test file.
 *
 * This closes the largest hole in Phase 0, and the milestone feature is not
 * what needed it. The side-to-side comparison is the product's stated
 * differentiator, and until this existed it had never once run on a real
 * measurement — not because the rule was unfinished, but because no real
 * measurement could reach it. Every self-test the engine had ever judged was
 * constructed in code by the person who wrote the rule.
 */

import { describe, expect, it } from "vitest";
import { parseTests } from "../src/import.js";
import { validateAll } from "../src/validate.js";
import { evaluateEpisode } from "../src/evaluate.js";
import { steadyRecovery } from "../src/fixtures.js";

const codesOf = (problems: { code: string }[]): string[] => problems.map((p) => p.code);

describe("parseTests", () => {
  it("reads a paired test in either language", () => {
    const de = parseTests("datum;test;betroffen;gesund\n2026-03-02;wadenheber;18;20");
    const en = parseTests("date,type,involved,uninvolved\n2026-03-02,calf_raise,18,20");

    expect(de.problems).toEqual([]);
    expect(en.problems).toEqual([]);
    expect(de.tests).toEqual(en.tests);
    expect(de.tests[0]).toEqual({
      type: "calf_raise",
      date: "2026-03-02",
      involved: 18,
      uninvolved: 20,
    });
  });

  it("reads a single self-recorded number as a measurement, not a test", () => {
    const result = parseTests("datum,test,wert,einheit\n2026-06-14,kniebeugen,15,wdh");
    expect(result.problems).toEqual([]);
    expect(result.tests).toEqual([]);
    expect(result.measurements[0]).toEqual({
      key: "kniebeugen",
      date: "2026-06-14",
      value: 15,
      unit: "reps",
      note: null,
    });
  });

  it("refuses half a paired test rather than inventing the other side", () => {
    // The same rule as `load-incomplete` for a session with an effort but no
    // minutes. A missing reference side is not a zero; filling it in would
    // feed the symmetry index a number nobody measured.
    const result = parseTests("datum,test,betroffen,gesund\n2026-03-02,wadenheber,18,");
    expect(codesOf(result.problems)).toEqual(["test-side-missing"]);
    expect(result.tests).toEqual([]);
    expect(result.measurements).toEqual([]);
  });

  it("refuses a unit that contradicts the procedure", () => {
    // A calf raise counted in centimetres means something other than a calf
    // raise was measured. Ignoring the stated unit would silently compare
    // centimetres against repetitions.
    const result = parseTests("datum,test,betroffen,gesund,einheit\n2026-03-02,wadenheber,18,20,cm");
    expect(codesOf(result.problems)).toEqual(["unit-mismatch"]);
    expect(result.tests).toEqual([]);
  });

  it("refuses a measurement without a usable unit", () => {
    // Fifteen of what? A number without a unit cannot be compared with the
    // next one, and guessing is how thirty minutes becomes thirty seconds.
    const result = parseTests("datum,test,wert,einheit\n2026-06-14,kniebeugen,15,");
    expect(codesOf(result.problems)).toEqual(["unknown-unit"]);
    expect(result.measurements).toEqual([]);
  });

  it("accepts nought on the involved side", () => {
    // The reading the engine used to reject as bad input.
    const result = parseTests("datum,test,betroffen,gesund\n2026-03-02,wadenheber,0,22");
    expect(result.problems).toEqual([]);
    expect(result.tests[0]!.involved).toBe(0);
    expect(validateAll([], result.tests).ok).toBe(true);
  });

  it("keeps reading after a bad row", () => {
    const result = parseTests(
      "datum,test,betroffen,gesund\n" +
        "2026-03-02,wadenheber,18,20\n" +
        "2026-13-99,wadenheber,18,20\n" +
        "2026-03-16,wadenheber,19,20",
    );
    expect(codesOf(result.problems)).toEqual(["invalid-date"]);
    expect(result.tests.length).toBe(2);
  });

  it("says what is missing instead of guessing at it", () => {
    expect(codesOf(parseTests("").problems)).toEqual(["empty-file"]);
    expect(codesOf(parseTests("test,betroffen\nwadenheber,18").problems)).toEqual([
      "missing-column",
    ]);
    expect(codesOf(parseTests("datum,betroffen\n2026-03-02,18").problems)).toEqual([
      "missing-column",
    ]);
  });

  it("produces tests the rest of the engine accepts unchanged", () => {
    // The round trip that proves the ingest is real rather than decorative.
    const parsed = parseTests(
      "datum,test,betroffen,gesund\n" +
        "2026-03-02,wadenheber,14,20\n" +
        "2026-03-16,wadenheber,15,20\n" +
        "2026-03-30,wadenheber,16,20",
    );
    expect(parsed.problems).toEqual([]);

    const result = evaluateEpisode({
      entries: steadyRecovery(56),
      tests: parsed.tests,
      context: { bodyRegion: "achilles" },
    });

    const asymmetry = result.flags.find((f) => f.kind === "asymmetry");
    expect(asymmetry, "a real imported test produced no side-to-side verdict").toBeDefined();
    expect(result.problems).toEqual([]);
  });
});
