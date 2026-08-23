/**
 * Properties that must hold across the whole scenario library.
 *
 * Unit tests check one rule against one situation. These check statements that
 * must be true of every rule in every situation — the class of bug that hides
 * between the cases somebody thought to write down.
 */

import { describe, expect, it } from "vitest";
import { addDays } from "../src/dates.js";
import { buildIndex } from "../src/episode.js";
import { currentFlags, evaluateEpisode, type Evaluation } from "../src/evaluate.js";
import { reportScenario } from "../src/report.js";
import { SCENARIOS, START, steadyRecovery } from "../src/fixtures.js";
import { evaluateAsymmetry } from "../src/rules/asymmetry.js";
import { evaluateLoadSpike } from "../src/rules/loadSpike.js";
import {
  ALL_BLOCKING_REASONS,
  ALL_REASON_CODES,
  DEFAULT_CONFIG,
  type BlockingReason,
  type Entry,
  type Overall,
  type ReasonCode,
  type SelfTest,
  type Severity,
} from "../src/types.js";

const SEVERITY_RANK = { green: 0, amber: 1, red: 2 } as const;

const runAll = (): { key: string; result: Evaluation }[] =>
  SCENARIOS.map((s) => ({
    key: s.key,
    result: evaluateEpisode({ entries: s.entries, tests: s.tests, context: s.context }),
  }));

const severityOf = (overall: Overall): Severity | null =>
  overall.status === "judged" ? overall.severity : null;

