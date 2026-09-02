/**
 * Was ein eigener Meilenstein erfüllen muss, als reine Funktion.
 *
 * ---------------------------------------------------------------------------
 * DER ZIELTEXT WIRD NICHT GEPRÜFT. DAS IST DIE WICHTIGSTE ZEILE DIESER DATEI.
 *
 * Geprüft werden Länge und Vorhandensein — nichts sonst. Kein Wortfilter, kein
 * Abgleich, keine Erlaubnisliste.
 *
 * Der Grund steht am Typ im Motor: `Milestone.label` ist ein einfacher
 * `string` und kein `Phrase`, damit `allPhrases()` ihn nicht einsammelt. Die
 * drei Ban-Listen regeln, was der MOTOR sagt. Auf dieses Feld angewandt würden
 * sie das Speichern von »Ich will in sechs Wochen wieder laufen« verweigern —
 * und einem Menschen verbieten, im eigenen Tagebuch über das eigene Ziel zu
 * sprechen. Derselbe Stand wie `Entry.note`, die keine Regel je gelesen hat.
 *
 * `engine/test/wording.test.ts` hält das mit einem eigenen Test fest, weil die
 * Versuchung greifbar ist: Jemand erweitert `allPhrases()` »der Vollständigkeit
 * halber«, und ab dann lehnt die App Ziele ab.
 *
 * ---------------------------------------------------------------------------
 * DIE APP LIEFERT KEIN KRITERIUM — AUCH NICHT ALS VOREINSTELLUNG.
 *
 * Kein Katalog, keine Vorschläge, kein vorbelegter Schwellenwert. Was hier
 * geprüft wird, ist die FORM einer Bedingung: dass die Zahl eine Zahl ist, dass
 * die Einheit zum Mass passt, dass die Tageszahl mindestens eins ist. Welcher
 * Wert erstrebenswert wäre, weiss diese Datei nicht und darf es nicht wissen.
 *
 * ---------------------------------------------------------------------------
 * DIE EINHEIT WIRD NICHT GEGLAUBT, SONDERN NACHGESCHLAGEN.
 *
 * Für vier der fünf Messquellen steht die Einheit fest — `unitOf` sagt sie.
 * Eine mitgeschickte Einheit, die davon abweicht, wird abgelehnt statt
 * überschrieben: »höchstens 3« auf einer Null-bis-Zehn-Skala und »höchstens 3«
 * in Minuten sind zwei verschiedene Ziele, und stillschweigend das eine ins
 * andere zu verwandeln wäre der Fehler, den 3.2 eine Ebene tiefer verhindert.
 * ---------------------------------------------------------------------------
 */

import {
  ALL_ACTIVITY_KINDS,
  TEST_UNIT,
  isDateStr,
  unitOf,
  type ActivityKind,
  type Measure,
  type TestType,
  type Unit,
} from "loadwise-engine";

/** Eine Bedingung, wie sie über das Netz ankommt: alles noch unsicher. */
export type ThresholdInput = {
  measure: unknown;
  direction: unknown;
  value: unknown;
  unit: unknown;
};

/** Ein Meilenstein, wie das Formular ihn hält. */
export type MilestonePayload = {
  /** Die eigenen Worte. Wird auf Länge geprüft und auf nichts sonst. */
  label: string;
  locale: string;
  createdOn: string;
  /** Leer heisst: ein Ziel, das kein Tagebuch sehen kann. */
  all: ThresholdInput[];
  onDistinctDays: number | null;
  withinDays: number | null;
};

export type MilestoneProblem =
  | "label-missing"
  | "label-too-long"
  | "unknown-measure"
  | "measure-not-in-profile"
  | "unit-mismatch"
  | "unknown-measure-key"
  | "value-missing"
  | "days-out-of-range"
  | "window-too-short"
  | "too-many-thresholds"
  | "invalid";

const LABEL_LIMIT = 200;
const THRESHOLD_LIMIT = 4;
const DAYS_LIMIT = 30;
const WINDOW_LIMIT = 365;

const UNITS: readonly string[] = ["reps", "cm", "deg", "min", "sec", "score_0_10"];
const DIRECTIONS: readonly string[] = ["at_least", "at_most"];

/** Ganze Zahl im Bereich, und nichts anderes. */
const ganzzahlIm = (n: unknown, low: number, high: number): boolean =>
  typeof n === "number" && Number.isInteger(n) && n >= low && n <= high;

/**
 * Ist das eine Messquelle, die es gibt — und darf diese Episode sie nennen?
 *
 * `erlaubteTests` kommt aus dem Profil, `bekannteMasse` aus der Datenbank.
 * Beides sind Angaben über DIESE Episode, und beide gehören geprüft: Ein Ziel
 * auf einen Fersenheber bei einer Schulter wäre eine Bedingung, die nie
 * eintreten kann und dabei aussieht, als warte sie nur.
 */
