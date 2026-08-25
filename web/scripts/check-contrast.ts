/**
 * Jedes Farbpaar, das die App tatsächlich zeigt, gegen WCAG AA.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS EIN SKRIPT IST UND KEIN BLICK.
 *
 * Kontrast lässt sich nicht ansehen. Zwei Paare, die auf einem guten Monitor
 * in einem hellen Raum beide »gut lesbar« aussehen, können 6:1 und 3:1 sein —
 * und das zweite ist auf einem Telefon in der Sonne, oder für ein Auge mit
 * beginnendem Grauen Star, unlesbar.
 *
 * Wen das hier trifft, ist nicht abstrakt: Wer eine Sehnenverletzung hat,
 * bedient das Telefon oft einhändig und liest im Vorbeigehen; ein Teil der
 * Nutzer ist älter; und ein Tagebuch, das man neunzig Tage lang führen soll,
 * wird abends geführt, müde, bei schlechtem Licht.
 *
 * ---------------------------------------------------------------------------
 * BEIDE THEMEN, UND DAS IST DER HALBE SINN.
 *
 * Die App hat einen dunklen Modus über `prefers-color-scheme`. Ein Paar, das
 * hell besteht, kann dunkel durchfallen — die dunkle Palette ist eine eigene
 * Palette, keine Umrechnung. Beide werden hier geprüft.
 *
 * ---------------------------------------------------------------------------
 * WAS AA VERLANGT.
 *
 * 4,5:1 für gewöhnlichen Text, 3:1 für grossen Text (ab 18,66 px fett oder
 * 24 px) und für die Umrisse von BEDIENELEMENTEN (1.4.11). Dieses Skript prüft
 * Text durchweg gegen 4,5 — auch dort, wo 3 genügen würde. Ein Grenzentext,
 * der die Einschränkung eines Profils erklärt, ist kein Schmuck.
 *
 * ---------------------------------------------------------------------------
 * WARUM `--line` HIER NICHT VORKOMMT.
 *
 * Es gibt zwei Randfarben, und der Unterschied ist eine Entscheidung, keine
 * Bequemlichkeit:
 *
 *   --edge  umrandet, was man antippen oder in das man tippen kann. 1.4.11
 *           verlangt 3:1, sonst ist nicht erkennbar, wo das Feld anfängt.
 *           Steht deshalb unten in der Liste.
 *
 *   --line  trennt und rahmt ohne Bedienfunktion: Karten, Abschnittslinien,
 *           ein Zitatbalken. WCAG verlangt dafür nichts — und ein Rand mit
 *           3:1 liesse jede Karte aussehen wie ein Formular, also genau die
 *           Unterscheidung verwischen, um die es hier geht.
 *
 * Beide zu prüfen wäre falsch, keins von beiden auch. Diese Datei prüft das
 * eine und sagt beim anderen, warum nicht.
 * ---------------------------------------------------------------------------
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS = resolve(process.cwd(), "src/app/globals.css");

const AA_TEXT = 4.5;
/** Für Umrisse und Trennlinien — sie tragen keinen Text. */
const AA_UI = 3;

type Paar = {
  vordergrund: string;
  hintergrund: string;
  schwelle: number;
  wo: string;
};

/**
 * Was die App wirklich nebeneinanderstellt.
 *
 * Von Hand geführt und nicht aus dem CSS erraten: Welche Farbe auf welchem
 * Grund landet, entscheidet die Seite, nicht die Variablendatei. Ein Paar hier
 * ist eine Aussage über das Produkt.
 */
