/**
 * Orchestration: run every rule over an episode and collect the verdicts.
 *
 * Results are returned as flags, ready to be persisted. Storing them rather
 * than recomputing on every page view means a warning shown yesterday stays
 * reproducible even after the thresholds change — which is why every flag
 * carries the rule version that produced it.
 *
 * The overall verdict is deliberately NOT a plain severity. An audit found this
 * layer reporting "green" for episodes in which almost nothing had been judged:
 * the 24-hour loop discarded every result it could not reach, and the summary
 * was a maximum over the flags that happened to survive. A green light nobody
 * earned is the one output this product cannot afford, so `Overall` now forces
 * the caller through `status === "judged"` before a severity is visible at all.
 */

import { assertConfig } from "./config.js";
import { addDays, compareDates, diffDays } from "./dates.js";
import { buildIndex, type EntryIndex } from "./episode.js";
import { evaluateAsymmetry } from "./rules/asymmetry.js";
import { evaluateBaselineDrift } from "./rules/baselineDrift.js";
import { evaluateLoadSpike } from "./rules/loadSpike.js";
import { evaluateLoadSpread } from "./rules/loadSpread.js";
import { evaluatePainPattern } from "./rules/painPattern.js";
import { evaluateResponse24h } from "./rules/response24h.js";
import { evaluateStagnation } from "./rules/stagnation.js";
import { configFor, profileByKey, profileFor } from "./profiles/registry.js";
import { evaluateProgress, type Milestone, type ProgressReport } from "./progress.js";
import type { Measurement } from "./measure.js";
import type { Profile } from "./profiles/types.js";
import { validateAll, validateEpisodeStart, type Problem } from "./validate.js";
import {
  DEFAULT_CONFIG,
  NEUTRAL_CONTEXT,
  RULE_VERSION,
  isBlocking,
  type BlockingReason,
  type Config,
  type Coverage,
  type DateStr,
  type Entry,
  type EpisodeContext,
  type Flag,
  type FlagKind,
  type FlagOf,
  type Overall,
  type Pending,
  type ReasonCode,
  type SelfTest,
  type Severity,
  type TestType,
} from "./types.js";

/** Every rule that can contribute a verdict. Used for the coverage count. */
const RULE_KINDS: FlagKind[] = [
  "response_24h",
  "load_spike",
  "asymmetry",
  "baseline_drift",
  "pain_pattern",
  "stagnation",
  "load_spread",
];

export interface EvaluationInput {
  entries: Entry[];
  tests?: SelfTest[];
  context?: EpisodeContext;
  config?: Config;
  /**
   * Skip input validation. Only for tests that deliberately feed broken data
   * to a single rule; never in production paths.
   */
  skipValidation?: boolean;
  /** Overrides the profile the body region would select. */
  profile?: Profile;
  /** Single self-recorded numbers with no reference side. */
  measurements?: Measurement[];
  /** Goals the user set for themselves. The engine authors none of these. */
  milestones?: Milestone[];
}

export interface Evaluation {
  flags: Flag[];
  /** The summary token. Carries a severity only when enough was actually judged. */
  overall: Overall;
  /** How much of the episode the engine could judge. */
  coverage: Coverage;
  /** Rules that wanted to speak and could not. Shown to the user as-is. */
  pending: Pending[];
  /** Input findings. A non-empty list means the verdicts above rest on bad data. */
  problems: Problem[];
  /** The profile these verdicts were produced under. */
  profile: Profile;
  /**
   * The thresholds these verdicts were actually produced under.
   *
   * The report used to render with DEFAULT_CONFIG regardless. No shipped
   * profile overrides a spike threshold yet, so nothing was wrong on screen —
   * but the first one that does would have had its verdicts explained against
   * numbers it was not judged by. Same class of dormant fault as the five dead
   * branches this engine has turned up.
   */
  config: Config;
  /** Last day the episode covers. Everything current is measured back from here. */
  lastDate: DateStr | null;
  /**
   * The user's own goals and their own series.
   *
   * A separate channel, never a rule. It carries no severity, takes no part in
   * coverage, and is computed after `overall` has already been decided — so a
   * milestone cannot unlock an all-clear it did not earn.
   */
  progress: ProgressReport;
}

