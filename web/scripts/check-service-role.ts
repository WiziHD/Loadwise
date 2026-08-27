/**
 * Der Service-Role-Schlüssel ist zurück. Bleibt er, wo er hingehört?
 *
 * ---------------------------------------------------------------------------
 * WARUM DIESE PRÜFUNG MIT DEM SCHLÜSSEL ZUSAMMEN ENTSTEHT UND NICHT DANACH.
 *
 * Er umgeht den zeilenbasierten Zugriffsschutz vollständig: die eine
 * Zugangsberechtigung, die jedes Tagebuch jedes Nutzers lesen kann. In der
 * Härtungswoche wurde er GELÖSCHT, weil ihn niemand benutzte — mit dem Satz,
 * ein Vorrat für später sei eine offene Tür ohne Wächter (SICHERHEIT.md
 * Punkt 1). Jetzt gibt es einen Benutzer, also gibt es auch den Wächter.
 *
 * Vier Zusicherungen, und jede hat eine Gegenprobe. Eine Suche, die nichts
 * findet, sagt nichts, solange nicht gezeigt ist, dass sie etwas finden kann.
 *
 *   1. Genau EINE Datei unter src/ nennt den Schlüssel.
 *   2. Sie trägt `import "server-only"`.
 *   3. Sie fasst nur `flags` und `evaluations` an — nie Nutzerdaten.
 *   4. Kein Client-Bündel nennt ihn.
 *   5. Nur mit .env.local: sein WERT kommt in keiner Build-Datei vor.
 *
 * Punkt 5 braucht das Geheimnis selbst und läuft deshalb nur lokal. Das Skript
 * sagt am Ende ausdrücklich, welche Prüfungen es übersprungen hat — eine
 * Ausgabe, die verschweigt, was sie nicht getan hat, ist schlimmer als keine.
 *
 *   npm run build --workspace=web        (Punkt 4 braucht .next/)
 *   npm run check:service-role --workspace=web
 * ---------------------------------------------------------------------------
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";

const WEB = resolve(import.meta.dirname, "..");
const SRC = resolve(WEB, "src");
const BUILD = resolve(WEB, ".next");

const SCHLUESSEL = "SUPABASE_SERVICE_ROLE_KEY";
const ANON = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

/** Die eine Datei, die ihn anfassen darf, und die zwei Tabellen, die sie darf. */
const ERLAUBTE_DATEI = "src/lib/db/verdict-write.ts";
const ERLAUBTE_TABELLEN = new Set(["flags", "evaluations"]);

/**
 * Ein Literal, das nachweislich in einem Client-Bündel steht.
 *
 * Es ist die Gegenprobe zu Punkt 4: Ohne sie bewiese »der Schlüssel kommt in
 * keinem Bündel vor« nur, dass die Suche ins Leere lief. Gewählt ist eine
 * Zeichenkette aus `EntryForm.tsx` — einem Bauteil mit "use client" —, die
 * keine Verkleinerung wegkürzt, weil sie ein Wert ist und kein Bezeichner.
 */
const ZEUGE = "morningScore-hint";

type Pruefung = { name: string; ok: boolean; detail: string };
const pruefungen: Pruefung[] = [];
const uebersprungen: string[] = [];

