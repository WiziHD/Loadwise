/**
 * Schlägt in der englischen Fassung Deutsch durch?
 *
 * ---------------------------------------------------------------------------
 * ENGLISCH FÜHRT, UND GENAU DESHALB IST DIESE PRÜFUNG NÖTIG.
 *
 * `config.ts` hält fest: *»English leads. German is second — a decision from
 * the concept: the product is meant to be usable worldwide.«* Geschrieben wird
 * hier trotzdem zuerst auf Deutsch, weil der Entwickler deutsch denkt. Der
 * kürzeste Weg von einem deutschen Satz zu einem englischen Feld ist deshalb
 * Kopieren-und-vergessen.
 *
 * Das fällt niemandem auf, der die App auf Deutsch benutzt. Es fällt genau der
 * Person auf, die sie zum ersten Mal auf Englisch öffnet — und die ist die
 * Zielgruppe.
 *
 * ---------------------------------------------------------------------------
 * BEIDE SEITEN: WÖRTERBUCH UND MOTOR.
 *
 * Ein deutscher Satz in einem `Phrase.en` des Motors erreicht den Bildschirm
 * auf genau demselben Weg wie einer im Wörterbuch. Die Ban-Listen in
 * `wording.test.ts` prüfen, WAS ein Satz sagt, nicht in welcher Sprache.
 *
 * ---------------------------------------------------------------------------
 * DREI SIGNALE, UND JEDES MIT GEGENPROBE.
 *
 * 1. **Umlaute und ß.** In englischem Produkttext kommen sie nicht vor.
 * 2. **Deutsche Anführungszeichen** »«. Die deutsche Fassung benutzt sie
 *    durchgehend; im Englischen wären sie ohnehin falsch gesetzt.
 * 3. **Eine enge Liste eindeutiger Funktionswörter.** Eng ist das Wort, auf
 *    das es ankommt: `die`, `war`, `hat`, `man`, `so`, `in`, `an` sind auch
 *    englisch, und eine Liste mit Fehlalarmen ist eine Liste, die abgeschaltet
 *    wird.
 *
 * Unten steht deshalb nicht nur, dass gepflanzte deutsche Sätze gefangen
 * werden, sondern auch, dass echte englische Sätze aus dem Produkt es NICHT
 * werden. Ohne die zweite Hälfte wäre ein zu breites Muster nicht zu
 * unterscheiden von einem guten.
 *
 * ---------------------------------------------------------------------------
 * NUR EINE RICHTUNG, UND DAS IST EINE ENTSCHEIDUNG.
 *
 * Englisch im deutschen Block wird nicht geprüft. Eine Liste englischer Wörter
 * schlüge auf jedes Lehnwort an — »Level«, »Score«, »Update« —, und die
 * deutsche Fassung ist ohnehin die, in der geschrieben wird. Der Fehler läuft
 * in eine Richtung, die Prüfung auch.
 *
 * Run: npm run check:language --workspace=web
 * ---------------------------------------------------------------------------
 */

import {
  ALL_BLOCKING_REASONS,
  ALL_PROFILES,
  ALL_REASON_CODES,
  BLOCKED_WORDING,
  CLAIM_WORDING,
  DISCLAIMER,
  EVIDENCE_WORDING,
  MILESTONE_WORDING,
  PROBLEM_WORDING,
  PROGRESS_BLOCK_WORDING,
  SELF_COMPARISON,
  TEST_PROCEDURE,
  VERDICT_WORDING,
} from "loadwise-engine";
import { DICTIONARY } from "../src/i18n/dictionary.js";

/**
 * Wörter, die es im Englischen nicht gibt — oder nicht in dieser Schreibung.
 *
 * Bewusst kurz. Jedes zusätzliche Wort ist ein möglicher Fehlalarm, und ein
 * Wächter mit Fehlalarmen wird abgeschaltet, bevor er den ersten echten Fund
 * hat. Ausgelassen: `die`, `war`, `hat`, `man`, `so`, `in`, `an`, `am`, `bin`,
 * `was`, `will`, `list`, `rot` — alle auch englisch.
 */
const FUNKTIONSWOERTER = [
  "und", "nicht", "ist", "dass", "oder", "aber", "noch", "schon", "wenn",
  "weil", "beim", "vom", "zum", "zur", "sich", "auch", "eine", "einen",
  "einem", "deine", "dein", "dich", "dir", "wurde", "wird", "kann", "keine",
  "kein", "nach", "sind", "werden", "sein", "haben", "diese", "dieser",
  "dieses", "damit", "dann", "durch", "gibt", "steht", "sagt",
  "heisst", "wieder", "immer", "jede", "jeder", "jedes", "ohne", "hier",
  "dort", "etwas", "nichts", "mehr", "weniger", "gegen", "ueber", "unter",
  "beide", "beiden",
];

