import {
  ALL_BLOCKING_REASONS,
  DISCLAIMER,
  blockedText,
  type BlockingReason,
  type Locale,
} from "loadwise-engine";
import type { StoredRun } from "@/lib/db/types";
import type { Strings } from "@/i18n/dictionary";
import { hint, section, sectionHeading } from "@/lib/ui";

/**
 * Die ersten zwei Wochen — der heikelste Moment des ganzen Produkts.
 *
 * ---------------------------------------------------------------------------
 * NACH DEM ERSTEN EINTRAG HAT DER MOTOR NICHTS ZU SAGEN. DAS IST DIE LAGE.
 *
 * Die 24-Stunden-Regel vergleicht einen Tag mit einem Vergleichswert, und der
 * braucht zehn Einträge in vierzehn Tagen. Vorher gibt es kein Urteil — nicht
 * weil etwas fehlschlägt, sondern weil es nichts zu vergleichen gibt.
 *
 * Was eine App an dieser Stelle üblicherweise tut, ist genau das Falsche: ein
 * Ladebalken, ein »wird ausgewertet«, ein erfundener erster Befund. Alle drei
 * behaupten, es passiere etwas. Der Preis wird zwei Wochen später fällig, wenn
 * das erste echte Urteil kommt und niemand mehr unterscheiden kann, was daran
 * neu ist.
 *
 * ---------------------------------------------------------------------------
 * DREI ABSCHNITTE, UND ZWEI DAVON KOMMEN AUS DEM MOTOR.
 *
 *   Was im Tagebuch steht   die eigenen Tage, gezählt gegen die Zahl aus der
 *                           Config DIESES Laufs — nicht gegen eine hier
 *                           hingeschriebene Zehn
 *   Was noch fehlt          `blockedText` über die Gründe, die der Motor
 *                           selbst nennt. Kein Satz von hier
 *   Die Frage für morgen    eine FRAGE, keine Anweisung
 *
 * ---------------------------------------------------------------------------
 * WARUM EINE FRAGE UND KEIN »TRAG MORGEN EIN«.
 *
 * »Trag morgen früh deinen Morgenwert ein« wäre eine Anweisung zur Bedienung
 * und regulatorisch harmlos. Sie wäre trotzdem die falsche Form: Sie sagt, was
 * jemand tun soll, an genau der Stelle, an der die App sonst peinlich genau
 * nichts sagt.
 *
 * Eine Frage — »wie fühlt es sich an, bevor du aufstehst?« — tut dasselbe und
 * lässt die Entscheidung dort, wo sie hingehört. Sie erklärt nebenbei, WARUM
 * vor dem Aufstehen: Der Wert soll vergleichbar sein, und ein Morgen nach zwei
 * Stunden Bürostuhl ist es nicht mehr.
 *
 * ---------------------------------------------------------------------------
 * DIE GRENZEN DES PROFILS STEHEN HIER NOCH EINMAL.
 *
 * `ProfilePicker` zeigt sie vor dem Anlegen. Das ist der richtige Zeitpunkt für
 * die Entscheidung — und der falsche, um sie zu behalten: Wer ein Formular
 * ausfüllt, liest den Satz über zwanzig Differentialdiagnosen nicht zu Ende.
 *
 * Hier, in den ersten Tagen, ist Platz dafür. Danach verschwindet dieser
 * ganze Abschnitt, weil der Motor dann selbst redet.
 * ---------------------------------------------------------------------------
 */

function fuellen(vorlage: string, werte: Record<string, string | number>): string {
  return vorlage.replace(/\{(\w+)\}/g, (ganz, key: string) =>
    key in werte ? String(werte[key]) : ganz,
  );
}

const IST_BLOCKADEGRUND = new Set<string>(ALL_BLOCKING_REASONS);

