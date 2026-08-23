import { describe, expect, it } from "vitest";
import { buildIndex } from "../src/episode.js";
import { build, plateau, steadyRecovery, tooShort } from "../src/fixtures.js";
import { evaluateBaselineDrift } from "../src/rules/baselineDrift.js";
import { evaluateLoadSpike } from "../src/rules/loadSpike.js";
import { evaluateResponse24h } from "../src/rules/response24h.js";
import { evaluateStagnation } from "../src/rules/stagnation.js";
import { DEFAULT_CONFIG, type DateStr, type Entry } from "../src/types.js";

const cfg = DEFAULT_CONFIG;
const run = (entries: Entry[], date: DateStr) =>
  evaluateStagnation(buildIndex(entries), date, cfg);
const lastDate = (entries: Entry[]): DateStr => entries[entries.length - 1]!.date;

describe("stagnation rule", () => {
  it("says nothing about a young episode", () => {
    const entries = tooShort();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("history-too-short");
  });

  it("says nothing about an empty episode", () => {
    const result = run([], "2026-05-20");
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("history-too-short");
  });

  it("says nothing when the episode is old but the windows are empty", () => {
    // Long enough on the calendar, too thin in the two windows that matter.
    const entries: Entry[] = [
      { date: "2026-03-02", morningScore: 5 },
      { date: "2026-05-20", morningScore: 5 },
    ];
    const result = run(entries, "2026-05-20");
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("history-too-sparse");
  });

  it("recognises real improvement over the whole episode", () => {
    const entries = steadyRecovery(70);
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.reason).toBe("progress-since-start");
      expect(result.severity).toBe("green");
      expect(result.detail.change).toBeLessThanOrEqual(-cfg.stagnation.minImprovement);
    }
  });

  it("does not scold somebody who has essentially no complaints", () => {
    // Steady at 1 out of 10 for twelve weeks is not stagnation — there is
    // nothing left to improve. Without this, the rule would nag every person
    // who has already recovered.
    const entries = build(
      Array.from({ length: 84 }, (_, i) =>
        i % 7 < 4 ? { rpe: 5, durationMin: 35, morningScore: 1 } : { morningScore: 1 },
      ),
    );
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("green");
      expect(result.detail.change).toBe(0);
    }
  });

  it("names a plateau nobody else can see", () => {
    const entries = plateau();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.reason).toBe("no-progress-since-start");
      expect(result.severity).toBe("amber");
      expect(result.detail.currentBaseline).toBe(8);
      expect(result.detail.weeks).toBeGreaterThanOrEqual(cfg.stagnation.minWeeks);
    }
  });

  describe("the three states are kept apart", () => {
    /** A course that sits at `from` for a fortnight and at `to` for the last one. */
    const course = (from: number, to: number, days = 70): Entry[] =>
      build(
        Array.from({ length: days }, (_, i) => ({
          morningScore: i < days - cfg.stagnation.windowDays ? from : to,
        })),
      );

    it("calls a rise what it is instead of calling it a standstill", () => {
      // The bug this replaced: the rule had two outcomes for three situations,
      // so somebody whose baseline went from 1 to 7 over eight weeks was told
      // it was "as high as at the start". It was six points higher.
      const result = run(course(1, 7), lastDate(course(1, 7)));
      expect(result.status).toBe("ok");
      if (result.status === "ok") {
        expect(result.reason).toBe("worse-than-start");
        expect(result.detail.change).toBe(6);
      }
    });

    it("still calls a standstill a standstill", () => {
      const result = run(course(6, 6), lastDate(course(6, 6)));
      if (result.status === "ok") expect(result.reason).toBe("no-progress-since-start");
    });

    it("draws both lines with the same dial, in both directions", () => {
      // No second threshold was invented for deterioration: the drop that counts
      // as progress is the rise that counts as getting worse. If these two ever
      // stop mirroring each other, the rule has grown a hidden asymmetry.
      const step = cfg.stagnation.minImprovement;
      const up = run(course(4, 4 + step), lastDate(course(4, 4 + step)));
      const down = run(course(4 + step, 4), lastDate(course(4 + step, 4)));
      if (up.status === "ok") expect(up.reason).toBe("worse-than-start");
      if (down.status === "ok") expect(down.reason).toBe("progress-since-start");

      // Just inside the dial, neither name applies.
      const half = run(course(4, 4 + step / 2), lastDate(course(4, 4 + step / 2)));
      if (half.status === "ok") expect(half.reason).toBe("no-progress-since-start");
    });

    it("neither scolds nor congratulates somebody who is already fine", () => {
      // Going from nothing to almost nothing is not deterioration — and it is
      // not improvement either. This assertion originally demanded
      // "progress-since-start", which is what the code did and what its
      // approved sentence calls "lower than at the start". Nought to one is
      // not lower. A wrong expectation written next to the code it describes
      // is the exact circularity this suite is supposed to resist.
      for (const [from, to] of [[0, 1], [1, 1]] as const) {
        const entries = course(from, to);
        const result = run(entries, lastDate(entries));
        if (result.status === "ok") {
          expect(result.reason, `${from} → ${to}`).toBe("settled-near-zero");
          expect(result.severity, `${from} → ${to}`).toBe("green");
        }
      }
    });

    it("names a real improvement as one even down in the noise", () => {
      // The branch ORDER, pinned. Improvement is tested before "already fine",
      // so 1 → 0 is progress and not a shrug — and there the approved sentence
      // "lower than at the start" is literally true. Swap the two branches and
      // every small final gain gets swallowed by the low-level case.
      const entries = course(1, 0);
      const result = run(entries, lastDate(entries));
      if (result.status === "ok") expect(result.reason).toBe("progress-since-start");
    });
  });

  it("proves the other rules really are blind to that plateau", () => {
    // The justification for this rule, asserted rather than assumed. Once the
    // level holds, every difference-based rule reads zero and reports fine.
    const entries = plateau();
    const index = buildIndex(entries);
    const last = lastDate(entries);

    const drift = evaluateBaselineDrift(index, last, cfg);
    expect(drift.status).toBe("ok");
    if (drift.status === "ok") {
      expect(drift.severity).toBe("green");
      expect(drift.detail.change).toBe(0);
    }

    const spike = evaluateLoadSpike(index, last, cfg);
    expect(spike.status).toBe("ok");
    if (spike.status === "ok") expect(spike.severity).toBe("green");

    // And the daily rule, across the whole plateau stretch.
    const plateauDays = entries.slice(30).map((e) => evaluateResponse24h(index, e.date, cfg));
    const judged = plateauDays.filter((r) => r.status === "ok");
    expect(judged.length).toBeGreaterThan(20);
    expect(judged.every((r) => r.status === "ok" && r.severity === "green")).toBe(true);
  });

  it("reports the level and the duration, not a clinical grade", () => {
    // The rule deliberately owns no threshold on the score itself. What it
    // states is factual: where the baseline started, where it is, how long.
    const result = run(plateau(), lastDate(plateau()));
    if (result.status === "ok") {
      expect(result.detail).toMatchObject({ currentBaseline: 8 });
      expect(typeof result.detail.startBaseline).toBe("number");
      expect(typeof result.detail.weeks).toBe("number");
    }
  });
});
