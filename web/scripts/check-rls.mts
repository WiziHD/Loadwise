/**
 * Hält der zeilenbasierte Zugriffsschutz? Gefragt an der echten Datenbank.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS EIN SKRIPT IST UND KEINE CHECKLISTE.
 *
 * Die Migration endete einmal mit einem Kommentar, der ein Ritual von Hand
 * beschrieb: zwei Konten anlegen, sich als beide anmelden, drei Abfragen
 * tippen. Niemand führt ein Ritual zweimal aus. Und der Fehler, der wirklich
 * eintrat — RLS aktiviert, keine einzige Regel, also alles verboten — hätte
 * zwei der drei Prüfungen BESTANDEN, weil »Konto B sieht nichts« bei kaputter
 * und bei korrekter Datenbank gleich aussieht.
 *
 * Deshalb ist die Prüfung umgedreht: Sie belegt, dass A an die EIGENEN Daten
 * kommt, und dass B es nicht kann. Nur beide Hälften zusammen bedeuten etwas.
 * Eine Datenbank, in der niemand an irgendetwas kommt, ist nicht sicher,
 * sondern kaputt, und muss hier durchfallen.
 *
 * Sie deckte anfangs drei von acht Tabellen ab. Die fünf ungeprüften waren
 * nicht die harmlosen: `measurements` hängt über einen Join zwei Ebenen tief
 * an der Episode, und ein falsch gesetzter Join LIEST in einer leeren Datenbank
 * genauso wie ein richtiger.
 *
 * Welche Tabellen es gibt, liest das Skript deshalb aus den Migrationen statt
 * es zu wissen: Eine weitere Tabelle mit Regel, für die hier nichts steht, ist
 * ab sofort ein Fehlschlag und keine stille Lücke.
 *
 * Braucht den Service-Role-Key, der RLS umgeht — genau das erlaubt es, den
 * Aufbau zu stellen und von aussen zu prüfen. Es ist damit ein
 * Entwicklungswerkzeug und kann nie Teil der App werden.
 *
 * ---------------------------------------------------------------------------
 * DIE PRÜFZEILEN BLEIBEN LIEGEN. ABSICHTLICH — ABER ES MUSS JEMAND WISSEN.
 *
 * `findOrCreate` statt anlegen-und-wieder-löschen: Der nächste Lauf verwendet
 * dieselben Zeilen wieder, und ein Lauf, der mittendrin abbricht, hinterlässt
 * damit keinen halben Aufbau, den der übernächste nicht mehr versteht.
 *
 * **Die Folge ist, dass diese Tabellen nach dem ersten Lauf nie wieder leer
 * sind**, und das ist nicht folgenlos: Migration `0007_evaluation_run.sql` setzt
 * Spalten auf `not null` ohne Standardwert, was nur auf leeren Tabellen geht.
 * Sie ist genau daran gescheitert, und ihre Fehlermeldung sagt inzwischen, wie
 * man die Prüfzeilen — und nur die — wieder loswird.
 *
 * Jede Zeile hier trägt deshalb eine erkennbare Marke — aber nicht dieselbe:
 * `PROBE_LABEL` auf der Episode, `probe` in `rule_version`, `profile_version`
 * und `profile_key`, `sonde` beim Messschlüssel, `sonde_start`/`sonde_ziel`
 * beim Profilwechsel. Gewachsen, nicht entworfen; wer aufräumt, braucht
 * deshalb mehrere Bedingungen und nicht eine.
 *
 * Wer eine neue Prüfzeile ergänzt, gibt ihr eine Marke, sonst ist sie später
 * von echten Daten nicht mehr zu unterscheiden.
 *
 * Die Zeilen gehören den Prüfkonten, nicht einem echten Nutzer. Solange
 * Entwicklung und Produktion dasselbe Projekt sind, liegen sie trotzdem in
 * derselben Datenbank — siehe die offene Stelle am Ende von ANMELDUNG.md.
 * ---------------------------------------------------------------------------
 *
 *   npm run check:rls --workspace=web
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Der Riegel, der dieses Skript von der Produktion fernhält.
 *
 * ---------------------------------------------------------------------------
 * DIESES SKRIPT IST NICHT HARMLOS.
 *
 * Es legt zwei Konten an, meldet sich als beide an und schreibt Sondenzeilen in
 * zehn Tabellen. In einer Entwicklungsdatenbank ist das genau richtig. In einer
 * Produktionsdatenbank wären es zwei echte Konten mit Zugang zu einem Bereich
 * für Gesundheitsdaten, die niemand angelegt hat und die in keiner Liste
 * stehen.
 *
 * Bisher entschied darüber allein, worauf `.env.local` gerade zeigte. Ein
 * kopierter Schlüssel, ein umgestelltes Projekt, ein Lauf aus Gewohnheit — und
 * die Testkonten wären dort, wo sie nie sein dürfen.
 *
 * Deshalb eine ausdrückliche Erlaubnis, die in einer Produktionsumgebung
 * niemand gesetzt hat. Sie zu setzen ist eine Handlung; sie zu vergessen ist
 * keine.
 * ---------------------------------------------------------------------------
 */
