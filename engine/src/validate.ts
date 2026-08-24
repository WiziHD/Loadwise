/**
 * Checking what comes in, before any rule reasons about it.
 *
 * Returns findings rather than throwing: the interface later has to be able to
 * say WHICH field is wrong on WHICH day, and an exception carries none of that.
 *
 * Garbage in this engine does not produce an error — it produces a confident
 * wrong verdict. That is the failure mode this file exists to prevent.
 * See TECHNIK.md, risk 4.
 */

import { compareDates, isDateStr } from "./dates.js";
import type { DateStr, Entry, SelfTest } from "./types.js";
import type { Measurement, Unit } from "./measure.js";

export type ProblemCode =
  // Content of a parsed diary
  | "invalid-date"
  | "duplicate-date"
  | "morning-out-of-range"
  | "stiffness-out-of-range"
  | "rpe-out-of-range"
  | "duration-not-positive"
  | "load-incomplete"
  | "symptom-out-of-range"
  | "symptom-timing-without-score"
  | "test-value-not-positive"
  // Shape of an imported file — see import.ts
  | "empty-file"
  | "missing-column"
  | "not-a-number"
  | "unknown-activity"
  | "unknown-timing"
  // Self-recorded measurements
  | "measure-unit-conflict"
  | "measure-value-not-finite"
  // Shape of an imported self-test file
  | "unknown-test-type"
  | "unknown-unit"
  | "test-side-missing"
  | "unit-mismatch"
  // Episode context
  | "start-after-first-entry";

type Exhaustive<U extends string, T extends readonly U[]> =
  [Exclude<U, T[number]>] extends [never] ? T : never;

/**
 * Every code, as an array.
 *
 * The same discipline `ALL_REASON_CODES` and `ALL_BLOCKING_REASONS` already
 * carry, applied here for the first time. A verdict nobody can reach has been
 * this project's recurring defect — found six times — and a PROBLEM nobody can
 * reach is the same fault wearing different clothes: input that should be
 * refused would sail through, and nothing would object.
 */
export const ALL_PROBLEM_CODES = [
  "invalid-date",
  "duplicate-date",
  "morning-out-of-range",
  "stiffness-out-of-range",
  "rpe-out-of-range",
  "duration-not-positive",
  "load-incomplete",
  "symptom-out-of-range",
  "symptom-timing-without-score",
  "test-value-not-positive",
  "empty-file",
  "missing-column",
  "not-a-number",
  "unknown-activity",
  "unknown-timing",
  "measure-unit-conflict",
  "measure-value-not-finite",
  "unknown-test-type",
  "unknown-unit",
  "test-side-missing",
  "unit-mismatch",
  "start-after-first-entry",
] as const;

const _problemCodesExhaustive: Exhaustive<ProblemCode, typeof ALL_PROBLEM_CODES> =
  ALL_PROBLEM_CODES;
void _problemCodesExhaustive;

export interface Problem {
  code: ProblemCode;
  /** Which day or test the finding belongs to, when it has one. */
  date: DateStr | null;
  field: string | null;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  problems: Problem[];
}

const inRange = (value: number, min: number, max: number): boolean =>
  Number.isFinite(value) && value >= min && value <= max;

export function validateEntries(entries: Entry[]): ValidationResult {
  const problems: Problem[] = [];
  const seen = new Set<DateStr>();

  for (const entry of entries) {
    const at = entry.date;

    if (typeof at !== "string" || !isDateStr(at)) {
      problems.push({
        code: "invalid-date",
        date: typeof at === "string" ? at : null,
        field: "date",
        message: `Not a valid calendar date: ${String(at)}`,
      });
      continue; // everything else on this row is unanchored
    }

    if (seen.has(at)) {
      problems.push({
        code: "duplicate-date",
        date: at,
        field: "date",
        message: `More than one entry for ${at}. One diary day, one row.`,
      });
    }
    seen.add(at);

    if (!inRange(entry.morningScore, 0, 10)) {
      problems.push({
        code: "morning-out-of-range",
        date: at,
        field: "morningScore",
        message: `morningScore must be between 0 and 10, got ${entry.morningScore}`,
      });
    }

    // Die Dauer der Morgensteifigkeit. Keine Regel liest sie — aber sie wird
    // ANGEZEIGT, und minus fünfzig Minuten auf einem Bildschirm ist Unsinn, den
    // niemand mehr einordnen kann. Die Obergrenze ist ein Tag: Der VISA-A
    // sättigt schon bei hundert Minuten, alles darüber unterscheidet er nicht
    // mehr, aber wer eine ganze Nacht steif ist, darf das eintragen.
    const steif = entry.morningStiffnessMin;
    if (steif !== null && steif !== undefined && !inRange(steif, 0, 1440)) {
      problems.push({
        code: "stiffness-out-of-range",
        date: at,
        field: "morningStiffnessMin",
        message: `morningStiffnessMin must be between 0 and 1440, got ${steif}`,
      });
    }

    // Jede Einheit des Tages einzeln. Ein Tag kann mehrere haben, und die
    // Meldung muss sagen, WELCHE nicht stimmt — sonst sucht jemand in einem
    // Doppeltag nach der falschen Zahl.
    for (const [n, session] of entry.sessions.entries()) {
      const wo = entry.sessions.length > 1 ? ` (Einheit ${n + 1})` : "";

      if (!inRange(session.rpe, 1, 10)) {
        problems.push({
          code: "rpe-out-of-range",
          date: at,
          field: "rpe",
          message: `rpe must be between 1 and 10, got ${session.rpe}${wo}`,
        });
      }

      if (!(session.durationMin > 0)) {
        problems.push({
          code: "duration-not-positive",
          date: at,
          field: "durationMin",
          message: `durationMin must be greater than 0, got ${session.durationMin}${wo}`,
        });
      }
    }

    // `load-incomplete` steht hier NICHT mehr. Eine halbe Einheit — Anstrengung
    // ohne Minuten — ist seit `Session` nicht mehr darstellbar; der Typ verbietet
    // sie. Der Code lebt weiter, weil er weiter gebraucht wird: an der Grenze,
    // wo untypisierte Daten hereinkommen. `parseDiary` meldet ihn, siehe
    // import.ts. Eine Prüfung hier wäre ein Zweig, der nie läuft.

    const hasSymptom = entry.symptomScore !== null && entry.symptomScore !== undefined;
    if (hasSymptom && !inRange(entry.symptomScore as number, 0, 10)) {
      problems.push({
        code: "symptom-out-of-range",
        date: at,
        field: "symptomScore",
        message: `symptomScore must be between 0 and 10, got ${entry.symptomScore}`,
      });
    }

    if (entry.symptomTiming && !hasSymptom) {
      problems.push({
        code: "symptom-timing-without-score",
        date: at,
        field: "symptomScore",
        message: "A symptom timing was given without a symptom score — the pain pattern rule cannot weight it.",
      });
    }
  }

  return { ok: problems.length === 0, problems };
}

