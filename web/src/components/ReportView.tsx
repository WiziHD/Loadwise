import {
  currentFlags,
  unnamedBlocking,
  blockedText,
  evidenceText,
  problemText,
  verdictText,
  DISCLAIMER,
  type Config,
  type Flag,
  type Locale,
  type RedFlag,
  type Severity,
} from "loadwise-engine";
import type { StoredRun } from "@/lib/db/types";
import type { Strings } from "@/i18n/dictionary";
import { fill } from "@/i18n/fill";
import { RunBehindNotice } from "@/components/RunBehindNotice";

/**
 * Der vollständige Bericht — fünf Abschnitte, und der fünfte ist nicht optional.
 *
 * ---------------------------------------------------------------------------
 * WARUM VERGANGENES UND HEUTIGES GETRENNT STEHEN.
 *
 * Ohne die Trennung stand im Konsolenbericht einmal »Gesamtbild: green« direkt
 * über vier STOP-Zeilen. Beides war wahr — die Person hatte in Woche fünf vier
 * schlechte Tage und war in Woche acht wiederhergestellt —, aber das kann man
 * von einer lesenden Person nicht verlangen. Ein Bericht, der mit sich selbst
 * zu streiten scheint, kostet mehr Vertrauen, als der Befund wert war.
 *
 * **Weggeworfen wird trotzdem nichts.** Zu entscheiden, dass ein alter roter Tag
 * nicht mehr den heutigen Stand setzt, ist ein Urteil über ein Wort. Ihn aus
 * dem Protokoll zu tilgen wäre das Löschen von Beweisen.
 *
 * ---------------------------------------------------------------------------
 * DIE URTEILSSÄTZE KOMMEN AUS DEM MOTOR, IMMER.
 *
 * `verdictText` und `blockedText`, nie eine Zeichenkette von hier. Die Sätze in
 * `wording.ts` stehen unter drei Sperrlisten — Befehle, Vorhersagen, Lob —, und
 * eine Kopie im Wörterbuch der App stünde ausserhalb davon. `check:boundary`
 * hält das fest.
 *
 * ---------------------------------------------------------------------------
 * FARBE TRÄGT NIE ALLEIN.
 *
 * Jede farbige Stelle hier trägt daneben ein Wort, das dasselbe sagt.
 * Rotgrünblindheit betrifft rund acht Prozent der Männer, und Grün gegen
 * Bernstein ist genau das Paar, das dabei zusammenfällt. Der Grundsatz steht
 * neben den Farben in `globals.css`; ab dieser Ansicht ist er eine Entscheidung
 * und keine Selbstverständlichkeit mehr.
 * ---------------------------------------------------------------------------
 */

const TONE: Record<Severity, string> = {
  green: "var(--green)",
  amber: "var(--amber)",
  red: "var(--red)",
};

/**
 * Der Zustand als Farbe, als Wort UND als Form. Nie nur das eine.
 *
 * ---------------------------------------------------------------------------
 * `unjudged` IST KEINE DRITTE FARBE, SONDERN EINE ANDERE SORTE ANTWORT.
 *
 * Grün, Bernstein und Rot sind eine Skala: Sie beantworten dieselbe Frage
 * verschieden stark. »Nicht genug beurteilt« beantwortet sie GAR NICHT — und
 * eine vierte Farbe auf derselben Skala liest sich unweigerlich als vierte
 * Stufe, meistens als die schwächste. Genau so ist der Zustand in einer
 * früheren Fassung zu blassem Grün geworden.
 *
 * Deshalb bekommt er eine eigene FORM: einen abgesetzten Kasten mit
 * gestricheltem Rand. Ein Urteil steht als Text da, eine Nicht-Antwort in einem
 * Rahmen. Der Unterschied ist auf einen Blick sichtbar, bevor irgendein Wort
 * gelesen ist, und er überlebt jede Farbenfehlsichtigkeit — gestrichelt gegen
 * gar kein Rahmen ist keine Farbfrage.
 * ---------------------------------------------------------------------------
 */
