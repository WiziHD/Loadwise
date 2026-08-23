/**
 * What the record says about somebody's own goals — and nothing more.
 *
 * ---------------------------------------------------------------------------
 * THIS IS NOT AN EIGHTH RULE, AND THE REASON MATTERS.
 *
 * Every `Flag` carries a `Severity`. A milestone can only ever be green, and a
 * green flag increments `coverage.rulesReporting` — which is one of the two
 * gates that turn "not enough judged" into "all clear". So a person reaching
 * their own goal would push a too-thin diary over the reassurance threshold.
 *
 * That is precisely the failure `Overall` was rebuilt to prevent. A green light
 * nobody earned is the one output this product cannot afford, and a milestone
 * is the last place it should come from.
 *
 * So progress is a separate channel with no severity anywhere in it, computed
 * AFTER the verdict has already been decided. The ordering in evaluate.ts is
 * part of the design, not an accident of where the line sits.
 *
 * WHAT IT WILL NOT SAY.
 *
 * Not "you improved" — see ChangeClaim. Not "80% of the way there": twelve out
 * of fifteen repetitions asserts that twelve and fifteen differ meaningfully,
 * and no measurement error published for these tests supports that. Not "almost
 * there", which is a prediction wearing encouragement as a disguise.
 *
 * It says which days are in the book. That is a fact, and facts are what this
 * engine is allowed to have.
 * ---------------------------------------------------------------------------
 */

import { compareDates, diffDays } from "./dates.js";
import { episodeDay, type EntryIndex } from "./episode.js";
import { unitOf, type Measure, type Measurement, type Threshold, type Unit } from "./measure.js";
import type { Profile } from "./profiles/types.js";
import type { DateStr, SelfTest } from "./types.js";
import type { Locale } from "./wording.js";

// ---------------------------------------------------------------------------
// Tier 1 — what the user set for themselves
// ---------------------------------------------------------------------------

export type MilestoneId = string;

export interface Milestone {
  id: MilestoneId;
  /**
   * Literal. The lock that makes a published criterion structurally incapable
   * of arriving here — the same construction as `Protocol.enabled`.
   */
  origin: "user";
  /**
   * The user's own words, and deliberately a plain `string` rather than a
   * `Phrase`.
   *
   * That distinction keeps user speech out of the ban lists in
   * test/wording.test.ts. Those police what the ENGINE says. Applying them here
   * would mean the app refusing to save "I want to run again in six weeks" —
   * forbidding a person from speaking in their own diary. Same standing as
   * `Entry.note`, which no rule has ever read.
   */
  label: { text: string; locale: Locale };
  createdOn: DateStr;
  /**
   * All of these, on ONE calendar day.
   *
   * "Thirty minutes walking and symptoms at nought" is two facts about one day.
   * Spread across two days it would be reachable by somebody who never had a
   * good one.
   *
   * Empty means a goal the diary cannot see; the user ticks it themselves.
   */
  all: Threshold[];
  /** Distinct days that must satisfy every threshold. */
  onDistinctDays: number;
  /** Those days must fall inside a window this long. Omitted: no window. */
  withinDays?: number;
  /** Only meaningful when `all` is empty. */
  markedReachedOn?: DateStr | null;
}

/**
 * Where a milestone stands.
 *
 * The naming carries the regulatory position and is not a matter of taste.
 * "recorded" is a statement about the book; "achieved" would be a statement
 * about the person. "not-in-record" says the days are not there; "not-reached"
 * would say the person fell short. The engine only ever knows the first of
 * each pair.
 */
export type MilestoneState =
  | "recorded"
  | "partly-recorded"
  | "not-in-record"
  | "not-measurable"
  | "untracked"
  | "marked-by-user";

export type ProgressBlock =
  | "measure-never-recorded"
  | "no-measurements"
  | "no-mdc-established";

export const ALL_PROGRESS_BLOCKS = [
  "measure-never-recorded",
  "no-measurements",
  "no-mdc-established",
] as const;

export const ALL_MILESTONE_STATES = [
  "recorded",
  "partly-recorded",
  "not-in-record",
  "not-measurable",
  "untracked",
  "marked-by-user",
] as const;

type Exhaustive<U extends string, T extends readonly U[]> =
  [Exclude<U, T[number]>] extends [never] ? T : never;

const _blocksExhaustive: Exhaustive<ProgressBlock, typeof ALL_PROGRESS_BLOCKS> =
  ALL_PROGRESS_BLOCKS;
const _statesExhaustive: Exhaustive<MilestoneState, typeof ALL_MILESTONE_STATES> =
  ALL_MILESTONE_STATES;
void _blocksExhaustive;
void _statesExhaustive;

