/**
 * Was eine eigene Messung erfüllen muss, als reine Funktion.
 *
 * ---------------------------------------------------------------------------
 * »15 KNIEBEUGEN« IST KEIN SEITENVERGLEICH.
 *
 * Eine Kniebeuge hat keine gesunde Seite, gegen die sie sich messen liesse.
 * Sie in `SelfTest` zu zwängen hiesse, ein `uninvolved` zu erfinden — eine
 * Zahl, die niemand gemessen hat, und die der Symmetrieindex dann zu einem
 * Urteil verrechnete. Deshalb ist `Measurement` ein eigener Typ und diese
 * Prüfung eine eigene Datei.
 *
 * ---------------------------------------------------------------------------
 * DIE APP SCHLÄGT NICHTS VOR. DAS IST KEINE BEQUEMLICHKEITSFRAGE.
 *
 * `MeasureKey` ist im Motor absichtlich ein offener String, und der Kommentar
 * dort nennt den Grund: *»Closing this union would also mean the app shipping a
 * list of what is worth measuring, and a list of what is worth measuring is a
 * clinical criterion.«*
 *
 * Diese Prüfung darf deshalb nie eine Liste zulässiger Masse führen. Sie prüft
 * die FORM eines Namens — nicht leer, nicht endlos — und niemals seinen Inhalt.
 *
 * ---------------------------------------------------------------------------
 * ZWEI STILLE FEHLER, UND BEIDE ERGEBEN EINEN PLAUSIBLEN VERLAUF.
 *
 * 1. **Dieselbe Zahl in zwei Einheiten.** Dreissig Minuten gegen dreissig
 *    Sekunden verglichen ist still, plausibel und vollständig falsch. Der Motor
 *    kennt dafür `measure-unit-conflict`; die Datenbank hat `one_unit_per_key`
 *    seit 0001. Hier wird es zuerst abgefangen, damit ein Mensch einen Satz
 *    darüber liest statt einen Datenbankfehler.
 *
 * 2. **Dasselbe Mass in zwei Schreibweisen.** »Kniebeugen« und »kniebeugen«
 *    sind zwei Reihen, jede für sich plausibel, wo eine gemeint war — und auf
 *    dem Bildschirm ist der Unterschied nicht zu sehen. Verglichen wird
 *    deshalb unempfindlich gegen Gross- und Kleinschreibung und Randleerzeichen;
 *    angezeigt wird die erste Schreibweise. Migration 0010 hält dasselbe eine
 *    Ebene tiefer.
 * ---------------------------------------------------------------------------
 */

import { diffDays, isDateStr, type DateStr, type Unit } from "loadwise-engine";

/** Eine eigene Messung, wie das Formular sie hält. */
export type MeasurementPayload = {
  /** Vom Nutzer benannt. Die App führt keine Liste dessen, was sich lohnt. */
  key: string;
  unit: string;
  date: string;
  /**
   * Nullbar aus demselben Grund wie überall hier: `Number("")` ist 0, und 0 ist
   * bei »null Kniebeugen geschafft« eine echte Messung. Ein leeres Feld darf
   * also nicht zur schlechtestmöglichen Messung werden.
   */
  value: number | null;
  note: string | null;
};

/** Ein Mass, das diese Episode schon kennt — mit der Einheit, die dafür gilt. */
export type KnownMeasure = { key: string; unit: Unit };

export type MeasurementProblem =
  | "key-missing"
  | "key-too-long"
  | "unknown-unit"
  | "unit-conflict"
  | "value-missing"
  | "out-of-range"
  | "future-date"
  | "invalid";

const KEY_LIMIT = 60;
const NOTE_LIMIT = 2000;

const UNITS: readonly string[] = ["reps", "cm", "deg", "min", "sec", "score_0_10"];

