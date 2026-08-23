/**
 * Where the pain sits in relation to the session.
 *
 * In tendon problems the timing carries information the intensity does not.
 * Pain that is present at the start and eases as the tissue warms up is the
 * classic picture and is usually tolerated. Pain that appears DURING loading,
 * or arrives afterwards and stays, is the warning sign.
 *
 * The timing is therefore treated as an ordered scale rather than a set of
 * labels — closer to the load means worse:
 *
 *     evening (1)  <  after (2)  <  during (3)
 *
 * The rule tracks the weighted average of that scale over time. A drift
 * upwards means the problem is moving closer to the load itself, which can
 * happen while the reported pain scores stay exactly the same. That shift is
 * invisible day by day and obvious over two months — which is the kind of
 * thing this engine exists to notice.
 */

import { addDays } from "../dates.js";
import { entriesBetween, type EntryIndex } from "../episode.js";
import type {
  Config,
  DateStr,
  Entry,
  PainPatternDetail,
  RuleResult,
  Severity,
  SymptomTiming,
} from "../types.js";

const ORDINAL: Record<SymptomTiming, number> = {
  evening: 1,
  after: 2,
  during: 3,
};

interface WindowSummary {
  index: number;
  reports: number;
}

export function evaluatePainPattern(
  index: EntryIndex,
  forDate: DateStr,
  config: Config,
): RuleResult<PainPatternDetail> {
  const { windowDays, minReportsPerWindow, worseningShift, easingShift } = config.pattern;

  const recentEnd = forDate;
  const recentStart = addDays(recentEnd, -(windowDays - 1));
  const previousEnd = addDays(recentStart, -1);
  const previousStart = addDays(previousEnd, -(windowDays - 1));

  const recent = summarise(entriesBetween(index, recentStart, recentEnd));
  const previous = summarise(entriesBetween(index, previousStart, previousEnd));

  if (recent.reports < minReportsPerWindow || previous.reports < minReportsPerWindow) {
    return { status: "insufficient", reason: "too-few-symptom-reports" };
  }

  const change = recent.index - previous.index;

  const detail: PainPatternDetail = {
    recent: recent.index,
    previous: previous.index,
    change,
    recentReports: recent.reports,
    previousReports: previous.reports,
  };

  let severity: Severity = "green";
  let reason: "pattern-stable" | "pattern-easing" | "pattern-worsening" = "pattern-stable";

  if (change >= worseningShift) {
    severity = "amber";
    reason = "pattern-worsening";
  } else if (change <= easingShift) {
    severity = "green";
    reason = "pattern-easing";
  }

  return { status: "ok", severity, reason, detail };
}

/**
 * Only days with an actual symptom report count. A session that hurt nowhere
 * carries no timing information, and counting it as a zero would drag the
 * average toward whatever end of the scale happens to be numerically lower.
 */
function summarise(entries: Entry[]): WindowSummary {
  let weighted = 0;
  let weight = 0;
  let reports = 0;

  for (const entry of entries) {
    const timing = entry.symptomTiming;
    const score = entry.symptomScore ?? 0;
    if (!timing || score <= 0) continue;
    weighted += ORDINAL[timing] * score;
    weight += score;
    reports++;
  }

  return { index: weight === 0 ? 0 : weighted / weight, reports };
}