export interface QualifyingDay {
  date: DateStr;
  values: { measure: Measure; value: number }[];
}

/** No severity field, and no path to one. See the header. */
export interface MilestoneStatus {
  id: MilestoneId;
  state: MilestoneState;
  /** Every day in the record that met all of the thresholds, ascending. */
  qualifyingDays: QualifyingDay[];
  /** How many were asked for. The count in the book is `qualifyingDays.length`. */
  needed: number;
  completedOn: DateStr | null;
  blocked: ProgressBlock | null;
}

// ---------------------------------------------------------------------------
// Tier 2 — what the record already contains
// ---------------------------------------------------------------------------

export interface RecordedPoint {
  date: DateStr;
  value: number;
}

/**
 * What may honestly be said about a difference between two readings.
 *
 * The VISA-A questionnaire is the clearest warning available: one study puts
 * the smallest clinically meaningful change at 6.5 points, against a smallest
 * DETECTABLE change of at least 7. The smallest difference that means anything
 * sits below the noise floor. For the heel-raise test two sources give 2 and 6
 * repetitions.
 *
 * An app that turns that into "you have improved" is inventing precision the
 * measurement does not have.
 */
export type ChangeClaim =
  | {
      level: "recorded-only";
      why:
        | "no-mdc-established"
        | "mdc-contested"
        | "mdc-not-graded"
        /**
         * The measure is not a standardised test at all — a morning rating, or
         * something the user named themselves. Repeat-measurement variation is
         * the wrong frame for it, and saying "how far two measurements of this
         * TEST differ by chance" about somebody's daily 0-to-10 would be a
         * sentence that does not fit its subject.
         */
        | "not-a-standardised-test";
    }
  | { level: "beyond-measurement-error"; mdc: number; unit: Unit }
  | { level: "within-measurement-error"; mdc: number; unit: Unit };

export interface PersonalRecord {
  measure: Measure;
  unit: Unit;
  /** Every reading, ascending — the user's own series. */
  series: RecordedPoint[];
  first: RecordedPoint;
  /** The most recent reading. Not "best": that word needs a direction. */
  latest: RecordedPoint;
  claim: ChangeClaim;
}

export interface ProgressPending {
  milestoneId: MilestoneId | null;
  reason: ProgressBlock;
}

export interface ProgressReport {
  milestones: MilestoneStatus[];
  records: PersonalRecord[];
  pending: ProgressPending[];
  episodeDay: { day: number; anchor: "declared" | "first-entry" } | null;
}

export interface ProgressInput {
  index: EntryIndex;
  tests: SelfTest[];
  measurements: Measurement[];
  milestones: Milestone[];
  profile: Profile;
}

// ---------------------------------------------------------------------------

/** Every reading of one measure, ascending by date. */
function seriesOf(input: ProgressInput, measure: Measure): RecordedPoint[] {
  const out: RecordedPoint[] = [];

  switch (measure.source) {
    case "self_test":
      for (const t of input.tests) {
        if (t.type === measure.type) out.push({ date: t.date, value: t[measure.side] });
      }
      break;
    case "measurement":
      for (const m of input.measurements) {
        if (m.key === measure.key) out.push({ date: m.date, value: m.value });
      }
      break;
    case "morning_score":
      for (const e of input.index.entries) out.push({ date: e.date, value: e.morningScore });
      break;
    case "symptom_score":
      for (const e of input.index.entries) {
        if (e.symptomScore !== null && e.symptomScore !== undefined) {
          out.push({ date: e.date, value: e.symptomScore });
        }
      }
      break;
    case "session_minutes":
      for (const e of input.index.entries) {
        if (e.durationMin === null || e.durationMin === undefined) continue;
        if (measure.activityKind !== undefined && e.activityKind !== measure.activityKind) continue;
        out.push({ date: e.date, value: e.durationMin });
      }
      break;
  }

  return out.sort((a, b) => compareDates(a.date, b.date));
}

/** The unit a measure's readings are in, taken from the data where the kind cannot say. */
function unitFor(input: ProgressInput, measure: Measure): Unit | null {
  const known = unitOf(measure);
  if (known !== null) return known;
  if (measure.source !== "measurement") return null;
  return input.measurements.find((m) => m.key === measure.key)?.unit ?? null;
}

function meets(threshold: Threshold, value: number): boolean {
  return threshold.direction === "at_least" ? value >= threshold.value : value <= threshold.value;
}

/**
 * Whether a difference may be called a change.
 *
 * A measurement error is usable ONLY at evidence grade A or B and only when it
 * is not marked contested. A grade-D figure is refused outright: a guessed
 * noise floor is worse than none, because it manufactures exactly the precision
 * this refuses to invent. PROFIL-ACHILLES.md §7.1 is why — a number was almost
 * imported from the wrong row of a table.
 */