export function evaluateEpisode(input: EvaluationInput): Evaluation {
  const baseContext = input.context ?? NEUTRAL_CONTEXT;
  // An explicit profile wins, then a named one from the context, then the
  // region's default. The middle step is why the registry was re-keyed: three
  // of the next four profiles are knee injuries, and naming the region can no
  // longer say which one somebody means.
  const profile =
    input.profile ??
    (baseContext.profileKey === undefined ? undefined : profileByKey(baseContext.profileKey)) ??
    profileFor(baseContext.bodyRegion);

  // The profile speaks through the configuration and through the tissue
  // weighting; the rules themselves never learn which injury they are looking
  // at. That separation is what keeps one kernel serving all of them.
  const config = configFor(input.config ?? DEFAULT_CONFIG, profile);
  assertConfig(config);

  const context: EpisodeContext = profile.tissue
    ? { ...baseContext, tissueOverride: { ...profile.tissue, ...baseContext.tissueOverride } }
    : baseContext;

  const tests = input.tests ?? [];
  const index = buildIndex(input.entries, context);

  const problems = input.skipValidation
    ? []
    : [
        ...validateAll(input.entries, tests).problems,
        // Needs the index, so it runs after it: an episode's declared start can
        // only be judged against the first row it actually has.
        ...validateEpisodeStart(context.startedOn, index.first).problems,
      ];
  const flagFrom = <K extends FlagKind>(
    kind: K,
    forDate: DateStr,
    severity: Severity,
    reason: ReasonCode,
    detail: FlagOf<K>["detail"],
  ): FlagOf<K> => makeFlag(profile.version, kind, forDate, severity, reason, detail);

  const flags: Flag[] = [];
  const pending: Pending[] = [];

  // ---- The per-day rule -------------------------------------------------
  //
  // Everything it could not judge used to be dropped on the floor. Now the
  // blocked days are counted and summarised into a single pending line, so a
  // silent rule is visible as a silent rule.

  let judgedDays = 0;
  let blockedDays = 0;
  const blockedByReason = new Map<BlockingReason, number>();

  for (const entry of index.entries) {
    const result = evaluateResponse24h(index, entry.date, config);

    if (result.status === "ok") {
      judgedDays++;
      flags.push(flagFrom("response_24h", entry.date, result.severity, result.reason, result.detail));
      continue;
    }

    // A rest day carries no reaction; a missing entry is not a diary day.
    if (!isBlocking(result.reason)) continue;

    // The last days of a diary legitimately have no tomorrow yet. That is the
    // diary catching up with the calendar, not a gap in the record.
    if (isTrailingEdge(index, entry.date, result.reason)) continue;

    blockedDays++;
    blockedByReason.set(result.reason, (blockedByReason.get(result.reason) ?? 0) + 1);
  }

  // One line per distinct reason, not per day and not collapsed to a single
  // dominant one. Per day would be noise; a single dominant reason would hide
  // the rarer ones entirely — which is how a gap in the middle of a diary can
  // disappear behind a run of early days that simply had no baseline yet.
  const expectedDays = judgedDays + blockedDays;
  for (const [reason, count] of [...blockedByReason.entries()].sort((a, b) => b[1] - a[1])) {
    pending.push({ kind: "response_24h", reason, affectedDays: count, expectedDays });
  }

  // ---- The standing rules ------------------------------------------------

  const latest = index.last;

  if (latest) {
    const spike = evaluateLoadSpike(index, latest, config);
    if (spike.status === "ok") {
      flags.push(flagFrom("load_spike", latest, spike.severity, spike.reason, spike.detail));
    } else if (isBlocking(spike.reason)) {
      pending.push({ kind: "load_spike", reason: spike.reason });
    }

    const drift = evaluateBaselineDrift(index, latest, config);
    if (drift.status === "ok") {
      flags.push(flagFrom("baseline_drift", latest, drift.severity, drift.reason, drift.detail));
    } else if (isBlocking(drift.reason)) {
      pending.push({ kind: "baseline_drift", reason: drift.reason });
    }

    const pattern = evaluatePainPattern(index, latest, config);
    if (pattern.status === "ok") {
      flags.push(flagFrom("pain_pattern", latest, pattern.severity, pattern.reason, pattern.detail));
    } else if (isBlocking(pattern.reason)) {
      pending.push({ kind: "pain_pattern", reason: pattern.reason });
    }

    const stagnation = evaluateStagnation(index, latest, config);
    if (stagnation.status === "ok") {
      flags.push(flagFrom("stagnation", latest, stagnation.severity, stagnation.reason, stagnation.detail));
    } else if (isBlocking(stagnation.reason)) {
      pending.push({ kind: "stagnation", reason: stagnation.reason });
    }

    const spread = evaluateLoadSpread(index, latest, config);
    if (spread.status === "ok") {
      flags.push(flagFrom("load_spread", latest, spread.severity, spread.reason, spread.detail));
    } else if (isBlocking(spread.reason)) {
      pending.push({ kind: "load_spread", reason: spread.reason });
    }
  }

  // ---- Asymmetry ----------------------------------------------------------
  //
  // One verdict per test type that has data. The rule can only ever decline for
  // one reason — no tests — so a per-type pending entry would be three
  // identical lines. Reported once, if at all.

  let anyAsymmetryVerdict = false;
  let asymmetryBlock: BlockingReason | null = null;

  for (const type of profile.tests) {
    const result = evaluateAsymmetry(tests, type, config, latest);

    if (result.status !== "ok") {
      // Carry the rule's OWN reason. An earlier version hard-coded "no tests"
      // here, which meant a newer, more specific reason — tests that exist but
      // are months out of date — could never reach anyone. Two of the three
      // test types will usually have no data at all, so a concrete reason from
      // any one of them outranks the generic one.
      if (isBlocking(result.reason)) {
        if (asymmetryBlock === null || asymmetryBlock === "no-tests") {
          asymmetryBlock = result.reason;
        }
      }
      continue;
    }

    const lastDate = lastTestDate(tests, type);
    if (!lastDate) continue;
    anyAsymmetryVerdict = true;
    flags.push(flagFrom("asymmetry", lastDate, result.severity, result.reason, result.detail));
  }

  // Reported once, not per test type — three identical lines would be noise.
  if (!anyAsymmetryVerdict && asymmetryBlock !== null) {
    pending.push({ kind: "asymmetry", reason: asymmetryBlock });
  }

  // ---- Summary ------------------------------------------------------------

  const rulesReporting = new Set(flags.map((f) => f.kind)).size;
  const coverage: Coverage = {
    judgedDays,
    blockedDays,
    responseRatio: expectedDays === 0 ? 1 : judgedDays / expectedDays,
    rulesReporting,
    rulesTotal: RULE_KINDS.length,
  };

  const overall = summarise(flags, coverage, pending, config, index.last);

  // Deliberately after the verdict, and the ordering is the design rather than
  // an accident of where the line sits. Nothing below can reach anything above.
  const progress = evaluateProgress({
    index,
    tests,
    measurements: input.measurements ?? [],
    milestones: input.milestones ?? [],
    profile,
  });

  return {
    flags,
    overall,
    coverage,
    pending,
    problems,
    profile,
    config,
    lastDate: index.last,
    progress,
  };
}

