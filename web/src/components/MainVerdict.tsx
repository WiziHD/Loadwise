import {
  currentFlags,
  evidenceText,
  isRecovery,
  verdictText,
  DISCLAIMER,
  type Flag,
  type Locale,
  type Severity,
} from "loadwise-engine";
import type { StoredRun } from "@/lib/db/types";
import type { Strings } from "@/i18n/dictionary";
import { fill } from "@/i18n/fill";
import { verdictLine, hint, meta } from "@/lib/ui";
import { CourseCurve, type CoursePoint } from "@/components/CourseCurve";
import { RunBehindNotice } from "@/components/RunBehindNotice";

/**
 * Der Hauptbildschirm: ein Satz, und darunter das Bild, das ihn belegt.
 *
 * ---------------------------------------------------------------------------
 * EIN ORT, DREI INHALTE — NIE LEER UND NIE DOPPELT.
 *
 * E7 hält fest, warum das keine Kachelanordnung ist: Zwei gleichrangige Kästen
 * nebeneinander wären der Fehler gewesen. Ein Bildschirm, der zwei Dinge sein
 * will, ist meist keines von beiden — und es sind auch nicht zwei Dinge,
 * sondern **ein Ding auf zwei Zeitskalen**: was zuletzt geschah, und wo man
 * über Wochen steht.
 *
 *   1. BEFUND      es gibt einen aktuellen        der schwerste, mit Grund
 *   2. GENESUNG    kein Befund, aber ein Verlauf  die Veränderung zum Besseren
 *   3. SPIEGEL     der Motor kann nichts sagen    die eigenen Zahlen, ungedeutet
 *
 * ---------------------------------------------------------------------------
 * WARNUNG GEHT VOR ERMUTIGUNG — DIESELBE ASYMMETRIE WIE IM MOTOR.
 *
 * Die Reihenfolge oben ist nicht Geschmack. Ein Befund verdrängt eine
 * Genesungszeile, nie umgekehrt. Gäbe es beides gleichzeitig gross, stünde
 * »seit sechs Wochen besser« neben »gestern deutlich stärker als sonst« — und
 * die lesende Person müsste entscheiden, was gilt.
 *
 * ---------------------------------------------------------------------------
 * WAS DIE GENESUNGSZEILE NICHT IST.
 *
 * Sie erscheint nur bei einem Urteil aus `RECOVERY_REASONS` — also bei einer
 * beschriebenen Veränderung, nicht beim blossen Ausbleiben eines Befunds.
 * `steady`, `baseline-stable`, `settled-within-24h` sagen »nichts Besonderes«;
 * daraus eine Meldung zu machen wäre die Ermutigung, die E8 und die Sperrliste
 * ACHIEVEMENT verbieten.
 *
 * Der Satz selbst kommt aus dem Motor. Diese Datei formuliert nichts.
 * ---------------------------------------------------------------------------
 */

const TONE: Record<Severity, string> = {
  green: "var(--green)",
  amber: "var(--amber)",
  red: "var(--red)",
};

const SCHWERE: Record<Severity, 0 | 1 | 2> = { green: 0, amber: 1, red: 2 };

export type MainState =
  | { kind: "finding"; flag: Flag }
  | { kind: "recovery"; flag: Flag }
  | { kind: "mirror" };

/**
 * Welcher der drei Zustände gilt.
 *
 * Ausgelagert und exportiert, damit ein Test ihn ohne Bildschirm befragen kann —
 * die Reihenfolge ist die Zusicherung, nicht das Aussehen.
 */
export function mainState(run: StoredRun): MainState {
  const aktuell = currentFlags(run.flags, run.config, run.lastDate);

  const befunde = aktuell.filter((f) => f.severity !== "green");
  if (befunde.length > 0) {
    // Der schwerste, und bei Gleichstand der jüngste. Ein Bildschirm, der bei
    // zwei roten Tagen den älteren zeigt, erzählt von vorgestern.
    const schwerster = [...befunde].sort(
      (a, b) => SCHWERE[b.severity] - SCHWERE[a.severity] || (a.forDate < b.forDate ? 1 : -1),
    )[0];
    if (schwerster !== undefined) return { kind: "finding", flag: schwerster };
  }

  const genesung = aktuell.filter((f) => isRecovery(f.reason));
  if (genesung.length > 0) {
    const juengste = [...genesung].sort((a, b) => (a.forDate < b.forDate ? 1 : -1))[0];
    if (juengste !== undefined) return { kind: "recovery", flag: juengste };
  }

  return { kind: "mirror" };
}

