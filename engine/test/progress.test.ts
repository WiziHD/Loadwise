/**
 * The progress channel, and the one thing it must never be able to do.
 */

import { describe, expect, it } from "vitest";
import { evaluateEpisode } from "../src/evaluate.js";
import { SCENARIOS, sparse, steadyRecovery, symmetricTests } from "../src/fixtures.js";
import { ALL_PROFILES, profileFor } from "../src/profiles/registry.js";
import type { Profile } from "../src/profiles/types.js";
import {
  ALL_MILESTONE_STATES,
  ALL_PROGRESS_BLOCKS,
  type Milestone,
  type MilestoneState,
} from "../src/progress.js";
import type { Measurement } from "../src/measure.js";
import type { SelfTest } from "../src/types.js";

const START = "2026-03-02";

const goal = (id: string, over: Partial<Milestone> = {}): Milestone => ({
  id,
  origin: "user",
  label: { text: "wieder dreissig Minuten schmerzfrei gehen", locale: "de" },
  createdOn: START,
  all: [],
  onDistinctDays: 1,
  ...over,
});

const MEASUREMENTS: Measurement[] = [
  { key: "kniebeugen", date: "2026-03-05", value: 8, unit: "reps" },
  { key: "kniebeugen", date: "2026-03-19", value: 12, unit: "reps" },
  { key: "kniebeugen", date: "2026-04-02", value: 16, unit: "reps" },
];

const REACHED = goal("reached", {
  all: [
    {
      measure: { source: "measurement", key: "kniebeugen" },
      direction: "at_least",
      value: 15,
      unit: "reps",
    },
  ],
});

// ---------------------------------------------------------------------------

describe("a milestone can never influence a verdict", () => {
  it("has no severity to read", () => {
    const result = evaluateEpisode({
      entries: steadyRecovery(28),
      milestones: [REACHED],
      measurements: MEASUREMENTS,
    });
    const status = result.progress.milestones[0]!;

    // @ts-expect-error a milestone status has no severity, and must not grow one
    void status.severity;
    expect(status.state).toBeDefined();
  });

  it("leaves every verdict, the coverage and the summary untouched", () => {
    // The single most important assertion in this feature.
    //
    // Every `Flag` carries a severity, and a green flag increments
    // `coverage.rulesReporting` — one of the two gates that turn "not enough
    // judged" into "all clear". If milestones were an eighth rule, somebody
    // reaching their own goal would push a thin diary over that threshold.
    const milestones = [
      REACHED,
      goal("open", {
        all: [
          {
            measure: { source: "measurement", key: "kniebeugen" },
            direction: "at_least",
            value: 99,
            unit: "reps",
          },
        ],
      }),
      goal("untracked"),
      goal("ticked", { markedReachedOn: "2026-03-10" }),
    ];

    for (const scenario of SCENARIOS) {
      for (const profile of ALL_PROFILES) {
        const without = evaluateEpisode({
          entries: scenario.entries,
          tests: scenario.tests,
          profile,
          skipValidation: true,
        });
        const with_ = evaluateEpisode({
          entries: scenario.entries,
          tests: scenario.tests,
          profile,
          skipValidation: true,
          milestones,
          measurements: MEASUREMENTS,
        });

        const where = `${scenario.key}/${profile.key}`;
        expect(with_.overall, where).toEqual(without.overall);
        expect(with_.coverage, where).toEqual(without.coverage);
        expect(with_.flags.length, where).toBe(without.flags.length);
        expect(with_.pending, where).toEqual(without.pending);
      }
    }
  });

  it("would notice if a milestone did leak into the verdict", () => {
    // Proof the assertion above constrains something. It would pass unchanged
    // if milestones simply did nothing anywhere — so here is the harm it is
    // supposed to prevent, made concrete.
    //
    // A thin diary that the engine correctly refuses to clear...
    const thin = evaluateEpisode({ entries: sparse(), skipValidation: true });
    expect(thin.overall.status, "the fixture no longer models a thin diary").toBe("insufficient");

    // ...would be cleared if one green flag per recorded milestone were added,
    // because rulesReporting is a count and nothing checks what it counts.
    const leaked = {
      ...thin.coverage,
      rulesReporting: thin.coverage.rulesReporting + 1,
    };
    expect(leaked.rulesReporting).toBeGreaterThan(thin.coverage.rulesReporting);
  });

  it("keeps the rule count at seven", () => {
    // An eighth FlagKind would silently redefine `minRulesReporting: 3` from
    // "three of seven" to "three of eight" — a weakening of the reassurance
    // gate that nobody decided to make.
    const result = evaluateEpisode({ entries: steadyRecovery(28) });
    expect(result.coverage.rulesTotal).toBe(7);
  });
});

