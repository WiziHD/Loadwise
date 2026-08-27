/**
 * Zahlen in einen Satz einsetzen, ohne den Satz zu zerschneiden.
 *
 * ---------------------------------------------------------------------------
 * WARUM NICHT DREI ZEICHENKETTEN UND ZWEI ZAHLEN DAZWISCHEN.
 *
 * »{judged} von {expected} erwarteten Tagen beurteilt« liesse sich auch als
 * `""`, `" von "`, `" erwarteten Tagen beurteilt"` ablegen und im JSX
 * zusammensetzen. Das ist die Bauform, an der Übersetzungen zerbrechen: Im
 * Englischen steht die Zahl anderswo, und wer die Reihenfolge ändern muss, kann
 * es nicht — die Reihenfolge steht im Code, nicht im Satz.
 *
 * Ganze Sätze mit Platzhaltern bleiben übersetzbar.
 *
 * ---------------------------------------------------------------------------
 * EIN NICHT ERSETZTER PLATZHALTER IST SICHTBAR, ABER NICHT LAUT.
 *
 * Bliebe `{judged}` stehen, stünde es so auf dem Bildschirm. Hässlich, aber
 * nicht still — und still ist in diesem Projekt das Schlimmere. Gegen den Fall
 * steht ausserdem ein Test, der jeden Platzhalter im Wörterbuch gegen die
 * Werte prüft, die die Ansicht übergibt.
 * ---------------------------------------------------------------------------
 */

/** Welche Platzhalter ein Satz trägt. Für den Test, der beide Seiten vergleicht. */
export function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].flatMap((m) => (m[1] === undefined ? [] : [m[1]]));
}

export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (ganz, name: string) =>
    name in values ? String(values[name]) : ganz,
  );
}
