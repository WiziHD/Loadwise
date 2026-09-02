"use client";

import { useMemo, useState } from "react";
import {
  DISCLAIMER,
  TEST_UNIT,
  compareDates,
  evidenceText,
  verdictText,
  type DateStr,
  type Entry,
  type Locale,
  type SelfTest,
  type TestType,
} from "loadwise-engine";
import type { StoredRun } from "@/lib/db/types";
import { CourseCurve, type CoursePoint } from "@/components/CourseCurve";
import type { Strings } from "@/i18n/dictionary";
import { hint, quietButton, sectionHeading } from "@/lib/ui";

/**
 * Der Bericht, den eine behandelnde Person in dreissig Sekunden liest.
 *
 * ---------------------------------------------------------------------------
 * FÜR JEMANDEN GESCHRIEBEN, DER DIESE APP NIE GESEHEN HAT.
 *
 * Das ist der Kern des Konzepts: nicht die dreissig Minuten beim Physio,
 * sondern die anderen 167 Stunden. Was hier steht, muss ohne Erklärung
 * verständlich sein — und damit auch ohne die Möglichkeit, jemanden zu fragen.
 *
 * Deshalb steht ausdrücklich dabei, WONACH beurteilt wurde: Profilname,
 * Profilversion, Regelversion, Berechnungszeitpunkt. Ohne diese vier Angaben
 * ist ein Ausdruck von vor drei Monaten nicht mehr einzuordnen — die Schwellen
 * können sich geändert haben, und niemand könnte sagen, ob ein anderes
 * Ergebnis am Körper oder an einer Profilverbesserung liegt.
 *
 * ---------------------------------------------------------------------------
 * DER ZEITRAUM ENGT EIN, WAS AUFGELISTET WIRD — NICHT DAS GESAMTURTEIL.
 *
 * Und das ist die Falle dieser Karte. Wer »letzte vier Wochen« wählt, sieht
 * eine kürzere Liste; das Gesamturteil bleibt aber die Aussage über den GANZEN
 * Verlauf bis zur Berechnung. Es unter einer Zeitraumüberschrift zu zeigen
 * hiesse, einen Befund von vor zwei Monaten dem gewählten Fenster
 * zuzuschreiben.
 *
 * Deshalb steht der Gesamtstand in einem eigenen Abschnitt, mit einem Satz
 * darüber, worauf er sich bezieht. Ihn ganz wegzulassen wäre die Alternative
 * gewesen — verworfen, weil eine behandelnde Person genau diese eine Zeile
 * zuerst sucht.
 *
 * ---------------------------------------------------------------------------
 * DRUCK OHNE PDF-ERZEUGER.
 *
 * `@media print` in `globals.css` blendet aus, was auf Papier nichts zu suchen
 * hat — Navigation, Zeitraumwahl, Druckknopf —, und stellt Farben auf
 * Schwarzweiss. Ein PDF-Erzeuger wäre eine Abhängigkeit mehr, ein zweiter Satz
 * Schriftarten und ein Weg, auf dem Gesundheitsdaten durch fremden Code laufen.
 * ---------------------------------------------------------------------------
 */

/** Die wählbaren Fenster. `null` heisst: der ganze Verlauf. */
const FENSTER: (number | null)[] = [28, 56, 84, null];

function fuellen(vorlage: string, werte: Record<string, string | number>): string {
  return vorlage.replace(/\{(\w+)\}/g, (ganz, key: string) =>
    key in werte ? String(werte[key]) : ganz,
  );
}

