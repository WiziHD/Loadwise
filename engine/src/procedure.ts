import type { TestType } from "./types.js";

/**
 * Wie ein Selbsttest durchgeführt wird — und warum dieser Text NICHT unter den
 * Ban-Listen steht.
 *
 * ---------------------------------------------------------------------------
 * EIN VERFAHREN IST KEIN URTEIL. DAS IST DER GANZE UNTERSCHIED.
 *
 * `wording.ts` sagt Sätze ÜBER EINEN MENSCHEN: was seine Zahlen bedeuten, was
 * auffällig ist, was der Motor nicht weiss. Deshalb gelten dort drei Ban-Listen
 * — nichts darf anweisen, nichts vorhersagen, nichts loben. Ein Satz wie »die
 * Ferse bis zur grösstmöglichen Höhe anheben« würde die erste davon verletzen,
 * und zu Recht: Als Urteil wäre er eine Belastungsvorgabe.
 *
 * Als Messanleitung ist er das Gegenteil. Er sagt nicht, WAS jemand tun soll,
 * sondern WIE eine Zahl zustande kommt, die sonst keine ist. Ohne ihn misst
 * jeder etwas anderes und nennt es gleich.
 *
 * `PROTOKOLLE.md` §1 zieht die Linie bei »Du bist in Phase 2, mach jetzt X« und
 * bei Freigabekriterien. Beides ist eine Aussage über den Verlauf DIESER
 * Person. Eine Messanleitung ist die Aussage »so hältst du das Thermometer«.
 *
 * Der Preis dieser Trennung ist eine eigene Disziplin, nicht ihr Fehlen. Diese
 * Texte sind bewusst KEINE `Phrase`, damit `allPhrases()` sie nicht einsammelt
 * — und `test/procedure.test.ts` hält dafür fest, was hier trotzdem nicht
 * stehen darf: keine Deutung des Ergebnisses, kein Normwert, kein Ziel, kein
 * Lob. Eine Anleitung beschreibt die Messung bis zu dem Moment, in dem eine
 * Zahl dasteht, und schweigt danach.
 *
 * WAS HIER AUSDRÜCKLICH NICHT STEHT: wann jemand messen soll. Das wäre der
 * Schritt von der Anleitung zur Vorgabe. Die App bietet den Test an; ob und
 * wann er stattfindet, entscheidet niemand hier.
 * ---------------------------------------------------------------------------
 */

/** Zweisprachig wie `Phrase`, aber absichtlich ein anderer Typ. Siehe oben. */
export interface Procedure {
  /** Die Schritte in ihrer Reihenfolge. */
  steps: { de: readonly string[]; en: readonly string[] };

  /**
   * Der eine Parameter, der zwischen zwei Messungen nicht wandern darf.
   *
   * Getrennt von den Schritten, weil er einen anderen Zweck hat: Die Schritte
   * sagen, wie gemessen wird; das hier sagt, woran die Vergleichbarkeit hängt.
   * Wer ihn übergeht, misst weiterhin etwas — nur nicht mehr dasselbe wie beim
   * letzten Mal.
   */
  fixed: { de: string; en: string };
}

/**
 * DER FERSENHEBER-TAKT: 60/MIN. EINE ENTSCHEIDUNG, KEIN FUND.
 *
 * Die Quellenlage ist strittig und wurde in `PROFIL-ACHILLES.md` §8.3 als
 * strittig festgehalten: **60/min** (Achilles Tendinopathy Toolkit, UBC,
 * Fassung Okt. 2021) gegen **30/min** (PMC7249277). Beides ist publiziert,
 * keines ist widerlegt.
 *
 * Gewählt wird 60/min, und der Grund ist nicht »die höherrangige Quelle« —
 * beide stehen auf Rang 3. Der Grund ist, dass dieses Projekt bereits Zahlen
 * aus dem Toolkit trägt: die Normwert-Mediane nach Jahrzehnt und Geschlecht
 * (37/33/28/24/19/14) und die Spannweite 6 bis 70 bei Gesunden zwischen 20 und
 * 59. **Diese Zahlen sind unter dem Toolkit-Takt entstanden.** 30/min zu
 * wählen hiesse, eine Normtabelle weiterzuführen, die zum eigenen Verfahren
 * nicht mehr passt — der stillste denkbare Fehler: Alles liefe weiter, nur
 * bedeuteten die Vergleichszahlen etwas anderes als die gemessenen.
 *
 * Ein langsamerer Takt ergibt MEHR Wiederholungen, nicht weniger. Wer bei
 * 30/min misst und sich an 28 als Median orientiert, hielte sich für schlechter
 * als er ist. Der Fehler ginge also in die Richtung, in die dieses Projekt am
 * wenigsten irren will.
 *
 * Für den Seitenvergleich selbst ist der Takt gleichgültig — beide Seiten
 * messen im selben Takt, und ein Verhältnis kürzt ihn weg. Er zählt für den
 * VERLAUF: dieselbe Person, sechs Wochen später. Genau der Fall, für den
 * Karte 3.1 existiert.
 */
