/**
 * Does Row Level Security actually hold? Asked of the real database.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A SCRIPT AND NOT A CHECKLIST.
 *
 * The migration used to end with a comment describing a manual ritual: make two
 * accounts, log in as each, run three queries by hand. Nobody performs a ritual
 * twice. And the one failure mode that actually occurred — RLS enabled with no
 * policies at all, so everything was denied — would have passed two of those
 * three checks, because "account B sees nothing" is exactly what a broken
 * database and a correct one both look like from B's side.
 *
 * So the check is inverted: it proves that A CAN reach A's own data, and that B
 * cannot. Only both halves together mean anything. A database where nobody can
 * reach anything is not secure, it is broken, and it must fail this script.
 *
 * Needs the service role key, which bypasses RLS — that is what lets it set up
 * the fixture and then verify from outside. It is therefore a development
 * script and can never become part of the app.
 * ---------------------------------------------------------------------------
 *
 *   npm run check:rls
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const A_EMAIL = "rls-probe-a@loadwise.test";
const B_EMAIL = "rls-probe-b@loadwise.test";
const PROBE_LABEL = "RLS-Sonde";

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail === "" ? "" : ` — ${detail}`}`);
}

function readEnv(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    console.error(`No ${path}. This script talks to the real project.`);
    process.exit(1);
  }
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "" && !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

/** A signed-in client for `email`, creating the account the first time. */
async function signIn(
  admin: SupabaseClient,
  url: string,
  anon: string,
  email: string,
): Promise<{ client: SupabaseClient; userId: string }> {
  // Reused if a previous run already made it — this script has to be runnable
  // as often as anybody likes without piling up accounts.
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (createError !== null && !/already|registered|exists/i.test(createError.message)) {
    throw new Error(`createUser(${email}): ${createError.message}`);
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError !== null) throw new Error(`generateLink(${email}): ${linkError.message}`);

  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (error !== null) throw new Error(`verifyOtp(${email}): ${error.message}`);
  if (data.user === null) throw new Error(`verifyOtp(${email}) returned no user`);

  return { client, userId: data.user.id };
}

/** The probe episode for A, reused across runs rather than multiplied. */
async function probeEpisode(a: SupabaseClient, userId: string): Promise<string> {
  const { data: found } = await a
    .from("episodes")
    .select("id")
    .eq("user_id", userId)
    .eq("label", PROBE_LABEL)
    .maybeSingle();
  if (found !== null && found !== undefined) return (found as { id: string }).id;

  const { data, error } = await a
    .from("episodes")
    .insert({
      user_id: userId,
      body_region: "patella",
      profile_key: "patellar_tendinopathy",
      side: "right",
      label: PROBE_LABEL,
    })
    .select("id")
    .single();

  if (error !== null) {
    throw new Error(
      `A cannot create its OWN episode: ${error.message}\n\n` +
        `This is the failure that looks like security and is not. RLS is on and\n` +
        `no policy grants anything, so everything is denied — including to the\n` +
        `owner. Run supabase/migrations/0002_rls.sql again: it is repeatable,\n` +
        `and it now refuses to finish in this state.`,
    );
  }
  return (data as { id: string }).id;
}