const ERLAUBNIS = "LOADWISE_ALLOW_PROBE_ACCOUNTS";

const A_EMAIL = "rls-probe-a@loadwise.test";
const B_EMAIL = "rls-probe-b@loadwise.test";
const PROBE_LABEL = "RLS-Sonde";
const MIGRATIONS_DIR = resolve(process.cwd(), "..", "supabase", "migrations");

/** Der Postgres-Code für »die Regel verbietet das«. Alles andere ist etwas anderes. */
const DENIED = "42501";

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail === "" ? "" : ` — ${detail}`}`);
}

/** Ein Fehler ist nicht automatisch eine Verweigerung. */
function denied(error: { code?: string; message?: string } | null): {
  ok: boolean;
  detail: string;
} {
  if (error === null) return { ok: false, detail: "das Einfügen hat FUNKTIONIERT" };
  if (error.code !== DENIED) {
    return { ok: false, detail: `${error.code}: ${error.message} — kein Regelverstoss` };
  }
  return { ok: true, detail: DENIED };
}

function readEnv(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    console.error(`Kein ${path}. Dieses Skript redet mit dem echten Projekt.`);
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

/**
 * Welche Tabellen geschützt sind — aus ALLEN Migrationen gelesen, nicht geraten.
 *
 * Zuerst las das hier nur 0002_rls.sql. Beim Anlegen von `sessions` in 0004
 * stand die Regel damit ausserhalb des Blickfelds, und der Wächter hätte die
 * neue Tabelle stillschweigend übersehen — genau der Fehler, gegen den er
 * gebaut wurde, in seinem eigenen Code.
 *
 * Das ist der strukturelle Teil: Wer eine weitere Tabelle mit Regel anlegt und
 * hier nichts ergänzt, bekommt einen Fehlschlag statt einer stillen Lücke.
 * Genau so ist die Lücke entstanden, die dieses Skript gerade schliesst.
 */
function tablesWithPolicies(): Set<string> {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error(`Kein ${MIGRATIONS_DIR}.`);
    process.exit(1);
  }

  const found = new Set<string>();
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    if (!file.endsWith(".sql")) continue;
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    for (const match of sql.matchAll(/^create policy\s+\w+\s+on\s+(\w+)/gm)) {
      found.add(match[1]!);
    }
  }
  return found;
}


/** Ein angemeldeter Client für `email`; das Konto entsteht beim ersten Mal. */
async function signIn(
  admin: SupabaseClient,
  url: string,
  anon: string,
  email: string,
): Promise<{ client: SupabaseClient; userId: string }> {
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
  if (data.user === null) throw new Error(`verifyOtp(${email}) lieferte keinen Nutzer`);

  return { client, userId: data.user.id };
}

/**
 * Zeile suchen, sonst anlegen.
 *
 * Nie löschen: Das Skript soll so oft laufen dürfen, wie jemand mag, ohne
 * Zeilen anzuhäufen und ohne je etwas wegzuwerfen.
 */
async function findOrCreate(
  client: SupabaseClient,
  table: string,
  match: Record<string, unknown>,
  row: Record<string, unknown>,
): Promise<{ id: string } | { error: string }> {
  let query = client.from(table).select("id");
  for (const [column, value] of Object.entries(match)) query = query.eq(column, value as never);
  const { data: found } = await query.limit(1).maybeSingle();
  if (found !== null && found !== undefined) return found as { id: string };

  const { data, error } = await client.from(table).insert(row).select("id").single();
  if (error !== null) return { error: error.message };
  return data as { id: string };
}

type Ctx = { episodeId: string; measureKeyId: string; entryId: string };

/**
 * Was auf jeder Tabelle gilt.
 *
 * `owner`    — dem Konto gehört die Zeile: lesen und schreiben.
 * `readonly` — das Konto darf lesen und NICHT schreiben. Zwei Sorten Zeilen
 *              fallen darunter, aus demselben Grund:
 *
 *              Urteile entstehen serverseitig aus dem Regelmodul. Dürfte ein
 *              Konto sie schreiben, könnte ein manipulierter Client sich selbst
 *              ein »alles in Ordnung« eintragen, und ein Physio-Bericht wäre
 *              wertlos, weil niemand mehr wüsste, woher die Zeile stammt.
 *
 *              Profilwechsel schreibt ein Trigger. Eine Zeile, die man selbst
 *              hineinlegen kann, erklärt einen veränderten Bericht nicht mehr,
 *              sondern behauptet nur etwas darüber.
 *
 *              (Hiess einmal `engine` — nach der einen Herkunft, die es damals
 *              gab. Der Name beschrieb, woher die Zeile kommt, statt was gelten
 *              muss, und wäre bei der zweiten Herkunft falsch geworden.)
 */
type Spec = {
  table: string;
  access: "owner" | "readonly";
  match: (ctx: Ctx) => Record<string, unknown>;
  row: (ctx: Ctx) => Record<string, unknown>;
};

const SPECS: Spec[] = [
  {
    table: "entries",
    access: "owner",
    match: (c) => ({ episode_id: c.episodeId, entry_date: "2026-01-01" }),
    row: (c) => ({ episode_id: c.episodeId, entry_date: "2026-01-01", morning_score: 3 }),
  },
  {
    // Hängt über `entries` an der Episode — dieselbe zweistufige Form wie
    // `measurements`, und derselbe Grund für Sorgfalt: Ein falsch gesetzter
    // Join liest in einer leeren Datenbank genauso wie ein richtiger.
    table: "sessions",
    access: "owner",
    match: (c) => ({ entry_id: c.entryId, position: 0 }),
    row: (c) => ({
      entry_id: c.entryId,
      position: 0,
      activity_kind: "run",
      duration_min: 30,
      rpe: 5,
    }),
  },
  {
    table: "self_tests",
    access: "owner",
    match: (c) => ({ episode_id: c.episodeId, test_date: "2026-01-01" }),
    row: (c) => ({
      episode_id: c.episodeId,
      test_type: "calf_raise",
      test_date: "2026-01-01",
      involved: 8,
      uninvolved: 20,
    }),
  },
  {
    table: "measure_keys",
    access: "owner",
    match: (c) => ({ episode_id: c.episodeId, key: "sonde" }),
    row: (c) => ({ episode_id: c.episodeId, key: "sonde", unit: "reps" }),
  },
  {
    // Hängt über measure_keys zwei Ebenen tief an der Episode. Die Regel ist
    // ein Join über zwei Tabellen, und ein falscher Join liest in einer leeren
    // Datenbank genauso wie ein richtiger — deshalb wird hier zuerst etwas
    // hineingelegt und dann gelesen.
    table: "measurements",
    access: "owner",
    match: (c) => ({ measure_key_id: c.measureKeyId, measured_on: "2026-01-01" }),
    row: (c) => ({ measure_key_id: c.measureKeyId, measured_on: "2026-01-01", value: 12 }),
  },
  {
    table: "milestones",
    access: "owner",
    match: (c) => ({ episode_id: c.episodeId, label_text: "Sonde" }),
    row: (c) => ({
      episode_id: c.episodeId,
      label_text: "Sonde",
      label_locale: "de",
      created_on: "2026-01-01",
    }),
  },
  {
    table: "flags",
    access: "readonly",
    match: (c) => ({ episode_id: c.episodeId, for_date: "2026-01-01" }),
    row: (c) => ({
      episode_id: c.episodeId,
      // Seit 0007 Pflicht: Jede Flag gehoert zu genau einem Lauf. Hier eine
      // erfundene Kennung — die Sondenzeile hat keinen Lauf und soll auch
      // keinen vortaeuschen. ABSICHTLICH kein Fremdschluessel in der Datenbank,
      // siehe E12: Die Flags werden VOR ihrer Auswertung geschrieben.
      evaluation_id: "00000000-0000-4000-8000-000000000001",
      kind: "response24h",
      for_date: "2026-01-01",
      severity: "green",
      reason: "settled-within-24h",
      detail: {},
      rule_version: "probe",
      profile_version: "probe",
    }),
  },
  {
    table: "evaluations",
    access: "readonly",
    match: (c) => ({ episode_id: c.episodeId, profile_key: "probe" }),
    row: (c) => ({
      episode_id: c.episodeId,
      overall_status: "insufficient",
      coverage: {},
      // Seit 0007 Pflicht. Ein leeres Objekt ist als ECHTER Wert wertlos — der
      // Bericht wuerde gegen gar keine Schwellen rendern —, und genau deshalb
      // laesst die Migration keinen Standardwert zu. Fuer eine Sondenzeile, die
      // gleich wieder verschwindet, ist es das Richtige: Sie soll pruefen, WER
      // schreiben darf, nicht was drinsteht.
      config: {},
      profile_key: "probe",
      profile_version: "probe",
      rule_version: "probe",
    }),
  },
  {
    // Profilwechsel. Schreibt der Trigger, nicht das Konto — deshalb hier
    // dieselbe Behandlung wie bei einem Urteil: A darf es NICHT hineinlegen,
    // der Service-Role-Key legt die Prüfzeile an, A liest sie, B nicht.
    table: "episode_profile_changes",
    access: "readonly",
    match: (c) => ({ episode_id: c.episodeId, to_key: "sonde_ziel" }),
    row: (c) => ({ episode_id: c.episodeId, from_key: "sonde_start", to_key: "sonde_ziel" }),
  },
];

async function main(): Promise<void> {
  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !service) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY und " +
        "SUPABASE_SERVICE_ROLE_KEY werden in .env.local gebraucht.",
    );
    process.exit(1);
  }

  if (env[ERLAUBNIS] !== "ja") {
    console.error(
      `Dieses Skript legt zwei Konten an und schreibt Sondenzeilen. Es läuft nur,\n` +
        `wenn in .env.local ausdrücklich steht:\n\n` +
        `  ${ERLAUBNIS}=ja\n\n` +
        `Dort steht es für die Entwicklungsdatenbank. In einer Produktionsumgebung\n` +
        `steht es nicht — und dann bricht dieser Lauf ab, statt Konten anzulegen,\n` +
        `die niemand angelegt hat und die in keiner Liste stehen.\n`,
    );
    process.exit(1);
  }

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("\nZeilenbasierter Zugriffsschutz, gegen das echte Projekt\n");

  // --- Deckt das Skript ab, was die Migration schützt?
  const geschuetzt = tablesWithPolicies();

  // Eine leere Liste besteht jede Abdeckungsprüfung mühelos — und genau das
  // ist einmal passiert: Ein kaputter Ausdruck fand nichts, und der Wächter
  // meldete »alle 0 Tabellen abgedeckt«, grün. Eine Zahl unter der bekannten
  // Untergrenze heisst deshalb: Die Migrationen wurden nicht gelesen.
  if (geschuetzt.size < 10) {
    throw new Error(
      `Nur ${geschuetzt.size} Tabellen mit Regel in den Migrationen gefunden, mindestens 10 erwartet. ` +
        `Vermutlich wurden die Dateien nicht gelesen — dann sagt diese Prüfung nichts aus.`,
    );
  }
  const geprueft = new Set(["episodes", ...SPECS.map((s) => s.table)]);
  const luecke = [...geschuetzt].filter((t) => !geprueft.has(t)).sort();
  record(
    `alle ${geschuetzt.size} Tabellen mit Regel sind hier abgedeckt`,
    luecke.length === 0,
    luecke.length === 0 ? [...geprueft].sort().join(", ") : `ungeprüft: ${luecke.join(", ")}`,
  );

  const a = await signIn(admin, url, anon, A_EMAIL);
  const b = await signIn(admin, url, anon, B_EMAIL);

  // --- Die Wurzel des Besitzverhältnisses.
  const episode = await findOrCreate(
    a.client,
    "episodes",
    { user_id: a.userId, label: PROBE_LABEL },
    {
      user_id: a.userId,
      body_region: "patella",
      profile_key: "patellar_tendinopathy",
      side: "right",
      label: PROBE_LABEL,
    },
  );
  if ("error" in episode) {
    throw new Error(
      `A kann seine EIGENE Episode nicht anlegen: ${episode.error}\n\n` +
        `Das ist der Fehlschlag, der nach Sicherheit aussieht und keine ist. RLS ist an\n` +
        `und keine Regel erlaubt etwas, also ist alles verboten — auch dem Besitzer.\n` +
        `supabase/migrations/0002_rls.sql erneut ausführen: Es ist wiederholbar und\n` +
        `weigert sich inzwischen, in diesem Zustand zu enden.`,
    );
  }
  record("A liest und schreibt die eigene Episode", true, episode.id);

  // Der Massschlüssel, an dem die Messungen hängen.
  const key = await findOrCreate(
    a.client,
    "measure_keys",
    { episode_id: episode.id, key: "sonde" },
    { episode_id: episode.id, key: "sonde", unit: "reps" },
  );
  if ("error" in key) throw new Error(`A kann keinen Massschlüssel anlegen: ${key.error}`);

  // Der Tageseintrag, an dem die Einheiten hängen. Vorab angelegt, weil seine
  // Kennung gebraucht wird, bevor die Reihe der Prüfungen losläuft.
  const eintrag = await findOrCreate(
    a.client,
    "entries",
    { episode_id: episode.id, entry_date: "2026-01-01" },
    { episode_id: episode.id, entry_date: "2026-01-01", morning_score: 3 },
  );
  if ("error" in eintrag) throw new Error(`A kann keinen Tageseintrag anlegen: ${eintrag.error}`);

  const ctx: Ctx = { episodeId: episode.id, measureKeyId: key.id, entryId: eintrag.id };

  // --- B sieht die Episode von A nicht.
  const { data: bEpisodes } = await b.client.from("episodes").select("id");
  record("B sieht keine Episode von A", (bEpisodes ?? []).length === 0, `${(bEpisodes ?? []).length} Zeile(n)`);

  const { error: bSteal } = await b.client.from("episodes").insert({
    user_id: a.userId,
    body_region: "patella",
    profile_key: "patellar_tendinopathy",
    side: "right",
    label: "gestohlen",
  });
  const stealResult = denied(bSteal);
  record("B kann keine Zeile auf A's Namen anlegen", stealResult.ok, stealResult.detail);

  // --- Und jetzt jede abhängige Tabelle, beide Hälften.
  for (const spec of SPECS) {
    const eigen = spec.access === "owner";

    if (eigen) {
      const row = await findOrCreate(a.client, spec.table, spec.match(ctx), spec.row(ctx));
      record(
        `${spec.table}: A schreibt in die eigene Episode`,
        !("error" in row),
        "error" in row ? row.error : "",
      );
    } else {
      // Was ein Konto nicht schreiben darf, legt der Service-Role-Key an —
      // so, wie es der Motor bzw. der Trigger später tut.
      const { error: aWrite } = await a.client.from(spec.table).insert(spec.row(ctx));
      const result = denied(aWrite);
      record(`${spec.table}: A kann hier nicht selbst schreiben`, result.ok, result.detail);

      const seeded = await findOrCreate(admin, spec.table, spec.match(ctx), spec.row(ctx));
      if ("error" in seeded) {
        record(`${spec.table}: Zeile zum Prüfen anlegen`, false, seeded.error);
        continue;
      }
    }

    // A liest, was in der eigenen Episode steht — die Hälfte, die das alte
    // Ritual ausliess und ohne die »B sieht nichts« nichts bedeutet.
    let aRead = a.client.from(spec.table).select("id");
    for (const [column, value] of Object.entries(spec.match(ctx))) {
      aRead = aRead.eq(column, value as never);
    }
    const { data: aSees } = await aRead;
    record(`${spec.table}: A liest die eigene Zeile`, (aSees ?? []).length === 1, `${(aSees ?? []).length} Zeile(n)`);

    // B sieht nichts davon.
    const { data: bSees } = await b.client.from(spec.table).select("id");
    record(`${spec.table}: B sieht nichts davon`, (bSees ?? []).length === 0, `${(bSees ?? []).length} Zeile(n)`);

    // Und B kann nichts hineinschreiben.
    const { error: bWrite } = await b.client.from(spec.table).insert(spec.row(ctx));
    const bResult = denied(bWrite);
    record(`${spec.table}: B kann nicht hineinschreiben`, bResult.ok, bResult.detail);
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} von ${checks.length} Prüfungen fehlgeschlagen.\n`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nAlle ${checks.length} Prüfungen halten.\n`);
}

try {
  await main();
} catch (error: unknown) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

// KEIN ausdrückliches Beenden — und das ist die Reparatur, nicht die Nachlässigkeit.
//
// Hier stand `process.exit(process.exitCode ?? 0)`, mit dem Kommentar, ein
// natürliches Ende breche unter Windows mit einem libuv-Fehler ab. Es ist
// umgekehrt: Der Aufruf WAR der Abbruch. `process.exit` reisst die offenen
// Sockets des Supabase-Clients mitten im Abbau weg, und libuv meldet dann
// "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" und liefert
// 3221226505 statt 1 oder 0.
//
// Gemessen, nicht vermutet: ohne diese Zeile endet dieses Skript mit Code 0
// nach 8 Sekunden, check-migrations.mts auf seinem Fehlerpfad mit Code 1 nach
// 6 Sekunden. Die Sekunden sind die Keep-alive-Sockets, die auslaufen — für ein
// Werkzeug, das von Hand läuft, ist das nichts, und ein richtiger Fehlercode
// ist alles.