/**
 * Die Vergleichsform eines Namens. Nur zum VERGLEICHEN, nie zum Speichern.
 *
 * `toLowerCase` ohne Gebietsschema ist hier Absicht: Ein gebietsabhängiges
 * Kleinschreiben (türkisches i) machte denselben Namen auf zwei Geräten zu
 * zwei Massen — und dieses Ergebnis ginge in die Datenbank, wo der Index aus
 * 0010 mit `lower()` rechnet und es anders sähe.
 */
export function measureKeyId(key: string): string {
  return key.trim().toLowerCase();
}

/**
 * Die Obergrenze je Einheit, und wozu sie da ist.
 *
 * Nicht zum Bewerten. Eine Zahl darüber ist kein aussergewöhnliches Ergebnis,
 * sondern ein Tippfehler oder ein verrutschtes Komma — und die verzerrt einen
 * Verlauf für immer, weil sie als Bestwert stehen bleibt.
 *
 * `score_0_10` ist die einzige Grenze, die etwas bedeutet: Die Skala hat elf
 * Werte, und eine 12 darauf ist keine schlimmere Zahl, sondern keine.
 */
const OBERGRENZE: Record<Unit, number> = {
  reps: 1000,
  cm: 10000,
  deg: 360,
  min: 1440,
  sec: 86400,
  score_0_10: 10,
};

/** Wie viele Nachkommastellen diese Einheit zulässt. */
const NACHKOMMASTELLEN: Record<Unit, number> = {
  reps: 0,
  cm: 1,
  deg: 1,
  min: 0,
  sec: 0,
  score_0_10: 0,
};

function messwertGueltig(n: number, unit: Unit): boolean {
  if (!Number.isFinite(n) || n < 0) return false;
  if (n > OBERGRENZE[unit]) return false;
  const faktor = 10 ** NACHKOMMASTELLEN[unit];
  return Number.isInteger(Math.round(n * faktor * 1000) / 1000);
}

/**
 * Alles, was Datenbank und Motor ablehnen würden — hier zuerst abgelehnt.
 *
 * `bekannt` sind die Masse, die diese Episode schon führt. Sie kommen als
 * Parameter herein und nicht aus einer Abfrage, damit diese Datei ohne eine
 * einzige Attrappe prüfbar bleibt.
 */
export function validateMeasurement(
  input: MeasurementPayload,
  bekannt: readonly KnownMeasure[],
  hostToday: string,
): MeasurementProblem | null {
  if (typeof input.key !== "string") return "invalid";
  const name = input.key.trim();
  if (name === "") return "key-missing";
  if (name.length > KEY_LIMIT) return "key-too-long";

  if (typeof input.unit !== "string" || !UNITS.includes(input.unit)) return "unknown-unit";
  const unit = input.unit as Unit;

  // -----------------------------------------------------------------------
  // Die eingefrorene Einheit. Verglichen wird unempfindlich gegen
  // Schreibweise — sonst liesse sich der Konflikt mit einem grossen K umgehen,
  // und genau dann stünden zwei Reihen da, wo eine gemeint war.
  // -----------------------------------------------------------------------
  const id = measureKeyId(name);
  const vorhanden = bekannt.find((m) => measureKeyId(m.key) === id);
  if (vorhanden !== undefined && vorhanden.unit !== unit) return "unit-conflict";

  if (typeof input.date !== "string" || !isDateStr(input.date)) return "invalid";
  if (diffDays(hostToday as DateStr, input.date as DateStr) > 1) return "future-date";

  // Erst auf Vollständigkeit, dann auf Gültigkeit: Ein leeres Feld soll
  // »fehlt« melden und nicht »ausserhalb des Bereichs«.
  if (input.value === null) return "value-missing";
  if (typeof input.value !== "number") return "invalid";
  if (!messwertGueltig(input.value, unit)) return "out-of-range";

  if (input.note !== null && (typeof input.note !== "string" || input.note.length > NOTE_LIMIT)) {
    return "invalid";
  }

  return null;
}
