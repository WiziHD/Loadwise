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
 * The header the proxy uses to tell a page which language it is in.
 *
 * Only the not-found boundary needs it: every other page reads the locale
 * from its route params. A not-found boundary has none, because Next renders
 * it outside the segment that failed.
 */
export const LOCALE_HEADER = "x-loadwise-locale";

/**
 * Pfadanfänge, die KEINE Sprache bekommen dürfen.
 *
 * `/auth/callback` liegt absichtlich ausserhalb von `[locale]`: Seine Adresse
 * steht in einer E-Mail, die Tage später geöffnet wird, und darf nicht davon
 * abhängen, auf welche Sprache der Browser damals eingestellt war.
 *
 * Ohne diese Ausnahme machte die Umleitung daraus `/de/auth/callback`, was es
 * nicht gibt — und JEDER Anmeldelink des Produkts lief in einen 404. Die Route
 * sagte in ihrem eigenen Kommentar, sie liege bewusst ausserhalb; die
 * Middleware hat das lautlos zunichtegemacht, und nichts schlug laut genug fehl,
 * um es zu sagen.
 */
const LOCALE_EXEMPT = new Set(["auth"]);

/**
 * Die erste unterstützte Sprache in der Reihenfolge, die der Browser wünscht.
 *
 * Hier und nicht im Proxy, damit sie prüfbar ist: Ein Header wie
 * `de-CH,de;q=0.9,en;q=0.8` ist genau die Sorte Zeichenkette, bei der eine
 * Zerlegung von Hand danebengreift, und der Proxy ist von aussen nicht
 * aufrufbar.
 */
export function preferredLocale(header: string | null): Locale {
  if (header === null) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const quality = q === undefined ? 1 : Number.parseFloat(q.split("=")[1] ?? "1");
      return { base: tag.split("-")[0]?.toLowerCase() ?? "", quality };
    })
    .filter((entry) => Number.isFinite(entry.quality))
    .sort((a, b) => b.quality - a.quality);

  const match = ranked.find((entry) => (LOCALES as readonly string[]).includes(entry.base));
  return isLocale(match?.base ?? "") ? (match!.base as Locale) : DEFAULT_LOCALE;
}

/**
 * Welche Sprache dieser Pfad bekommt, und ob er dafür umgeleitet werden muss.
 *
 * `redirectTo` ist null, wenn der Pfad bleiben darf — entweder weil er schon
 * eine Sprache trägt oder weil er ausgenommen ist. Die Sprache steht trotzdem
 * dabei, denn die Kopfzeile für die Nicht-gefunden-Grenze wird in beiden Fällen
 * gebraucht.
 *
 * Als reine Funktion, damit der Fehler, der jeden Anmeldelink zerstört hat, ein
 * Testfall sein kann statt einer Erinnerung.
 */
export function localeRouteFor(
  pathname: string,
  acceptLanguage: string | null,
): { locale: Locale; redirectTo: string | null } {
  const first = pathname.split("/")[1] ?? "";

  if (isLocale(first)) return { locale: first, redirectTo: null };

  const locale = preferredLocale(acceptLanguage);
  if (LOCALE_EXEMPT.has(first)) return { locale, redirectTo: null };

  return { locale, redirectTo: `/${locale}${pathname === "/" ? "" : pathname}` };
}

/**
 * Dieselbe Adresse in der anderen Sprache.
 *
 * ---------------------------------------------------------------------------
 * DIE ABFRAGE GEHÖRT ZUR ADRESSE, UND SIE GING VERLOREN.
 *
 * Der Sprachwechsel las nur den Pfad. Die eine Seite dieser App, die Zustand in
 * der Abfrage trägt, ist die Anmeldeseite — `?error=link-expired`. Der Ablauf
 * war also: Jemand klickt einen abgelaufenen Link, bekommt die Erklärung in der
 * falschen Sprache, schaltet um, um sie zu lesen — und der Satz, für den
 * umgeschaltet wurde, ist weg.
 *
 * Als reine Funktion, damit das ein Testfall sein kann und keine Erinnerung.
 * ---------------------------------------------------------------------------
 */
export function swapLocaleIn(pathname: string, query: string, to: Locale): string {
  const segments = pathname.split("/");
  // ["", "<locale>", ...rest]
  segments[1] = to;
  const pfad = segments.join("/") || `/${to}`;
  const rein = query.startsWith("?") ? query.slice(1) : query;
  return rein === "" ? pfad : `${pfad}?${rein}`;
}
