import type { Strings } from "@/i18n/dictionary";
import { fill } from "@/i18n/fill";

/**
 * Der Verlauf — das Bild, das den Satz darüber belegt.
 *
 * ---------------------------------------------------------------------------
 * LÜCKEN BLEIBEN LÜCKEN.
 *
 * Ein Tag ohne Eintrag bekommt keinen Punkt und keine Verbindung. Eine Linie,
 * die über ein Loch hinweggezogen wird, ist eine Behauptung: Sie sagt, der Wert
 * sei dazwischen gleichmässig gewandert. Das weiss niemand, und ausgerechnet
 * bei einem Tagebuch, das über Wochen lückenhaft geführt wird, wäre es die
 * häufigste Behauptung auf dem Bildschirm.
 *
 * Der Motor macht es genauso: Er urteilt über Tage, die er hat, und sagt bei
 * den anderen, dass er sie nicht hat.
 *
 * ---------------------------------------------------------------------------
 * DIE MARKIERUNG IST DER GANZE PUNKT.
 *
 * E7: »Das Auge geht Satz → Markierung → ah, dort.« Ohne die Markierung wäre
 * das hier eine Kurve neben einem Satz, und die lesende Person müsste selbst
 * suchen, welcher Tag gemeint ist. Genau die Suche ist der Unterschied
 * zwischen einem Beweis und einer Dekoration.
 *
 * Die Markierung ist eine LINIE, keine Farbe: Sie ist auch dann da, wenn jemand
 * Farben nicht unterscheidet, und auch dann, wenn ein Bildschirm sie
 * verschluckt.
 *
 * ---------------------------------------------------------------------------
 * ZWEI REIHEN, NICHT ZWEI DIAGRAMME.
 *
 * Oben der Morgenwert — was der Körper sagt. Unten die Tageslast,
 * gewebegewichtet — was ihm zugemutet wurde. Untereinander, mit derselben
 * Zeitachse: Die Frage dieses Produkts ist, wie das eine auf das andere folgt,
 * und zwei getrennte Bilder machen daraus zwei Fragen.
 *
 * Die UNgewichtete Last steht bewusst nicht daneben. Sie ist eine andere
 * Grösse mit derselben Einheit; nebeneinander gestellt lädt sie zum Vergleich
 * ein, und der Vergleich gehört in den Satz (»der Unterschied liegt in der Wahl
 * der Aktivität«), nicht in zwei Linien.
 * ---------------------------------------------------------------------------
 */

export type CoursePoint = {
  date: string;
  /** Null heisst: an diesem Tag wurde nichts erfasst. Kein Punkt, keine Linie. */
  morning: number | null;
  /** Gewebegewichtete Tageslast. 0 an einem Ruhetag — das ist ein Wert, keine Lücke. */
  load: number;
};

const BREITE = 600;

/**
 * Rand links und rechts.
 *
 * Ohne ihn sitzt ein Befund am LETZTEN Tag genau auf der Kante: Die
 * gestrichelte Linie steht auf dem Rand, der Punkt ragt zur Hälfte hinaus. Und
 * der letzte Tag ist der häufigste Ort für einen aktuellen Befund — der Fall
 * ist also nicht der Rand, sondern der Normalfall.
 */
const RAND = 10;

/**
 * Der Morgenwert bekommt den grössten Teil der Höhe.
 *
 * Vorher waren es 74 von 140 Einheiten, und bei einer festen Skala von 0 bis 10
 * mit Werten zwischen 1 und 6 blieb davon die Hälfte leer — die Kurve lag als
 * flacher Strich im oberen Drittel. Die FORM ist aber das, wofür dieses Bild da
 * ist.
 *
 * Die Skala bleibt trotzdem fest bei 0–10. Sie auf den eigenen Verlauf zu
 * dehnen würde jede kleine Schwankung zum Berg machen — und eine Kurve, die
 * Rauschen wie ein Ereignis aussehen lässt, deutet, statt zu zeigen.
 */
const OBEN = { y: 6, hoehe: 96 };
const UNTEN = { y: 112, hoehe: 30 };
const HOEHE = UNTEN.y + UNTEN.hoehe + 4;

/** Der Morgenwert läuft 0–10; die Skala ist fest, damit zwei Wochen vergleichbar bleiben. */
const MAX_MORGEN = 10;