function overallLook(
  run: StoredRun,
  s: Strings["report"],
): { text: string; tone: string; unjudged: boolean } {
  switch (run.overall.status) {
    case "judged":
      return {
        text: { green: s.stateGreen, amber: s.stateAmber, red: s.stateRed }[
          run.overall.severity
        ],
        tone: TONE[run.overall.severity],
        unjudged: false,
      };
    case "insufficient":
      // NICHT grün, und das ist der Grund, aus dem `--unjudged` als eigene
      // Farbe existiert: »nicht genug beurteilt« ist eine eigene Antwort und
      // kein schwaches »alles in Ordnung«. Eine Durchsicht hat genau diesen
      // Fehler schon einmal gefunden.
      return { text: s.stateInsufficient, tone: "var(--unjudged)", unjudged: true };
    case "no-data":
      return { text: s.stateNoData, tone: "var(--unjudged)", unjudged: true };
  }
}

const section: React.CSSProperties = {
  margin: "0 0 2rem",
  paddingTop: "1.25rem",
  borderTop: "1px solid var(--line)",
};

const heading: React.CSSProperties = {
  fontSize: "var(--text-base)",
  margin: "0 0 0.75rem",
  color: "var(--muted)",
  fontWeight: "var(--weight-semibold)",
};

function Finding({
  flag,
  config,
  s,
  locale,
}: {
  flag: Flag;
  /**
   * Die Schwellen, unter denen dieses Urteil ENTSTANDEN ist — aus dem
   * gespeicherten Lauf, nicht die heutigen.
   *
   * `evidenceText` erklärt damit gegen dieselben Zahlen, nach denen geurteilt
   * wurde. Genau dafür trägt jede Auswertung ihre eigene `config` mit sich
   * (Migration 0007): Ein Beweis, der gegen andere Schwellen rechnet als das
   * Urteil, ist eine erfundene Begründung.
   */
  config: Config;
  s: Strings["report"];
  locale: Locale;
}) {
  const label = { green: s.stateGreen, amber: s.stateAmber, red: s.stateRed }[flag.severity];

  return (
    <li style={{ margin: "0 0 1.25rem", listStyle: "none" }}>
      <p style={{ margin: "0 0 0.15rem", fontSize: "var(--text-sm)" }}>
        {/* Das Wort steht VOR der Farbe und trägt dieselbe Auskunft. */}
        <span style={{ color: TONE[flag.severity], fontWeight: "var(--weight-semibold)" }}>{label}</span>
        <span style={{ color: "var(--muted)" }}> · {s.rules[flag.kind]} · </span>
        <time dateTime={flag.forDate} style={{ color: "var(--muted)" }}>
          {flag.forDate}
        </time>
      </p>
      <p style={{ margin: "0 0 0.2rem" }}>{verdictText(flag.reason, locale)}</p>
      {/* Der Beleg für den Satz, nie sein Ersatz. Deshalb darunter und kleiner —
          wer nur den Satz liest, hat das Urteil; wer die Zahlen will, findet
          sie. Umgekehrt wäre es eine Tabelle mit einem Kommentar. */}
      <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--text-sm)" }}>
        {evidenceText(flag, config, locale)}
      </p>
    </li>
  );
}

