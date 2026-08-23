import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PUBLIC_ENV } from "@/lib/env";

/**
 * Supabase for server components, route handlers and server actions.
 *
 * Uses the ANON key on purpose, so every query still passes through Row Level
 * Security. Server-side is not a reason to skip the check — a bug in a query
 * would otherwise read somebody else's diary and look like it was working.
 */
export async function supabaseServer() {
  const store = await cookies();

  return createServerClient(PUBLIC_ENV.supabaseUrl(), PUBLIC_ENV.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options);
        } catch {
          // Called from a server component, where cookies are read-only. The
          // middleware refreshes the session instead, so this is expected
          // rather than an error worth surfacing.
        }
      },
    },
  });
}

/** The signed-in user, or null. Never throws — callers decide what absence means. */
export async function currentUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
