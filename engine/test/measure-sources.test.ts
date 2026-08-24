/**
 * Every place a milestone can take its number from.
 *
 * ---------------------------------------------------------------------------
 * WRITTEN BECAUSE THREE OF THE FIVE HAD NO TEST AT ALL.
 *
 * `Measure` has five sources. The progress tests exercised two — a paired self
 * test and a self-recorded measurement — and the other three were reached by
 * nothing. Somebody setting the most natural goal of all, "a morning of nought
 * out of ten", was relying on code no test had ever run.
 *
 * The failure would have been silent in the worst way: a source that reads the
 * wrong field still returns numbers, so the milestone would simply be reached
 * on the wrong day, or never, and there is nothing on the screen that would
 * let anybody tell.
 *
 * Each case here asserts the VALUE, not merely that something came back. A
 * test that only checked for a non-empty series would pass just as happily if
 * `symptom_score` read the morning score.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { session } from "../src/fixtures.js";
import { evaluateEpisode } from "../src/evaluate.js";
import { profileFor } from "../src/profiles/registry.js";
import type { Milestone } from "../src/progress.js";
import type { Entry } from "../src/types.js";

const START = "2026-03-02";

/** Four days, every field different from every other, so a swap shows up. */
const ENTRIES: Entry[] = [
  { date: "2026-03-02", morningScore: 5, sessions: [session(5, 30, "run")], symptomScore: 4, symptomTiming: "after", note: null },
  { date: "2026-03-03", morningScore: 3, sessions: [session(4, 60, "cycle")], symptomScore: 2, symptomTiming: "during", note: null },
  { date: "2026-03-04", morningScore: 1, sessions: [], symptomScore: null, symptomTiming: null, note: null },
  { date: "2026-03-05", morningScore: 0, sessions: [session(6, 45, "run")], symptomScore: 1, symptomTiming: "after", note: null },
];

const goal = (id: string, over: Partial<Milestone>): Milestone => ({
  id,
  origin: "user",
  label: { text: "ein eigenes Ziel", locale: "de" },
  createdOn: START,
  all: [],
  onDistinctDays: 1,
  ...over,
});

function statusOf(milestone: Milestone) {
  const result = evaluateEpisode({
    entries: ENTRIES,
    milestones: [milestone],
    profile: profileFor("achilles"),
    context: { bodyRegion: "achilles", startedOn: START },
  });
  return result.progress.milestones[0]!;
}

describe("where a milestone takes its number from", () => {
  it("reads the morning score, and reaches nought out of ten", () => {
    // The most natural goal anybody with a tendon injury would set.
    const status = statusOf(
      goal("morning", {
        all: [{ measure: { source: "morning_score" }, direction: "at_most", value: 0, unit: "score_0_10" }],
      }),
    );

    expect(status.state).toBe("recorded");
    // 05.03. is the only morning at nought — 04.03. is a one.
    expect(status.completedOn).toBe("2026-03-05");
  });

  it("does not confuse the symptom score with the morning score", () => {
    // On 03.03. the symptom score is 2 and the morning score is 3. A goal of
    // "at most 2" is met by the symptom score on that day and NOT by the
    // morning score, so reading the wrong field moves the date.
    const status = statusOf(
      goal("symptom", {
        all: [{ measure: { source: "symptom_score" }, direction: "at_most", value: 2, unit: "score_0_10" }],
      }),
    );

    expect(status.state).toBe("recorded");
    expect(status.completedOn).toBe("2026-03-03");
  });

  it("skips days with no symptom score rather than reading them as nought", () => {
    // 04.03. has no symptom score. Treating absent as zero would make it the
    // best day in the record, which is the opposite of what it is.
    const status = statusOf(
      goal("symptom-zero", {
        all: [{ measure: { source: "symptom_score" }, direction: "at_most", value: 0, unit: "score_0_10" }],
      }),
    );

    expect(status.state).not.toBe("recorded");
  });

  it("reads session minutes across every activity when none is named", () => {
    const status = statusOf(
      goal("minutes", {
        all: [{ measure: { source: "session_minutes" }, direction: "at_least", value: 60, unit: "min" }],
      }),
    );

    // The 60 minutes are on the bike, on 03.03.
    expect(status.state).toBe("recorded");
    expect(status.completedOn).toBe("2026-03-03");
  });

  it("counts only the named activity when one is named", () => {
    // "45 minutes of running" must not be met by 60 minutes of cycling. This
    // is the whole point of the field: somebody coming back from an Achilles
    // injury cares about the running minutes and nothing else.
    const status = statusOf(
      goal("running-minutes", {
        all: [
          {
            measure: { source: "session_minutes", activityKind: "run" },
            direction: "at_least",
            value: 45,
            unit: "min",
          },
        ],
      }),
    );

    expect(status.state).toBe("recorded");
    expect(status.completedOn).toBe("2026-03-05");
  });

  it("finds nothing when the named activity never appears", () => {
    const status = statusOf(
      goal("swimming-minutes", {
        all: [
          {
            measure: { source: "session_minutes", activityKind: "swim" },
            direction: "at_least",
            value: 1,
            unit: "min",
          },
        ],
      }),
    );

    expect(status.state).not.toBe("recorded");
  });
});