/**
 * Is the missing day simply beyond the end of the diary?
 *
 * A gap in the middle of the record is a real blind spot. The final two days
 * having no follow-up is just today being today.
 */
function isTrailingEdge(index: EntryIndex, date: DateStr, reason: BlockingReason): boolean {
  if (index.last === null) return false;
  if (reason === "next-day-missing") return compareDates(addDays(date, 1), index.last) > 0;
  if (reason === "second-day-missing") return compareDates(addDays(date, 2), index.last) > 0;
  return false;
}

/**
 * The summary, and the one place where "I could not check" must never come out
 * looking like "everything is fine".
 */
/**
 * Which flags describe the situation NOW.
 *
 * Two kinds of flag live in the same list and they age completely differently.
 *
 *   A STATE.  Six of the seven rules read a window ending on the last day and
 *             produce exactly one verdict. That verdict IS the present, and
 *             each of those rules already manages its own recency — the
 *             asymmetry rule declares its own tests stale after six weeks.
 *             Their latest flag therefore always counts.
 *
 *   AN EVENT. The 24-hour rule speaks once per training day, and those flags
 *             pile up for the whole episode. A reaction on one Tuesday is not
 *             a description of today.
 *
 * The first attempt at this used a plain date cutoff for everything, and a test
 * caught it immediately: a self-test from three weeks ago stopped counting. A
 * strength deficit does not expire in three weeks, and deciding when it does is
 * the asymmetry rule's job, not this function's.
 *
 * So: a flag is current if it is the latest its rule produced, or if it falls
 * inside `baseline.windowDays` — the span in which this engine defines what
 * "normal" means for a person. Reusing that dial avoids inventing a second
 * number to answer a question the first one already answers.
 */