function claimFor(profile: Profile, measure: Measure, first: number, latest: number, unit: Unit): ChangeClaim {
  if (measure.source !== "self_test") {
    return { level: "recorded-only", why: "not-a-standardised-test" };
  }

  const error = profile.measurementError?.[measure.type];
  if (error === undefined) return { level: "recorded-only", why: "no-mdc-established" };
  if (error.provenance.contested === true) return { level: "recorded-only", why: "mdc-contested" };
  if (error.provenance.grade !== "A" && error.provenance.grade !== "B") {
    return { level: "recorded-only", why: "mdc-not-graded" };
  }

  const difference = Math.abs(latest - first);
  return difference >= error.mdc
    ? { level: "beyond-measurement-error", mdc: error.mdc, unit }
    : { level: "within-measurement-error", mdc: error.mdc, unit };
}

function evaluateMilestone(input: ProgressInput, milestone: Milestone): MilestoneStatus {
  const base = {
    id: milestone.id,
    needed: Math.max(1, milestone.onDistinctDays),
    qualifyingDays: [] as QualifyingDay[],
    completedOn: null as DateStr | null,
    blocked: null as ProgressBlock | null,
  };

  // A goal the diary cannot see. The user is the only one who can say.
  if (milestone.all.length === 0) {
    return milestone.markedReachedOn
      ? { ...base, state: "marked-by-user", completedOn: milestone.markedReachedOn }
      : { ...base, state: "untracked" };
  }

  const series = milestone.all.map((t) => ({ threshold: t, points: seriesOf(input, t.measure) }));

  if (series.some((s) => s.points.length === 0)) {
    return { ...base, state: "not-measurable", blocked: "measure-never-recorded" };
  }

  // Every day on which all of the thresholds were met at once.
  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort(compareDates);
  const qualifying: QualifyingDay[] = [];

  for (const date of dates) {
    const values: { measure: Measure; value: number }[] = [];
    let all = true;

    for (const { threshold, points } of series) {
      const point = points.find((p) => p.date === date);
      if (point === undefined || !meets(threshold, point.value)) {
        all = false;
        break;
      }
      values.push({ measure: threshold.measure, value: point.value });
    }

    if (all) qualifying.push({ date, values });
  }

  if (qualifying.length === 0) return { ...base, state: "not-in-record" };

  // With a window, the required days must sit inside one.
  const needed = base.needed;
  let completedOn: DateStr | null = null;

  for (let i = needed - 1; i < qualifying.length; i++) {
    const last = qualifying[i]!;
    const firstOfRun = qualifying[i - needed + 1]!;
    const insideWindow =
      milestone.withinDays === undefined ||
      diffDays(firstOfRun.date, last.date) < milestone.withinDays;
    if (insideWindow) {
      completedOn = last.date;
      break;
    }
  }

  return completedOn === null
    ? { ...base, state: "partly-recorded", qualifyingDays: qualifying }
    : { ...base, state: "recorded", qualifyingDays: qualifying, completedOn };
}

/** Which measures are worth showing a series for: everything a milestone names. */
function measuresInUse(milestones: Milestone[]): Measure[] {
  const seen = new Map<string, Measure>();
  for (const m of milestones) {
    for (const t of m.all) seen.set(JSON.stringify(t.measure), t.measure);
  }
  return [...seen.values()];
}

export function evaluateProgress(input: ProgressInput): ProgressReport {
  const milestones = input.milestones.map((m) => evaluateMilestone(input, m));

  const pending: ProgressPending[] = [];
  for (const status of milestones) {
    if (status.blocked !== null) pending.push({ milestoneId: status.id, reason: status.blocked });
  }

  const records: PersonalRecord[] = [];
  for (const measure of measuresInUse(input.milestones)) {
    const series = seriesOf(input, measure);
    if (series.length === 0) continue;

    const unit = unitFor(input, measure);
    if (unit === null) continue;

    const first = series[0]!;
    const latest = series[series.length - 1]!;
    const claim = claimFor(input.profile, measure, first.value, latest.value, unit);

    if (claim.level === "recorded-only" && !pending.some((p) => p.reason === "no-mdc-established")) {
      // Said out loud, never swallowed. That the engine cannot tell a real
      // change from measurement noise is a fact about the measurement, and the
      // person reading their own numbers is entitled to know it.
      pending.push({ milestoneId: null, reason: "no-mdc-established" });
    }

    records.push({ measure, unit, series, first, latest, claim });
  }

  const last = input.index.last;
  return {
    milestones,
    records,
    pending,
    episodeDay: last === null ? null : episodeDay(input.index, last),
  };
}