const PAARE: Paar[] = [
  { vordergrund: "--fg", hintergrund: "--bg", schwelle: AA_TEXT, wo: "Fliesstext auf der Seite" },
  { vordergrund: "--fg", hintergrund: "--card", schwelle: AA_TEXT, wo: "Text in einer Karte" },
  { vordergrund: "--muted", hintergrund: "--bg", schwelle: AA_TEXT, wo: "Hinweistexte unter Feldern" },
  {
    vordergrund: "--muted",
    hintergrund: "--card",
    schwelle: AA_TEXT,
    wo: "die Grenzen eines Profils — genau der Satz, der gelesen werden muss",
  },
  { vordergrund: "--green", hintergrund: "--card", schwelle: AA_TEXT, wo: "»Gespeichert.«" },
  { vordergrund: "--green", hintergrund: "--bg", schwelle: AA_TEXT, wo: "Entwarnung" },
  { vordergrund: "--amber", hintergrund: "--card", schwelle: AA_TEXT, wo: "Warnung im Formular" },
  { vordergrund: "--amber", hintergrund: "--bg", schwelle: AA_TEXT, wo: "Warnung auf der Seite" },
  { vordergrund: "--red", hintergrund: "--card", schwelle: AA_TEXT, wo: "deutliche Warnung" },
  { vordergrund: "--red", hintergrund: "--bg", schwelle: AA_TEXT, wo: "deutliche Warnung" },
  {
    vordergrund: "--unjudged",
    hintergrund: "--bg",
    schwelle: AA_TEXT,
    wo: "»nicht genug beurteilt« — die Farbe, die nie nach Grün aussehen darf",
  },
  { vordergrund: "--unjudged", hintergrund: "--card", schwelle: AA_TEXT, wo: "»nicht genug beurteilt«" },
  { vordergrund: "--bg", hintergrund: "--fg", schwelle: AA_TEXT, wo: "Beschriftung auf dem Hauptknopf" },
  { vordergrund: "--edge", hintergrund: "--bg", schwelle: AA_UI, wo: "Umriss eines Eingabefelds" },
  { vordergrund: "--edge", hintergrund: "--card", schwelle: AA_UI, wo: "Umriss eines Felds in einer Karte" },
];

function fail(message: string): never {
  console.error(`\nKontrastprüfung FEHLGESCHLAGEN\n\n${message}\n`);
  process.exit(1);
}

/** Die Variablen eines Themas aus globals.css. */
function palette(css: string, dunkel: boolean): Record<string, string> {
  const block = dunkel
    ? css.slice(css.indexOf("@media (prefers-color-scheme: dark)"))
    : css.slice(0, css.indexOf("@media (prefers-color-scheme: dark)"));

  const out: Record<string, string> = {};
  for (const match of block.matchAll(/(--[a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    out[match[1]!] = match[2]!;
  }
  return out;
}

/** Relative Leuchtdichte nach WCAG 2.x. */
function luminanz(hex: string): number {
  const kanal = (i: number): number => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * kanal(0) + 0.7152 * kanal(1) + 0.0722 * kanal(2);
}

function verhaeltnis(a: string, b: string): number {
  const [hell, dunkel] = [luminanz(a), luminanz(b)].sort((x, y) => y - x) as [number, number];
  return (hell + 0.05) / (dunkel + 0.05);
}

function main(): void {
  const css = readFileSync(CSS, "utf8");
  const themen: [string, Record<string, string>][] = [
    ["hell", palette(css, false)],
    ["dunkel", palette(css, true)],
  ];

  const durchgefallen: string[] = [];
  let geprueft = 0;

  for (const [name, farben] of themen) {
    console.log(`\n${name}`);
    for (const paar of PAARE) {
      const vg = farben[paar.vordergrund];
      const hg = farben[paar.hintergrund];
      if (vg === undefined || hg === undefined) {
        fail(
          `${paar.vordergrund} oder ${paar.hintergrund} fehlt im ${name}en Thema.\n` +
            `Eine Farbe, die nur in einem Thema existiert, ist im anderen unsichtbar.`,
        );
      }

      geprueft++;
      const wert = verhaeltnis(vg, hg);
      const haelt = wert >= paar.schwelle;
      const zeile = `${haelt ? "  ok  " : " FAIL "} ${wert.toFixed(2)}:1 (mind. ${paar.schwelle}) ${paar.vordergrund} auf ${paar.hintergrund} — ${paar.wo}`;
      console.log(zeile);
      if (!haelt) durchgefallen.push(`${name}: ${zeile.trim()}`);
    }
  }

  // Fail-open-Sperre, dieselbe wie bei der RLS-Prüfung: Findet der Ausdruck
  // oben keine Farben, bestünde eine leere Liste jede Prüfung mühelos.
  if (geprueft < PAARE.length * 2) {
    fail(`Nur ${geprueft} Paare geprüft, ${PAARE.length * 2} erwartet. globals.css wurde nicht gelesen.`);
  }

  if (durchgefallen.length > 0) {
    fail(
      `${durchgefallen.length} Farbpaar(e) unter AA:\n\n` +
        durchgefallen.map((z) => `  ${z}`).join("\n") +
        `\n\nEine Farbe hier zu ändern ist eine Entscheidung über Lesbarkeit,\n` +
        `nicht über Geschmack. Wer eine Schwelle senken will, muss sagen, für\n` +
        `wen der Text dann nicht mehr da ist.`,
    );
  }

  console.log(`\nAlle ${geprueft} Farbpaare bestehen WCAG AA, hell und dunkel.\n`);
}

main();
