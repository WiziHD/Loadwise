/**
 * Der Bericht — die Strecke vom gespeicherten Urteil bis zum Bildschirm.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIE FIXTUREN DEN GANZEN WEG GEHEN.
 *
 * Keine von Hand gebaute `StoredRun`. Jede Prüfung hier lässt den echten Motor
 * laufen, bildet das Ergebnis auf Datenbankzeilen ab und liest es wieder
 * zurück — dieselben zwei Funktionen, die auch im Betrieb laufen.
 *
 * Eine erfundene Fixtur bewiese vor allem, dass diese Datei zu sich selbst
 * passt. Der Weg über die Zeilen fängt zusätzlich das, was schon einmal
 * passiert ist: dass ein Feld beim Ablegen still verlorengeht (`blocking`) und
 * niemand es merkt, bis jemand es braucht.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  evaluateEpisode,
  verdictText,
  blockedText,
  type Entry,
  type Evaluation,
} from "loadwise-engine";
import { ReportView } from "@/components/ReportView";
import { toEvaluationRow, toStoredRun, type EvaluationRow, type FlagRow, type StoredRun } from "@/lib/db/types";
import { t } from "@/i18n/dictionary";

const s = t("de").report;

/** Motorausgabe → Zeilen → zurück. Genau der Weg, den der Betrieb geht. */
function laufAus(auswertung: Evaluation, flagRowPatch: Partial<FlagRow>[] = []): StoredRun {
  const laufId = "lauf-1";
  const zeile = toEvaluationRow(auswertung, laufId, "ep1") as unknown as EvaluationRow;
  const flagRows: FlagRow[] = auswertung.flags.map((f, i) => ({
    id: `f${i}`,
    evaluation_id: laufId,
    episode_id: "ep1",
    computed_at: "2026-08-21T09:00:00Z",
    kind: f.kind,
    for_date: f.forDate,
    severity: f.severity,
    reason: f.reason,
    detail: f.detail,
    rule_version: f.ruleVersion,
    profile_version: f.profileVersion,
    ...(flagRowPatch[i] ?? {}),
  }));

  const run = toStoredRun({ ...zeile, computed_at: "2026-08-21T09:00:00Z" }, flagRows);
  if (run === null) throw new Error("toStoredRun hat null geliefert — Fixtur kaputt");
  return run;
}

function tage(anzahl: number, bau: (i: number) => Partial<Entry> = () => ({})): Entry[] {
  return Array.from({ length: anzahl }, (_, i) => ({
    date: `2026-08-${String(i + 1).padStart(2, "0")}`,
    morningScore: 2,
    sessions: [],
    ...bau(i),
  }));
}

const kontext = { bodyRegion: "achilles" as const, profileKey: "achilles_midportion" };

/** Sieben Tage: der Motor hat zu wenig und sagt das. */
const duenn = () => evaluateEpisode({ entries: tage(7), context: kontext });

/** Ein Rückfall spät im Verlauf. Alle Befunde beschreiben den heutigen Stand. */
const mitVerlauf = () =>
  evaluateEpisode({
    entries: tage(20, (i) => ({
      morningScore: i < 18 ? 2 : 7,
      sessions: i === 17 ? [{ activityKind: "run", durationMin: 90, rpe: 9 }] : [],
    })),
    context: kontext,
  });

/**
 * Sechzig Tage mit einem Rückfall in der Mitte — und danach geht es weiter.
 *
 * -------------------------------------------------------------------------
 * DIESE FIXTUR IST DER GANZE ABSCHNITT »FRÜHER IM VERLAUF«.
 *
 * `mitVerlauf` hat sie zuerst mitgeprüft und konnte es nicht: Der Rückfall
 * liegt dort zwei Tage vor dem Ende, also innerhalb des Fensters, mit dem der
 * Motor »aktuell« bestimmt (`config.baseline.windowDays`, 14). Es gab schlicht
 * keinen zurückliegenden Befund, und den Abschnitt zu entfernen änderte nichts
 * am gerenderten Text.
 *
 * Aufgefallen ist das, als die Mutation »zurückliegende Befunde werden
 * weggeworfen« als einzige von fünf überlebte.
 *
 * Der Rückfall muss also **nach** dem 14. Tag liegen, damit es überhaupt eine
 * Ausgangslinie gibt, und **mehr als 14 Tage vor dem Ende**, damit er
 * zurückfällt. Tag 25 von 60 erfüllt beides — und liefert obendrein genau den
 * Fall, für den die Trennung gebaut wurde: ein beurteiltes Gesamtbild MIT
 * einem roten Tag in der Vorgeschichte.
 * -------------------------------------------------------------------------
 */
