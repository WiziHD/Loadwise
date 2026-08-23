/**
 * Calendar arithmetic on YYYY-MM-DD strings.
 *
 * Everything here operates on the date parts only. Date objects are used
 * internally as UTC containers purely to get correct month lengths and leap
 * years — no local time ever enters, so no daylight-saving shift can move a
 * diary day. See TECHNIK.md, risk 3.
 */

import type { DateStr } from "./types.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateStr(value: string): value is DateStr {
  if (!DATE_PATTERN.test(value)) return false;
  return toDateStr(parse(value)) === value; // rejects 2026-02-30 and friends
}

function parse(date: DateStr): Date {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateStr(d: Date): DateStr {
  const year = String(d.getUTCFullYear()).padStart(4, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: DateStr, days: number): DateStr {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function diffDays(from: DateStr, to: DateStr): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((parse(to).getTime() - parse(from).getTime()) / MS_PER_DAY);
}

/** Inclusive range of calendar dates. */
export function dateRange(from: DateStr, to: DateStr): DateStr[] {
  const out: DateStr[] = [];
  const span = diffDays(from, to);
  for (let i = 0; i <= span; i++) out.push(addDays(from, i));
  return out;
}

export function compareDates(a: DateStr, b: DateStr): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
