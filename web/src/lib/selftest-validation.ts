/**
 * Was eine Selbsttest-Messung erfüllen muss, als reine Funktion.
 *
 * ---------------------------------------------------------------------------
 * DIESES FORMULAR IST DAS ALLEINSTELLUNGSMERKMAL, UND ES GAB ES NICHT.
 *
 * Der Seitenvergleich ist die eine Regel, die dieses Produkt von einem
 * Schmerztagebuch unterscheidet — und bis hierher ist er nie auf einer echten
 * Messung gelaufen, weil kein Weg in die Tabelle `self_tests` führte. Die Regel
 * war da, der Motor konnte sie, `verdicts.ts` liest sie seit Wochen aus, und
 * die Abfrage kam jedes Mal leer zurück.
 *
 * ---------------------------------------------------------------------------
 * DREI REGELN, DIE ALLE DREI SCHON EINMAL ETWAS GEKOSTET HÄTTEN.
 *
 * 1. **Nur Tests, die das Profil nennt.** Die Schulter zeigt nur
 *    Beweglichkeit; ein Wadenheber ergäbe dort eine Zahl, ein Verhältnis und
 *    ein Urteil — alles davon bedeutungslos, und nichts davon sähe so aus. Das
 *    Formular bietet deshalb nur an, was `profile.tests` führt, und diese
 *    Prüfung wiederholt es. Ein Formular, das nur die Auswahl begrenzt, ist
 *    keine Prüfung: Eine Server-Aktion ist ein öffentlicher Endpunkt.
 *
 * 2. **Beide Seiten oder keine.** Eine halbe Paarung wird VERWORFEN, nicht
 *    ergänzt. Es gibt keinen Wert, mit dem sich eine fehlende Seite auffüllen
 *    liesse, der nicht erfunden wäre — und der Index würde ihn zu einem Urteil
 *    verrechnen, das dann echt aussieht.
 *
 * 3. **`involved` darf 0 sein, `uninvolved` nicht.** Null Wiederholungen auf
 *    der verletzten Seite ist Tag eins einer Reha: die aussagekräftigste
 *    Messung überhaupt, Index 0. Sie als Eingabefehler abzuweisen war ein
 *    echter Fehler in einer früheren Fassung des Schemas. Null auf der gesunden
 *    Seite ist etwas anderes — es ist der Divisor.
 * ---------------------------------------------------------------------------
 */

import {
  TEST_UNIT,
  diffDays,
  isDateStr,
  type DateStr,
  type TestType,
  type Unit,
} from "loadwise-engine";

/** Eine Messung, wie das Formular sie hält: beide Seiten, ein Tag, eine Art. */
export type SelfTestPayload = {
  type: string;
  date: string;
  /**
   * Absichtlich nullbar, und aus demselben Grund wie `morningScore`:
   * `Number("")` ist 0, und 0 ist auf der verletzten Seite ein gültiger,
   * bedeutungsvoller Messwert. Ein leeres Feld muss deshalb als null ankommen
   * und als »fehlt« abgelehnt werden — niemals als die Messung, die es nicht
   * gab.
   */
  involved: number | null;
  uninvolved: number | null;
  note: string | null;
};

export type SelfTestProblem =
  | "unknown-test"
  | "test-not-in-profile"
  | "half-pairing"
  | "reference-side-zero"
  | "out-of-range"
  | "future-date"
  | "invalid";

const NOTE_LIMIT = 2000;

/**
 * Die Obergrenze je Einheit — und warum es sie überhaupt gibt.
 *
 * Nicht, um jemanden zu bewerten. Eine Zahl über diesen Grenzen ist keine
 * ungewöhnliche Leistung, sondern ein Tippfehler: 250 statt 25, ein verrutschtes
 * Komma, ein Feld mit einer Telefonnummer darin. Der Unterschied zählt, weil
 * eine solche Zahl auf der GESUNDEN Seite den Index in den Keller zieht und ein
 * rotes Urteil erzeugt, das nichts mit dem Körper zu tun hat.
 *
 * Die Grenzen sind bewusst weit. `reps` bei 200, obwohl Gesunde zwischen 20 und
 * 59 im Toolkit 6 bis 70 erreichten: Wer 90 schafft, soll 90 eintragen können,
 * ohne dass diese App ihm sagt, das gehe nicht. `deg` bei 90 ist die einzige
 * harte Grenze, und die ist geometrisch — ein Schienbein, das mehr als
 * rechtwinklig zur Senkrechten steht, liegt.
 */
const OBERGRENZE: Record<Unit, number> = {
  reps: 200,
  cm: 500,
  deg: 90,
  min: 1440,
  sec: 3600,
  score_0_10: 10,
};

/** Wiederholungen sind ganzzahlig; Zentimeter und Grad dürfen eine Stelle haben. */
const NACHKOMMASTELLEN: Record<Unit, number> = {
  reps: 0,
  cm: 1,
  deg: 1,
  min: 0,
  sec: 0,
  score_0_10: 0,
};

/** Passt diese Zahl zu dieser Einheit? Endlich, nicht negativ, im Raster. */
function messwertGueltig(n: number, unit: Unit): boolean {
  if (!Number.isFinite(n) || n < 0) return false;
  if (n > OBERGRENZE[unit]) return false;
  const faktor = 10 ** NACHKOMMASTELLEN[unit];
  return Number.isInteger(Math.round(n * faktor * 1000) / 1000);
}

/**
 * Alles, was Datenbank und Motor ablehnen würden — hier zuerst abgelehnt.
 *
 * `erlaubteTests` kommt vom Profil der Episode und nicht aus einer Konstanten:
 * Welche Tests zählen, ist genau die Frage, für die es Profile gibt.
 */
export function validateSelfTest(
  input: SelfTestPayload,
  erlaubteTests: readonly TestType[],
  hostToday: string,
): SelfTestProblem | null {
  if (typeof input.type !== "string") return "invalid";
  if (!(input.type in TEST_UNIT)) return "unknown-test";

  const type = input.type as TestType;
  if (!erlaubteTests.includes(type)) return "test-not-in-profile";

  if (typeof input.date !== "string" || !isDateStr(input.date)) return "invalid";
  // Dieselbe Grenze wie beim Tageseintrag, aus demselben Grund: Kein bewohnter
  // Zeitversatz liegt mehr als vierzehn Stunden von UTC entfernt.
  if (diffDays(hostToday as DateStr, input.date as DateStr) > 1) return "future-date";

  // ---------------------------------------------------------------------
  // Die Paarung. Erst auf Vollständigkeit, dann auf Gültigkeit — in dieser
  // Reihenfolge, damit ein leeres Feld »fehlt« meldet und nicht »ungültig«.
  // ---------------------------------------------------------------------
  if (input.involved === null || input.uninvolved === null) return "half-pairing";
  if (typeof input.involved !== "number" || typeof input.uninvolved !== "number") {
    return "invalid";
  }

  const unit = TEST_UNIT[type];
  if (!messwertGueltig(input.involved, unit)) return "out-of-range";
  if (!messwertGueltig(input.uninvolved, unit)) return "out-of-range";

  // Der Divisor. Eigener Grund, eigener Satz — »ungültig« würde jemanden
  // suchen lassen, was an einer 0 ungültig ist, wo die andere 0 erlaubt war.
  if (input.uninvolved === 0) return "reference-side-zero";

  if (input.note !== null && (typeof input.note !== "string" || input.note.length > NOTE_LIMIT)) {
    return "invalid";
  }

  return null;
}
