import { addDays, diffDays, type DateStr, type EntryIndex } from "loadwise-engine";
import type { CoursePoint } from "@/components/CourseCurve";

/**
 * Der Verlauf als eine Reihe von Kalendertagen — mit den Lücken darin.
 *
 * ---------------------------------------------------------------------------
 * EIN PUNKT JE KALENDERTAG, NICHT JE EINTRAG.
 *
 * Das ist der ganze Zweck dieser Funktion. Über die Einträge zu laufen ergäbe
 * eine Kurve, in der zehn erfasste Tage gleich weit auseinanderliegen — egal ob
 * sie zehn Tage oder zehn Wochen umspannen. Die Frage dieses Produkts ist aber,
 * WANN etwas auf was folgte, und eine Achse, die Zeit gleichmässig staucht,
 * beantwortet sie falsch.
 *
 * Ein Tag ohne Eintrag bekommt `morning: null`. Die Kurve zeichnet dort nichts
 * und verbindet nicht darüber hinweg — siehe `CourseCurve`.
 *
 * ---------------------------------------------------------------------------
 * `load: 0` IST KEIN FEHLENDER WERT.
 *
 * Ein Ruhetag hat die Last null, und das ist eine Aussage. Ein Tag ohne Eintrag
 * hat gar keine. Beides als 0 zu zeichnen würde aus jeder Lücke einen Ruhetag
 * machen — und Ruhetage tragen im Motor die Basislinie, sind also alles andere
 * als nichts.
 *
 * Deshalb steht die Last hier nur an Tagen, an denen es einen Eintrag gibt.
 * ---------------------------------------------------------------------------
 */
export function coursePoints(index: EntryIndex, lastDate: DateStr | null): CoursePoint[] {
  const erster = index.entries[0]?.date;
  if (erster === undefined) return [];

  const letzter = lastDate ?? index.entries[index.entries.length - 1]?.date ?? erster;
  const spanne = diffDays(erster, letzter);
  if (spanne < 0) return [];

  // Kein Fenster, keine Begrenzung: Der ganze Verlauf steht da. Bei einer
  // Episode über ein Jahr sind das 365 Punkte auf 600 Einheiten Breite — eng,
  // aber ehrlich. Ein Ausschnitt der letzten n Tage wäre eine Entscheidung
  // darüber, was zählt, und die trifft der Motor mit `currentFlags`, nicht
  // diese Achse.
  const punkte: CoursePoint[] = [];
  for (let i = 0; i <= spanne; i += 1) {
    const datum = addDays(erster, i);
    const eintrag = index.byDate.get(datum);
    punkte.push({
      date: datum,
      morning: eintrag === undefined ? null : eintrag.morningScore,
      load: eintrag === undefined ? 0 : (index.loadByDate.get(datum) ?? 0),
    });
  }
  return punkte;
}
