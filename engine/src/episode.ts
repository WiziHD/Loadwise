/**
 * The prepared view every rule reads from.
 *
 * Built once per evaluation instead of per rule per day. Before this existed,
 * the 24-hour rule rebuilt its own date map on every single call, making a
 * full episode evaluation quadratic in the number of entries.
 *
 * It also carries the episode context, which the tissue factor needs — that is
 * why the rules take an index rather than a bare array of entries.
 *
 * ---------------------------------------------------------------------------
 * ONE ROW PER CALENDAR DAY. This is the guarantee everything above depends on.
 *
 * An audit found `entries` and `byDate` disagreeing: the array kept every row
 * while the maps collapsed duplicates. Every window in the engine measures its
 * evidence by counting entries in range, so a duplicated row inflated the
 * coverage gates AND had its load counted twice — verified as `daysCovered: 29`
 * inside a 28-day window. An invalid date like `2026-03-32` did the same, and
 * worse: date arithmetic silently rolls it into April, so a rule could emit a
 * flag for a day that never existed.
 *
 * Both are dropped here, at the door, so no rule can ever see one. Reporting
 * them is validate.ts's job; not tripping over them is this file's.
 * ---------------------------------------------------------------------------
 */

import { compareDates, diffDays, isDateStr } from "./dates.js";
import { loadOf } from "./load.js";
import {
  NEUTRAL_CONTEXT,
  type DateStr,
  type Entry,
  type EpisodeContext,
} from "./types.js";

export interface EntryIndex {
  /** Sorted ascending, exactly one per calendar day. */
  entries: Entry[];
  byDate: Map<DateStr, Entry>;
  /** Tissue-weighted load, computed once. */
  loadByDate: Map<DateStr, number>;
  /**
   * The same sessions WITHOUT the tissue factor — effort times minutes.
   *
   * Carried so the engine can tell the difference between "you trained less"
   * and "you trained the same but switched to something that spares this
   * tissue". Without both numbers, somebody who moved from running to cycling
   * is told their volume collapsed, and they will correctly reply that it did
   * not.
   */
  rawLoadByDate: Map<DateStr, number>;
  context: EpisodeContext;
  first: DateStr | null;
  last: DateStr | null;
  /** Rows discarded at the door, so the caller can see they existed. */
  discarded: { invalidDates: string[]; duplicateDates: DateStr[] };
}

export function buildIndex(
  entries: Entry[],
  context: EpisodeContext = NEUTRAL_CONTEXT,
): EntryIndex {
  const invalidDates: string[] = [];
  const duplicateDates: DateStr[] = [];

  const usable = entries.filter((e) => {
    if (typeof e.date === "string" && isDateStr(e.date)) return true;
    invalidDates.push(String(e.date));
    return false;
  });

  const sorted = [...usable].sort((a, b) => compareDates(a.date, b.date));

  // Later row wins, matching what the maps have always done — but now the
  // array agrees with them instead of quietly carrying both.
  const byDate = new Map<DateStr, Entry>();
  for (const entry of sorted) {
    if (byDate.has(entry.date)) duplicateDates.push(entry.date);
    byDate.set(entry.date, entry);
  }

  const unique = [...byDate.values()].sort((a, b) => compareDates(a.date, b.date));

  const loadByDate = new Map<DateStr, number>();
  const rawLoadByDate = new Map<DateStr, number>();
  for (const entry of unique) {
    loadByDate.set(entry.date, loadOf(entry, context));
    rawLoadByDate.set(entry.date, loadOf(entry, NEUTRAL_CONTEXT));
  }

  return {
    entries: unique,
    byDate,
    loadByDate,
    rawLoadByDate,
    context,
    first: unique[0]?.date ?? null,
    last: unique[unique.length - 1]?.date ?? null,
    discarded: { invalidDates, duplicateDates },
  };
}

export function entryAt(index: EntryIndex, date: DateStr): Entry | undefined {
  return index.byDate.get(date);
}

export function loadAt(index: EntryIndex, date: DateStr): number {
  return index.loadByDate.get(date) ?? 0;
}

/** Session load with no tissue weighting — what the person actually did. */
export function rawLoadAt(index: EntryIndex, date: DateStr): number {
  return index.rawLoadByDate.get(date) ?? 0;
}

