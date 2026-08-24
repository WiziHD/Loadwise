/**
 * Was eine korrigierte Episode erfüllen muss, als reine Funktion.
 *
 * ---------------------------------------------------------------------------
 * DIESELBE ÜBERLEGUNG WIE BEI `entry-validation.ts`.
 *
 * Eine Server-Aktion sieht aus wie ein Funktionsaufruf und ist ein
 * öffentlicher Endpunkt: Alles im Netz kann sie mit beliebigen Werten
 * aufrufen. Die Regeln stehen deshalb hier, ohne `next/cache` und ohne
 * Supabase-Client, und sind ohne eine einzige Attrappe prüfbar.
 *
 * ---------------------------------------------------------------------------
 * DIE KÖRPERREGION STEHT NICHT IM FORMULAR, UND DAS IST DER PUNKT.
 *
 * Sie kommt aus dem Profil. Zwei Profile teilen sich `knee`; liesse man ein
 * Formular beides schicken, könnten sie sich widersprechen — und die Episode
 * würde unter einer Region geführt, die zu ihrem Profil nicht passt. Beim
 * Anlegen war das schon so gelöst; beim Korrigieren muss es genauso sein,
 * sonst ist die zweite Tür weiter als die erste.
 * ---------------------------------------------------------------------------
 */

import { diffDays, isDateStr, profileByKey, type DateStr, type Side } from "loadwise-engine";

/** Eine Episode, wie das Korrekturformular sie schickt: alles noch unsicher. */
export type EpisodePatch = {
  profileKey: unknown;
  side: unknown;
  startedOn: unknown;
  label: unknown;
};

export type EpisodeProblem = "unknown-profile" | "future-start" | "invalid";

export const ALL_SIDES: readonly Side[] = ["left", "right", "both", "n/a"];

const LABEL_LIMIT = 120;

/**
 * Der Beginn darf nicht in der Zukunft liegen.
 *
 * Dieselbe Vierzehn-Stunden-Grenze wie beim Tageseintrag, aus demselben Grund:
 * Der Server kennt das Ortsdatum der Person nicht, kann die Antwort aber
 * eingrenzen — kein bewohnter Versatz liegt mehr als vierzehn Stunden von UTC
 * entfernt.
 *
 * Weniger zerstörerisch als beim Eintrag, aber nicht harmlos: `started_on` ist
 * der Anker des Tageszählers. Ein Datum in der Zukunft heisst »Tag 0«, und die
 * Zeile verschwindet dann kommentarlos — der Fehler, den `DayCount` schon
 * einmal hatte.
 */
export function startsInTheFuture(startedOn: string, hostToday: string): boolean {
  return diffDays(hostToday as DateStr, startedOn as DateStr) > 1;
}

export function validateEpisodePatch(
  input: EpisodePatch,
  hostToday: string,
): EpisodeProblem | null {
  if (typeof input.profileKey !== "string") return "invalid";
  if (profileByKey(input.profileKey) === undefined) return "unknown-profile";

  if (typeof input.side !== "string") return "invalid";
  if (!ALL_SIDES.includes(input.side as Side)) return "invalid";

  if (input.startedOn !== null) {
    if (typeof input.startedOn !== "string" || !isDateStr(input.startedOn)) return "invalid";
    if (startsInTheFuture(input.startedOn, hostToday)) return "future-start";
  }

  if (input.label !== null) {
    if (typeof input.label !== "string") return "invalid";
    // Kein leerer Text: Wer die Bezeichnung löschen will, schickt null. Ein
    // leerer String stünde sonst als Überschrift da, wo der Profilname stehen
    // sollte — sichtbar als eine Zeile, die fehlt.
    if (input.label.trim() === "" || input.label.length > LABEL_LIMIT) return "invalid";
  }

  return null;
}
