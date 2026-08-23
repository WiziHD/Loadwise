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

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await supabaseServer();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?locale=${locale}` },
  });

  return error === null ? { ok: true } : { ok: false, reason: "send-failed" };
}

export async function signOut(locale: Locale): Promise<never> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