/**
 * The first position whose date is not before `date`, by binary search.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS A BINARY SEARCH IN A DIARY APP.
 *
 * `entriesBetween` used to filter the whole array on every call, and every rule
 * calls it once per day of the episode. That is quadratic, and it was measured
 * rather than suspected: 360 days took 70 ms, 720 took 276 ms — twice the input
 * for four times the work.
 *
 * The file's own opening docstring says the index exists to stop exactly this,
 * and it did stop the version of it that the 24-hour rule had. It just never
 * reached the windows.
 *
 * Two things made it expensive. The scan itself, and `diffDays` inside the
 * predicate — which parses both dates into Date objects for every entry, twice.
 * Neither is needed: `index.entries` is sorted, and a YYYY-MM-DD string
 * compares chronologically as text, so the bounds can be found without parsing
 * anything at all.
 *
 * It matters from card 2.2 onward, where the evaluation runs on every save.
 * ---------------------------------------------------------------------------
 */
function lowerBound(entries: Entry[], date: DateStr): number {
  let low = 0;
  let high = entries.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (entries[mid]!.date < date) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** The first position whose date is after `date`. */
function upperBound(entries: Entry[], date: DateStr): number {
  let low = 0;
  let high = entries.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (entries[mid]!.date <= date) low = mid + 1;
    else high = mid;
  }
  return low;
}

/**
 * Entries whose date falls in [from, to], inclusive at both ends.
 *
 * Because the index holds one row per calendar day, the length of this result
 * IS the number of distinct days covered — which is what every coverage gate
 * in the engine means to ask.
 */
export function entriesBetween(index: EntryIndex, from: DateStr, to: DateStr): Entry[] {
  const start = lowerBound(index.entries, from);
  const end = upperBound(index.entries, to);
  return start >= end ? [] : index.entries.slice(start, end);
}

/**
 * Distinct calendar days with an entry in [from, to].
 *
 * Counted from the bounds instead of building the slice: the callers that ask
 * this are the coverage gates, and they want a number, not an array.
 */
export function daysCovered(index: EntryIndex, from: DateStr, to: DateStr): number {
  const start = lowerBound(index.entries, from);
  const end = upperBound(index.entries, to);
  return start >= end ? 0 : end - start;
}

/** Total tissue-weighted load over [from, to]. */
export function loadBetween(index: EntryIndex, from: DateStr, to: DateStr): number {
  return entriesBetween(index, from, to).reduce((sum, e) => sum + loadAt(index, e.date), 0);
}

/** Total unweighted load over [from, to]. */
export function rawLoadBetween(index: EntryIndex, from: DateStr, to: DateStr): number {
  return entriesBetween(index, from, to).reduce((sum, e) => sum + rawLoadAt(index, e.date), 0);
}

/**
 * Which day of the record a date falls on, and what that count is measured from.
 *
 * ---------------------------------------------------------------------------
 * `EpisodeContext.startedOn` has existed since the first version and was read
 * by nothing. That is not an oversight to correct quietly — it is a field that
 * needs a decided role, because there are two different days it could mean.
 *
 *   declared     the day the person says it began. A surgery date, the run
 *                where something went. Accurate about the INJURY.
 *   first-entry  the earliest row in the diary. Accurate about the RECORD.
 *
 * Somebody who started logging in week three is on day one of the record and
 * day fifteen of the injury, and the difference matters to them.
 *
 * So the anchor travels WITH the number. A caller cannot present a
 * first-entry count as a declared one, because it never receives one without
 * the label.
 *
 * NO RULE MAY READ THIS. `stagnation` derives its window origin from
 * `index.first`, and report.ts explains at length why that first fortnight
 * deliberately swallows the fast early improvement. Moving that origin to a
 * date somebody typed from memory would silently change shipped verdicts on
 * the strength of a recollection. test/invariants.test.ts enforces it.
 * ---------------------------------------------------------------------------
 */
export interface EpisodeAnchor {
  date: DateStr;
  kind: "declared" | "first-entry";
}

/**
 * The day the count runs from, and which of the two things it is.
 *
 * Split out of `episodeDay` so a caller that cannot supply a date — a browser
 * that has to ask its own clock what today is — can still count correctly
 * without rebuilding this choice from parts. The alternative was for the page
 * to write `startedOn ?? first` again, and a rule that lives in two places
 * lives in one and a half.
 */
export function episodeAnchor(index: EntryIndex): EpisodeAnchor | null {
  const declared = index.context.startedOn;
  const date = declared ?? index.first;
  if (date === null || date === undefined) return null;
  return { date, kind: declared === undefined ? "first-entry" : "declared" };
}

export function episodeDay(
  index: EntryIndex,
  date: DateStr,
): { day: number; anchor: "declared" | "first-entry" } | null {
  const anchor = episodeAnchor(index);
  if (anchor === null) return null;

  const day = diffDays(anchor.date, date) + 1;
  if (day < 1) return null;

  return { day, anchor: anchor.kind };
}
