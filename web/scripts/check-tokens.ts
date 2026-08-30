/**
 * Die Skala ist eine Skala, oder sie ist nichts.
 *
 * ---------------------------------------------------------------------------
 * WAS OHNE DIESE PRÜFUNG ZURÜCKKOMMT.
 *
 * Vor Karte A1 standen 75 Schriftgrössen verstreut im Code. Gezählt: **0.8,
 * 0.85, 0.88, 0.9 und 0.92 rem — fünf Werte für »kleiner Text«, in 54
 * Verwendungen.** Keiner davon war eine Entscheidung. Sie sind entstanden, wie
 * so etwas immer entsteht: kopieren, ein bisschen nachjustieren, weitergehen.
 *
 * Eine Skala hält das nur auf, solange niemand daneben schreibt. Und daneben
 * schreibt man nicht aus Nachlässigkeit, sondern weil eine Stelle gerade einen
 * Tick kleiner aussehen soll — was jedes Mal stimmt und in Summe die Skala
 * auflöst.
 *
 * ---------------------------------------------------------------------------
 * DREI ZUSICHERUNGEN, UND DIE DRITTE IST DIE STILLE.
 *
 * 1. Keine rohe Schriftgrösse, kein rohes Gewicht, kein roher Radius
 *    ausserhalb von `lib/ui.ts` — dort steht die Skala selbst.
 *
 * 2. Eine dokumentierte Ausnahme: `em` statt `rem`. Eine Zeile INNERHALB eines
 *    Satzes soll relativ zu dessen Grösse schrumpfen; ein fester Wert sähe je
 *    nach Umgebung mal zu gross und mal zu klein aus.
 *
 * 3. **Jeder benutzte Token existiert auch.** Das ist der Fall, der niemandem
 *    auffällt: `var(--text-md)` gibt es nicht, CSS wirft dafür keinen Fehler,
 *    und der Text erbt still die Grösse seines Elternelements. Auf dem
 *    Bildschirm sieht das nach einer Entscheidung aus.
 *
 * ---------------------------------------------------------------------------
 * ABSTÄNDE WERDEN (NOCH) NICHT ERZWUNGEN.
 *
 * `--space-*` gibt es, und die geteilten Formen benutzen es. Die 126 verstreuten
 * Abstände im übrigen Code sind aber überwiegend zusammengesetzt (`"0 0 1rem"`),
 * und die mechanisch umzustellen hiesse, jede Zeile ungeprüft anzufassen.
 *
 * Was hier trotzdem gilt: Ein `var(--space-…)`, das es nicht gibt, fällt auf.
 * Die Erzwingung kommt, wenn die Abstände einmal von Hand durchgegangen sind —
 * und dieser Absatz ist der Ort, an dem das dann gestrichen wird.
 *
 *   npm run check:tokens --workspace=web
 * ---------------------------------------------------------------------------
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";

const WEB = resolve(import.meta.dirname, "..");
const SRC = resolve(WEB, "src");
const CSS = resolve(SRC, "app/globals.css");

/** Hier steht die Skala selbst; rohe Werte sind genau hier die Definition. */
const SKALA_DATEI = join("src", "lib", "ui.ts");

type Fund = { datei: string; zeile: number; text: string; warum: string };
const funde: Fund[] = [];

function dateien(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const pfad = join(dir, name);
    if (statSync(pfad).isDirectory()) dateien(pfad, out);
    else if (/\.tsx?$/.test(name)) out.push(pfad);
  }
  return out;
}

const kurz = (p: string) => p.slice(WEB.length + 1).split(sep).join("/");

// ---------------------------------------------------------------------------
// Welche Token gibt es überhaupt?
// ---------------------------------------------------------------------------

const css = readFileSync(CSS, "utf8");
const vorhanden = new Set(
  [...css.matchAll(/^\s*(--[\w-]+):/gm)].flatMap((m) => (m[1] === undefined ? [] : [m[1]])),
);

