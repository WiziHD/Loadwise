/**
 * Has anything actually got better?
 *
 * An audit found a hole running through the whole engine: every rule reads a
 * DIFFERENCE, never a level. Somebody whose morning score climbed from 2 to 8
 * and then held at 8 is graded green by all of them — the rolling median sits
 * at 8, so the 24-hour delta is zero; the drift is zero; the training volume is
 * unchanged. The engine tells a person in constant pain that everything is
 * fine, and it cannot do otherwise, because it has no word for "the level
 * itself".
 *
 * ---------------------------------------------------------------------------
 * WHY THIS RULE REPORTS DURATION AND NOT HEIGHT.
 *
 * The obvious fix is a clinical threshold: amber above 4, red above 6. We would
 * have to invent those numbers. No data in this project supports them, and a
 * badly chosen line becomes a NEW source of wrong verdicts — trading a missing
 * warning for a false one.
 *
 * So this rule compares the person only to themselves: has the baseline moved
 * since the episode began? "Your morning baseline has sat at 6 out of 10 for
 * nine weeks" needs no invented threshold, states a fact rather than a
 * judgement, and is precisely the thing nobody notices from inside it.
 *
 * The one number it does use — `notableLevel` — is not clinical either. It only
 * separates "essentially no complaints" from "something", so that a person
 * steady at 1 out of 10 is not told they have failed to improve.
 * ---------------------------------------------------------------------------
 */

import { addDays, diffDays } from "../dates.js";
import { baselineOver } from "../baseline.js";
import type { EntryIndex } from "../episode.js";
import type { Config, DateStr, RuleResult, StagnationDetail } from "../types.js";

export function evaluateStagnation(
  index: EntryIndex,
  forDate: DateStr,
  config: Config,
): RuleResult<StagnationDetail> {
  const { minWeeks, windowDays, minImprovement, notableLevel, minEntriesPerWindow } =
    config.stagnation;

  if (index.first === null) return { status: "insufficient", reason: "history-too-short" };

  const span = diffDays(index.first, forDate) + 1;
  if (span < minWeeks * 7) return { status: "insufficient", reason: "history-too-short" };

  const startBaseline = baselineOver(
    index,
    index.first,
    addDays(index.first, windowDays - 1),
    minEntriesPerWindow,
  );
  const currentBaseline = baselineOver(
    index,
    addDays(forDate, -(windowDays - 1)),
    forDate,
    minEntriesPerWindow,
  );

  if (startBaseline === null || currentBaseline === null) {
    return { status: "insufficient", reason: "history-too-sparse" };
  }

  const change = currentBaseline - startBaseline;
  const weeks = Math.floor(span / 7);
  const detail: StagnationDetail = { startBaseline, currentBaseline, change, weeks };

  // Genuine improvement, whatever the level.
  if (change <= -minImprovement) {
    return { status: "ok", severity: "green", reason: "progress-since-start", detail };
  }

  // Nothing left to improve — a person steady near zero has not stagnated.
  //
  // This branch used to answer "progress-since-start", whose approved sentence
  // is "the baseline is LOWER than at the start". That sentence cannot be true
  // here: this branch is only reached when the baseline did NOT fall by a
  // meaningful amount. Somebody who sat at 1 out of 10 for twelve weeks was
  // told they had improved, and somebody who went from 0 to 1 was told the same.
  //
  // No scenario in the library reached it, so nothing ever contradicted it —
  // the sixth unreachable branch found in this engine, and the first that would
  // have spoken a falsehood rather than staying silent. It has its own verdict
  // now, and `settledNearZero` in fixtures.ts exists to keep it reachable.
  if (currentBaseline < notableLevel) {
    return { status: "ok", severity: "green", reason: "settled-near-zero", detail };
  }

  // Worse than at the start — a third state, and for a long time this rule did
  // not have it. A course that went from 1 to 7 over eight weeks was reported
  // as "as high as at the start", which is simply untrue. Somebody who
  // deteriorated and somebody who stalled were given the same sentence.
  //
  // No new number is invented here: the same `minImprovement` that defines
  // progress downwards defines deterioration upwards.
  //
  // It stays AMBER rather than red on purpose. This rule refuses to escalate on
  // height anywhere else — that is its founding principle — and `baselineDrift`
  // already owns the question of how FAST something is rising, going red when
  // that is warranted. What this rule adds is the word, not the alarm level,
  // and the word is where the difference belongs.
  if (change >= minImprovement) {
    return { status: "ok", severity: "amber", reason: "worse-than-start", detail };
  }

  return { status: "ok", severity: "amber", reason: "no-progress-since-start", detail };
}