/**
 * Zeigt diese Episode noch die ersten Tage?
 *
 * ---------------------------------------------------------------------------
 * AN DER ZAHL DER EINTRÄGE, NICHT AM URTEILSZUSTAND.
 *
 * `insufficient` allein taugt nicht als Bedingung: Es tritt auch nach Monaten
 * auf, wenn ein Schmerzmittel im Fenster liegt. Wer seit zwölf Wochen einträgt,
 * bekäme dann »die ersten zwei Wochen« zu lesen.
 *
 * Die ehrliche Bedingung ist die, um die es geht: Der Motor kann noch keinen
 * Vergleichswert haben. Das hängt an `baseline.minEntries` — der Zahl aus der
 * Config DES LAUFS, nicht aus `DEFAULT_CONFIG`. Ein Profil, das die Schwelle
 * verschiebt, verschiebt damit auch, wie lange diese Ansicht steht.
 * ---------------------------------------------------------------------------
 */
export function inFirstDays(run: StoredRun | null, entryCount: number): boolean {
  if (run === null) return true;
  return entryCount < run.config.baseline.minEntries;
}

export function FirstDays({
  run,
  entryCount,
  limitations,
  strings,
  locale,
}: {
  /** Der gespeicherte Lauf. Null: es gab noch keinen. */
  run: StoredRun | null;
  entryCount: number;
  /** `profile.limitations` in der Sprache der Seite. Aus dem Motor. */
  limitations: string;
  strings: Strings["firstDays"];
  locale: Locale;
}) {
  const gebraucht = run?.config.baseline.minEntries ?? 10;

  /**
   * Die Gründe, die der Motor selbst nennt — ohne Doubletten.
   *
   * `pending` trägt sie je Tag und Regel; nach zehn Tagen stünde »für einen
   * Vergleichswert fehlen noch Einträge« zehnmal untereinander. Gefiltert wird
   * gegen `ALL_BLOCKING_REASONS`, damit ein Grund aus einer Fassung, die es
   * nicht mehr gibt, als leere Zeile erscheint statt als Absturz.
   */
  const gruende = [
    ...new Set(
      (run?.pending ?? [])
        .map((p) => p.reason as string)
        .filter((r) => IST_BLOCKADEGRUND.has(r)),
    ),
  ] as BlockingReason[];

  return (
    <section data-first-days="" style={section}>
      <h2 style={sectionHeading}>{strings.heading}</h2>

      <p style={{ margin: "0 0 0.4rem", maxWidth: "42rem" }}>{strings.whatThisIs}</p>
      <p style={{ ...hint, margin: "0 0 var(--space-4)", maxWidth: "42rem" }}>
        {strings.whatThisIsNot}
      </p>

      <h3 style={{ ...sectionHeading, fontSize: "var(--text-base)" }}>
        {strings.recordedHeading}
      </h3>
      <p data-recorded="" style={{ margin: "0 0 var(--space-4)" }}>
        {fuellen(strings.recordedCount, { done: entryCount, needed: gebraucht })}
      </p>

      <h3 style={{ ...sectionHeading, fontSize: "var(--text-base)" }}>{strings.missingHeading}</h3>
      {gruende.length === 0 ? (
        <p data-missing="" style={{ margin: "0 0 var(--space-4)", maxWidth: "42rem" }}>
          {strings.missingNothingYet}
        </p>
      ) : (
        <ul data-missing="" style={{ margin: "0 0 var(--space-4)", paddingLeft: "1.1rem" }}>
          {gruende.map((r) => (
            <li key={r} style={{ margin: "0 0 0.2rem" }}>
              {blockedText(r, locale)}
            </li>
          ))}
        </ul>
      )}

      <h3 style={{ ...sectionHeading, fontSize: "var(--text-base)" }}>{strings.tomorrowHeading}</h3>
      <p data-tomorrow="" style={{ margin: "0 0 var(--space-4)", maxWidth: "42rem" }}>
        {strings.tomorrowQuestion}
      </p>

      <h3 style={{ ...sectionHeading, fontSize: "var(--text-base)" }}>{strings.limitsHeading}</h3>
      <p style={{ ...hint, margin: "0 0 var(--space-4)", maxWidth: "42rem" }}>{limitations}</p>

      {/* Diese Datei ruft `blockedText`. `check:boundary` verlangt deshalb die
          Zweckbestimmung — und hier steht sie am Tag 1, also an dem einen Tag,
          an dem noch niemand weiss, was dieses Produkt ist. */}
      <p style={{ ...hint, margin: 0, maxWidth: "42rem" }}>{DISCLAIMER[locale]}</p>
    </section>
  );
}