const langerVerlauf = () =>
  evaluateEpisode({
    entries: Array.from({ length: 60 }, (_, i) => {
      const d = new Date(2026, 5, 1 + i);
      const datum = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
      const spitze = i === 25;
      return {
        date: datum,
        morningScore: i === 26 ? 8 : 2,
        sessions:
          spitze || i % 4 === 0
            ? [{ activityKind: "run" as const, durationMin: spitze ? 110 : 35, rpe: spitze ? 9 : 5 }]
            : [],
      };
    }),
    context: kontext,
  });

const zeichnen = (run: StoredRun) =>
  render(<ReportView run={run} strings={s} locale="de" />);

describe("ReportView — das Gesamtbild", () => {
  it("sagt bei sieben Einträgen NICHT, dass alles in Ordnung ist", () => {
    // ---------------------------------------------------------------------
    // DIE WICHTIGSTE PRÜFUNG DIESES MODULS.
    //
    // »Abdeckung begrenzt die Entwarnung, nie die Warnung« ist der oberste
    // Grundsatz des Motors. Sieben Tage reichen ihm nicht, und was dann auf dem
    // Bildschirm steht, muss eine EIGENE Antwort sein — nicht ein schwaches
    // Grün. Eine Durchsicht hat genau diesen Fehler in einer früheren Fassung
    // gefunden.
    //
    // Diese Bedingung stand ursprünglich auf Karte 2.0 und war dort nicht
    // erfüllbar: Sie nennt eine Ansicht, die es damals nicht gab.
    // ---------------------------------------------------------------------
    const run = duenn();
    expect(run.overall.status).toBe("insufficient");

    zeichnen(laufAus(run));

    expect(screen.getByText(s.stateInsufficient)).toBeDefined();
    expect(screen.queryByText(s.stateGreen)).toBeNull();
  });

  it("und benutzt dafür nicht die Farbe einer Entwarnung", () => {
    zeichnen(laufAus(duenn()));
    const zustand = screen.getByText(s.stateInsufficient);
    // `--unjudged` ist als »die Farbe, die nie nach Grün aussehen darf«
    // angelegt. Hier bekommt sie ihren Einsatz.
    expect(zustand.style.color).toBe("var(--unjudged)");
    expect(zustand.style.color).not.toBe("var(--green)");
  });

  it("ein beurteilter Lauf zeigt seine Schwere", () => {
    // Gegenprobe: Eine Ansicht, die IMMER »nicht genug beurteilt« zeigt,
    // bestünde beide Prüfungen darüber mühelos.
    const run = mitVerlauf();
    expect(run.overall.status).toBe("judged");
    zeichnen(laufAus(run));
    expect(screen.queryByText(s.stateInsufficient)).toBeNull();
  });

  it("nennt die Abdeckung in Zahlen", () => {
    const run = duenn();
    zeichnen(laufAus(run));
    const erwartet = run.coverage.judgedDays + run.coverage.blockedDays;
    expect(
      screen.getByText(
        new RegExp(`${run.coverage.judgedDays}\\D+${erwartet}\\D+${run.coverage.rulesReporting}`),
      ),
    ).toBeDefined();
  });

  it("und lässt keinen Platzhalter stehen", () => {
    // `fill` ersetzt `{judged}` und Geschwister. Bleibt einer stehen, steht er
    // so auf dem Bildschirm — sichtbar, aber leicht zu übersehen.
    const { container } = zeichnen(laufAus(duenn()));
    expect(container.textContent).not.toMatch(/\{\w+\}/);
  });
});

