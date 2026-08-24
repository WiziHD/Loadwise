/**
 * Die Gründe, aus denen jemand auf der Anmeldeseite landet statt in der App.
 *
 * ---------------------------------------------------------------------------
 * EINER DAVON WURDE GESENDET UND NIE GEZEIGT.
 *
 * `auth/callback` leitet auf zwei verschiedene Codes um. Die Anmeldeseite
 * rannte genau einen ab — `link-expired` — und sonst nichts. Wer mit
 * `?error=missing-code` ankam, sah eine Seite, auf der nichts passiert war:
 * dieselbe Überschrift, dasselbe Formular, kein Wort darüber, warum der Klick
 * auf den Link im Postfach hier geendet hat. Nichts schlug fehl, nichts wurde
 * protokolliert, und die App hatte keine Möglichkeit, es zu bemerken.
 *
 * Deshalb steht die Liste hier und nicht an zwei Stellen. Der Rückweg schickt
 * nur, was hier steht; `signInErrorText` deckt über `Record<SignInError, string>`
 * alles ab, was hier steht. Ein dritter Grund ist damit ein Übersetzungsfehler
 * statt einer leeren Seite — dieselbe Erschöpfungsdisziplin wie bei
 * `VERDICT_WORDING` im Motor.
 * ---------------------------------------------------------------------------
 */

import type { Strings } from "@/i18n/dictionary";

export const SIGNIN_ERRORS = ["link-expired", "missing-code"] as const;

export type SignInError = (typeof SIGNIN_ERRORS)[number];

/**
 * Aus einem Abfrageparameter, wo der Typprüfer nicht mehr hinreicht.
 *
 * Unbekanntes wird zu `null` und nicht zu einer Meldung: Ein Code, den diese
 * Fassung nicht kennt, kann aus einem alten Lesezeichen stammen oder
 * hingeschrieben sein. Dann ist die gewöhnliche Anmeldeseite die richtige
 * Antwort — eine Fehlermeldung zu erfinden wäre eine Auskunft über etwas, das
 * die App nicht weiss.
 */
export function signInErrorFrom(value: string | undefined): SignInError | null {
  if (value === undefined) return null;
  return (SIGNIN_ERRORS as readonly string[]).includes(value) ? (value as SignInError) : null;
}

/**
 * Der Satz zu einem Grund.
 *
 * Steht hier und nicht in der Seite, damit ein Test ihn erreichen kann: Dass
 * jeder Grund einen Satz hat, sichert der `Record`-Typ; dass dieser Satz in
 * BEIDEN Sprachen dasteht und nicht bloss der englische kopiert ist, sichert
 * kein Typ. Genau der Fall — gesetzt, aber nicht wirklich vorhanden — ist der,
 * um den es auf dieser Karte geht.
 */
export function signInErrorText(grund: SignInError, auth: Strings["auth"]): string {
  const text: Record<SignInError, string> = {
    "link-expired": auth.linkExpired,
    "missing-code": auth.missingCode,
  };
  return text[grund];
}