export function CourseCurve({
  points,
  markDate,
  strings,
}: {
  points: CoursePoint[];
  /** Der Tag, um den es im Satz darüber geht. Null: es gibt keinen. */
  markDate: string | null;
  strings: Strings["main"];
}) {
  if (points.length === 0) return null;

  const s = strings;
  const n = points.length;
  const x = (i: number): number =>
    n === 1 ? BREITE / 2 : RAND + (i / (n - 1)) * (BREITE - 2 * RAND);

  // Die Lastachse skaliert auf den grössten Tag DIESES Verlaufs. Eine feste
  // Obergrenze gibt es nicht: Was viel ist, entscheidet sich am eigenen
  // Verlauf, nicht an einer erfundenen Zahl.
  const maxLast = Math.max(...points.map((p) => p.load), 1);

  const yMorgen = (wert: number): number =>
    OBEN.y + OBEN.hoehe - (wert / MAX_MORGEN) * OBEN.hoehe;

  // Zusammenhängende Strecken. Jede Lücke beendet eine und beginnt die nächste.
  const strecken: string[] = [];
  let laufend: string[] = [];
  points.forEach((p, i) => {
    if (p.morning === null) {
      if (laufend.length > 1) strecken.push(laufend.join(" "));
      laufend = [];
      return;
    }
    laufend.push(`${laufend.length === 0 ? "M" : "L"}${x(i).toFixed(1)},${yMorgen(p.morning).toFixed(1)}`);
  });
  if (laufend.length > 1) strecken.push(laufend.join(" "));

  const markIndex = markDate === null ? -1 : points.findIndex((p) => p.date === markDate);

  const beschreibung = fill(s.curveAria, {
    days: n,
    from: points[0]?.date ?? "",
    to: points[n - 1]?.date ?? "",
  });

  return (
    <figure style={{ margin: "0 0 var(--space-4)" }}>
      <svg
        viewBox={`0 0 ${BREITE} ${HOEHE}`}
        width="100%"
        height="auto"
        role="img"
        aria-label={beschreibung}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Die Markierung ganz nach hinten: Sie ist der Hintergrund, vor dem
            die Daten stehen, nicht ein Punkt darauf. */}
        {markIndex >= 0 && (
          <line
            x1={x(markIndex)}
            x2={x(markIndex)}
            y1={OBEN.y - 2}
            y2={UNTEN.y + UNTEN.hoehe}
            stroke="var(--fg)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            opacity={0.55}
          />
        )}

        {/* Tageslast als Balken. Ein Ruhetag ist ein Balken der Höhe null —
            sichtbar als Lücke im Rhythmus, nicht als fehlender Tag.

            Zurückhaltend, mit Absicht: Die Last ist der Kontext, der Morgenwert
            die Aussage. Bei 0,5 Deckkraft konkurrierten sechzig gleich hohe
            Balken optisch mit der Linie darüber und wurden zu einer Wand. */}
        {points.map((p, i) => {
          if (p.load <= 0) return null;
          const h = (p.load / maxLast) * UNTEN.hoehe;
          const breite = Math.max(1.5, ((BREITE - 2 * RAND) / n) * 0.6);
          return (
            <rect
              key={`l${p.date}`}
              x={x(i) - breite / 2}
              y={UNTEN.y + UNTEN.hoehe - h}
              width={breite}
              height={h}
              fill="var(--muted)"
              opacity={0.32}
            />
          );
        })}

        {strecken.map((d, i) => (
          <path
            key={`m${i}`}
            d={d}
            fill="none"
            stroke="var(--fg)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Einzelne Tage ohne Nachbarn bekämen sonst gar nichts — eine Strecke
            aus einem Punkt zeichnet nichts. */}
        {points.map((p, i) =>
          p.morning === null ? null : (
            <circle
              key={`p${p.date}`}
              cx={x(i)}
              cy={yMorgen(p.morning)}
              r={i === markIndex ? 4 : 1.8}
              fill="var(--fg)"
            />
          ),
        )}
      </svg>

      <figcaption style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--muted)" }}>
        {s.curveMorningLabel} · {s.curveLoadLabel}
        {markIndex >= 0 && ` · ${fill(s.curveMarker, { date: markDate ?? "" })}`}
      </figcaption>
    </figure>
  );
}
