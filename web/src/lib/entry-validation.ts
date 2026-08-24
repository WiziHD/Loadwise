/**
 * Was ein Tageseintrag erfüllen muss, als reine Funktion.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS NICHT IN DER SERVER-AKTION STEHT.
 *
 * Es stand dort, und dort war es nicht prüfbar: Wer die Aktion testen will,
 * muss `next/cache`, `next/headers` und den Supabase-Client nachbauen — und
 * prüft am Ende die Attrappen mit. Genau das ist der Weg, auf dem eine Suite
 * beweist, dass der Code zu sich selbst passt.
 *
 * Die Regeln hier sind der Vertrag des Produkts, nicht ein Detail der Aktion.
 * Als reine Funktion sind sie ohne eine einzige Attrappe prüfbar, und die
 * Aktion ruft sie auf, statt sie zu sein.
 *
 * Die Prüfungen wiederholen bewusst, was auch die Datenbank und der Motor
 * durchsetzen. Drei Orte klingen nach zwei zu viel, bis einer davon umgangen
 * wird — und der am nächsten am Netz ist der, der nicht ausfallen darf. Eine
 * Server-Aktion sieht aus wie ein Funktionsaufruf, ist aber ein öffentlicher
 * Endpunkt: Alles im Netz kann sie mit beliebigen Werten aufrufen.
 * ---------------------------------------------------------------------------
 */

import {
  ALL_ACTIVITY_KINDS,
  ALL_EVERYDAY_LOADS,
  diffDays,
  isDateStr,
  type ActivityKind,
  type DateStr,
  type SymptomTiming,
} from "loadwise-engine";

/** Ein Tagebuchtag, wie das Formular ihn hält. */
export type EntryPayload = {
  date: string;
  /**
   * Absichtlich nullbar. `Number("")` ist 0, und 0 heisst auf dieser Skala
   * »gar nichts« — der bestmögliche Morgen. Ein leeres Feld muss also als null
   * ankommen und abgelehnt werden, nie als der schmeichelhafteste Wert, den es
   * gibt.
   */
  morningScore: number | null;
  /** Null bis mehrere Einheiten. Leer heisst Ruhetag. */
  sessions: SessionInput[];
  everydayLoad: string | null;
  symptomScore: number | null;
  symptomTiming: SymptomTiming | null;
  note: string | null;
};

/**
 * Eine Einheit, wie sie über das Netz ankommt: alles noch unsicher.
 *
 * Der Motortyp `Session` verlangt drei Zahlen bzw. eine bekannte Aktivität.
 * Hier steht `unknown`, weil eine Server-Aktion ein öffentlicher Endpunkt ist
 * und alles enthalten kann. Erst `validateEntry` macht daraus Sessions.
 */
export type SessionInput = {
  activityKind: unknown;
  durationMin: unknown;
  rpe: unknown;
};

export type EntryProblem =
  | "load-incomplete"
  | "symptom-incomplete"
  | "future-date"
  | "invalid";

const TIMINGS: readonly string[] = ["during", "after", "evening"];
const NOTE_LIMIT = 2000;

/** Eine ganze Zahl im Bereich, und nichts anderes. */
const wholeNumberInRange = (n: unknown, low: number, high: number): boolean =>
  typeof n === "number" && Number.isInteger(n) && n >= low && n <= high;

/**
 * Das späteste Datum, das dieser Host annehmen kann — und warum das nicht
 * einfach »heute« ist.
 *
 * Der Server weiss nicht, welcher Tag dort ist, wo die Person steht; genau
 * darum geht es bei der Zeitzonen-Reparatur. Was er kann, ist die Antwort
 * eingrenzen: Kein bewohnter Versatz liegt mehr als vierzehn Stunden von UTC
 * entfernt, ein echtes Ortsdatum also nie mehr als einen Tag vor dem des Hosts.
 *
 * Diese Grenze zählt, weil ein Datum in der Zukunft zerstörerisch ist und nicht
 * bloss seltsam: `saveEntry` ersetzt über `(episode_id, entry_date)`. Eine
 * Zeile, die einen Tag voraus geschrieben wird, wird später still überschrieben
 * — oder überschreibt —, wenn der Tag tatsächlich kommt.
 *
 * `hostToday` kommt als Parameter herein, damit das prüfbar ist, ohne die Uhr
 * zu stellen.
 */
export function tooFarAhead(date: string, hostToday: string): boolean {
  return diffDays(hostToday as DateStr, date as DateStr) > 1;
}

/** Das Datum des Hosts in UTC. Ein Ausgangspunkt, kein Urteil über den Nutzer. */
export function utcToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
}

/**
 * Alles, was Datenbank und Motor ablehnen würden — hier zuerst abgelehnt.
 *
 * Gibt den Grund zurück oder null, wenn nichts dagegen spricht.
 */
export function validateEntry(input: EntryPayload, hostToday: string): EntryProblem | null {
  if (typeof input.date !== "string" || !isDateStr(input.date)) return "invalid";
  if (!wholeNumberInRange(input.morningScore, 0, 10)) return "invalid";
  if (tooFarAhead(input.date, hostToday)) return "future-date";

  // ---------------------------------------------------------------------
  // Jede Einheit einzeln, und alle drei Angaben sind Pflicht.
  //
  // Die Paarung »Anstrengung und Minuten gehören zusammen« musste früher an
  // vier Stellen gleichzeitig verteidigt werden und hat trotzdem Daten
  // gekostet. Seit eine Einheit ein eigenes Ding mit drei Pflichtfeldern ist,
  // gibt es die halbe Einheit nicht mehr — hier wird nur noch geprüft, dass
  // ankommt, was ankommen soll.
  // ---------------------------------------------------------------------
  if (!Array.isArray(input.sessions)) return "invalid";
  if (input.sessions.length > 8) return "invalid";

  for (const s of input.sessions) {
    if (s === null || typeof s !== "object") return "invalid";
    if (typeof s.activityKind !== "string") return "load-incomplete";
    if (!ALL_ACTIVITY_KINDS.includes(s.activityKind as ActivityKind)) return "invalid";
    if (!wholeNumberInRange(s.durationMin, 1, 1440)) return "load-incomplete";
    if (!wholeNumberInRange(s.rpe, 1, 10)) return "load-incomplete";
  }

  if (input.everydayLoad !== null && !ALL_EVERYDAY_LOADS.includes(input.everydayLoad as never)) {
    return "invalid";
  }

  if (input.symptomScore !== null && !wholeNumberInRange(input.symptomScore, 0, 10)) {
    return "invalid";
  }
  if (input.symptomTiming !== null && !TIMINGS.includes(input.symptomTiming)) return "invalid";

  // Ein Zeitpunkt ohne Wert beschreibt nichts. Das wurde früher still verworfen:
  // Das Speichern meldete Erfolg, und da keine Seite Zeitpunkte anzeigt, war der
  // Verlust nicht zu bemerken.
  if (input.symptomTiming !== null && input.symptomScore === null) return "symptom-incomplete";

  if (input.note !== null && (typeof input.note !== "string" || input.note.length > NOTE_LIMIT)) {
    return "invalid";
  }

  return null;
}