/**
 * Inhaltswörter aus dem Vokabular DIESES Produkts.
 *
 * ---------------------------------------------------------------------------
 * DIESE LISTE VERDANKT SICH EINER GEGENPROBE, DIE FEHLGESCHLAGEN IST.
 *
 * Die erste Fassung hatte nur Funktionswörter — und liess »Beide Seiten,
 * gemessen in« durch, die echte deutsche Tabellenbeschriftung aus dem
 * Seitenvergleich. Kein Umlaut, kein »und«, kein »nicht«: Eine kurze
 * Beschriftung besteht oft genau aus den Wörtern, die keine Funktionswörter
 * sind.
 *
 * Gefunden hat es nicht das Produkt, sondern der gepflanzte Satz. Ein Wächter
 * ohne Gegenprobe hätte hier »alles sauber« gemeldet und wäre für kurze
 * Beschriftungen — also für die Hälfte einer Oberfläche — blind gewesen.
 *
 * Jedes Wort hier ist im Englischen kein Wort. Das ist die Bedingung für die
 * Aufnahme, und die zweite Gegenprobe unten hält sie fest.
 * ---------------------------------------------------------------------------
 */
const INHALTSWOERTER = [
  "seiten", "gemessen", "messung", "messungen", "morgen", "tagebuch",
  "verlauf", "tage", "tagen", "wert", "werte", "ziel", "ziele", "notiz",
  "einheit", "einheiten", "verletzte", "gesunde", "erfasst", "gespeichert",
  "belastung", "beschwerden", "auswertung", "urteil", "profil", "woche",
  "wochen", "seite", "zeitraum", "abstand",
];

const DEUTSCH = [...FUNKTIONSWOERTER, ...INHALTSWOERTER];

const UMLAUT = /[äöüÄÖÜß]/;
const DEUTSCHE_ANFUEHRUNG = /[»«]/;

/** Warum ein Satz verdächtig ist — oder null, wenn er es nicht ist. */
export function germanSmell(text: string): string | null {
  if (UMLAUT.test(text)) return "Umlaut oder ß";
  if (DEUTSCHE_ANFUEHRUNG.test(text)) return "deutsche Anführungszeichen";

  const woerter = text.toLowerCase().match(/[a-zäöüß]+/g) ?? [];
  const treffer = woerter.filter((w) => DEUTSCH.includes(w));
  return treffer.length > 0 ? `deutsche Wörter: ${[...new Set(treffer)].join(", ")}` : null;
}

/** Jede englische Zeichenkette der App, mit ihrem Pfad. */
function appStrings(): { pfad: string; text: string }[] {
  const out: { pfad: string; text: string }[] = [];
  const walk = (wert: unknown, pfad: string[]): void => {
    if (typeof wert === "string") {
      out.push({ pfad: pfad.join("."), text: wert });
      return;
    }
    if (wert === null || typeof wert !== "object") return;
    for (const [k, v] of Object.entries(wert)) walk(v, [...pfad, k]);
  };
  walk(DICTIONARY.en, []);
  return out;
}

