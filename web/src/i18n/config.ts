/**
 * The app's own language handling.
 *
 * ---------------------------------------------------------------------------
 * WHAT DOES NOT BELONG IN HERE, AND WHY IT MATTERS.
 *
 * Not one sentence the engine produces. No verdict, no blocking reason, no red
 * flag, no milestone state, no measurement caveat, no disclaimer.
 *
 * Those live in `engine/src/wording.ts`, which is a REGULATORY BOUNDARY rather
 * than a translation table. Three ban lists run over every one of them —
 * imperatives, predictions, and praise — and each has a proof test showing it
 * fires. Copying a sentence into an app dictionary would take it outside that
 * check, and the first well-meaning rewrite would put an instruction in front
 * of a user with nothing to catch it.
 *
 * The app calls `verdictText(reason, locale)`, `blockedText`, `milestoneText`.
 * It never composes a sentence about somebody's body itself.
 *
 * What DOES belong here: buttons, form labels, navigation, error messages about
 * the app rather than about the person.
 * ---------------------------------------------------------------------------
 */

import type { Locale } from "loadwise-engine";

export const LOCALES = ["en", "de"] as const;

/**
 * English leads. German is second — a decision from the concept: the product
 * is meant to be usable worldwide, and the diary does not care what language
 * it is kept in.
 */
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Falls back rather than throwing — a locale arrives from a URL segment. */
export function localeFrom(value: string | undefined): Locale {
  return value !== undefined && isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * The header the middleware uses to tell a page which language it is in.
 *
 * Only the not-found boundary needs it: every other page reads the locale
 * from its route params. A not-found boundary has none, because Next renders
 * it outside the segment that failed.
 */
export const LOCALE_HEADER = "x-loadwise-locale";