function record(name: string, ok: boolean, detail = ""): void {
  pruefungen.push({ name, ok, detail });
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail === "" ? "" : ` — ${detail}`}`);
}

function dateien(dir: string, passt: (name: string) => boolean, out: string[] = []): string[] {
  for (const eintrag of readdirSync(dir)) {
    const pfad = join(dir, eintrag);
    if (statSync(pfad).isDirectory()) dateien(pfad, passt, out);
    else if (passt(eintrag)) out.push(pfad);
  }
  return out;
}

const kurz = (p: string) => p.slice(WEB.length + 1).split(sep).join("/");

// ---------------------------------------------------------------------------
// 1 — Wer nennt den Schlüssel?
// ---------------------------------------------------------------------------

const quelldateien = dateien(SRC, (n) => /\.tsx?$/.test(n));
const nenner = quelldateien.filter((p) => readFileSync(p, "utf8").includes(SCHLUESSEL));

const einziger = nenner.length === 1 ? nenner[0] : undefined;
record(
  "genau eine Datei unter src/ nennt den Schlüssel",
  einziger !== undefined && kurz(einziger) === ERLAUBTE_DATEI,
  nenner.length === 0 ? "keine" : nenner.map(kurz).join(", "),
);

// Gegenprobe: Findet diese Suche überhaupt etwas? Ohne sie wäre ein Tippfehler
// im gesuchten Namen ein grüner Haken.
const anonNenner = quelldateien.filter((p) => readFileSync(p, "utf8").includes(ANON));
record(
  "Gegenprobe: dieselbe Suche findet den anon key",
  anonNenner.length > 0,
  `${anonNenner.length} Datei(en) unter ${quelldateien.length}`,
);

// ---------------------------------------------------------------------------
// 2 und 3 — Was tut diese eine Datei?
// ---------------------------------------------------------------------------

const pfad = resolve(WEB, ERLAUBTE_DATEI);
if (!existsSync(pfad)) {
  record(`${ERLAUBTE_DATEI} existiert`, false, "fehlt");
} else {
  const inhalt = readFileSync(pfad, "utf8");

  record(
    "sie trägt import \"server-only\"",
    /^\s*import\s+["']server-only["'];?\s*$/m.test(inhalt),
    "sonst wäre der Import aus einem Client-Bauteil ein Kommentar statt eines Build-Fehlers",
  );

  const tabellen = new Set(
    [...inhalt.matchAll(/\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g)].flatMap((m) =>
      m[1] === undefined ? [] : [m[1]],
    ),
  );
  const verboten = [...tabellen].filter((t) => !ERLAUBTE_TABELLEN.has(t));
  record(
    "sie fasst nur flags und evaluations an",
    verboten.length === 0 && tabellen.size > 0,
    tabellen.size === 0
      ? "gar keine Tabelle gefunden — greift das Suchmuster noch?"
      : verboten.length > 0
        ? `auch: ${verboten.join(", ")}`
        : [...tabellen].join(", "),
  );

  // Die eigentliche Zusicherung hinter Punkt 3: Der Schlüssel liest NIE. Ein
  // Fehler in einer Abfrage läse sonst ein fremdes Tagebuch und sähe dabei aus,
  // als funktioniere er.
  record(
    "und liest mit ihm nichts",
    !/\.select\(/.test(inhalt),
    "ein .select() mit diesem Zugang ginge an allen Zugriffsregeln vorbei",
  );
}

// ---------------------------------------------------------------------------
// 4 — Kommt der Name in einem Client-Bündel vor?
// ---------------------------------------------------------------------------

const statisch = resolve(BUILD, "static");
if (!existsSync(statisch)) {
  uebersprungen.push(
    `Punkt 4 (Client-Bündel): kein ${kurz(statisch)}. Zuerst: npm run build --workspace=web`,
  );
} else {
  const buendel = dateien(statisch, (n) => n.endsWith(".js"));
  const treffer = buendel.filter((p) => readFileSync(p, "utf8").includes(SCHLUESSEL));
  record(
    "kein Client-Bündel nennt den Schlüssel",
    treffer.length === 0,
    treffer.length === 0 ? `${buendel.length} Bündel durchsucht` : treffer.map(kurz).join(", "),
  );

  const zeugen = buendel.filter((p) => readFileSync(p, "utf8").includes(ZEUGE));
  record(
    `Gegenprobe: »${ZEUGE}« steht in einem Bündel`,
    zeugen.length > 0,
    zeugen.length > 0
      ? `${zeugen.length} Bündel`
      : "die Suche liest also womöglich die falschen Dateien",
  );
}

// ---------------------------------------------------------------------------
// 5 — Der WERT, nicht der Name. Braucht das Geheimnis, also nur lokal.
// ---------------------------------------------------------------------------

const envPfad = resolve(WEB, ".env.local");
if (!existsSync(envPfad) || !existsSync(BUILD)) {
  uebersprungen.push(
    "Punkt 5 (der Wert im Build): braucht .env.local und .next/. Das ist der Grund, " +
      "warum diese Prüfung in CI weniger sagt als lokal.",
  );
} else {
  const env = Object.fromEntries(
    readFileSync(envPfad, "utf8")
      .split(/\r?\n/)
      .filter((z) => z.trim() !== "" && !z.trim().startsWith("#"))
      .map((z) => {
        const i = z.indexOf("=");
        return [z.slice(0, i).trim(), z.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  ) as Record<string, string>;

  const wert = env[SCHLUESSEL];
  const anonWert = env[ANON];

  if (wert === undefined || wert === "") {
    uebersprungen.push(`Punkt 5: ${SCHLUESSEL} steht nicht in .env.local.`);
  } else {
    const alle = dateien(BUILD, (n) => /\.(js|json|map|html|txt|rsc)$/.test(n));
    const treffer = alle.filter((p) => readFileSync(p, "utf8").includes(wert));
    record(
      "der Wert kommt in keiner Build-Datei vor",
      treffer.length === 0,
      treffer.length === 0 ? `${alle.length} Dateien durchsucht` : treffer.map(kurz).join(", "),
    );

    if (anonWert !== undefined && anonWert !== "") {
      const anonTreffer = alle.filter((p) => readFileSync(p, "utf8").includes(anonWert));
      record(
        "Gegenprobe: der anon key kommt vor",
        anonTreffer.length > 0,
        `${anonTreffer.length} Dateien`,
      );
    }
  }
}

// ---------------------------------------------------------------------------

for (const satz of uebersprungen) console.log(`  --    ÜBERSPRUNGEN: ${satz}`);

const durchgefallen = pruefungen.filter((p) => !p.ok);
if (durchgefallen.length > 0) {
  console.error(
    `\n${durchgefallen.length} von ${pruefungen.length} Prüfungen fehlgeschlagen.\n` +
      `Der Service-Role-Schlüssel umgeht JEDE Zugriffsregel. Nichts hiervon ist Kosmetik.\n`,
  );
  process.exit(1);
}

console.log(
  `\nAlle ${pruefungen.length} Prüfungen halten` +
    (uebersprungen.length > 0 ? `, ${uebersprungen.length} übersprungen.` : ".") +
    "\n",
);