describe("every verdict is reachable", () => {
  it("produces each ReasonCode in at least one scenario", () => {
    // The single most important test in this suite.
    //
    // The first real bug in this engine was an unreachable branch: a condition
    // that could never be true, so the rule fell silent in exactly the case it
    // was written for. Nothing crashed and no test failed — it was found by
    // accident. This test turns that whole class of bug into a red suite.
    const seen = new Set<ReasonCode>();
    for (const { result } of runAll()) {
      for (const flag of result.flags) seen.add(flag.reason);
    }

    const missing = ALL_REASON_CODES.filter((code) => !seen.has(code));
    expect(missing, `Unreachable verdicts: ${missing.join(", ")}`).toEqual([]);
  });

  it("surfaces each BlockingReason to the user in at least one scenario", () => {
    // The other half, and the half that was missing.
    //
    // An audit found that five of the nine insufficient reasons could not
    // reach a caller at all: the 24-hour loop discarded everything it could
    // not judge, so the engine was able to go silent about its own silence.
    // Reachability of a verdict was tested; reachability of "I could not
    // judge this" was not.
    const seen = new Set<BlockingReason>();
    for (const { result } of runAll()) {
      for (const p of result.pending) seen.add(p.reason);
    }

    const missing = ALL_BLOCKING_REASONS.filter((r) => !seen.has(r));
    expect(missing, `Blocking reasons that never reach the user: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("the summary never over-claims", () => {
  it("only carries a severity when enough was actually judged", () => {
    for (const { key, result } of runAll()) {
      if (result.overall.status !== "judged") continue;
      // Coverage gates reassurance only — a warning stands on its own evidence.
      if (result.overall.severity !== "green") continue;
      expect(
        result.coverage.responseRatio,
        `${key}: judged verdict on thin day coverage`,
      ).toBeGreaterThanOrEqual(DEFAULT_CONFIG.coverage.minResponseRatio);
      expect(
        result.coverage.rulesReporting,
        `${key}: judged verdict with too few rules speaking`,
      ).toBeGreaterThanOrEqual(DEFAULT_CONFIG.coverage.minRulesReporting);
    }
  });

  it("says insufficient rather than green when almost nothing was judged", () => {
    // The concrete failure the audit surfaced: a diary with half its days
    // missing reported "green" off two flags.
    const sparse = SCENARIOS.find((s) => s.key === "sparse")!;
    const result = evaluateEpisode({
      entries: sparse.entries,
      tests: sparse.tests,
      context: sparse.context,
    });
    expect(severityOf(result.overall)).not.toBe("green");
  });

  it("names what it is waiting for whenever it reports insufficient", () => {
    for (const { key, result } of runAll()) {
      if (result.overall.status !== "insufficient") continue;
      expect(result.overall.blocking.length, `${key}: insufficient with no reason given`).toBeGreaterThan(0);
      expect(result.pending.length, `${key}: insufficient with an empty pending list`).toBeGreaterThan(0);
    }
  });
});

describe("invariants", () => {
  it("never emits a flag for a date without an entry", () => {
    for (const scenario of SCENARIOS) {
      const dates = new Set(scenario.entries.map((e) => e.date));
      const testDates = new Set(scenario.tests.map((t) => t.date));
      const result = evaluateEpisode({
        entries: scenario.entries,
        tests: scenario.tests,
        context: scenario.context,
      });
      for (const flag of result.flags) {
        const pool = flag.kind === "asymmetry" ? testDates : dates;
        expect(pool.has(flag.forDate), `${scenario.key}: ${flag.forDate}`).toBe(true);
      }
    }
  });

  it("is unaffected by the order entries arrive in", () => {
    for (const scenario of SCENARIOS) {
      const forward = evaluateEpisode({
        entries: scenario.entries,
        tests: scenario.tests,
        context: scenario.context,
      });
      const reversed = evaluateEpisode({
        entries: [...scenario.entries].reverse(),
        tests: [...scenario.tests].reverse(),
        context: scenario.context,
      });
      expect(reversed.overall, scenario.key).toEqual(forward.overall);
      expect(reversed.flags.length, scenario.key).toBe(forward.flags.length);
    }
  });

  it("never produces a verdict outside the three severities", () => {
    for (const { result } of runAll()) {
      for (const flag of result.flags) {
        expect(Object.keys(SEVERITY_RANK)).toContain(flag.severity);
      }
    }
  });

  it("keeps the load ratio unchanged when every load is scaled alike", () => {
    // The ratio compares a week against neighbouring weeks, so it must not
    // care about the unit. If it ever did, changing the tissue factors would
    // silently move every verdict.
    const base = steadyRecovery(56);
    const scaled: Entry[] = base.map((e) => ({
      ...e,
      durationMin: e.durationMin === null || e.durationMin === undefined ? e.durationMin : e.durationMin * 3,
    }));

    const last = base[base.length - 1]!.date;
    const a = evaluateLoadSpike(buildIndex(base), last, DEFAULT_CONFIG);
    const b = evaluateLoadSpike(buildIndex(scaled), last, DEFAULT_CONFIG);

    expect(a.status).toBe("ok");
    expect(b.status).toBe("ok");
    if (a.status === "ok" && b.status === "ok") {
      expect(b.detail.ratio!).toBeCloseTo(a.detail.ratio!, 10);
      expect(b.severity).toBe(a.severity);
    }
  });

  it("keeps the symmetry index unchanged when both sides are scaled alike", () => {
    const original: SelfTest[] = [
      { type: "calf_raise", date: addDays(START, 0), involved: 18, uninvolved: 20 },
      { type: "calf_raise", date: addDays(START, 14), involved: 17, uninvolved: 20 },
      { type: "calf_raise", date: addDays(START, 28), involved: 16, uninvolved: 20 },
    ];
    const scaled = original.map((t) => ({ ...t, involved: t.involved * 7, uninvolved: t.uninvolved * 7 }));

    const a = evaluateAsymmetry(original, "calf_raise", DEFAULT_CONFIG);
    const b = evaluateAsymmetry(scaled, "calf_raise", DEFAULT_CONFIG);

    expect(a.status).toBe("ok");
    if (a.status === "ok" && b.status === "ok") {
      expect(b.detail.lsi).toBeCloseTo(a.detail.lsi, 10);
      expect(b.severity).toBe(a.severity);
      expect(b.detail.widening).toBe(a.detail.widening);
    }
  });

  it("does not let an added rest day turn a green episode red", () => {
    // Recording a day off is an act of honesty. It must never be punished —
    // if it were, the incentive would be to stop logging rest days, and the
    // baseline would rot.
    for (const scenario of SCENARIOS) {
      const before = evaluateEpisode({
        entries: scenario.entries,
        tests: scenario.tests,
        context: scenario.context,
      });
      if (severityOf(before.overall) !== "green") continue;

      const lastEntry = scenario.entries[scenario.entries.length - 1];
      if (!lastEntry) continue;

      const withRest: Entry[] = [
        ...scenario.entries,
        { date: addDays(lastEntry.date, 1), morningScore: lastEntry.morningScore },
      ];
      const after = evaluateEpisode({
        entries: withRest,
        tests: scenario.tests,
        context: scenario.context,
      });
      expect(severityOf(after.overall) === "red", `${scenario.key} turned red on a rest day`).toBe(false);
    }
  });

  it("reports clean input for every scenario in the library", () => {
    // The fixtures are also the calibration material. If they contain invalid
    // data, every threshold conclusion drawn from them is worthless.
    for (const { key, result } of runAll()) {
      expect(result.problems, `${key}: ${JSON.stringify(result.problems.slice(0, 2))}`).toEqual([]);
    }
  });
});

describe("the summary is about now, the record is about everything", () => {
  it("never carries a severity that no current finding supports", () => {
    // The bug this pins down: the summary took the worst severity across the
    // whole episode, so one bad week in month one made every later day red.
    // Somebody who recovered could not be told so — the engine had no way
    // left to say a course was going well.
    for (const s of SCENARIOS) {
      const r = evaluateEpisode({ entries: s.entries, tests: s.tests, context: s.context });
      if (r.overall.status !== "judged") continue;

      const current = currentFlags(r.flags, r.config, r.lastDate);
      const worstCurrent = current.some((x) => x.severity === "red")
        ? "red"
        : current.some((x) => x.severity === "amber")
          ? "amber"
          : "green";

      expect(r.overall.severity, `${s.key}: summary disagrees with its own current flags`)
        .toBe(worstCurrent);
    }
  });

  it("never drops a finding from the report, however old it is", () => {
    // The other half, and the one that would be dangerous to get wrong.
    // Deciding an old red day no longer sets today's STATUS is a judgement
    // about what the summary word means. Letting it disappear from the RECORD
    // would be deleting evidence, and that is a different thing entirely.
    for (const s of SCENARIOS) {
      const r = evaluateEpisode({ entries: s.entries, tests: s.tests, context: s.context });
      const text = reportScenario(s);

      for (const flag of r.flags.filter((x) => x.severity !== "green")) {
        expect(text, `${s.key}: ${flag.forDate} ${flag.kind} vanished from the report`)
          .toContain(flag.forDate);
      }
    }
  });

  it("does not print an all-clear directly above a current warning", () => {
    // A report that appears to argue with itself costs more trust than the
    // finding was worth. Historic findings live under their own heading.
    for (const s of SCENARIOS) {
      const text = reportScenario(s);
      if (!text.includes("Gesamtbild: green")) continue;

      const body = text.split("Auffälligkeiten:")[1];
      if (body === undefined) continue;
      const currentSection = body.split("Früher im Verlauf")[0]!;
      expect(currentSection, `${s.key}: green summary over a current warning`)
        .not.toMatch(/\[(STOP|ACHT)\]/);
    }
  });
});