describe("ReportView — Auffälligkeiten und Vorgeschichte", () => {
  it("trennt, was heute gilt, von dem, was zurückliegt", () => {
    // Ohne die Trennung stand im Konsolenbericht einmal »Gesamtbild: green«
    // direkt über vier STOP-Zeilen. Beides wahr, zusammen ein Widerspruch, der
    // mehr Vertrauen kostet als der Befund wert war.
    const auswertung = langerVerlauf();
    expect(auswertung.overall.status).toBe("judged");

    zeichnen(laufAus(auswertung));
    expect(screen.getByText(s.currentHeading)).toBeDefined();
    expect(screen.getByText(s.earlierHeading)).toBeDefined();
    // Der Satz daneben ist Teil der Zusicherung: Ohne ihn liest sich eine
    // zweite Liste roter Zeilen wie ein zweiter Befund.
    expect(screen.getByText(s.earlierHint)).toBeDefined();
  });

  it("und zeigt keine Vorgeschichte, wo es keine gibt", () => {
    // Gegenprobe: Eine Ansicht, die den Abschnitt immer aufmacht, stellte
    // jemandem eine leere Überschrift »Früher im Verlauf« hin.
    zeichnen(laufAus(mitVerlauf()));
    expect(screen.queryByText(s.earlierHeading)).toBeNull();
  });

  it("wirft keinen Befund weg", () => {
    // Zu entscheiden, dass ein alter roter Tag nicht mehr den heutigen Stand
    // setzt, ist ein Urteil über ein Wort. Ihn aus dem Protokoll zu tilgen wäre
    // das Löschen von Beweisen. Also: Jeder nicht-grüne Befund des Laufs steht
    // irgendwo auf der Seite — vorne oder hinten, aber er steht da.
    const auswertung = langerVerlauf();
    const { container } = zeichnen(laufAus(auswertung));

    const nichtGruen = auswertung.flags.filter((f) => f.severity !== "green");
    expect(nichtGruen.length).toBeGreaterThan(0);
    for (const f of nichtGruen) {
      expect(container.textContent, `${f.kind} ${f.forDate} fehlt`).toContain(f.forDate);
    }
  });

  it("und nimmt die Urteilssätze aus dem Motor", () => {
    // Nie eine Zeichenkette aus dem Wörterbuch der App: Die Sätze in
    // `wording.ts` stehen unter drei Sperrlisten, eine Kopie hier stünde
    // ausserhalb davon. check:boundary hält das fest — dieser Test hält fest,
    // dass der Satz überhaupt ankommt.
    const auswertung = mitVerlauf();
    const { container } = zeichnen(laufAus(auswertung));
    const einer = auswertung.flags.find((f) => f.severity !== "green");
    expect(einer).toBeDefined();
    expect(container.textContent).toContain(verdictText(einer!.reason, "de"));
  });
});

describe("ReportView — warum es keine Entwarnung gab", () => {
  it("zeigt auch die Gründe, die zu keiner Regel gehören", () => {
    // Ein Schmerzmittel in den betrachteten Tagen gehört zu keiner der sieben
    // Regeln und hält die Entwarnung trotzdem zurück. Genau diese Gründe
    // standen einmal nur in `overall.blocking` — gesetzt und nie gezeigt.
    const auswertung = evaluateEpisode({
      entries: tage(20, (i) => ({
        sessions: i % 3 === 0 ? [{ activityKind: "run", durationMin: 40, rpe: 5 }] : [],
        painMedication: i > 17,
      })),
      context: kontext,
    });
    const gruende = auswertung.overall.status === "insufficient" ? auswertung.overall.blocking : [];
    expect(gruende).toContain("medication-in-window");

    const { container } = zeichnen(laufAus(auswertung));
    expect(container.textContent).toContain(blockedText("medication-in-window", "de"));
  });
});

describe("ReportView — was nicht mehr lesbar ist", () => {
  it("verschweigt nicht, wie viele Befunde fehlen", () => {
    // Eine Flag aus einer Fassung, die es nicht mehr gibt, kann diese Ansicht
    // nicht darstellen — ohne Regelnamen und Urteilssatz wäre sie eine Zeile,
    // die niemand lesen kann. Sie still wegzulassen hiesse aber, weniger
    // Befunde zu zeigen, als der Lauf hatte, ohne dass es jemand sieht.
    const auswertung = mitVerlauf();
    const run = laufAus(auswertung, [{ kind: "gibt_es_nicht_mehr" }]);

    expect(run.unreadableFlags).toBe(1);
    expect(run.flags.length).toBe(auswertung.flags.length - 1);

    const { container } = zeichnen(run);
    expect(container.textContent).toContain(s.unreadableOne);
  });

  it("und sagt nichts, wenn alle lesbar sind", () => {
    // Gegenprobe: Eine Ansicht, die den Satz immer zeigt, behauptete bei jedem
    // Lauf, es fehle etwas.
    const run = laufAus(mitVerlauf());
    expect(run.unreadableFlags).toBe(0);
    const { container } = zeichnen(run);
    expect(container.textContent).not.toContain(s.unreadableOne);
    expect(container.textContent).not.toContain(s.unreadableMany.slice(s.unreadableMany.indexOf(" ")));
  });
});
