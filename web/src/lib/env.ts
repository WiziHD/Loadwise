/**
 * Environment values, read once and checked loudly.
 *
 * A missing key must fail at startup with a sentence that says which one.
 * Health data behind an undefined URL fails silently in exactly the wrong
 * direction: the client builds, the page renders, and nothing is stored.
 */

function required(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Safe in the browser: the anon key only ever sees what Row Level Security allows. */
export const PUBLIC_ENV = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () =>
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};

/**
 * Server only. NEVER import this into a client component.
 *
 * The service role key bypasses Row Level Security completely — it is the one
 * credential that can read every user's diary. It exists here for exactly one
 * job: writing `flags` and `evaluations`, which user accounts are forbidden to
 * write so that a manipulated client cannot award itself an all-clear.
 */
export const SERVER_ENV = {
  supabaseServiceRoleKey: () =>
    required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
};