export function ReportView({
  run,
  redFlags,
  behind,
  strings,
  mainStrings,
  locale,
}: {
  run: StoredRun;
  /**
   * Der Lauf kennt den neuesten Eintrag nicht.
   *
   * Dieselbe Frage wie auf dem Hauptbildschirm, deshalb dieselbe Antwort:
   * entschieden von `runIsBehind`, nicht hier. Der Satz selbst liegt unter
   * `main` im Wörterbuch — er gehört zum Zustand des Laufs, nicht zu einer
   * Ansicht, und zweimal formuliert liefe er auseinander.
   */
  behind: boolean;
  /**
   * Die Warnzeichen des Profils, unter dem die Episode HEUTE geführt wird —
   * nicht das des gespeicherten Laufs.
   *
   * Der Unterschied zählt nach einem Profilwechsel: Der Lauf trägt die Urteile
   * unter dem alten Massstab, die Warnzeichen aber sind keine Urteile. Sie
   * sagen, wann etwas zu einer Fachperson gehört, und das richtet sich nach der
   * Verletzung, die jemand heute hat.
   */
  redFlags: RedFlag[];
  strings: Strings["report"];
  /** Die zwei Sätze zum Stand des Laufs. Sie gehören zum Lauf, nicht zur Ansicht. */
  mainStrings: Strings["main"];
  locale: Locale;
}) {
  const s = strings;
  const zustand = overallLook(run, s);

  // Was den HEUTIGEN Stand beschreibt. Der Motor entscheidet das, nicht die
  // Ansicht: `currentFlags` liest dafür `config.baseline.windowDays` — dieselbe
  // Spanne, in der der Motor definiert, was für diese Person normal ist. Eine
  // zweite Zahl hier zu erfinden hiesse, dieselbe Frage zweimal verschieden zu
  // beantworten.
  const aktuell = new Set(currentFlags(run.flags, run.config, run.lastDate));
  const auffaellig = run.flags.filter((f) => f.severity !== "green" && aktuell.has(f));
  const frueher = run.flags.filter((f) => f.severity !== "green" && !aktuell.has(f));

  const weitereGruende = unnamedBlocking(run.overall, run.pending);

  return (
    <>
      <RunBehindNotice active={behind} strings={mainStrings} />

      <p style={{ margin: "0 0 1.5rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
        {s.computedAt}{" "}
        {/* Nur der Datumsteil: Eine Uhrzeit müsste in die Zeitzone der lesenden
            Person umgerechnet werden, und das auf dem Server zu tun ist genau
            der Fehler, den `deviceToday` im Eintragsformular behebt. */}
        <time dateTime={run.computedAt}>{run.computedAt.slice(0, 10)}</time>
      </p>

      <section style={{ ...section, borderTop: "none", paddingTop: 0 }}>
        <h2 style={heading}>{s.overallHeading}</h2>
        {/* Der Kasten steht immer, nur seine Form hängt am Zustand.
            Zuerst wurde er nur bei »nicht beurteilt« gerendert — dann prüfte
            der Test das VORHANDENSEIN des Elements statt seiner Form, und eine
            Mutation, die JEDEM Zustand den Rahmen gibt, überlebte. Ein
            Anhaltspunkt, den es in beiden Fällen gibt, macht beide Richtungen
            prüfbar. */}
        <div
          data-overall={run.overall.status}
          style={
            zustand.unjudged
              ? {
                  // Die Form, nicht nur die Farbe. Siehe `overallLook`.
                  border: "1px dashed var(--unjudged)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.9rem 1rem",
                }
              : { border: "none", padding: 0 }
          }
        >
          <p
            style={{ margin: "0 0 0.5rem", fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)", color: zustand.tone }}
          >
            {zustand.text}
          </p>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--text-sm)" }}>
            {fill(s.coverage, {
              judged: run.coverage.judgedDays,
              expected: run.coverage.judgedDays + run.coverage.blockedDays,
              reporting: run.coverage.rulesReporting,
              total: run.coverage.rulesTotal,
            })}
          </p>
        </div>
      </section>

      {(run.pending.length > 0 || weitereGruende.length > 0) && (
        <section style={section}>
          <h2 style={heading}>{s.pendingHeading}</h2>
          <ul style={{ margin: 0, padding: 0 }}>
            {run.pending.map((p, i) => (
              <li key={`p${i}`} style={{ margin: "0 0 0.6rem", listStyle: "none" }}>
                <span style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                  {s.rules[p.kind]}
                </span>
                <br />
                {blockedText(p.reason, locale)}
                {p.affectedDays !== undefined && (
                  <span style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                    {" — "}
                    {fill(s.pendingScope, {
                      days: p.affectedDays,
                      expected: p.expectedDays ?? p.affectedDays,
                    })}
                  </span>
                )}
              </li>
            ))}

            {/* Gründe ohne Regel. Sie standen einmal nur in `overall.blocking`
                und erreichten den Bildschirm nie — einer der acht Funde der
                Härtungswoche. Die Auswahl macht der Motor, siehe
                `unnamedBlocking`. */}
            {weitereGruende.map((reason) => (
              <li key={reason} style={{ margin: "0 0 0.6rem", listStyle: "none" }}>
                {blockedText(reason, locale)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={section}>
        <h2 style={heading}>{s.currentHeading}</h2>
        {auffaellig.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)" }}>{s.currentNone}</p>
        ) : (
          <ul style={{ margin: 0, padding: 0 }}>
            {auffaellig.map((f, i) => (
              <Finding key={`c${i}`} flag={f} config={run.config} s={s} locale={locale} />
            ))}
          </ul>
        )}
      </section>

      {frueher.length > 0 && (
        <section style={section}>
          <h2 style={heading}>{s.earlierHeading}</h2>
          <p style={{ margin: "0 0 1rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
            {s.earlierHint}
          </p>
          <ul style={{ margin: 0, padding: 0 }}>
            {frueher.map((f, i) => (
              <Finding key={`e${i}`} flag={f} config={run.config} s={s} locale={locale} />
            ))}
          </ul>
        </section>
      )}

      {run.problems.length > 0 && (
        <section style={section}>
          <h2 style={heading}>{s.problemsHeading}</h2>
          <p style={{ margin: "0 0 0.5rem" }}>
            {run.problems.length === 1
              ? s.problemsOne
              : fill(s.problemsMany, { n: run.problems.length })}
          </p>
          {/* ------------------------------------------------------------
              JE FUND EIN SATZ — SEIT KARTE 2.7.

              Hier standen nur die betroffenen Tage, und der Grund war gut:
              `Problem.message` ist die technische Spur mit Zeilennummer und
              Rohwert, teils englische Entwicklerprosa. Die einer lesenden
              Person hinzustellen wäre schlechter gewesen als sie wegzulassen.

              `problemText` gibt es jetzt — ein Satz je Code, in beiden
              Sprachen, unter denselben drei Sperrlisten wie jedes Urteil. Damit
              erfährt jemand nicht nur, WELCHER Tag nicht gelesen werden konnte,
              sondern WAS daran fehlte.

              Nach Code zusammengefasst: Fünf Tage mit demselben Problem sind
              ein Satz mit fünf Daten, nicht fünfmal derselbe Satz.
              ------------------------------------------------------------ */}
          <ul style={{ margin: "0 0 var(--space-3)", padding: 0 }}>
            {[...new Set(run.problems.map((p) => p.code))].map((code) => {
              const tage = [
                ...new Set(
                  run.problems
                    .filter((p) => p.code === code)
                    .map((p) => p.date)
                    .filter((d) => d !== null),
                ),
              ];
              return (
                <li key={code} style={{ margin: "0 0 var(--space-2)", listStyle: "none" }}>
                  {problemText(code, locale)}
                  {tage.length > 0 && (
                    <span style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                      {" — "}
                      {tage.join(" · ")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--text-sm)" }}>{s.problemsHint}</p>
        </section>
      )}

      {/* ------------------------------------------------------------------
          WARNZEICHEN UND DISCLAIMER STEHEN IM BAUTEIL, NICHT AUF DER SEITE.

          Beides ist keine Zierde: Der Disclaimer spricht die Zweckbestimmung
          aus, und die Zweckbestimmung entscheidet, ob dies ein Medizinprodukt
          ist. Die Warnzeichen sind die Stelle, an der die App ihre eigene
          Grenze benennt.

          An der SEITE hängend wären beide vergessbar — die nächste Ansicht, die
          ein Urteil zeigt, hätte sie einfach nicht. Am Bauteil hängend kommen
          sie mit, wo immer ein Urteil hingeht. `check:boundary` hält das fest:
          Wer `verdictText` importiert, importiert auch `DISCLAIMER`.
          ------------------------------------------------------------------ */}
      {redFlags.length > 0 && (
        <section style={section}>
          <h2 style={heading}>{s.redFlagsHeading}</h2>
          <p style={{ margin: "0 0 0.75rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
            {s.redFlagsHint}
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {redFlags.map((flag) => (
              <li key={flag.key} style={{ margin: "0 0 0.4rem" }}>
                {flag.text[locale]}
              </li>
            ))}
          </ul>
        </section>
      )}

      {run.unreadableFlags > 0 && (
        // Nicht still weglassen. Der Bericht zeigt sonst weniger Befunde, als
        // der Lauf hatte, und niemand kann das sehen.
        <p style={{ margin: "1.5rem 0 0", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
          {run.unreadableFlags === 1
            ? s.unreadableOne
            : fill(s.unreadableMany, { n: run.unreadableFlags })}
        </p>
      )}

      {/* Wörtlich aus dem Motor. Eine Kopie im Wörterbuch stünde ausserhalb der
          drei Sperrlisten — und dieser eine Satz ist der, der sagt, was dieses
          Produkt IST. */}
      <p
        data-disclaimer=""
        style={{
          margin: "2.5rem 0 0",
          paddingTop: "1.25rem",
          borderTop: "1px solid var(--line)",
          color: "var(--muted)",
          fontSize: "var(--text-sm)",
        }}
      >
        {DISCLAIMER[locale]}
      </p>
    </>
  );
}