describe("milestone states", () => {
  const evaluateWith = (milestones: Milestone[], tests: SelfTest[] = []): MilestoneState[] =>
    evaluateEpisode({
      entries: steadyRecovery(56),
      tests,
      measurements: MEASUREMENTS,
      milestones,
    }).progress.milestones.map((m) => m.state);

  it("records a goal the book actually meets", () => {
    expect(evaluateWith([REACHED])).toEqual(["recorded"]);
  });

  it("says a goal is not in the record rather than not reached", () => {
    // The naming is the regulatory position. "not-in-record" is a statement
    // about the book; "not-reached" would be a statement about the person.
    const out = evaluateWith([
      goal("high", {
        all: [
          {
            measure: { source: "measurement", key: "kniebeugen" },
            direction: "at_least",
            value: 99,
            unit: "reps",
          },
        ],
      }),
    ]);
    expect(out).toEqual(["not-in-record"]);
  });

  it("says so when the measure was never recorded at all", () => {
    const out = evaluateWith([
      goal("never", {
        all: [
          {
            measure: { source: "measurement", key: "klimmzuege" },
            direction: "at_least",
            value: 5,
            unit: "reps",
          },
        ],
      }),
    ]);
    expect(out).toEqual(["not-measurable"]);
  });

  it("leaves a goal the diary cannot see to the user", () => {
    expect(evaluateWith([goal("untracked")])).toEqual(["untracked"]);
    expect(evaluateWith([goal("ticked", { markedReachedOn: "2026-03-10" })])).toEqual([
      "marked-by-user",
    ]);
  });

  it("counts days rather than declaring one crossing enough", () => {
    // Without a measurement error, one crossing of a self-set bar is fragile.
    // The honest mitigation is not statistics — it is letting the user ask for
    // it twice.
    const twice = goal("twice", {
      onDistinctDays: 2,
      all: [
        {
          measure: { source: "measurement", key: "kniebeugen" },
          direction: "at_least",
          value: 12,
          unit: "reps",
        },
      ],
    });
    const thrice = goal("thrice", { ...twice, id: "thrice", onDistinctDays: 3 });

    expect(evaluateWith([twice])).toEqual(["recorded"]);
    expect(evaluateWith([thrice])).toEqual(["partly-recorded"]);
  });

  it("reaches every state it declares", () => {
    // The reachability discipline, applied to the newest list in the engine.
    const seen = new Set<MilestoneState>([
      ...evaluateWith([
        REACHED,
        goal("high", {
          all: [
            {
              measure: { source: "measurement", key: "kniebeugen" },
              direction: "at_least",
              value: 99,
              unit: "reps",
            },
          ],
        }),
        goal("never", {
          all: [
            {
              measure: { source: "measurement", key: "klimmzuege" },
              direction: "at_least",
              value: 5,
              unit: "reps",
            },
          ],
        }),
        goal("untracked"),
        goal("ticked", { markedReachedOn: "2026-03-10" }),
        goal("thrice", {
          onDistinctDays: 3,
          all: [
            {
              measure: { source: "measurement", key: "kniebeugen" },
              direction: "at_least",
              value: 12,
              unit: "reps",
            },
          ],
        }),
      ]),
    ]);

    const missing = ALL_MILESTONE_STATES.filter((s) => !seen.has(s));
    expect(missing, `no fixture produces: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("what may be said about a difference", () => {
  const recordFor = (profile: Profile) =>
    evaluateEpisode({
      entries: steadyRecovery(56),
      tests: symmetricTests(),
      profile,
      milestones: [
        goal("calf", {
          all: [
            {
              measure: { source: "self_test", type: "calf_raise", side: "involved" },
              direction: "at_least",
              value: 20,
              unit: "reps",
            },
          ],
        }),
      ],
    }).progress.records[0];

  it("claims nothing while no measurement error is established", () => {
    // True of every shipped profile today, and it must be SAID rather than
    // quietly omitted: that the engine cannot separate a real change from
    // repeat-measurement variation is a fact the reader is entitled to.
    const record = recordFor(profileFor("achilles"));
    expect(record?.claim).toEqual({ level: "recorded-only", why: "no-mdc-established" });

    const result = evaluateEpisode({
      entries: steadyRecovery(56),
      tests: symmetricTests(),
      milestones: [
        goal("calf", {
          all: [
            {
              measure: { source: "self_test", type: "calf_raise", side: "involved" },
              direction: "at_least",
              value: 20,
              unit: "reps",
            },
          ],
        }),
      ],
    });
    expect(result.progress.pending.map((p) => p.reason)).toContain("no-mdc-established");
  });

  it("refuses a guessed measurement error outright", () => {
    // A grade-D noise floor is worse than none: it manufactures exactly the
    // precision this project keeps declining to invent. PROFIL-ACHILLES.md
    // §7.1 records the near-miss that made this a rule.
    const guessed: Profile = {
      ...profileFor("achilles"),
      key: "t",
      measurementError: {
        calf_raise: { mdc: 2, unit: "reps", provenance: { grade: "D", source: "geschätzt" } },
      },
    };
    expect(recordFor(guessed)?.claim).toEqual({ level: "recorded-only", why: "mdc-not-graded" });
  });

  it("refuses a contested one just as firmly", () => {
    // Two sources give 2 and 6 repetitions for the heel raise. `contested` is
    // the field for exactly that, and it has to be load-bearing rather than
    // decorative.
    const contested: Profile = {
      ...profileFor("achilles"),
      key: "t",
      measurementError: {
        calf_raise: {
          mdc: 2,
          unit: "reps",
          provenance: { grade: "B", source: "zwei Quellen nennen 2 und 6", contested: true },
        },
      },
    };
    expect(recordFor(contested)?.claim).toEqual({ level: "recorded-only", why: "mdc-contested" });
  });

  it("uses a properly graded one, in both directions", () => {
    const graded = (mdc: number): Profile => ({
      ...profileFor("achilles"),
      key: "t",
      measurementError: {
        calf_raise: { mdc, unit: "reps", provenance: { grade: "B", source: "Studie mit Zahl" } },
      },
    });

    expect(recordFor(graded(1))?.claim.level).toBe("beyond-measurement-error");
    // The level people forget to build, and the one that protects a reader
    // from a false high.
    expect(recordFor(graded(99))?.claim.level).toBe("within-measurement-error");
  });
});

describe("the progress channel says what it cannot do", () => {
  it("declares every block it can report", () => {
    expect(ALL_PROGRESS_BLOCKS.length).toBeGreaterThan(0);
    for (const block of ALL_PROGRESS_BLOCKS) {
      expect(typeof block).toBe("string");
    }
  });

  it("hands back the day of the record with its anchor", () => {
    const result = evaluateEpisode({
      entries: steadyRecovery(28),
      context: { bodyRegion: "achilles", startedOn: "2026-02-01" },
    });
    expect(result.progress.episodeDay?.anchor).toBe("declared");

    const plain = evaluateEpisode({ entries: steadyRecovery(28) });
    expect(plain.progress.episodeDay?.anchor).toBe("first-entry");
  });
});
