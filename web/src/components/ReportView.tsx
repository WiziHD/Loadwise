import {
  currentFlags,
  unnamedBlocking,
  blockedText,
  verdictText,
  type Flag,
  type Locale,
  type Severity,
} from "loadwise-engine";
import type { StoredRun } from "@/lib/db/types";
import type { Strings } from "@/i18n/dictionary";
import { fill } from "@/i18n/fill";

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

/** Der Zustand als Farbe UND als Wort. Nie nur das eine. */
function overallLook(
  run: StoredRun,
  s: Strings["report"],
): { text: string; tone: string } {
  switch (run.overall.status) {
    case "judged":
      return {
        text: { green: s.stateGreen, amber: s.stateAmber, red: s.stateRed }[
          run.overall.severity
        ],
        tone: TONE[run.overall.severity],
      };
    case "insufficient":
      // NICHT grün, und das ist der Grund, aus dem `--unjudged` als eigene
      // Farbe existiert: »nicht genug beurteilt« ist eine eigene Antwort und
      // kein schwaches »alles in Ordnung«. Eine Durchsicht hat genau diesen
      // Fehler schon einmal gefunden.
      return { text: s.stateInsufficient, tone: "var(--unjudged)" };
    case "no-data":
      return { text: s.stateNoData, tone: "var(--unjudged)" };
  }
}

const section: React.CSSProperties = {
  margin: "0 0 2rem",
  paddingTop: "1.25rem",
  borderTop: "1px solid var(--line)",
};

const heading: React.CSSProperties = {
  fontSize: "1rem",
  margin: "0 0 0.75rem",
  color: "var(--muted)",
  fontWeight: 600,
};

function Finding({
  flag,
  s,
  locale,
}: {
  flag: Flag;
  s: Strings["report"];
  locale: Locale;
}) {
  const label = { green: s.stateGreen, amber: s.stateAmber, red: s.stateRed }[flag.severity];

  return (
    <li style={{ margin: "0 0 1rem", listStyle: "none" }}>
      <p style={{ margin: "0 0 0.15rem", fontSize: "0.85rem" }}>
        {/* Das Wort steht VOR der Farbe und trägt dieselbe Auskunft. */}
        <span style={{ color: TONE[flag.severity], fontWeight: 600 }}>{label}</span>
        <span style={{ color: "var(--muted)" }}> · {s.rules[flag.kind]} · </span>
        <time dateTime={flag.forDate} style={{ color: "var(--muted)" }}>
          {flag.forDate}
        </time>
      </p>
      <p style={{ margin: 0 }}>{verdictText(flag.reason, locale)}</p>
    </li>
  );
}

export function ReportView({
  run,
  strings,
  locale,
}: {
  run: StoredRun;
  strings: Strings["report"];
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
      <p style={{ margin: "0 0 1.5rem", color: "var(--muted)", fontSize: "0.85rem" }}>
        {s.computedAt}{" "}
        {/* Nur der Datumsteil: Eine Uhrzeit müsste in die Zeitzone der lesenden
            Person umgerechnet werden, und das auf dem Server zu tun ist genau
            der Fehler, den `deviceToday` im Eintragsformular behebt. */}
        <time dateTime={run.computedAt}>{run.computedAt.slice(0, 10)}</time>
      </p>

      <section style={{ ...section, borderTop: "none", paddingTop: 0 }}>
        <h2 style={heading}>{s.overallHeading}</h2>
        <p style={{ margin: "0 0 0.5rem", fontSize: "1.35rem", fontWeight: 600, color: zustand.tone }}>
          {zustand.text}
        </p>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
          {fill(s.coverage, {
            judged: run.coverage.judgedDays,
            expected: run.coverage.judgedDays + run.coverage.blockedDays,
            reporting: run.coverage.rulesReporting,
            total: run.coverage.rulesTotal,
          })}
        </p>
      </section>

      {(run.pending.length > 0 || weitereGruende.length > 0) && (
        <section style={section}>
          <h2 style={heading}>{s.pendingHeading}</h2>
          <ul style={{ margin: 0, padding: 0 }}>
            {run.pending.map((p, i) => (
              <li key={`p${i}`} style={{ margin: "0 0 0.6rem", listStyle: "none" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                  {s.rules[p.kind]}
                </span>
                <br />
                {blockedText(p.reason, locale)}
                {p.affectedDays !== undefined && (
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
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
              <Finding key={`c${i}`} flag={f} s={s} locale={locale} />
            ))}
          </ul>
        )}
      </section>

      {frueher.length > 0 && (
        <section style={section}>
          <h2 style={heading}>{s.earlierHeading}</h2>
          <p style={{ margin: "0 0 1rem", color: "var(--muted)", fontSize: "0.9rem" }}>
            {s.earlierHint}
          </p>
          <ul style={{ margin: 0, padding: 0 }}>
            {frueher.map((f, i) => (
              <Finding key={`e${i}`} flag={f} s={s} locale={locale} />
            ))}
          </ul>
        </section>
      )}

      {run.unreadableFlags > 0 && (
        // Nicht still weglassen. Der Bericht zeigt sonst weniger Befunde, als
        // der Lauf hatte, und niemand kann das sehen.
        <p style={{ margin: "1.5rem 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
          {run.unreadableFlags === 1
            ? s.unreadableOne
            : fill(s.unreadableMany, { n: run.unreadableFlags })}
        </p>
      )}
    </>
  );
}