export function currentFlags(flags: Flag[], config: Config, lastDate: DateStr | null): Flag[] {
  if (lastDate === null) return flags;

  const latestOfKind = new Map<FlagKind, DateStr>();
  for (const f of flags) {
    const seen = latestOfKind.get(f.kind);
    if (seen === undefined || compareDates(f.forDate, seen) > 0) latestOfKind.set(f.kind, f.forDate);
  }

  const cutoff = config.baseline.windowDays;
  return flags.filter(
    (f) => latestOfKind.get(f.kind) === f.forDate || diffDays(f.forDate, lastDate) < cutoff,
  );
}

function summarise(
  flags: Flag[],
  coverage: Coverage,
  pending: Pending[],
  config: Config,
  lastDate: DateStr | null,
): Overall {
  if (flags.length === 0) return { status: "no-data" };

  // The summary line answers "where does this stand", not "what has ever
  // happened here".
  //
  // It used to take the worst severity across the entire episode, which meant
  // a single red day could never be left behind: somebody who had one bad week
  // in month one carried a red summary through a full recovery, and the engine
  // had no way left to say "this is going well". The scenario built to ask
  // whether a verdict lets go — twelve weeks, a setback in week five, recovered
  // by week eight — came out RED on its last day.
  //
  // This does NOT weaken "coverage gates reassurance, never a warning". A
  // CURRENT finding still bypasses the coverage gate exactly as before. What
  // changed is that a finding from seven weeks ago no longer sets today's
  // status — and it is not hidden either: every flag stays in `flags` and the
  // report lists it. Only the one-word summary became a statement about now.
  // Never empty here, and that is a property rather than a coincidence:
  // `currentFlags` keeps the latest flag of every kind unconditionally, so for
  // any non-empty input at least one flag per kind survives. The empty case had
  // a branch guarding it — returning "insufficient" — which no scenario under
  // any profile could ever reach, and which would have been wrong if it had:
  // the latest reading of a rule IS the current state, however old it is.
  //
  // Removed rather than kept as defence, because a branch that cannot run is a
  // branch nobody maintains. The guarantee is asserted in test/invariants.test.ts
  // instead, where a change to `currentFlags` would break it loudly.
  const current = currentFlags(flags, config, lastDate);

  const worst = worstSeverity(current);

  // Coverage gates REASSURANCE, never a warning.
  //
  // The asymmetry is deliberate and it is the whole point. A finding stands on
  // its own evidence: if one rule saw a sharp load increase, that increase
  // happened, and burying it behind "not enough judged" would hide a real
  // signal. "Everything is fine", by contrast, is a claim about all the things
  // that did NOT happen — and that claim requires having looked.
  //
  // Getting this backwards would trade a false all-clear for a suppressed
  // warning. Both are bad; only one of them is silent.
  if (worst !== "green") return { status: "judged", severity: worst };

  const enoughDays = coverage.responseRatio >= config.coverage.minResponseRatio;
  const enoughRules = coverage.rulesReporting >= config.coverage.minRulesReporting;

  if (!enoughDays || !enoughRules) {
    const blocking = [...new Set(pending.map((p) => p.reason))];
    return { status: "insufficient", blocking };
  }

  return { status: "judged", severity: "green" };
}

/**
 * The one place where a flag is built.
 *
 * Generic in the rule kind, so passing a drift detail to a load-spike flag is
 * a compile error at the call site. TypeScript cannot prove the assembled
 * object matches the narrowed variant from inside a generic function, so there
 * is a single assertion here — traded against the five that used to sit at the
 * READ sites, which is where a mismatch would actually have done damage.
 */
function makeFlag<K extends FlagKind>(
  profileVersion: string,
  kind: K,
  forDate: DateStr,
  severity: Severity,
  reason: ReasonCode,
  detail: FlagOf<K>["detail"],
): FlagOf<K> {
  return {
    kind,
    forDate,
    severity,
    reason,
    detail,
    ruleVersion: RULE_VERSION,
    profileVersion,
  } as FlagOf<K>;
}

function lastTestDate(tests: SelfTest[], type: TestType): DateStr | null {
  const dates = tests.filter((t) => t.type === type).map((t) => t.date).sort(compareDates);
  return dates[dates.length - 1] ?? null;
}

function worstSeverity(flags: Flag[]): Severity {
  if (flags.some((f) => f.severity === "red")) return "red";
  if (flags.some((f) => f.severity === "amber")) return "amber";
  return "green";
}
