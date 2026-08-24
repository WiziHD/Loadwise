/**
 * Every way this engine can refuse input must actually be reachable.
 *
 * The reachability discipline applied to a third list. It already guards
 * `ALL_REASON_CODES` and `ALL_BLOCKING_REASONS`, and it has found six dead
 * branches in this project — but nothing had ever checked that a PROBLEM code
 * can be produced. That is the same fault wearing different clothes: input
 * that ought to be refused would sail through, the engine would compute a
 * verdict on it, and nothing anywhere would object.
 */

import { describe, expect, it } from "vitest";
import { session } from "../src/fixtures.js";
import { parseDiary, parseTests } from "../src/import.js";
import { evaluateEpisode } from "../src/evaluate.js";
import { ALL_PROBLEM_CODES, validateAll, type ProblemCode } from "../src/validate.js";
import type { Measurement } from "../src/measure.js";
import type { Entry, SelfTest } from "../src/types.js";

/** One input per code, each chosen to provoke exactly that finding. */
const PROVOCATIONS: { code: ProblemCode; produce: () => ProblemCode[] }[] = [
  {
    code: "invalid-date",
    produce: () => codes([{ date: "2026-02-30", morningScore: 2, sessions: [] }]),
  },
  {
    code: "duplicate-date",
    produce: () =>
      codes([
        { date: "2026-03-02", morningScore: 2, sessions: [] },
        { date: "2026-03-02", morningScore: 3, sessions: [] },
      ]),
  },
  {
    code: "morning-out-of-range",
    produce: () => codes([{ date: "2026-03-02", morningScore: 47, sessions: [] }]),
  },
  {
    code: "stiffness-out-of-range",
    produce: () =>
      codes([{ date: "2026-03-02", morningScore: 2, sessions: [], morningStiffnessMin: -5 }]),
  },
  {
    code: "rpe-out-of-range",
    produce: () => codes([{ date: "2026-03-02", morningScore: 2, sessions: [session(20, 30)] }]),
  },
  {
    code: "duration-not-positive",
    produce: () => codes([{ date: "2026-03-02", morningScore: 2, sessions: [session(5, 0)] }]),
  },
  {
    // Nicht mehr über `validateAll`, und das ist der Punkt: Seit `Session` alle
    // drei Angaben verlangt, ist eine halbe Einheit im Motor nicht mehr
    // DARSTELLBAR. Der Code lebt an der Grenze weiter, wo untypisierte Daten
    // hereinkommen — eine CSV-Datei, in der jemand die Minuten vergessen hat.
    code: "load-incomplete",
    produce: () =>
      parseDiary(["datum;morgen;anstrengung", "2026-03-02;2;5"].join(String.fromCharCode(10)))
        .problems.map((p) => p.code),
  },
  {
    code: "symptom-out-of-range",
    produce: () => codes([{ date: "2026-03-02", morningScore: 2, sessions: [], symptomScore: 20 }]),
  },
  {
    code: "symptom-timing-without-score",
    produce: () => codes([{ date: "2026-03-02", morningScore: 2, sessions: [], symptomTiming: "during" }]),
  },
  {
    code: "test-value-not-positive",
    produce: () =>
      codes([], [{ type: "calf_raise", date: "2026-03-02", involved: 5, uninvolved: 0 }]),
  },
  {
    code: "measure-unit-conflict",
    produce: () =>
      codes(
        [],
        [],
        [
          { key: "gehen", date: "2026-03-02", value: 30, unit: "min" },
          { key: "gehen", date: "2026-03-03", value: 30, unit: "sec" },
        ],
      ),
  },
  {
    code: "measure-value-not-finite",
    produce: () =>
      codes([], [], [{ key: "gehen", date: "2026-03-02", value: Number.NaN, unit: "min" }]),
  },
  {
    code: "start-after-first-entry",
    produce: () =>
      evaluateEpisode({
        entries: [
          { date: "2026-03-02", morningScore: 3, sessions: [] },
          { date: "2026-03-03", morningScore: 3, sessions: [] },
        ],
        context: { bodyRegion: "achilles", startedOn: "2026-06-01" },
      }).problems.map((x) => x.code),
  },
  { code: "empty-file", produce: () => parsed("") },
  { code: "missing-column", produce: () => parsed("morgen,aktivitaet\n3,laufen") },
  { code: "not-a-number", produce: () => parsed("datum,morgen\n2026-03-02,drei") },
  {
    code: "unknown-activity",
    produce: () =>
      parsed("datum,morgen,aktivitaet,minuten,anstrengung\n2026-03-02,3,unterwasserschach,30,5"),
  },
  {
    code: "unknown-test-type",
    produce: () => parsedTests("datum,test,wert,einheit\n2026-03-02,unterwasserschach,,"),
  },
  {
    code: "unknown-unit",
    produce: () => parsedTests("datum,test,wert,einheit\n2026-03-02,kniebeugen,15,bananen"),
  },
  {
    code: "test-side-missing",
    produce: () => parsedTests("datum,test,betroffen,gesund\n2026-03-02,wadenheber,18,"),
  },
  {
    code: "unit-mismatch",
    produce: () =>
      parsedTests("datum,test,betroffen,gesund,einheit\n2026-03-02,wadenheber,18,20,cm"),
  },
  {
    code: "unknown-timing",
    produce: () =>
      parsed("datum,morgen,beschwerden,zeitpunkt\n2026-03-02,3,4,uebermorgen"),
  },
];

function codes(
  entries: Entry[],
  tests: SelfTest[] = [],
  measurements: Measurement[] = [],
): ProblemCode[] {
  return validateAll(entries, tests, measurements).problems.map((p) => p.code);
}

function parsed(text: string): ProblemCode[] {
  return parseDiary(text).problems.map((p) => p.code);
}

function parsedTests(text: string): ProblemCode[] {
  return parseTests(text).problems.map((p) => p.code);
}

describe("every problem code can actually be produced", () => {
  it("reaches all of them", () => {
    const unreachable = ALL_PROBLEM_CODES.filter((code) => {
      const provocation = PROVOCATIONS.find((p) => p.code === code);
      return provocation === undefined || !provocation.produce().includes(code);
    });

    expect(
      unreachable,
      `no input in this file produces: ${unreachable.join(", ")}`,
    ).toEqual([]);
  });

  it("provokes each one on purpose rather than by accident", () => {
    // A weaker version of this test would pool every provocation and check the
    // union. That would pass even if one input happened to produce three codes
    // and another produced none — which is exactly how a dead code hides.
    for (const { code, produce } of PROVOCATIONS) {
      expect(produce(), `provocation for ${code} did not produce it`).toContain(code);
    }
  });
});
