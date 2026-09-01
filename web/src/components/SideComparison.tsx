import {
  DISCLAIMER,
  SELF_COMPARISON,
  TEST_UNIT,
  verdictText,
  type Flag,
  type Locale,
  type SelfTest,
  type TestType,
  type Unit,
} from "loadwise-engine";
import type { Strings } from "@/i18n/dictionary";
import { hint, section, sectionHeading } from "@/lib/ui";

/**
 * Der Seitenvergleich, angezeigt — mit dem Vorbehalt, der dazugehört.
 *
 * ---------------------------------------------------------------------------
 * KEIN BALKEN GEGEN 100 %. DAS IST DIE ZENTRALE GESTALTUNGSENTSCHEIDUNG.
 *
 * Ein Fortschrittsbalken hätte ein Ende, und ein Ende ist ein Ziel. Der
 * Symmetrieindex ist aber ein **Verhältnis**: Er sagt, wie sich eine Seite zur
 * anderen verhält, und nicht, wie weit jemand ist. 100 % heisst »beide Seiten
 * gleich« — nicht »gesund«, nicht »fertig«, nicht »freigegeben«.
 *
 * Ein Balken machte daraus stillschweigend eine Freigabekriterium-Anzeige, und
 * das ist genau die Linie aus `PROTOKOLLE.md` §1. Deshalb stehen hier Zahlen
 * und eine Tabelle, kein Balken und keine Skala mit Obergrenze.
 *
 * ---------------------------------------------------------------------------
 * BEIDE SEITEN ABSOLUT, NICHT NUR DAS VERHÄLTNIS. DAS IST DER PUNKT DER KARTE.
 *
 * Der Motor meldet `reference-eroding`, wenn auch die **gesunde** Seite
 * absinkt. Dann steigt das Verhältnis oder bleibt stehen, während die Person
 * auf beiden Seiten schwächer wird — der Index sieht gut aus und bedeutet
 * nichts mehr.
 *
 * Diese Warnung ist im Motor gebaut, hat eine eigene Reason-Code und drei
 * Szenarien in der Erwartungsdatei. Erreichte sie den Bildschirm nicht, wäre
 * sie umsonst gebaut — und die Ansicht zeigte ein Verhältnis, dessen Nenner
 * wegbricht, ohne das zu sagen.
 *
 * Deshalb steht die Spalte der gesunden Seite gleichberechtigt neben der
 * verletzten, und deshalb steht der Befund darüber, nicht darunter.
 *
 * ---------------------------------------------------------------------------
 * DER VORBEHALT KOMMT AUS DEM MOTOR.
 *
 * `SELF_COMPARISON` trägt eine belegte Zahl — Gesunde zwischen 20 und 59
 * erreichen 6 bis 70 Wiederholungen — und steht deshalb unter den drei
 * Ban-Listen. Im Wörterbuch der App stünde er ausserhalb, und die natürliche
 * Kurzfassung wäre »ein guter Wert sind 25«.
 * ---------------------------------------------------------------------------
 */

/** Eine Zeile der Tabelle: ein Tag, beide Seiten, das Verhältnis. */
type Zeile = {
  date: string;
  involved: number;
  uninvolved: number;
  /** Prozent, gerundet. Null, wenn die Bezugsseite null ist — dann gibt es keins. */
  index: number | null;
};

function zeilenFuer(tests: SelfTest[], type: TestType): Zeile[] {
  return tests
    .filter((t) => t.type === type)
    .map((t) => ({
      date: String(t.date),
      involved: t.involved,
      uninvolved: t.uninvolved,
      // Nicht `t.involved / t.uninvolved` ohne Prüfung: Eine Bezugsseite bei
      // null ergäbe Infinity, und das stünde dann als Prozentzahl da.
      index: t.uninvolved > 0 ? Math.round((t.involved / t.uninvolved) * 100) : null,
    }));
}

