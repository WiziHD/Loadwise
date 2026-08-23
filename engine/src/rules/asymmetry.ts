/**
 * Side-to-side asymmetry — the differentiating rule.
 *
 * The absolute Limb Symmetry Index is the well-known part. The valuable part
 * is the TREND: an index that keeps falling test after test is the early
 * warning for the cascade (one injury, compensation, imbalance, second injury
 * elsewhere). A single measurement cannot show that. Three can.
 *
 * ---------------------------------------------------------------------------
 * THE RULE USED TO CONTRADICT ITS OWN PREMISE.
 *
 * A ratio between two sides only means anything while the reference side is
 * healthy — and the cascade this rule exists to detect is precisely what
 * destroys that assumption. Somebody compensating onto the good leg for months
 * loses strength on BOTH sides; the index holds steady while the person gets
 * worse, and the rule reports symmetry.
 *
 * So the healthy side is now tracked in absolute terms as well. A reference
 * that is itself eroding gets said out loud instead of silently flattering the
 * ratio.
 *
 * Two further corrections from the same audit:
 *
 *  - The rule threw away the dates it already had. Three tests spread over a
 *    year counted exactly as much as three over six weeks, and a measurement
 *    from four months ago could still drive today's verdict.
 *
 *  - A widening trend overwrote the REASON, not just the severity. At 70 % and
 *    falling the verdict stayed red but came back labelled "the gap is
 *    widening", so `marked-deficit` was unreachable in the worst combination
 *    there is — and Phase 1 would have written the wrong sentence to exactly
 *    the person who most needed the right one. The absolute finding is now the
 *    headline whenever there is one; the trend is the headline only when the
 *    value alone looks acceptable.
 * ---------------------------------------------------------------------------
 */

import { compareDates, diffDays } from "../dates.js";
import type {
  AsymmetryDetail,
  Config,
  DateStr,
  ReasonCode,
  RuleResult,
  SelfTest,
  Severity,
  TestType,
} from "../types.js";

const SEVERITY_ORDER: Record<Severity, number> = { green: 0, amber: 1, red: 2 };

export function worstOf(a: Severity, b: Severity): Severity {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}

export function limbSymmetryIndex(test: SelfTest): number | null {
  if (test.uninvolved <= 0) return null;
  return (test.involved / test.uninvolved) * 100;
}

/**
 * Evaluates one test type as of `forDate`. Returns the verdict for the most
 * recent measurement, with the trend and the state of the reference side
 * folded in.
 */
export function evaluateAsymmetry(
  tests: SelfTest[],
  type: TestType,
  config: Config,
  forDate: DateStr | null = null,
): RuleResult<AsymmetryDetail> {
  const { greenMinLsi, amberMinLsi, trendTestCount, maxAgeDays, minSpanDays, referenceDeclinePct } =
    config.asymmetry;

  const usable = tests
    .filter((t) => t.type === type && limbSymmetryIndex(t) !== null)
    .sort((a, b) => compareDates(a.date, b.date));

  if (usable.length === 0) return { status: "insufficient", reason: "no-tests" };

  const newest = usable[usable.length - 1]!;

  // A measurement from months ago describes a body that no longer exists.
  if (forDate !== null && diffDays(newest.date, forDate) > maxAgeDays) {
    return { status: "insufficient", reason: "tests-stale" };
  }

  const history = usable.map((t) => limbSymmetryIndex(t)!);
  const uninvolvedHistory = usable.map((t) => t.uninvolved);
  const lsi = history[history.length - 1]!;

  let severity: Severity;
  let reason: ReasonCode;
  if (lsi >= greenMinLsi) {
    severity = "green";
    reason = "symmetric";
  } else if (lsi >= amberMinLsi) {
    severity = "amber";
    reason = "mild-deficit";
  } else {
    severity = "red";
    reason = "marked-deficit";
  }

  const widening = isWidening(usable, history, trendTestCount, minSpanDays);
  const referenceDeclining = isReferenceDeclining(usable, uninvolvedHistory, trendTestCount, minSpanDays, referenceDeclinePct);

  const detail: AsymmetryDetail = {
    type,
    lsi,
    history,
    uninvolvedHistory,
    widening,
    referenceDeclining,
  };

  // An eroding reference outranks everything else the ratio can say, because
  // it means the ratio itself has stopped being trustworthy.
  if (referenceDeclining) {
    return { status: "ok", severity: worstOf(severity, "amber"), reason: "reference-eroding", detail };
  }

  // The trend is only the headline when the value alone looks acceptable.
  // Otherwise the deficit is the news and the trend is context in the detail.
  if (widening && severity === "green") {
    return { status: "ok", severity: "amber", reason: "widening-gap", detail };
  }

  return { status: "ok", severity, reason, detail };
}

/** True when the last `count` measurements fall step by step over real time. */
function isWidening(
  tests: SelfTest[],
  history: number[],
  count: number,
  minSpanDays: number,
): boolean {
  if (history.length < count) return false;
  const recent = history.slice(-count);
  const recentTests = tests.slice(-count);

  // Three measurements taken in the same week are one measurement with noise.
  const span = diffDays(recentTests[0]!.date, recentTests[recentTests.length - 1]!.date);
  if (span < minSpanDays) return false;

  for (let i = 1; i < recent.length; i++) {
    if (recent[i]! >= recent[i - 1]!) return false;
  }
  return true;
}

/**
 * Is the healthy side itself losing ground?
 *
 * If it is, the index can hold perfectly steady while both legs get weaker —
 * the exact blind spot that made this rule contradict its own premise.
 */
function isReferenceDeclining(
  tests: SelfTest[],
  uninvolved: number[],
  count: number,
  minSpanDays: number,
  declinePct: number,
): boolean {
  if (uninvolved.length < count) return false;
  const recent = uninvolved.slice(-count);
  const recentTests = tests.slice(-count);

  const span = diffDays(recentTests[0]!.date, recentTests[recentTests.length - 1]!.date);
  if (span < minSpanDays) return false;

  // Safe to divide: the caller filtered out every test whose reference side
  // was zero or negative before this was ever reached. A guard here would be
  // an unreachable branch, which is the one thing this engine does not allow.
  const first = recent[0]!;
  const last = recent[recent.length - 1]!;
  return ((first - last) / first) * 100 >= declinePct;
}