async function main(): Promise<void> {
  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !service) {
    console.error(
      "Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and " +
        "SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
    process.exit(1);
  }

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("\nRow Level Security, against the real project\n");

  const a = await signIn(admin, url, anon, A_EMAIL);
  const b = await signIn(admin, url, anon, B_EMAIL);
  const episodeId = await probeEpisode(a.client, a.userId);

  // --- A reaches its own. Without this half, "B sees nothing" proves nothing.
  const { data: aSees } = await a.client.from("episodes").select("id").eq("id", episodeId);
  record("A reads A's own episode", (aSees ?? []).length === 1, `${(aSees ?? []).length} row(s)`);

  const { error: aWrite } = await a.client.from("entries").upsert(
    { episode_id: episodeId, entry_date: "2026-01-01", morning_score: 3 },
    { onConflict: "episode_id,entry_date" },
  );
  record("A writes into A's own episode", aWrite === null, aWrite?.message ?? "");

  // --- B reaches nothing of A's.
  const { data: bEpisodes } = await b.client.from("episodes").select("id");
  record("B sees no episode of A's", (bEpisodes ?? []).length === 0, `${(bEpisodes ?? []).length} row(s)`);

  const { data: bEntries } = await b.client.from("entries").select("episode_id");
  record("B sees no entry of A's", (bEntries ?? []).length === 0, `${(bEntries ?? []).length} row(s)`);

  const { error: bWrite } = await b.client
    .from("entries")
    .insert({ episode_id: episodeId, entry_date: "2026-09-01", morning_score: 3 });
  record(
    "B cannot write into A's episode",
    bWrite?.code === "42501",
    bWrite === null ? "the insert SUCCEEDED" : `${bWrite.code}: ${bWrite.message}`,
  );

  const { error: bSteal } = await b.client.from("episodes").insert({
    user_id: a.userId,
    body_region: "patella",
    profile_key: "patellar_tendinopathy",
    side: "right",
    label: "stolen",
  });
  record(
    "B cannot create a row owned by A",
    bSteal?.code === "42501",
    bSteal === null ? "the insert SUCCEEDED" : `${bSteal.code}: ${bSteal.message}`,
  );

  // --- Verdicts come from the engine, never from a client.
  //
  // The payload has to match the table exactly. The first version of this
  // check sent a column that does not exist and got PGRST204 back — "column
  // not found" — which is an error, so the check went green. It would have
  // gone green with no policy on `flags` at all. A guard that passes for the
  // wrong reason is worse than no guard, so the code is asserted, not just the
  // presence of an error.
  const { error: aFlag } = await a.client.from("flags").insert({
    episode_id: episodeId,
    for_date: "2026-01-01",
    kind: "response24h",
    severity: "green",
    reason: "settled-within-24h",
    detail: {},
    rule_version: "probe",
    profile_version: "probe",
  });
  record(
    "A cannot write its own verdict",
    aFlag?.code === "42501",
    aFlag === null ? "the insert SUCCEEDED" : `${aFlag.code}: ${aFlag.message}`,
  );

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} of ${checks.length} checks failed. Card 1.3 is not done.\n`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} checks hold.\n`);
}

/**
 * Beenden mit Fehlercode, ohne den Prozess abzuwürgen.
 *
 * `process.exit` reisst offene Handles mit, und der Supabase-Client hält noch
 * welche: Unter Windows bricht Node dann mit
 * "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" ab und liefert
 * 3221226505 statt 1. Ein Prüfskript, dessen Fehlercode nicht stimmt, ist in
 * einer Kette wertlos — und in CI unbrauchbar.
 *
 * Die frühen Abbrüche oben dürfen `process.exit` bleiben: Sie greifen, bevor
 * ein Client existiert, also gibt es dort nichts, was hängen könnte.
 */
function fail(): void {
  process.exitCode = 1;
}

try {
  await main();
} catch (error: unknown) {
  console.error(`
${error instanceof Error ? error.message : String(error)}
`);
  process.exitCode = 1;
}

// Ausdrücklich beenden, statt die Ereignisschleife auslaufen zu lassen.
//
// Der Supabase-Client hält unter Windows ein libuv-Handle offen, und ein
// natürliches Ende bricht dann mit
// "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" ab — mit Exitcode
// 3221226505 statt 0 oder 1. Ein Prüfskript, dessen Fehlercode lügt, ist in
// einer Kette wertlos, also wird der Code hier gesetzt und nicht erhofft.
//
// Gefahrlos an dieser Stelle: Alles ist ausgegeben, es steht keine Arbeit mehr
// aus, und die Ausgabe ist bereits geschrieben.
process.exit(process.exitCode ?? 0);