export const TEST_PROCEDURE: Record<TestType, Procedure> = {
  calf_raise: {
    steps: {
      de: [
        "Barfuss oder in flachen Schuhen auf einem Bein stehen, das andere Bein angehoben.",
        "Eine Hand an der Wand, nur zum Gleichgewicht — das Gewicht bleibt auf dem Bein.",
        "Die Ferse bis zur grösstmöglichen Höhe anheben und wieder ganz absenken.",
        "Ein Takt von 60 Schlägen pro Minute gibt das Tempo vor: eine Wiederholung je Schlag.",
        "Gezählt wird, bis die Höhe sichtbar einbricht oder der Takt nicht mehr zu halten ist.",
        "Danach dieselbe Messung auf der anderen Seite.",
      ],
      en: [
        "Stand on one leg, barefoot or in flat shoes, the other leg lifted.",
        "One hand on the wall for balance only — the weight stays on the leg.",
        "Raise the heel as high as it goes, then lower it all the way down.",
        "A metronome at 60 beats per minute sets the pace: one repetition per beat.",
        "Counting runs until the height visibly drops off or the beat can no longer be held.",
        "Then the same measurement on the other side.",
      ],
    },
    fixed: {
      de: "Takt: 60 Schläge pro Minute, eine Wiederholung je Schlag. In einem anderen Takt kommt eine andere Zahl heraus.",
      en: "Tempo: 60 beats per minute, one repetition per beat. A different tempo produces a different number.",
    },
  },

  single_hop: {
    steps: {
      de: [
        "Auf einem Bein hinter einer Startlinie stehen, die Zehenspitzen an der Linie.",
        "So weit wie möglich nach vorn springen und auf demselben Bein landen.",
        "Die Landung drei Sekunden halten. Ein Ausfallschritt oder eine aufgesetzte Hand macht den Versuch ungültig.",
        "Von der Startlinie bis zur Ferse des Landefusses messen, in Zentimetern.",
        "Danach dieselbe Messung auf der anderen Seite.",
      ],
      en: [
        "Stand on one leg behind a start line, toes at the line.",
        "Hop forward as far as possible and land on the same leg.",
        "The landing is held for three seconds. A step out or a hand down makes the attempt invalid.",
        "Measure from the start line to the heel of the landing foot, in centimetres.",
        "Then the same measurement on the other side.",
      ],
    },
    fixed: {
      de: "Gemessen wird bis zur Ferse, nicht bis zur Fussspitze.",
      en: "The reading is taken to the heel, not to the toe.",
    },
  },

  rom: {
    steps: {
      de: [
        "Barfuss vor eine Wand stellen, der zu messende Fuss vorn, die Zehen zur Wand.",
        "Das Knie geradeaus nach vorn zur Wand schieben, die Ferse bleibt dabei am Boden.",
        "Den Fuss so weit nach hinten setzen, dass das Knie die Wand gerade noch berührt und die Ferse gerade noch liegt.",
        "Einen Neigungsmesser mittig auf das Schienbein legen, eine Handbreit unter der Kniescheibe.",
        "Der Winkel des Schienbeins gegen die Senkrechte ist der Messwert, in Grad.",
        "Danach dieselbe Messung auf der anderen Seite.",
      ],
      en: [
        "Stand barefoot facing a wall, the foot being measured in front, toes towards the wall.",
        "The knee travels straight forward to the wall, the heel staying on the floor.",
        "Move the foot back until the knee only just touches the wall and the heel only just stays down.",
        "Place an inclinometer flat along the middle of the shin, a hand width below the kneecap.",
        "The angle of the shin against vertical is the reading, in degrees.",
        "Then the same measurement on the other side.",
      ],
    },
    fixed: {
      de: "Gemessen wird der Winkel des Schienbeins gegen die Senkrechte, nicht der Abstand des Fusses zur Wand.",
      en: "The reading is the angle of the shin against vertical, not the distance from foot to wall.",
    },
  },
};
