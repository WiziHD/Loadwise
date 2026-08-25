"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Locale } from "loadwise-engine";
import { supabaseServer } from "@/lib/supabase/server";

export type SignInResult = { ok: true } | { ok: false; reason: "invalid-email" | "send-failed" };

/**
 * Sends a sign-in link. No password anywhere in the product.
 *
 * One field fewer to get wrong, and no password hash sitting in a database of
 * health data — a table that should be as boring as possible to steal.
 */
export async function requestSignInLink(
  locale: Locale,
  formData: FormData,
): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "").trim();

  // Deliberately loose. Email validation by regular expression is a well-known
  // way to reject addresses that are perfectly valid; the link either arrives
  // or it does not, and that is the real check.
  if (!email.includes("@") || email.length < 5) return { ok: false, reason: "invalid-email" };

  const supabase = await supabaseServer();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?locale=${locale}` },
  });

  return error === null ? { ok: true } : { ok: false, reason: "send-failed" };
}

/**
 * Wohin der Anmeldelink zeigt — aus der Konfiguration, nicht aus der Anfrage.
 *
 * ---------------------------------------------------------------------------
 * HIER STAND `headers().get("origin")`.
 *
 * Eine Server-Aktion ist ein öffentlicher Endpunkt: Wer sie aufruft, bestimmt
 * die Kopfzeilen. Der `Origin` war damit ein vom Aufrufer gesetzter Wert, aus
 * dem die Adresse gebaut wurde, an die ein ANMELDELINK geschickt wird — und ein
 * Anmeldelink trägt einen Token, der ein Konto öffnet.
 *
 * Ausnutzbar war es heute nicht: Supabase prüft `emailRedirectTo` gegen die
 * Liste erlaubter Rückkehradressen des Projekts und fällt sonst auf die
 * Site-URL zurück. Die Sicherheit lag also an einer Einstellung im
 * Verwaltungsbereich, nicht an dieser Datei. Diese Liste ist genau die, die
 * beim Einrichten von eigenem SMTP angefasst wird (Karte H3) — der Zeitpunkt,
 * zu dem jemand versucht ist, ein Platzhalterzeichen hineinzuschreiben.
 *
 * `NEXT_PUBLIC_SITE_URL` ist absichtlich OPTIONAL: Ohne sie läuft die
 * Entwicklung wie bisher weiter. Ist sie gesetzt, hängt nichts mehr an der
 * Kopfzeile. Vor einer Auslieferung gehört sie gesetzt, und das steht in
 * .env.example.
 * ---------------------------------------------------------------------------
 */
async function siteOrigin(): Promise<string> {
  const konfiguriert = process.env.NEXT_PUBLIC_SITE_URL;
  if (konfiguriert !== undefined && konfiguriert.trim() !== "") {
    return konfiguriert.replace(/\/+$/, "");
  }
  return (await headers()).get("origin") ?? "";
}

export async function signOut(locale: Locale): Promise<never> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