/**
 * Der Spiegel — für die Zeit, in der der Motor schweigt.
 *
 * ---------------------------------------------------------------------------
 * E10: KEINE DEUTUNG, IN KEINER FORM.
 *
 * Kein »steigend«, kein Pfeil, keine Urteilsfarbe. Ein »↑« wäre eine Behauptung
 * über einen Trend aus fünf Punkten — genau das, was der Motor über eine Regel
 * verweigert. Wer das Zeichen hinzufügt, hat die achte Regel gebaut, nur ohne
 * Test.
 *
 * Was hier steht, sind die eigenen Zahlen, zurückgegeben. Das fügt der Person
 * nichts hinzu, was sie nicht hat — sie hat sie selbst eingetippt. Was es
 * hinzufügt, ist Aufmerksamkeit: Die App schaut hin, auch wenn sie noch nichts
 * sagen darf.
 *
 * ---------------------------------------------------------------------------
 * DIE BALKEN ZEIGEN, WIE NAH DIE APP AM SPRECHEN IST — NICHT, WIE FLEISSIG
 * JEMAND EINTRÄGT.
 *
 * Das ist der Unterschied zu einem Streak (E8) und der ganze Punkt. Ein Balken,
 * der Eintragsdisziplin misst, belohnt das Eintragen. Diese hier messen die
 * beiden Bedingungen, die der Motor selbst stellt, bevor er ein Gesamtbild
 * gibt: genug beurteilte Tage, genug Regeln, die gesprochen haben.
 * ---------------------------------------------------------------------------
 */
function Mirror({
  run,
  points,
  s,
}: {
  run: StoredRun;
  points: CoursePoint[];
  s: Strings["main"];
}) {
  const werte = points
    .map((p) => p.morning)
    .filter((m): m is number => m !== null)
    .slice(-8);

  const erwartet = run.coverage.judgedDays + run.coverage.blockedDays;
  const balken = [
    // »0 von 0 Tagen beurteilt« stand hier und war wörtlich wahr: Ohne eine
    // erfasste Belastung erwartet die 24-Stunden-Regel keinen einzigen Tag,
    // also sind Zähler und Nenner null. Auf dem Bildschirm liest sich das wie
    // ein Fehler — und es ist die Zeile, die jemand in der ersten Woche sieht.
    //
    // Weggelassen statt umformuliert: Wo nichts erwartet wurde, gibt es zu
    // dieser Bedingung nichts zu sagen. Die zweite Zeile — wie viele Regeln
    // gesprochen haben — steht weiter da und trägt die Auskunft.
    ...(erwartet === 0
      ? []
      : [
          {
            key: "days",
            text: fill(s.mirrorDays, { judged: run.coverage.judgedDays, expected: erwartet }),
            anteil: run.coverage.judgedDays / erwartet,
          },
        ]),
    {
      key: "rules",
      text: fill(s.mirrorRules, {
        reporting: run.coverage.rulesReporting,
        total: run.coverage.rulesTotal,
      }),
      anteil: run.coverage.rulesTotal === 0 ? 0 : run.coverage.rulesReporting / run.coverage.rulesTotal,
    },
  ];

  return (
    <>
      {werte.length > 0 && (
        <p style={{ ...verdictLine, color: "var(--unjudged)" }}>
          {s.mirrorMornings}{" "}
          {/* Nur die Zahlen, durch Punkte getrennt. Kein Pfeil, kein Wort über
              die Richtung — siehe oben. */}
          {werte.join(" · ")}
        </p>
      )}

      <p style={{ ...hint, margin: "0 0 var(--space-4)" }}>{s.mirrorHint}</p>

      <div style={{ display: "grid", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
        {balken.map((b) => (
          <div key={b.key}>
            <p style={{ ...meta, margin: "0 0 var(--space-1)" }}>{b.text}</p>
            <div
              style={{
                height: "0.375rem",
                borderRadius: "var(--radius-sm)",
                background: "var(--line)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(Math.min(1, b.anteil) * 100)}%`,
                  height: "100%",
                  background: "var(--unjudged)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function MainVerdict({
  run,
  points,
  behind,
  strings,
  locale,
}: {
  run: StoredRun;
  points: CoursePoint[];
  /**
   * Der Lauf kennt den neuesten Eintrag nicht.
   *
   * Entschieden wird das von `runIsBehind` — an EINER Stelle, weil der Bericht
   * dieselbe Frage stellt. Zwei Vergleiche wären zwei Antworten, sobald jemand
   * einen davon anfasst.
   */
  behind: boolean;
  strings: Strings["main"];
  locale: Locale;
}) {
  const s = strings;
  const zustand = mainState(run);

  const satz =
    zustand.kind === "mirror" ? null : (
      <>
        <p
          style={{
            ...verdictLine,
            color: zustand.kind === "finding" ? TONE[zustand.flag.severity] : "var(--green)",
          }}
        >
          {verdictText(zustand.flag.reason, locale)}
        </p>
        <p style={{ ...hint, margin: "0 0 var(--space-4)" }}>
          {evidenceText(zustand.flag, run.config, locale)}
        </p>
      </>
    );

  return (
    <section style={{ margin: "0 0 var(--space-6)" }}>
      <RunBehindNotice active={behind} strings={s} />

      {satz}
      {zustand.kind === "mirror" && <Mirror run={run} points={points} s={s} />}

      <CourseCurve
        points={points}
        markDate={zustand.kind === "mirror" ? null : zustand.flag.forDate}
        strings={s}
      />

      {/* Auch hier, und aus demselben Grund wie im Bericht: Der Satz spricht die
          Zweckbestimmung aus, und ein Bauteil, das Urteile rendert, trägt ihn
          mit. `check:boundary` hält die Kopplung fest. */}
      <p style={{ ...meta, marginTop: "var(--space-4)" }}>{DISCLAIMER[locale]}</p>
    </section>
  );
}
