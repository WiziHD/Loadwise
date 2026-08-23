"use client";

import { createBrowserClient } from "@supabase/ssr";
import { PUBLIC_ENV } from "@/lib/env";

/**
 * Supabase in the browser.
 *
 * Only the anon key ever reaches here. Everything it can see is what Row Level
 * Security allows for the signed-in account, which is why the policies in
 * `0002_rls.sql` are the real access control rather than anything in this file.
 */
export function supabaseBrowser() {
  return createBrowserClient(PUBLIC_ENV.supabaseUrl(), PUBLIC_ENV.supabaseAnonKey());
}
