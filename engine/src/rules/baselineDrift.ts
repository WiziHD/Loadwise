/**
 * Creeping deterioration — the frog in slowly heating water.
 *
 * This rule exists because of a blind spot in our own 24-hour rule. That rule
 * compares each morning against a rolling median of the last fortnight. If the
 * mornings get worse GRADUALLY, the median climbs along with them: yesterday's
 * "bad" quietly becomes today's "normal", the delta stays small, and the rule
 * reports green while the person slowly gets worse over months.
 *
 * Nothing is broken in that case, and nothing looks wrong. Which is precisely
 * why a human does not catch it either — it plays out over weeks, and memory
 * of how a calf felt six weeks ago is not reliable.
 *
 * So this rule watches the reference itself instead of the days.
 */

import { addDays } from "../dates.js";
import { baselineOver } from "../baseline.js";
import type { EntryIndex } from "../episode.js";
import type { BaselineDriftDetail, Config, DateStr, RuleResult, Severity } from "../types.js";

export function evaluateBaselineDrift(
  index: EntryIndex,
  forDate: DateStr,
  config: Config,
): RuleResult<BaselineDriftDetail> {
  const { windowDays, minEntriesPerWindow, amberRise, redRise } = config.drift;

  const recent = windowAt(index, forDate, 0, windowDays, minEntriesPerWindow);
  const previous = windowAt(index, forDate, 1, windowDays, minEntriesPerWindow);

  if (recent === null || previous === null) {
    return { status: "insufficient", reason: "history-too-short" };
  }

  const change = recent - previous;

  // How far back does the climb go? A rise across several fortnights is a very
  // different story from one bad stretch, so it is counted and reported.
  let risingWindows = 0;
  for (let step = 0; step < 6; step++) {
    const a = windowAt(index, forDate, step, windowDays, minEntriesPerWindow);
    const b = windowAt(index, forDate, step + 1, windowDays, minEntriesPerWindow);
    if (a === null || b === null) break;
    if (a - b > 0) risingWindows++;
    else break;
  }

  const detail: BaselineDriftDetail = { recent, previous, change, risingWindows };

  let severity: Severity = "green";
  let reason: "baseline-stable" | "baseline-creeping" | "baseline-rising" = "baseline-stable";

  if (change >= redRise) {
    severity = "red";
    reason = "baseline-rising";
  } else if (change >= amberRise) {
    severity = "amber";
    reason = "baseline-creeping";
  } else if (risingWindows >= 3) {
    // Each step small enough to look harmless, three of them in a row is not.
    //
    // Note the interaction, found by the calibration run: for a slow, steady
    // climb this branch fires no matter how amberRise is set, so that dial has
    // no say there. The two mechanisms cover different shapes — this one a long
    // gentle slope, amberRise a single sharp step that then holds — and only
    // look redundant when the scenario library lacks the second shape.
    severity = "amber";
    reason = "baseline-creeping";
  }

  return { status: "ok", severity, reason, detail };
}

/** Baseline for the window `stepsBack` fortnights before `forDate`. */
function windowAt(
  index: EntryIndex,
  forDate: DateStr,
  stepsBack: number,
  windowDays: number,
  minEntries: number,
): number | null {
  const end = addDays(forDate, -stepsBack * windowDays);
  const start = addDays(end, -(windowDays - 1));
  return baselineOver(index, start, end, minEntries);
}
