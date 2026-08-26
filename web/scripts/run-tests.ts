/**
 * Der Testlauf — mit einer Untergrenze gegen den einen Fehlschlag, der grün
 * meldet.
 *
 * ---------------------------------------------------------------------------
 * WARUM `vitest run` NICHT DIREKT AUFGERUFEN WIRD.
 *
 * Als die zweite Testumgebung entstand, lief der erste kalte Lauf so:
 *
 *   Failed to start forks worker for test files .../umgebung.test.tsx
 *   Caused by: Timeout waiting for worker to respond
 *   Test Files  8 passed (8)   Tests  95 passed (95)   Errors  1 error
 *   EXITCODE=0
 *
 * **Das ganze jsdom-Projekt lief nicht, und der Lauf meldete grün.** In CI wäre
 * das »App — Tests ✓« mit null Bauteiltests gewesen — und CI hat bei jedem Lauf
 * einen kalten Cache, das ist dort also nicht der Randfall, sondern der
 * Normalfall.
 *
 * Der Startfehler selbst ist behoben (`pool: "threads"` statt forks; 4,5 s
 * kalt statt Zeitüberschreitung). Was bleibt, ist die Bauform: Ein Pool, der
 * nicht startet, beendet den Lauf mit 0. Ein Importfehler tut das nicht — der
 * ist nachgemessen und liefert 1 —, aber genau diese eine Klasse eben doch.
 *
 * ---------------------------------------------------------------------------
 * DIE UNTERGRENZE IST KEINE ZAHL.
 *
 * »Mindestens 98 Tests« wäre die Sorte Zahl, die niemand nachzieht — dieselbe,
 * gegen die `check:docs` gebaut wurde.
 *
 * Verglichen werden stattdessen zwei unabhängig ermittelte Tatsachen: **welche
 * Testdateien auf der Platte liegen** und **welche einen Befund gemeldet
 * haben.** Was auf der einen Seite fehlt, wird benannt. Das hält auch, wenn
 * jemand ein Suchmuster in `vitest.config.mts` verengt, eine Datei falsch
 * benennt, oder ein ganzes Projekt stumm bleibt.
 * ---------------------------------------------------------------------------
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

const WEB = resolve(import.meta.dirname, "..");
const WURZEL = resolve(WEB, "..");
const VITEST = resolve(WURZEL, "node_modules/vitest/vitest.mjs");

/** Jede Testdatei unter test/ — beide Endungen, beide Umgebungen. */
function testdateien(dir: string, out: string[] = []): string[] {
  for (const eintrag of readdirSync(dir)) {
    const pfad = join(dir, eintrag);
    if (statSync(pfad).isDirectory()) testdateien(pfad, out);
    else if (/\.test\.tsx?$/.test(eintrag)) out.push(pfad);
  }
  return out;
}

const arbeitsordner = mkdtempSync(join(tmpdir(), "loadwise-tests-"));
const bericht = join(arbeitsordner, "bericht.json");

let lauf = 0;
try {
  execFileSync(
    process.execPath,
    [VITEST, "run", "--reporter=default", "--reporter=json", `--outputFile.json=${bericht}`],
    { cwd: WEB, stdio: "inherit" },
  );
} catch {
  lauf = 1;
}

// Auch bei rotem Lauf weiterprüfen: Ein Fehlschlag IN einem Test und eine
// Datei, die gar nicht gelaufen ist, sind zwei verschiedene Auskünfte, und die
// zweite geht sonst in der ersten unter.
let gemeldet: Set<string>;
try {
  const roh = JSON.parse(readFileSync(bericht, "utf8")) as {
    testResults?: { name: string }[];
  };
  gemeldet = new Set((roh.testResults ?? []).map((r) => resolve(r.name)));
} catch {
  console.error(
    `\nKein Bericht unter ${bericht}.\n` +
      `Vitest hat keinen geschrieben — das heisst, der Lauf ist nicht bis zum Ende gekommen.\n`,
  );
  rmSync(arbeitsordner, { recursive: true, force: true });
  process.exit(1);
}
rmSync(arbeitsordner, { recursive: true, force: true });

const vorhanden = testdateien(resolve(WEB, "test")).map((p) => resolve(p));
const stumm = vorhanden.filter((p) => !gemeldet.has(p));

if (stumm.length > 0) {
  console.error(
    `\nTestdateien ohne Befund: ${stumm.length} von ${vorhanden.length}\n\n` +
      stumm.map((p) => `  ${p.slice(WEB.length + 1).split(sep).join("/")}`).join("\n") +
      `\n\nDiese Dateien liegen unter test/ und haben nichts gemeldet — weder grün\n` +
      `noch rot. Entweder greift kein Suchmuster in vitest.config.mts, oder das\n` +
      `Projekt, zu dem sie gehören, ist gar nicht gestartet.\n`,
  );
  process.exit(1);
}

console.log(`\nAlle ${vorhanden.length} Testdateien haben einen Befund gemeldet.`);
process.exit(lauf);
