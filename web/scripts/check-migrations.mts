/**
 * Welche Migration ist angewendet — und ist es noch dieselbe Datei?
 *
 * ---------------------------------------------------------------------------
 * WAS DIESES SKRIPT WEISS UND WAS NICHT.
 *
 * Es liest die Buchführung, die jede Migration am Ende ihres eigenen Laufs
 * anlegt. Ein Lauf, der vorher abbricht, erreicht diese Zeile nicht — genau
 * deshalb steht sie dort. Die Buchführung bildet also ab, was durchgelaufen
 * ist, nicht was jemand vorhatte.
 *
 * Was es NICHT kann: in den Katalog schauen. Über PostgREST sind Tabellen und
 * Spalten sichtbar, aber keine Policies, keine RLS-Schalter, keine
 * CHECK-Bedingungen. Der Zustand, an dem dieses Projekt schon einmal
 * vorbeigelaufen ist — RLS an, keine Regel — ist von hier aus unsichtbar.
 *
 * Deshalb ist das hier ausdrücklich NICHT die RLS-Prüfung. Die macht
 * `npm run check:rls`, indem sie sich anmeldet und es versucht. Wer dieses
 * Skript grün sieht und daraus »der Zugriffsschutz steht« liest, liest falsch.
 * Das Skript sagt es am Ende selbst.
 * ---------------------------------------------------------------------------
 *
 *   npm run check:migrations --workspace=web
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const MIGRATIONS_DIR = resolve(process.cwd(), "..", "supabase", "migrations");

type Row = { version: string; sha256: string | null; applied_at: string };

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

/** Die Dateien auf der Platte, nach Version, mit Prüfsumme ihres Inhalts. */
function localMigrations(): Map<string, string> {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error(`Kein ${MIGRATIONS_DIR}.`);
    process.exit(1);
  }
  const out = new Map<string, string>();
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    if (!file.endsWith(".sql")) continue;
    const body = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    // Zeilenenden vereinheitlichen, sonst meldet Windows gegenüber Linux eine
    // Abweichung, die keine ist.
    const normalised = body.split("\r\n").join("\n");
    out.set(file.replace(/\.sql$/, ""), createHash("sha256").update(normalised).digest("hex"));
  }
  return out;
}

async function main(): Promise<void> {
  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    console.error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY werden gebraucht.");
    process.exit(1);
  }

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const local = localMigrations();
  console.log(`\nMigrationen — ${local.size} Datei(en) auf der Platte\n`);

  const { data, error } = await admin
    .from("schema_migrations")
    .select("version, sha256, applied_at")
    .order("version");

  if (error !== null) {
    console.error(
      `Die Buchführung ist nicht lesbar: ${error.message}\n\n` +
        `Wenn die Tabelle noch nicht existiert, ist supabase/migrations/0003_ledger.sql\n` +
        `noch nicht ausgeführt. Danach 0002_rls.sql erneut ausführen, damit es sich\n` +
        `einträgt — es ist wiederholbar.\n`,
    );
    fail();
    return;
  }

  const applied = new Map((data as Row[]).map((r) => [r.version, r]));
  let problems = 0;
  const recorded: string[] = [];

  for (const [version, hash] of local) {
    const row = applied.get(version);

    if (row === undefined) {
      console.log(` FEHLT  ${version} — nie bis zum Ende durchgelaufen`);
      problems++;
      continue;
    }

    if (row.sha256 === null) {
      // Erstes Sehen: festhalten, mit welchem Inhalt sie lief. Danach ist jede
      // Abweichung eine echte Meldung.
      const { error: writeError } = await admin
        .from("schema_migrations")
        .update({ sha256: hash })
        .eq("version", version);
      if (writeError !== null) {
        console.log(` ??     ${version} — Prüfsumme nicht eintragbar: ${writeError.message}`);
        problems++;
        continue;
      }
      recorded.push(version);
      console.log(`  neu   ${version} — Prüfsumme jetzt festgehalten`);
      continue;
    }

    if (row.sha256 !== hash) {
      console.log(
        ` DRIFT  ${version} — die Datei wurde nach dem Anwenden geändert\n` +
          `        angewendet: ${row.sha256.slice(0, 12)}…  auf der Platte: ${hash.slice(0, 12)}…`,
      );
      problems++;
      continue;
    }

    console.log(`  ok    ${version}`);
  }

  for (const version of applied.keys()) {
    if (local.has(version)) continue;
    console.log(` EXTRA  ${version} — eingetragen, aber es gibt keine Datei dazu`);
    problems++;
  }

  if (recorded.length > 0) {
    console.log(
      `\nHinweis: ${recorded.length} Prüfsumme(n) wurden gerade erst festgehalten.\n` +
        `Das Skript nimmt dafür den JETZIGEN Inhalt der Datei. Wer sie zwischen dem\n` +
        `Ausführen und diesem Lauf verändert hat, hält damit den falschen Stand fest.`,
    );
  }

  console.log(
    `\nDas hier sagt NICHTS über den Zugriffsschutz. Policies, RLS-Schalter und\n` +
      `CHECK-Bedingungen sind über die REST-Schnittstelle unsichtbar — genau der\n` +
      `Zustand, an dem dieses Projekt schon einmal vorbeigelaufen ist. Dafür:\n` +
      `  npm run check:rls --workspace=web\n`,
  );

  if (problems > 0) {
    console.error(`${problems} Abweichung(en).\n`);
    fail();
    return;
  }
  console.log("Buchführung stimmt mit den Dateien überein.\n");
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
// BEKANNTE GRENZE, ehrlich benannt statt kaschiert: Auf dem Pfad, auf dem die
// Buchführungstabelle noch gar nicht existiert, bricht Node unter Windows beim
// Abbau mit "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" ab und
// liefert 3221226505 statt 1. Die AUSGABE ist dabei vollständig und richtig —
// nur der Fehlercode stimmt nicht.
//
// Eingegrenzt, nicht vermutet: Derselbe Aufbau beendet sich in check-rls.ts
// sauber mit 0, eine minimale Sonde mit demselben Client und derselben
// fehlschlagenden Abfrage ebenfalls. Weder der Wechsel von tsx auf Node noch
// oberste Ebene statt main().catch() noch ein Tick vor dem Beenden hat es
// geändert. Es hängt an diesem einen sofort fehlschlagenden Aufruf.
//
// Getragen statt behoben, weil: Das ist ein lokales Entwicklerwerkzeug, es
// läuft nicht in CI, und der betroffene Zustand endet, sobald 0003_ledger.sql
// einmal ausgeführt ist. Ab dann geht der Lauf über den Erfolgspfad, und der
// ist nachweislich sauber. Steht als Karte auf dem Brett.
process.exit(process.exitCode ?? 0);
