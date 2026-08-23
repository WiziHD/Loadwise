/**
 * Load spikes: the last week against the recent norm.
 *
 * UNCOUPLED on purpose. The widely quoted version of this ratio puts the
 * current week inside the reference period as well, so the same load appears
 * above and below the line. That dampens every spike and — worse for us —
 * makes it arithmetically impossible for the reference to be zero while the
 * current week is not. Which would silently hide the single most important
 * case: somebody returning to training after a long lay-off.
 *
 * Here the reference is the weeks BEFORE the current one, so the two windows
 * never overlap.
 *
 * ---------------------------------------------------------------------------
 * PER RECORDED DAY, NOT PER WINDOW. The earlier version divided the reference
 * total by a fixed constant — three weeks — no matter how many of those
 * twenty-one days actually had an entry. A patchy reference period therefore
 * looked quieter than it was and inflated the ratio into a false
 * `sharp-increase`; gaps in the current week did the reverse and produced a
 * false `detraining`. Both windows are now measured against the days they
 * actually contain, and each has to clear the coverage bar on its own before
 * any comparison happens at all.
 * ---------------------------------------------------------------------------
 *
 * Caveat carried deliberately: this ratio is CONTESTED in sport science; the
 * original studies drew methodological criticism. It is used as a hint, never
 * as a verdict, and the wording downstream must reflect that — "your load rose
 * sharply this week", never "you are going to get injured".
 * See TECHNIK.md, section 4.3.
 */

import { addDays, diffDays } from "../dates.js";
import { daysCovered, loadBetween, rawLoadBetween, type EntryIndex } from "../episode.js";
import type { Config, DateStr, LoadSpikeDetail, RuleResult } from "../types.js";

export function evaluateLoadSpike(
  index: EntryIndex,
  forDate: DateStr,
  config: Config,
): RuleResult<LoadSpikeDetail> {
  const { acuteDays, chronicDays, minCoverage } = config.spike;

  const chronicStart = addDays(forDate, -(chronicDays - 1));
  const acuteStart = addDays(forDate, -(acuteDays - 1));
  const referenceEnd = addDays(acuteStart, -1);
  const referenceDays = chronicDays - acuteDays;

  // Enough history to have a norm at all?
  if (index.first === null || diffDays(index.first, chronicStart) < 0) {
    return { status: "insufficient", reason: "history-too-short" };
  }

  const acuteCovered = daysCovered(index, acuteStart, forDate);
  const referenceCovered = daysCovered(index, chronicStart, referenceEnd);

  // Each window must stand on its own. A well-filled month with one empty week
  // is not a month we can compare across.
  if (
    acuteCovered < Math.ceil(acuteDays * minCoverage) ||
    referenceCovered < Math.ceil(referenceDays * minCoverage)
  ) {
    return { status: "insufficient", reason: "history-too-sparse" };
  }

  const acuteTotal = loadBetween(index, acuteStart, forDate);
  const referenceTotal = loadBetween(index, chronicStart, referenceEnd);

  // Average per recorded day, then expressed as a week so the reported numbers
  // stay readable. Dividing by recorded days is what removes the coverage bias.
  const acute = (acuteTotal / acuteCovered) * acuteDays;
  const chronic = (referenceTotal / referenceCovered) * acuteDays;

  // The same arithmetic on the UNWEIGHTED sessions.
  //
  // Somebody who swaps running for cycling while a tendon calms down has not
  // trained less — the tissue simply stopped being loaded. Reporting only the
  // weighted number tells them their volume collapsed, and they will correctly
  // reply that it did not. Carrying both lets the verdict stay accurate while
  // the sentence stays credible.
  const rawAcute = (rawLoadBetween(index, acuteStart, forDate) / acuteCovered) * acuteDays;
  const rawChronic =
    (rawLoadBetween(index, chronicStart, referenceEnd) / referenceCovered) * acuteDays;
  const rawRatio = rawChronic === 0 ? null : rawAcute / rawChronic;

  const detail = {
    acute,
    chronic,
    rawAcute,
    rawChronic,
    rawRatio,
    daysCovered: acuteCovered + referenceCovered,
  };

  if (chronic === 0) {
    if (acute === 0) {
      return {
        status: "ok",
        severity: "green",
        reason: "no-load-recorded",
        detail: { ...detail, ratio: null },
      };
    }
    // Straight from complete rest back into training — the classic setup.
    return {
      status: "ok",
      severity: "red",
      reason: "return-from-zero",
      detail: { ...detail, ratio: null },
    };
  }

  const ratio = acute / chronic;
  const rounded = { ...detail, ratio };

  if (ratio > config.spike.redAbove) {
    return { status: "ok", severity: "red", reason: "sharp-increase", detail: rounded };
  }
  if (ratio > config.spike.amberAbove) {
    return { status: "ok", severity: "amber", reason: "rising-fast", detail: rounded };
  }
  if (ratio < config.spike.amberBelow) {
    return { status: "ok", severity: "amber", reason: "detraining", detail: rounded };
  }
  return { status: "ok", severity: "green", reason: "steady", detail: rounded };
}