/** Jeder englische Motorsatz, mit seiner Herkunft. */
function engineStrings(): { pfad: string; text: string }[] {
  const out: { pfad: string; text: string }[] = [];
  const add = (pfad: string, phrase: { en: string }): void => {
    out.push({ pfad, text: phrase.en });
  };

  for (const code of ALL_REASON_CODES) add(`verdict:${code}`, VERDICT_WORDING[code]);
  for (const reason of ALL_BLOCKING_REASONS) add(`blocked:${reason}`, BLOCKED_WORDING[reason]);
  for (const [k, p] of Object.entries(MILESTONE_WORDING)) add(`milestone:${k}`, p);
  for (const [k, p] of Object.entries(CLAIM_WORDING)) add(`claim:${k}`, p);
  for (const [k, p] of Object.entries(EVIDENCE_WORDING)) add(`evidence:${k}`, p);
  for (const [k, p] of Object.entries(PROBLEM_WORDING)) add(`problem:${k}`, p);
  for (const [k, p] of Object.entries(PROGRESS_BLOCK_WORDING)) add(`block:${k}`, p);
  add("disclaimer", DISCLAIMER);
  add("note:selfComparison", SELF_COMPARISON);

  for (const [art, procedure] of Object.entries(TEST_PROCEDURE)) {
    procedure.steps.en.forEach((schritt, i) =>
      out.push({ pfad: `procedure:${art}[${i}]`, text: schritt }),
    );
    add(`procedure:${art}/fixed`, procedure.fixed);
  }

  for (const profile of ALL_PROFILES) {
    for (const flag of profile.redFlags) add(`redflag:${profile.key}/${flag.key}`, flag.text);
    add(`limitations:${profile.key}`, profile.limitations);
    if (profile.horizon) add(`horizon:${profile.key}`, profile.horizon.note);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Erst die Gegenproben. Ein Muster, das nichts trifft, findet auch nichts.
// ---------------------------------------------------------------------------

const GEPFLANZT = [
  "Die Belastung hat sich über Nacht wieder gelegt.",
  "Es braucht beide Seiten. Eine einzelne Seite wird nicht gespeichert.",
  "Fuer diesen Tag ist dieser Test schon erfasst.",
  "Beide Seiten, gemessen in",
  "»Kniebeugen«",
];

const nichtGefangen = GEPFLANZT.filter((t) => germanSmell(t) === null);
if (nichtGefangen.length > 0) {
  console.error(
    `\nSprachprüfung FEHLGESCHLAGEN\n\n` +
      `Diese deutschen Sätze werden NICHT erkannt — das Muster ist zu eng:\n\n` +
      nichtGefangen.map((t) => `  ${t}`).join("\n") +
      "\n",
  );
  process.exit(1);
}

/**
 * Echte englische Sätze aus diesem Produkt, die NICHT anschlagen dürfen.
 *
 * Die zweite Hälfte der Gegenprobe, und die wichtigere: Ein zu breites Muster
 * fängt jeden gepflanzten Satz und ist trotzdem unbrauchbar.
 */
const ECHTES_ENGLISCH = [
  "The load had settled again by the next morning.",
  "Both sides are close together in the self-test.",
  "Loadwise documents and structures. It does not treat and gives no recommendations.",
  "Zero belongs here if that is what it was. It is a measurement, not a blank.",
  "A diary cannot see this — only you know.",
  "Stand on one leg, barefoot or in flat shoes, the other leg lifted.",
  // `also` stand einmal in der Liste und hat drei echte Motorsaetze gefangen.
  // Ein englisches Wort in einer Liste deutscher Woerter ist der Fehlalarm,
  // vor dem der Kopf dieser Datei warnt -- und er kam prompt.
  "Tissue is also more prone to failure after a corticosteroid injection.",
];

const falschGefangen = ECHTES_ENGLISCH.map((t) => ({ t, grund: germanSmell(t) })).filter(
  (x) => x.grund !== null,
);
if (falschGefangen.length > 0) {
  console.error(
    `\nSprachprüfung FEHLGESCHLAGEN\n\n` +
      `Diese ECHTEN englischen Sätze schlagen an — das Muster ist zu breit,\n` +
      `und ein Wächter mit Fehlalarmen wird abgeschaltet:\n\n` +
      falschGefangen.map((x) => `  ${x.grund}\n    ${x.t}`).join("\n") +
      "\n",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Und jetzt das Produkt.
// ---------------------------------------------------------------------------

const alle = [
  ...appStrings().map((s) => ({ ...s, wo: "Wörterbuch" })),
  ...engineStrings().map((s) => ({ ...s, wo: "Motor" })),
];

const funde = alle
  .map((s) => ({ ...s, grund: germanSmell(s.text) }))
  .filter((s) => s.grund !== null);

if (funde.length > 0) {
  console.error(`\nSprachprüfung FEHLGESCHLAGEN\n\n${funde.length} englische Zeichenkette(n) tragen Deutsch:\n`);
  for (const f of funde) {
    console.error(`  ${f.wo} · ${f.pfad}\n    ${f.grund}\n    »${f.text.slice(0, 90)}«\n`);
  }
  console.error(
    "Englisch ist die Hauptsprache. Ein deutscher Satz hier faellt niemandem auf,\n" +
      "der die App auf Deutsch benutzt — und genau der Person, die sie zum ersten\n" +
      "Mal auf Englisch oeffnet.\n",
  );
  process.exit(1);
}

console.log(
  `\nKein Deutsch in der englischen Fassung: ${alle.length} Zeichenketten geprüft\n` +
    `(${appStrings().length} aus dem Wörterbuch, ${engineStrings().length} aus dem Motor).\n` +
    // Aus den Listen gezählt, nicht hingeschrieben: Eine Zahl im Fliesstext,
    // die niemand nachzieht, ist genau die Behauptung, gegen die `check:docs`
    // gebaut wurde.
    `Beide Gegenproben halten: ${GEPFLANZT.length} gepflanzte deutsche Sätze gefangen,\n` +
    `${ECHTES_ENGLISCH.length} echte englische durchgelassen.\n`,
);