export function validateTests(tests: SelfTest[]): ValidationResult {
  const problems: Problem[] = [];

  for (const test of tests) {
    if (typeof test.date !== "string" || !isDateStr(test.date)) {
      problems.push({
        code: "invalid-date",
        date: typeof test.date === "string" ? test.date : null,
        field: "date",
        message: `Not a valid calendar date: ${String(test.date)}`,
      });
      continue;
    }

    // The two sides are NOT symmetrical, and treating them as if they were
    // rejected the single most meaningful reading this engine can receive.
    //
    // `involved: 0` is somebody who cannot manage one heel raise on the injured
    // side — day one of a rehab, or a tendon that has just been repaired. It is
    // a real measurement and it produces a real verdict: LSI 0, marked-deficit.
    // The engine used to report it as bad input.
    //
    // `uninvolved: 0` genuinely is unusable: it is the divisor, and
    // `limbSymmetryIndex` already returns null for it. A reference side that
    // cannot do anything is not a reference.
    if (!Number.isFinite(test.involved) || test.involved < 0) {
      problems.push({
        code: "test-value-not-positive",
        date: test.date,
        field: "involved",
        message: `involved must not be negative, got ${test.involved}`,
      });
    }

    if (!Number.isFinite(test.uninvolved) || test.uninvolved <= 0) {
      problems.push({
        code: "test-value-not-positive",
        date: test.date,
        field: "uninvolved",
        message: `uninvolved is the reference side and must be greater than 0, got ${test.uninvolved}`,
      });
    }
  }

  return { ok: problems.length === 0, problems };
}

/**
 * Self-recorded measurements, and the one check that matters.
 *
 * `key` is an open string on purpose (see measure.ts), which leaves exactly one
 * way for it to go wrong: the same name arriving in two different units. Thirty
 * minutes compared against thirty seconds is a silent, plausible, completely
 * wrong answer — and it is the only failure an open key can produce that the
 * user would never spot.
 *
 * So the unit is frozen at first sight and every later row must agree.
 */
export function validateMeasurements(measurements: Measurement[]): ValidationResult {
  const problems: Problem[] = [];
  const unitOfKey = new Map<string, Unit>();

  for (const m of measurements) {
    if (typeof m.date !== "string" || !isDateStr(m.date)) {
      problems.push({
        code: "invalid-date",
        date: typeof m.date === "string" ? m.date : null,
        field: "date",
        message: `Not a valid calendar date: ${String(m.date)}`,
      });
      continue;
    }

    if (!Number.isFinite(m.value)) {
      problems.push({
        code: "measure-value-not-finite",
        date: m.date,
        field: "value",
        message: `${m.key} must be a number, got ${String(m.value)}`,
      });
      continue;
    }

    const seen = unitOfKey.get(m.key);
    if (seen === undefined) {
      unitOfKey.set(m.key, m.unit);
    } else if (seen !== m.unit) {
      problems.push({
        code: "measure-unit-conflict",
        date: m.date,
        field: "unit",
        message: `${m.key} was first recorded in ${seen} and now arrives in ${m.unit}`,
      });
    }
  }

  return { ok: problems.length === 0, problems };
}

/**
 * The declared start of an episode, against the record it belongs to.
 *
 * An episode cannot begin after its own first diary row. If it appears to,
 * either the date is a typo or the rows belong to a different episode — and
 * both are worth saying rather than silently producing a negative day count.
 */
export function validateEpisodeStart(
  startedOn: DateStr | undefined,
  firstEntry: DateStr | null,
): ValidationResult {
  const problems: Problem[] = [];

  if (startedOn !== undefined) {
    if (!isDateStr(startedOn)) {
      problems.push({
        code: "invalid-date",
        date: null,
        field: "startedOn",
        message: `Not a valid calendar date: ${String(startedOn)}`,
      });
    } else if (firstEntry !== null && compareDates(startedOn, firstEntry) > 0) {
      problems.push({
        code: "start-after-first-entry",
        date: startedOn,
        field: "startedOn",
        message: `The episode is declared to start on ${startedOn}, after its own first entry on ${firstEntry}.`,
      });
    }
  }

  return { ok: problems.length === 0, problems };
}

export function validateAll(
  entries: Entry[],
  tests: SelfTest[] = [],
  measurements: Measurement[] = [],
): ValidationResult {
  const problems = [
    ...validateEntries(entries).problems,
    ...validateTests(tests).problems,
    ...validateMeasurements(measurements).problems,
  ];
  return { ok: problems.length === 0, problems };
}