if (vorhanden.size < 10) {
  console.error(
    `\nNur ${vorhanden.size} Token in globals.css gefunden. Das Suchmuster passt nicht mehr —\n` +
      `und eine Prüfung, die keine Token kennt, findet auch keinen falschen.\n`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1 bis 3 — durch jede Quelldatei
// ---------------------------------------------------------------------------

const quellen = dateien(SRC);

for (const pfad of quellen) {
  const inDerSkala = kurz(pfad).endsWith("src/lib/ui.ts") || pfad.endsWith(SKALA_DATEI);
  const zeilen = readFileSync(pfad, "utf8").split(/\r?\n/);

  zeilen.forEach((zeile, i) => {
    const stelle = (text: string, warum: string): void => {
      funde.push({ datei: kurz(pfad), zeile: i + 1, text: text.trim(), warum });
    };

    if (!inDerSkala) {
      // Rohe Schriftgrösse in rem oder px. `em` ist die dokumentierte Ausnahme.
      for (const m of zeile.matchAll(/fontSize:\s*"([^"]+)"/g)) {
        const wert = m[1] ?? "";
        if (wert.startsWith("var(")) continue;
        if (wert.endsWith("em") && !wert.endsWith("rem")) continue;
        stelle(zeile, `rohe Schriftgrösse »${wert}« — nimm var(--text-…)`);
      }
      for (const m of zeile.matchAll(/fontWeight:\s*([0-9]+)/g)) {
        stelle(zeile, `rohes Schriftgewicht »${m[1]}« — nimm var(--weight-…)`);
      }
      for (const m of zeile.matchAll(/borderRadius:\s*"([^"]+)"/g)) {
        const wert = m[1] ?? "";
        if (wert.startsWith("var(") || wert === "50%" || wert === "9999px") continue;
        stelle(zeile, `roher Radius »${wert}« — nimm var(--radius-…)`);
      }
    }

    // Gilt AUCH in der Skala selbst: ein Token, das es nicht gibt, ist dort
    // genauso still wie überall sonst.
    for (const m of zeile.matchAll(/var\((--[\w-]+)\)/g)) {
      const token = m[1] ?? "";
      if (!vorhanden.has(token)) {
        stelle(zeile, `»${token}« gibt es in globals.css nicht — CSS erbt dann still`);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Gegenprobe: Findet dieser Lauf überhaupt etwas?
//
// Ohne sie ginge ein verstelltes Suchmuster als grüner Haken durch.
// ---------------------------------------------------------------------------

const probe = 'fontSize: "0.87rem", fontWeight: 550, var(--gibt-es-nicht)';
const findetSchrift = /fontSize:\s*"([^"]+)"/.test(probe);
const findetGewicht = /fontWeight:\s*([0-9]+)/.test(probe);
const findetToken = [...probe.matchAll(/var\((--[\w-]+)\)/g)].some((m) => !vorhanden.has(m[1] ?? ""));

if (!findetSchrift || !findetGewicht || !findetToken) {
  console.error("\nDie Suchmuster finden ihre eigene Probe nicht. Diese Prüfung ist blind.\n");
  process.exit(1);
}

if (funde.length > 0) {
  console.error(`\n${funde.length} Stelle(n) neben der Skala:\n`);
  for (const f of funde) {
    console.error(`  ${f.datei}:${f.zeile}  ${f.warum}`);
  }
  console.error(
    `\nDie Skala steht in src/app/globals.css, die Formen in src/lib/ui.ts.\n` +
      `Wer eine Stufe braucht, die es nicht gibt, trifft eine Entscheidung —\n` +
      `und die gehört in die Skala, nicht neben sie.\n`,
  );
  process.exit(1);
}

console.log(
  `\nDie Skala hält: ${quellen.length} Quelldateien, ${vorhanden.size} Token in globals.css,\n` +
    `keine rohe Schriftgrösse, kein rohes Gewicht, kein roher Radius, kein toter Token.\n`,
);
