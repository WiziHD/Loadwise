/**
 * Löscht `delete_own_account()` wirklich alles — und nur das eigene Konto?
 *
 * ---------------------------------------------------------------------------
 * DIESE PRÜFUNG LEGT EIN WEGWERF-KONTO AN UND LÖSCHT ES WIEDER.
 *
 * Sie fasst kein bestehendes Konto an. Das ist keine Höflichkeit, sondern die
 * einzige Form, in der sich eine Löschfunktion überhaupt prüfen lässt: Was sie
 * tut, ist unwiderruflich.
 *
 * ---------------------------------------------------------------------------
 * DREI FRAGEN, UND DIE DRITTE IST DIE, DIE ZÄHLT.
 *
 * 1. Verschwindet das Konto?
 * 2. Verschwinden die Daten mit — Episode, Eintrag, Selbsttest, Ziel?
 * 3. **Bleibt das Konto daneben unberührt?**
 *
 * Die dritte ist der Grund für die ganze Datei. Eine Funktion, die zu viel
 * löscht, bestünde die ersten beiden Prüfungen mit Auszeichnung. Deshalb legt
 * dieser Lauf ZWEI Konten an, löscht eines und schaut beim anderen nach.
 *
 * ---------------------------------------------------------------------------
 * SIE LÄUFT ÜBER DEN SERVICE-ROLE-SCHLÜSSEL, DIE APP NICHT.
 *
 * Konten anzulegen und ein Token zu besorgen geht nur mit ihm. `check:rls`
 * und `check:verdicts` tun dasselbe; `check:service-role` prüft `src/`, nicht
 * `scripts/`. Die APP kommt weiterhin ohne aus — genau das ist die Aussage von
 * 0012, und der Aufruf unten läuft deshalb bewusst NICHT mit dem
 * Service-Schlüssel, sondern mit dem Token des Wegwerf-Kontos.
 *
 * ---------------------------------------------------------------------------
 * Von Hand, nie in CI. Wie `check:rls` und `check:verdicts`.
 *
 *   npm run check:delete-account --workspace=web
 * ---------------------------------------------------------------------------
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ERLAUBNIS = "LOADWISE_ALLOW_PROBE_ACCOUNTS";

function fail(message: string): never {
  console.error(`\nLöschprüfung FEHLGESCHLAGEN\n\n${message}\n`);
  process.exit(1);
}

function readEnv(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) fail(`Kein ${path}. Dieses Skript redet mit dem echten Projekt.`);
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((z) => z.trim() !== "" && !z.trim().startsWith("#"))
      .map((z) => {
        const i = z.indexOf("=");
        return [z.slice(0, i).trim(), z.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

const pruefungen: { name: string; ok: boolean; detail: string }[] = [];
function record(name: string, ok: boolean, detail = ""): void {
  pruefungen.push({ name, ok, detail });
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail === "" ? "" : ` — ${detail}`}`);
}

async function main(): Promise<void> {
  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !service || !anon) {
    fail("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY und NEXT_PUBLIC_SUPABASE_ANON_KEY werden gebraucht.");
  }
  if (env[ERLAUBNIS] !== "ja") {
    fail(
      `Dieses Skript legt Konten an und LÖSCHT eines davon.\n` +
        `Es läuft nur, wenn in .env.local steht:\n\n  ${ERLAUBNIS}=ja\n\n` +
        `In einer Produktionsumgebung steht das nicht.`,
    );
  }

  const admin: SupabaseClient = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\nKontolöschung gegen ${url}\n`);

  // --- Zwei Wegwerf-Konten. Eines wird gelöscht, das andere ist die Kontrolle.
  const stempel = Date.now();
  const mailA = `delete-probe-a-${stempel}@loadwise.test`;
  const mailB = `delete-probe-b-${stempel}@loadwise.test`;
  const passwort = `pw-${stempel}-${Math.random().toString(36).slice(2)}`;

  const anlegen = async (email: string): Promise<string> => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: passwort,
      email_confirm: true,
    });
    if (error !== null) fail(`Konto ${email} anlegen: ${error.message}`);
    return data.user.id;
  };

  const idA = await anlegen(mailA);
  const idB = await anlegen(mailB);

  let episodeA = "";
  let episodeB = "";

  try {
    // --- Beiden Konten je eine Episode mit Daten geben --------------------
    const bestuecken = async (userId: string): Promise<string> => {
      const { data: ep, error } = await admin
        .from("episodes")
        .insert({ user_id: userId, body_region: "achilles", profile_key: "achilles_midportion", side: "right" })
        .select("id")
        .single();
      if (error !== null) fail(`Episode anlegen: ${error.message}`);
      const id = (ep as { id: string }).id;

      await admin.from("entries").insert({ episode_id: id, entry_date: "2026-08-01", morning_score: 3 });
      await admin.from("self_tests").insert({
        episode_id: id,
        test_type: "calf_raise",
        test_date: "2026-08-01",
        involved: 10,
        uninvolved: 20,
      });
      await admin.from("milestones").insert({
        episode_id: id,
        label_text: "Wegwerf-Ziel",
        label_locale: "de",
        created_on: "2026-08-01",
      });
      return id;
    };

    episodeA = await bestuecken(idA);
    episodeB = await bestuecken(idB);

    const zaehle = async (tabelle: string, spalte: string, wert: string): Promise<number> => {
      const { count } = await admin.from(tabelle).select("*", { count: "exact", head: true }).eq(spalte, wert);
      return count ?? 0;
    };

    record("die Probedaten stehen da", (await zaehle("entries", "episode_id", episodeA)) === 1);

    // --- Als Konto A anmelden und die eigene Löschung aufrufen -------------
    //
    // Über den anon key, mit dem Token dieses Kontos — also genau so, wie die
    // App es tut. Mit dem Service-Schlüssel zu löschen bewiese nichts über
    // 0012.
    const alsA: SupabaseClient = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: loginFehler } = await alsA.auth.signInWithPassword({ email: mailA, password: passwort });
    if (loginFehler !== null) fail(`Anmelden als ${mailA}: ${loginFehler.message}`);

    const { error: rpcFehler } = await alsA.rpc("delete_own_account");
    record(
      "ein angemeldetes Konto darf sich selbst löschen",
      rpcFehler === null,
      rpcFehler?.message ?? "",
    );

    // --- Was ist weg, was ist noch da? ------------------------------------
    const { data: konten } = await admin.auth.admin.listUsers();
    const nochDaA = konten.users.some((u) => u.id === idA);
    const nochDaB = konten.users.some((u) => u.id === idB);

    record("das Konto ist weg", !nochDaA);
    record("die Episode ist weg", (await zaehle("episodes", "id", episodeA)) === 0);
    record("die Einträge sind weg", (await zaehle("entries", "episode_id", episodeA)) === 0);
    record("die Selbsttests sind weg", (await zaehle("self_tests", "episode_id", episodeA)) === 0);
    record("die Ziele sind weg", (await zaehle("milestones", "episode_id", episodeA)) === 0);

    // Die Prüfung, um die es geht. Eine Funktion, die zu viel löscht, bestünde
    // alles darüber mit Auszeichnung.
    record("das ANDERE Konto ist unberührt", nochDaB);
    record("und seine Daten stehen noch da", (await zaehle("entries", "episode_id", episodeB)) === 1);

    // --- Ohne Anmeldung geht gar nichts ------------------------------------
    const anonym: SupabaseClient = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: anonFehler } = await anonym.rpc("delete_own_account");
    record(
      "ohne Anmeldung lehnt die Datenbank ab",
      anonFehler !== null,
      anonFehler?.code ?? "durchgelassen",
    );
  } finally {
    // Immer aufräumen, auch nach einem Abbruch. Konto B ist die Kontrolle und
    // hat keinen Grund, den Lauf zu überleben.
    const { error } = await admin.auth.admin.deleteUser(idB);
    if (error !== null) {
      console.error(`\nAUFRÄUMEN FEHLGESCHLAGEN: ${error.message}`);
      console.error(`Das Probekonto ${mailB} liegt noch da.\n`);
    } else {
      console.log(`\n  --    aufgeräumt: Probekonto ${mailB} gelöscht`);
    }
  }

  const durchgefallen = pruefungen.filter((p) => !p.ok);
  if (durchgefallen.length > 0) {
    fail(`${durchgefallen.length} von ${pruefungen.length} Prüfungen fehlgeschlagen.`);
  }
  console.log(`\nAlle ${pruefungen.length} Prüfungen halten.\n`);
}

try {
  await main();
} catch (fehler: unknown) {
  console.error(`\n${fehler instanceof Error ? fehler.message : String(fehler)}\n`);
  process.exitCode = 1;
}
