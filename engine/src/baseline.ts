/**
 * The comparison value: what does a normal morning look like for this person?
 *
 * Median rather than mean, on purpose. A single bad morning after one hard
 * session must not drag the reference upward — otherwise every rough week
 * quietly redefines "normal" and the 24-hour rule stops firing exactly when
 * it matters most.
 *
 * The median protects against a single outlier. It does NOT protect against a
 * slow, steady climb over weeks: there the reference rises with the symptoms
 * and the rule falls silent legitimately. That blind spot is the reason
 * rules/baselineDrift exists.
 *
 * The window ends the day BEFORE the date under inspection, so a day is never
 * part of its own reference.
 */

import { addDays } from "./dates.js";
import { entriesBetween, type EntryIndex } from "./episode.js";
import { median } from "./load.js";
import type { Config, DateStr } from "./types.js";

export function rollingBaseline(
  index: EntryIndex,
  forDate: DateStr,
  config: Config,
): number | null {
  return baselineOver(index, addDays(forDate, -config.baseline.windowDays), addDays(forDate, -1), config.baseline.minEntries);
}

/** Median morning score over an explicit window. Used by the drift rule too. */
export function baselineOver(
  index: EntryIndex,
  from: DateStr,
  to: DateStr,
  minEntries: number,
): number | null {
  const inWindow = entriesBetween(index, from, to);
  if (inWindow.length < minEntries) return null;
  return median(inWindow.map((e) => e.morningScore));
}