export function PrintReport({
  run,
  entries,
  points,
  tests,
  profileLabel,
  strings,
  mainStrings,
  reportStrings,
  comparisonStrings,
  locale,
}: {
  /** Der gespeicherte Lauf. Null: es gab noch keinen. */
  run: StoredRun | null;
  entries: Entry[];
  points: CoursePoint[];
  tests: SelfTest[];
  /** Der Name des Profils in der Sprache der Seite. */
  profileLabel: string;
  strings: Strings["print"];
  mainStrings: Strings["main"];
  reportStrings: Strings["report"];
  comparisonStrings: Strings["comparison"];
  locale: Locale;
}) {
  const [tage, setTage] = useState<number | null>(null);

  /**
   * Der erste Tag des Zeitraums.
   *
   * Gerechnet vom jüngsten ERFASSTEN Tag, nicht von heute: Wer zwei Wochen
   * nichts eingetragen hat und »letzte vier Wochen« wählt, bekäme sonst eine
   * halb leere Seite und den Eindruck, es fehlten Daten.
   */
  const grenze = useMemo<DateStr | null>(() => {
    if (tage === null) return null;
    const letzter = entries[entries.length - 1]?.date;
    if (letzter === undefined) return null;
    const d = new Date(`${String(letzter)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (tage - 1));
    return d.toISOString().slice(0, 10) as DateStr;
  }, [tage, entries]);

  const imZeitraum = (datum: string): boolean =>
    grenze === null || compareDates(datum as DateStr, grenze) >= 0;

  const punkteImZeitraum = points.filter((p) => imZeitraum(p.date));
  const tageImZeitraum = entries.filter((e) => imZeitraum(String(e.date))).length;

  // Befunde im Zeitraum, jüngste zuerst — eine behandelnde Person liest von
  // oben und will das Aktuelle zuerst.
  const befunde = (run?.flags ?? [])
    .filter((f) => imZeitraum(f.forDate))
    .slice()
    .sort((a, b) => compareDates(b.forDate as DateStr, a.forDate as DateStr));

  const messungen = tests.filter((t) => imZeitraum(String(t.date)));

  const testName: Record<TestType, string> = {
    calf_raise: comparisonStrings.calfRaise,
    single_hop: comparisonStrings.singleHop,
    rom: comparisonStrings.rom,
  };

  const zustand =
    run === null
      ? null
      : run.overall.status === "judged"
        ? {
            green: reportStrings.stateGreen,
            amber: reportStrings.stateAmber,
            red: reportStrings.stateRed,
          }[run.overall.severity]
        : run.overall.status === "insufficient"
          ? reportStrings.stateInsufficient
          : reportStrings.none;

  return (
    <div data-print-report="">
      {/* Die Zeitraumwahl und der Druckknopf gehören auf den Bildschirm, nicht
          aufs Papier. `@media print` blendet alles mit diesem Merkmal aus. */}
      <div data-screen-only="" style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", marginBottom: "var(--space-4)" }}>
        <span style={hint}>{strings.period}</span>
        {FENSTER.map((f) => (
          <button
            key={String(f)}
            type="button"
            aria-pressed={tage === f}
            onClick={() => setTage(f)}
            style={{
              ...quietButton,
              fontWeight: tage === f ? "var(--weight-semibold)" : "var(--weight-normal)",
            }}
          >
            {f === null ? strings.periodAll : fuellen(strings.periodDays, { days: f })}
          </button>
        ))}
        <button type="button" onClick={() => window.print()} style={quietButton}>
          {strings.printButton}
        </button>
      </div>

      {run === null ? (
        <p style={{ ...hint, margin: 0 }}>{strings.noRun}</p>
      ) : (
        <>
          {/* ------------------------------------------------------------
              WONACH BEURTEILT WURDE. Die vier Angaben, ohne die ein alter
              Ausdruck nicht mehr einzuordnen ist. Ganz oben, weil eine
              behandelnde Person zuerst wissen muss, was sie da liest.
              ------------------------------------------------------------ */}
          <section data-basis="" style={{ marginBottom: "var(--space-5)" }}>
            <h2 style={sectionHeading}>{strings.basisHeading}</h2>
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.2rem 0.8rem" }}>
              {[
                [strings.profileLabel, profileLabel],
                [strings.profileVersion, run.profileVersion],
                [strings.ruleVersion, run.ruleVersion],
                [strings.computedAt, run.computedAt.slice(0, 10)],
                [
                  strings.period,
                  grenze === null
                    ? strings.periodAll
                    : `${strings.periodFrom} ${grenze} ${strings.periodTo} ${String(entries[entries.length - 1]?.date ?? "")}`,
                ],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt style={{ ...hint, margin: 0 }}>{k}</dt>
                  <dd style={{ margin: 0 }}>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ------------------------------------------------------------
              DER GESAMTSTAND, mit dem Satz, worauf er sich bezieht. Siehe
              den Kopf: Er gilt für den ganzen Verlauf, nicht für den
              gewählten Zeitraum.
              ------------------------------------------------------------ */}
          <section data-overall="" style={{ marginBottom: "var(--space-5)" }}>
            <h2 style={sectionHeading}>{strings.overallHeading}</h2>
            <p style={{ margin: "0 0 0.2rem", fontSize: "var(--text-lg)" }}>{zustand}</p>
            <p style={{ ...hint, margin: 0 }}>{strings.overallScope}</p>
          </section>

          <section data-curve="" style={{ marginBottom: "var(--space-5)" }}>
            <h2 style={sectionHeading}>{strings.curveHeading}</h2>
            <p style={{ ...hint, margin: "0 0 0.4rem" }}>
              {fuellen(strings.daysInPeriod, { count: tageImZeitraum })}
            </p>
            <CourseCurve points={punkteImZeitraum} markDate={null} strings={mainStrings} />
          </section>

          {/* ------------------------------------------------------------
              AUFFÄLLIGKEITEN MIT DATUM UND ZAHLEN. Beides aus dem Motor:
              der Satz über `verdictText`, die Zahlen über `evidenceText`
              gegen die Config DIESES Laufs. Gegen `DEFAULT_CONFIG` zu
              rechnen erklärte ein Urteil mit Schwellen, nach denen es nie
              gefällt wurde.
              ------------------------------------------------------------ */}
          <section data-findings="" style={{ marginBottom: "var(--space-5)" }}>
            <h2 style={sectionHeading}>{strings.findingsHeading}</h2>
            {befunde.length === 0 ? (
              <p style={{ ...hint, margin: 0 }}>{strings.findingsEmpty}</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.6rem" }}>
                {befunde.map((f) => (
                  <li key={`${f.forDate}-${f.kind}-${f.reason}`} data-finding={f.reason}>
                    <p style={{ margin: "0 0 0.1rem", fontSize: "var(--text-sm)" }}>
                      <time dateTime={f.forDate}>{f.forDate}</time>
                      <span style={{ color: "var(--muted)" }}> · {reportStrings.rules[f.kind]}</span>
                    </p>
                    <p style={{ margin: "0 0 0.1rem" }}>{verdictText(f.reason, locale)}</p>
                    <p style={{ ...hint, margin: 0 }}>{evidenceText(f, run.config, locale)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section data-tests="">
            <h2 style={sectionHeading}>{strings.testsHeading}</h2>
            {messungen.length === 0 ? (
              <p style={{ ...hint, margin: 0 }}>{strings.testsEmpty}</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.25rem" }}>
                {messungen.map((t) => (
                  <li key={`${t.type}-${t.date}`}>
                    <time dateTime={String(t.date)} style={{ color: "var(--muted)" }}>
                      {String(t.date)}
                    </time>{" "}
                    · {testName[t.type]} · {t.involved} / {t.uninvolved} {TEST_UNIT[t.type]}
                    {t.uninvolved > 0 && ` · ${Math.round((t.involved / t.uninvolved) * 100)} %`}
                    {t.note != null && t.note !== "" && (
                      <span style={{ color: "var(--muted)" }}> · {t.note}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Diese Datei ruft `verdictText`. `check:boundary` verlangt deshalb die
          Zweckbestimmung — und auf einem Ausdruck, der ohne die App gelesen
          wird, ist sie wichtiger als irgendwo sonst. */}
      <p style={{ ...hint, marginTop: "var(--space-5)", maxWidth: "42rem" }}>{DISCLAIMER[locale]}</p>
    </div>
  );
}