function measureProblem(
  measure: unknown,
  erlaubteTests: readonly TestType[],
  bekannteMasse: readonly string[],
): MilestoneProblem | null {
  if (measure === null || typeof measure !== "object") return "unknown-measure";
  const m = measure as { source?: unknown };

  switch (m.source) {
    case "self_test": {
      const t = measure as { type?: unknown; side?: unknown };
      if (typeof t.type !== "string" || !(t.type in TEST_UNIT)) return "unknown-measure";
      if (t.side !== "involved" && t.side !== "uninvolved") return "unknown-measure";
      if (!erlaubteTests.includes(t.type as TestType)) return "measure-not-in-profile";
      return null;
    }
    case "measurement": {
      const k = measure as { key?: unknown };
      if (typeof k.key !== "string" || k.key.trim() === "") return "unknown-measure";
      // Ein Ziel auf ein Mass, das es nicht gibt, wartet auf eine Zahl, die
      // nie kommt — und `progress.ts` meldet dafür `measure-never-recorded`.
      // Das ist ein ehrlicher Zustand, aber er entsteht besser durch Löschen
      // als durch einen Tippfehler beim Anlegen.
      if (!bekannteMasse.includes(k.key.trim().toLowerCase())) return "unknown-measure-key";
      return null;
    }
    case "morning_score":
    case "symptom_score":
      return null;
    case "session_minutes": {
      const s = measure as { activityKind?: unknown };
      if (s.activityKind === undefined) return null;
      if (typeof s.activityKind !== "string") return "unknown-measure";
      if (!ALL_ACTIVITY_KINDS.includes(s.activityKind as ActivityKind)) return "unknown-measure";
      return null;
    }
    default:
      return "unknown-measure";
  }
}

/**
 * Alles, was Datenbank und Motor ablehnen würden — hier zuerst abgelehnt.
 *
 * `bekannteMasse` sind die eigenen Masse dieser Episode, kleingeschrieben und
 * beschnitten (siehe `measureKeyId`).
 */
export function validateMilestone(
  input: MilestonePayload,
  erlaubteTests: readonly TestType[],
  bekannteMasse: readonly string[],
): MilestoneProblem | null {
  // --- Der Zieltext. Länge, sonst nichts. Siehe Kopf. ---
  if (typeof input.label !== "string") return "invalid";
  const label = input.label.trim();
  if (label === "") return "label-missing";
  if (label.length > LABEL_LIMIT) return "label-too-long";

  if (input.locale !== "de" && input.locale !== "en") return "invalid";
  if (typeof input.createdOn !== "string" || !isDateStr(input.createdOn)) return "invalid";

  // --- Die Bedingungen. Leer ist zulässig und heisst »selbst abhaken«. ---
  if (!Array.isArray(input.all)) return "invalid";
  if (input.all.length > THRESHOLD_LIMIT) return "too-many-thresholds";

  for (const t of input.all) {
    if (t === null || typeof t !== "object") return "invalid";

    const problem = measureProblem(t.measure, erlaubteTests, bekannteMasse);
    if (problem !== null) return problem;

    if (typeof t.direction !== "string" || !DIRECTIONS.includes(t.direction)) return "invalid";
    if (typeof t.unit !== "string" || !UNITS.includes(t.unit)) return "invalid";

    // Erst auf Vorhandensein, dann auf Form: Ein leeres Feld soll »fehlt«
    // melden und nicht »ungültig«.
    if (t.value === null || t.value === undefined) return "value-missing";
    if (typeof t.value !== "number" || !Number.isFinite(t.value) || t.value < 0) return "invalid";

    // Die Einheit, wo sie feststeht. Nicht überschreiben — ablehnen.
    const zwingend = unitOf(t.measure as Measure);
    if (zwingend !== null && t.unit !== zwingend) return "unit-mismatch";
    // Auf einer Null-bis-Zehn-Skala gibt es keine 11.
    if ((t.unit as Unit) === "score_0_10" && t.value > 10) return "invalid";
  }

  // --- Wie oft, und in welchem Fenster. ---
  if (!ganzzahlIm(input.onDistinctDays, 1, DAYS_LIMIT)) return "days-out-of-range";

  if (input.withinDays !== null) {
    if (!ganzzahlIm(input.withinDays, 1, WINDOW_LIMIT)) return "invalid";
    // Ein Fenster, das kürzer ist als die verlangte Zahl von Tagen, ist nicht
    // streng, sondern unerfüllbar: Drei verschiedene Tage passen nicht in zwei.
    // Der Motor meldete dafür nie etwas — das Ziel bliebe schlicht für immer
    // offen und sähe dabei aus, als warte es.
    // `onDistinctDays` ist an dieser Stelle geprüft — die Zeile darüber wäre
    // sonst schon zurückgekehrt. Die Zusicherung steht hier statt einer
    // zweiten Prüfung, damit sichtbar bleibt, worauf sie sich stützt.
    if (input.withinDays < (input.onDistinctDays as number)) return "window-too-short";
  }

  return null;
}
