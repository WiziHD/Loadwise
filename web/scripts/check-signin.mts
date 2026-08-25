/**
 * Der Anmeldeweg, gegen die echte Datenbank und den laufenden Server.
 *
 * ---------------------------------------------------------------------------
 * WARUM AUSGERECHNET DIESER WEG EINE EIGENE PRÜFUNG BRAUCHT.
 *
 * Er ist der einzige Weg in die App, und er ist der einzige, den kein Test
 * erreicht: Er braucht Supabase, einen echten Token und einen laufenden
 * Server. Was hier schiefgeht, sperrt jeden aus — und es sperrt LEISE aus, mit
 * einer Meldung über einen abgelaufenen Link, der nicht abgelaufen ist.
 *
 * Genau das ist schon zweimal passiert:
 *
 *   Die Middleware hängte vor jeden Pfad ohne Sprachpräfix eine Sprache, auch
 *   vor `/auth/callback`. Aus jedem Anmeldelink wurde ein 404.
 *
 *   Der Rückweg kannte nur den PKCE-Austausch über `?code=`. Wer den Link auf
 *   einem ZWEITEN Gerät öffnete, hatte den Verifizierer-Keks nicht — und bekam
 *   »Link abgelaufen« für einen gültigen Link.
 *
 * ---------------------------------------------------------------------------
 * DER `token_hash`-ZWEIG FEUERT HEUTE NIE.
 *
 * Supabase schickt mit der Standardvorlage den PKCE-Link. Erst wenn die
 * Mailvorlage auf `?token_hash={{ .TokenHash }}&type=magiclink` umgestellt ist,
 * läuft dieser Zweig im Betrieb — und dann ist es zu spät, um zu merken, dass
 * er nicht stimmt. Diese Prüfung geht ihn ab, bevor jemand sich darauf
 * verlässt.
 *
 * ---------------------------------------------------------------------------
 * DREI FRAGEN, UND ZWEI DAVON SIND GEGENPROBEN.
 *
 * Ein gültiger Token muss hineinlassen. Ein erfundener darf es nicht. Und
 * derselbe Token darf nicht zweimal gelten — ein Anmeldelink, der in einem
 * Postfach liegen bleibt und weiter funktioniert, ist ein Dauerschlüssel.
 *
 * Ohne die beiden Gegenproben bewiese die erste nichts: Ein Rückweg, der jeden
 * hineinlässt, bestünde sie mühelos.
 * ---------------------------------------------------------------------------
 *
 *   npm run dev --workspace=web      (in einem anderen Fenster)
 *   npm run check:signin --workspace=web
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

/** Dasselbe Tor wie bei check-rls: Dieses Skript fasst ein echtes Konto an. */
const ERLAUBNIS = "LOADWISE_ALLOW_PROBE_ACCOUNTS";
const EMAIL = "dev-test@loadwise.test";

function fail(message: string): never {
  console.error(`\nAnmeldeprüfung FEHLGESCHLAGEN\n\n${message}\n`);
  process.exit(1);
}

function readEnv(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) fail(`Kein ${path}. Dieses Skript redet mit dem echten Projekt.`);
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

type Pruefung = { name: string; ok: boolean; detail: string };
const pruefungen: Pruefung[] = [];

function record(name: string, ok: boolean, detail: string): void {
  pruefungen.push({ name, ok, detail });
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail === "" ? "" : ` — ${detail}`}`);
}

/** Was der Rückweg auf eine Anfrage antwortet. */
async function rueckweg(app: string, query: string) {
  const antwort = await fetch(`${app}/auth/callback?${query}`, { redirect: "manual" });
  const kekse = antwort.headers.getSetCookie?.() ?? [];
  return {
    status: antwort.status,
    wohin: antwort.headers.get("location") ?? "",
    sitzung: kekse.some((k) => k.includes("auth-token")),
  };
}

async function main(): Promise<void> {
  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  const app = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!url || !service) fail("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY werden gebraucht.");

  if (env[ERLAUBNIS] !== "ja") {
    fail(
      `Dieses Skript meldet ein echtes Konto an. Es läuft nur, wenn in .env.local steht:\n\n` +
        `  ${ERLAUBNIS}=ja\n\n` +
        `In einer Produktionsumgebung steht das nicht.`,
    );
  }

  // Läuft überhaupt ein Server? Sonst sieht ein Fehlschlag hier aus wie ein
  // kaputter Rückweg, und man sucht an der falschen Stelle.
  try {
    await fetch(app, { redirect: "manual" });
  } catch {
    fail(`Unter ${app} antwortet nichts.\nZuerst: npm run dev --workspace=web`);
  }

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\nAnmeldeweg gegen ${app}\n`);

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: EMAIL,
  });
  if (error !== null) fail(`generateLink(${EMAIL}): ${error.message}`);
  const hash = link.properties.hashed_token;

  // --- 1. Ein gültiger Token lässt hinein.
  const gut = await rueckweg(app, `token_hash=${hash}&type=magiclink&locale=de`);
  record(
    "gültiger token_hash führt in die App",
    gut.wohin.endsWith("/de"),
    `${gut.status} → ${gut.wohin}`,
  );
  record("und setzt eine Sitzung", gut.sitzung, gut.sitzung ? "" : "kein Sitzungskeks");

  // --- 2. Ein erfundener Token nicht.
  const boese = await rueckweg(app, `token_hash=erfunden&type=magiclink&locale=de`);
  record(
    "erfundener token_hash führt zur Anmeldeseite",
    boese.wohin.includes("/signin?error=link-expired"),
    boese.wohin,
  );
  record(
    "und setzt KEINE Sitzung",
    !boese.sitzung,
    boese.sitzung ? "Sitzungskeks gesetzt — das wäre ein Loch" : "",
  );

  // --- 3. Derselbe Token gilt nicht zweimal.
  const zweimal = await rueckweg(app, `token_hash=${hash}&type=magiclink&locale=de`);
  record(
    "derselbe Token gilt kein zweites Mal",
    zweimal.wohin.includes("/signin?error=link-expired"),
    zweimal.wohin,
  );

  // --- 4. Ohne alles: der Grund, den die Seite bis vor Kurzem nicht kannte.
  const leer = await rueckweg(app, `locale=de`);
  record(
    "ein Link ganz ohne Token nennt seinen eigenen Grund",
    leer.wohin.includes("/signin?error=missing-code"),
    leer.wohin,
  );

  // --- 5. Die Sprache überlebt den Weg durch die Mail.
  const englisch = await rueckweg(app, `token_hash=erfunden&type=magiclink&locale=en`);
  record(
    "die Sprache aus dem Link bleibt erhalten",
    englisch.wohin.includes("/en/signin"),
    englisch.wohin,
  );

  const durchgefallen = pruefungen.filter((p) => !p.ok);
  if (durchgefallen.length > 0) {
    fail(`${durchgefallen.length} von ${pruefungen.length} Prüfungen fehlgeschlagen.`);
  }
  console.log(`\nAlle ${pruefungen.length} Prüfungen halten.\n`);
}

try {
  await main();
} catch (error: unknown) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

// Kein ausdrückliches Beenden — siehe check-rls.mts: `process.exit` reisst die
// offenen Sockets des Clients mitten im Abbau weg, und genau darüber stolpert
// libuv.
