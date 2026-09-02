import {
  DISCLAIMER,
  claimText,
  progressBlockText,
  type Locale,
  type ProgressReport,
  type Unit,
} from "loadwise-engine";
import { measureLabel } from "@/lib/measure-label";
import type { Strings } from "@/i18n/dictionary";
import { hint, section, sectionHeading } from "@/lib/ui";

/**
 * Die eigenen Zahlenreihen — aufgezeichnet, nie »verbessert«.
 *
 * ---------------------------------------------------------------------------
 * DREI DINGE FEHLEN HIER, UND JEDES EINZELNE MIT GRUND.
 *
 * **1. Kein Verb der Veränderung.** Nicht »besser«, nicht »+7«, nicht
 * »Bestwert«. Für keinen Test dieser neun Profile ist belegt, wie weit zwei
 * Messungen allein durch Zufall auseinanderliegen — ohne diese Zahl lässt sich
 * »acht, dann fünfzehn« nicht von Messrauschen trennen.
 *
 * Wie ernst das ist, zeigt der VISA-A-Fragebogen: 6,5 Punkte als klinisch
 * bedeutsamer Unterschied bei einer Messgenauigkeit von mindestens 7. Die
 * kleinste Änderung, die etwas bedeutet, liegt UNTER der Genauigkeit der
 * Messung.
 *
 * Der Motor sagt das selbst, über `claimText`. Diese Ansicht gibt seinen Satz
 * aus und fügt keinen eigenen hinzu.
 *
 * **2. Kein Prozentbalken gegen einen Zielwert.** »12 von 15 = 80 %«
 * behauptet, dass 12 und 15 sich bedeutsam unterscheiden — dieselbe erfundene
 * Genauigkeit, nur als Bild. Siehe E16.
 *
 * **3. Keine Serien, Abzeichen, Punkte.** Der Motor kann einen weggelassenen
 * schlechten Tag nicht erkennen; das ist dokumentiert und unlösbar. Eine Serie
 * macht das Weglassen doppelt lohnend, und eine gerissene Serie bestraft
 * jemanden dafür, dass sein Knie nicht mitgespielt hat.
 *
 * ---------------------------------------------------------------------------
 * »ERSTE« UND »JÜNGSTE«, NICHT »SCHLECHTESTE« UND »BESTE«.
 *
 * Beides sind Angaben über die POSITION in einer Reihe. Der Motortyp sagt es
 * an `PersonalRecord.latest` selbst: *»Not 'best': that word needs a
 * direction.«* Eine Richtung hätte die App zu erfinden — und bei einem
 * Beschwerdewert zeigte sie in die andere Richtung als bei Wiederholungen.
 * ---------------------------------------------------------------------------
 */

function fuellen(vorlage: string, werte: Record<string, string | number>): string {
  return vorlage.replace(/\{(\w+)\}/g, (ganz, key: string) =>
    key in werte ? String(werte[key]) : ganz,
  );
}

export function ProgressRecords({
  progress,
  strings,
  goalStrings,
  unitStrings,
  locale,
}: {
  /** Der Fortschrittskanal aus dem gespeicherten Lauf. */
  progress: ProgressReport | null;
  strings: Strings["progress"];
  /** Für die Namen der Messquellen — dieselben Worte wie im Zielformular. */
  goalStrings: Strings["goal"];
  unitStrings: Strings["measure"];
  locale: Locale;
}) {
  const records = progress?.records ?? [];

  // Gründe, die an keinem einzelnen Ziel hängen — etwa »für die verwendeten
  // Tests ist keine Messgenauigkeit belegt«. Die je Ziel hängenden zeigt
  // `MilestoneList`; diese hier hätten sonst gar keinen Ort.
  const allgemein = (progress?.pending ?? []).filter((p) => p.milestoneId === null);

  if (records.length === 0 && allgemein.length === 0) {
    return (
      <section style={section}>
        <h2 style={sectionHeading}>{strings.heading}</h2>
        <p style={{ ...hint, margin: 0 }}>{strings.empty}</p>
      </section>
    );
  }

  const einheitentext: Partial<Record<Unit, string>> = {
    reps: unitStrings.unitReps,
    cm: unitStrings.unitCm,
    deg: unitStrings.unitDeg,
    min: unitStrings.unitMin,
    sec: unitStrings.unitSec,
    score_0_10: unitStrings.unitScore,
  };

  return (
    <section style={section}>
      <h2 style={sectionHeading}>{strings.heading}</h2>
      <p style={{ margin: "0 0 var(--space-4)", maxWidth: "42rem" }}>{strings.intro}</p>

      {allgemein.map((p) => (
        <p key={p.reason} data-pending={p.reason} style={{ ...hint, margin: "0 0 var(--space-3)" }}>
          {progressBlockText(p.reason, locale)}
        </p>
      ))}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-5)" }}>
        {records.map((r, i) => {
          const einheit = einheitentext[r.unit] ?? r.unit;

          return (
            <li key={i} data-record={i}>
              <h3 style={{ ...sectionHeading, fontSize: "var(--text-base)" }}>
                {measureLabel(r.measure, goalStrings)}
              </h3>

              {/* Erste und jüngste, nebeneinander und ohne Differenz dazwischen.
                  Die Differenz auszurechnen wäre die Behauptung, sie bedeute
                  etwas — siehe Kopf. */}
              <p style={{ margin: "0 0 0.3rem" }}>
                <span data-first="">
                  <span style={{ color: "var(--muted)" }}>{strings.firstReading} </span>
                  <time dateTime={String(r.first.date)}>{String(r.first.date)}</time>{" "}
                  {r.first.value} {einheit}
                </span>
                <span style={{ color: "var(--muted)" }}> · </span>
                <span data-latest="">
                  <span style={{ color: "var(--muted)" }}>{strings.latestReading} </span>
                  <time dateTime={String(r.latest.date)}>{String(r.latest.date)}</time>{" "}
                  {r.latest.value} {einheit}
                </span>
              </p>

              {/* Der Vorbehalt des Motors, direkt unter den Zahlen. Weiter
                  unten wäre er eine Fussnote zu etwas, das schon gelesen ist. */}
              <p data-claim={r.claim.level} style={{ ...hint, margin: "0 0 0.4rem", maxWidth: "42rem" }}>
                {claimText(r.claim, locale)}
              </p>

              {/* Die ganze Reihe. Waagrecht scrollbar in einem eigenen
                  Behälter — die Seite selbst darf nicht seitlich scrollen. */}
              {r.series.length > 2 && (
                <div style={{ overflowX: "auto" }}>
                  <p style={{ ...hint, margin: "0 0 0.2rem" }}>
                    {strings.seriesHeading} · {fuellen(strings.readingCount, { count: r.series.length })}
                  </p>
                  <p data-series="" style={{ margin: 0, whiteSpace: "nowrap" }}>
                    {r.series.map((punkt, j) => (
                      <span key={String(punkt.date)}>
                        {j > 0 && <span style={{ color: "var(--muted)" }}> · </span>}
                        <time dateTime={String(punkt.date)} style={{ color: "var(--muted)" }}>
                          {String(punkt.date)}
                        </time>{" "}
                        {punkt.value}
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Diese Datei gibt Sätze des Motors über die Zahlen eines Menschen aus.
          Die Zweckbestimmung gehört an das Bauteil, nicht an die Seite. */}
      <p style={{ ...hint, margin: "var(--space-4) 0 0", maxWidth: "42rem" }}>{DISCLAIMER[locale]}</p>
    </section>
  );
}