export function SideComparison({
  tests,
  flags,
  strings,
  locale,
}: {
  /** Die gespeicherten Messungen, nach Tag geordnet. */
  tests: SelfTest[];
  /** Die Asymmetrie-Flags des jüngsten Laufs. Das Urteil, nicht die Zahlen. */
  flags: Flag[];
  strings: Strings["comparison"];
  locale: Locale;
}) {
  if (tests.length === 0) return null;

  // Nur Testarten, für die es Messungen gibt. Eine leere Tabelle mit
  // Überschrift wäre eine Auskunft über nichts.
  const arten = [...new Set(tests.map((t) => t.type))];

  const einheitentext: Partial<Record<Unit, string>> = {
    reps: strings.unitReps,
    cm: strings.unitCm,
    deg: strings.unitDeg,
  };
  const testName: Record<TestType, string> = {
    calf_raise: strings.calfRaise,
    single_hop: strings.singleHop,
    rom: strings.rom,
  };

  return (
    <section style={section}>
      <h2 style={sectionHeading}>{strings.heading}</h2>

      {arten.map((art) => {
        const zeilen = zeilenFuer(tests, art);
        // Das Flag dieser Testart aus dem gespeicherten Lauf. `detail` trägt
        // die Testart; ohne die Einschränkung stünde der Befund des
        // Fersenhebers über der Tabelle des Einbeinsprungs.
        const flag = flags.find(
          (f) => f.kind === "asymmetry" && (f.detail as { type?: TestType }).type === art,
        );
        const einheit = einheitentext[TEST_UNIT[art]] ?? TEST_UNIT[art];

        return (
          <div key={art} data-comparison={art} style={{ marginBottom: "var(--space-5)" }}>
            <h3 style={{ ...sectionHeading, fontSize: "var(--text-base)" }}>{testName[art]}</h3>

            {/* Der Befund ÜBER der Tabelle. Wer liest, soll wissen, worauf er
                blickt, bevor er die Zahlen aufnimmt — dieselbe Überlegung wie
                bei `RunBehindNotice`. */}
            {flag !== undefined && (
              <p
                data-verdict={flag.reason}
                style={{
                  margin: "0 0 var(--space-3)",
                  paddingLeft: "var(--space-3)",
                  borderLeft: `2px solid var(--${flag.severity})`,
                }}
              >
                {verdictText(flag.reason, locale)}
              </p>
            )}

            {/* Waagrecht scrollbar in einem eigenen Behälter: Vier Spalten
                passen auf ein Telefon nur knapp, und die Seite selbst darf
                nicht seitlich scrollen. */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "22rem" }}>
                <caption style={{ ...hint, textAlign: "left", marginBottom: "0.3rem" }}>
                  {strings.tableCaption} {einheit}
                </caption>
                <thead>
                  <tr>
                    {[strings.colDate, strings.colInvolved, strings.colUninvolved, strings.colIndex].map(
                      (kopf) => (
                        <th
                          key={kopf}
                          scope="col"
                          style={{
                            textAlign: "left",
                            padding: "0.3rem 0.6rem 0.3rem 0",
                            borderBottom: "1px solid var(--line)",
                            fontWeight: "var(--weight-semibold)",
                            fontSize: "var(--text-sm)",
                          }}
                        >
                          {kopf}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {zeilen.map((z) => (
                    <tr key={z.date}>
                      <th
                        scope="row"
                        style={{
                          textAlign: "left",
                          padding: "0.3rem 0.6rem 0.3rem 0",
                          fontWeight: "var(--weight-normal)",
                          color: "var(--muted)",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        <time dateTime={z.date}>{z.date}</time>
                      </th>
                      <td style={{ padding: "0.3rem 0.6rem 0.3rem 0" }}>{z.involved}</td>
                      <td style={{ padding: "0.3rem 0.6rem 0.3rem 0" }}>{z.uninvolved}</td>
                      {/* Der Index als Zahl. Kein Balken — siehe Kopf. */}
                      <td style={{ padding: "0.3rem 0.6rem 0.3rem 0" }}>
                        {z.index === null ? strings.noIndex : `${z.index} %`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <p style={{ ...hint, margin: "0 0 var(--space-3)", maxWidth: "42rem" }}>
        {SELF_COMPARISON[locale]}
      </p>

      {/* Diese Datei ruft `verdictText`. `check:boundary` verlangt deshalb, dass
          sie die Zweckbestimmung trägt — an das Bauteil gebunden, nicht an die
          Seite darum herum. */}
      <p style={{ ...hint, margin: 0, maxWidth: "42rem" }}>{DISCLAIMER[locale]}</p>
    </section>
  );
}
