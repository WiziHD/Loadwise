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
  profileByKey,
  verdictText,
  blockedText,
  evidenceText,
  problemText,
  DISCLAIMER,
  type Entry,
  type Evaluation,
  type RedFlag,
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

/**
 * Die Warnzeichen kommen als eigene Eigenschaft herein, nicht aus dem Lauf.
 *
 * Nach einem Profilwechsel trägt der gespeicherte Lauf die Urteile unter dem
 * alten Massstab; die Warnzeichen sind aber keine Urteile, sondern eine Aussage
 * über die Verletzung, die jemand HEUTE hat. Deshalb reicht die Seite sie aus
 * dem aktuellen Profil hinein.
 */
const WARNZEICHEN = profileByKey("achilles_midportion")!.redFlags;

const zeichnen = (run: StoredRun, warnzeichen: RedFlag[] = WARNZEICHEN, behind = false) =>
  render(
    <ReportView
      run={run}
      redFlags={warnzeichen}
      behind={behind}
      strings={s}
      mainStrings={t("de").main}
      locale="de"
    />,
  );

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

/**
 * Ein Verlauf mit Besserung, einem roten Tag in der Mitte — und Schmerzmitteln
 * am Ende.
 *
 * ---------------------------------------------------------------------------
 * DIESE FIXTUR IST DIE EINZIGE, DIE DIE ASYMMETRIE PRÜFEN KANN.
 *
 * »Abdeckung begrenzt die Entwarnung, nie die Warnung.« Beim Bau von Karte 2.4
 * stellte sich heraus, dass die naheliegende Prüfung — ein AKTUELLER Befund bei
 * »nicht genug beurteilt« — gar nicht konstruierbar ist: `evaluateEpisode`
 * schliesst kurz, `if (worst !== "green") return { status: "judged", ... }`
 * steht VOR dem Abdeckungstor. Ein aktueller Befund erzwingt also immer
 * `judged`. Die Zusicherung ist eine Ebene tiefer garantiert.
 *
 * Was sehr wohl zusammentrifft — und was die Ansicht falsch machen KANN:
 * **ein zurückliegender Befund bei dünner aktueller Datenlage.** `worst` wird
 * nur über die aktuellen Flags gebildet; ein roter Tag von vor fünf Wochen
 * hält `insufficient` nicht auf.
 *
 * Genau diesen Fall baut die Fixtur: Besserung (damit die Stagnationsregel
 * schweigt), gleichmässige Belastung (damit die Lastverteilung schweigt), eine
 * Spitze an Tag 25 (der rote Tag) und Schmerzmittel ab Tag 50 (die Entwarnung
 * wird verweigert).
 *
 * Das Gegenstück `mitBesserungOhneMedikament` ist dieselbe Fixtur ohne die
 * Schmerzmittel. Der einzige Unterschied zwischen beiden ist die ENTWARNUNG —
 * der rote Tag steht in beiden. Ohne dieses Paar liesse sich nicht zeigen,
 * dass die Ansicht die Warnung nicht an die Abdeckung koppelt.
 * ---------------------------------------------------------------------------
 */
function mitBesserung(medikamenteAb: number | null) {
  return evaluateEpisode({
    entries: Array.from({ length: 60 }, (_, i) => {
      const d = new Date(2026, 5, 1 + i);
      const datum = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
      const grund = Math.max(1, 6 - Math.floor(i / 10));
      return {
        date: datum,
        morningScore: i === 26 ? Math.min(10, grund + 6) : grund,
        sessions:
          i === 25
            ? [{ activityKind: "run" as const, durationMin: 110, rpe: 9 }]
            : [{ activityKind: "walk" as const, durationMin: 30, rpe: 3 }],
        ...(medikamenteAb !== null && i >= medikamenteAb ? { painMedication: true } : {}),
      };
    }),
    context: kontext,
  });
}

describe("ReportView — Abdeckung begrenzt die Entwarnung, nie die Warnung", () => {
  it("zeigt einen zurückliegenden Befund auch dann, wenn nichts beurteilt werden konnte", () => {
    const auswertung = mitBesserung(50);
    expect(auswertung.overall.status).toBe("insufficient");

    const roter = auswertung.flags.find((f) => f.severity === "red");
    expect(roter, "Fixtur ohne roten Tag prüft nichts").toBeDefined();

    const { container } = zeichnen(laufAus(auswertung));

    // Der Zustand sagt »nicht genug beurteilt« UND der rote Tag steht da.
    // Ihn zu verstecken, weil die Abdeckung dünn ist, hiesse die Asymmetrie
    // umzudrehen: ein echtes Signal verschwiegen, um eine Nicht-Aussage
    // aufzuräumen.
    expect(screen.getByText(s.stateInsufficient)).toBeDefined();
    expect(container.textContent).toContain(roter!.forDate);
    expect(container.textContent).toContain(verdictText(roter!.reason, "de"));
  });

  it("und dieselben Tage ohne Schmerzmittel werden beurteilt — der rote Tag bleibt", () => {
    // Das Gegenstück. Einziger Unterschied: keine Schmerzmittel. Der Zustand
    // kippt auf »beurteilt«, der Befund bleibt unverändert stehen.
    //
    // Ohne diese Prüfung liesse sich die obige mit einer Ansicht bestehen, die
    // Befunde IMMER zeigt und den Zustand nie unterscheidet.
    const auswertung = mitBesserung(null);
    expect(auswertung.overall.status).toBe("judged");

    const roter = auswertung.flags.find((f) => f.severity === "red");
    expect(roter).toBeDefined();

    const { container } = zeichnen(laufAus(auswertung));
    expect(screen.queryByText(s.stateInsufficient)).toBeNull();
    expect(container.textContent).toContain(roter!.forDate);
  });
});

describe("ReportView — der Zustand hat eine eigene Form", () => {
  it("»nicht genug beurteilt« steht in einem abgesetzten Rahmen", () => {
    // Grün, Bernstein und Rot sind eine Skala; »nicht genug beurteilt«
    // beantwortet die Frage gar nicht. Eine vierte Farbe auf derselben Skala
    // liest sich als vierte Stufe — so ist der Zustand einmal zu blassem Grün
    // geworden. Die Form ist der Unterschied, der keine Farbfrage ist.
    const kasten = zeichnen(laufAus(mitBesserung(50))).container.querySelector(
      '[data-overall="insufficient"]',
    ) as HTMLElement | null;
    expect(kasten).not.toBeNull();
    expect(kasten!.style.border).toContain("dashed");
  });

  it("ein Urteil steht ohne Rahmen da", () => {
    // Gegenprobe, und sie prüft die FORM, nicht das Vorhandensein eines
    // Elements. Zuerst stand hier `querySelector("[data-unjudged]")` — und eine
    // Mutation, die JEDEM Zustand den gestrichelten Rahmen gibt, überlebte,
    // weil das Attribut davon unberührt blieb. Der Kasten steht jetzt immer,
    // damit beide Richtungen an derselben Eigenschaft hängen.
    const kasten = zeichnen(laufAus(mitBesserung(null))).container.querySelector(
      '[data-overall="judged"]',
    ) as HTMLElement | null;
    expect(kasten).not.toBeNull();
    expect(kasten!.style.border).not.toContain("dashed");
  });
});

describe("ReportView — was keine Kür ist", () => {
  it("trägt den Disclaimer, wörtlich aus dem Motor", () => {
    // -----------------------------------------------------------------------
    // DIESER EINE SATZ SAGT, WAS DIESES PRODUKT IST.
    //
    // Er spricht die Zweckbestimmung aus, und die Zweckbestimmung entscheidet,
    // ob dies ein Medizinprodukt nach MepV und MDR ist. Deshalb wörtlich aus
    // `wording.ts` und nie aus dem Wörterbuch der App — eine Kopie dort stünde
    // ausserhalb der drei Sperrlisten.
    // -----------------------------------------------------------------------
    const { container } = zeichnen(laufAus(mitVerlauf()));
    expect(container.textContent).toContain(DISCLAIMER.de);
  });

  it("und zwar auch dann, wenn der Motor GAR nichts hat", () => {
    // Die Gegenprobe zur Zeile darüber, und sie ist die wichtigere: Ein
    // Disclaimer, der nur bei einem Befund erscheint, fehlt genau dort, wo die
    // App am wenigsten weiss.
    //
    // Hier stand zuerst `duenn()` — sieben Tage. Das reicht dem Motor nicht für
    // ein Urteil, ABER er erzeugt dabei trotzdem ein grünes Flag, und die
    // Mutation »Disclaimer nur bei Befunden« überlebte damit unbemerkt.
    //
    // Ein leeres Tagebuch ist der einzige Lauf ohne jedes Flag. Die
    // ausdrückliche Zusicherung darunter hält das fest, damit die Prüfung nicht
    // beim nächsten Motorwechsel wieder leerläuft.
    const leer = evaluateEpisode({ entries: [] });
    expect(leer.flags).toHaveLength(0);

    const { container } = zeichnen(laufAus(leer));
    expect(container.textContent).toContain(DISCLAIMER.de);
  });

  it("zeigt die Warnzeichen des Profils", () => {
    // Gleichzeitig Sicherheit und Glaubwürdigkeit: Ein Werkzeug, das seine
    // eigenen Grenzen benennt, wird für den Rest ernster genommen.
    const { container } = zeichnen(laufAus(mitVerlauf()));
    expect(WARNZEICHEN.length).toBeGreaterThan(0);
    for (const flag of WARNZEICHEN) {
      expect(container.textContent, `Warnzeichen ${flag.key} fehlt`).toContain(flag.text.de);
    }
  });

  it("und schweigt, wo ein Profil keine hat", () => {
    // Gegenprobe: Eine Überschrift ohne Liste darunter wäre schlechter als
    // keine — sie verspricht etwas, das nicht kommt.
    zeichnen(laufAus(mitVerlauf()), []);
    expect(screen.queryByText(s.redFlagsHeading)).toBeNull();
  });
});

describe("ReportView — Eingabefehler werden nicht verschluckt", () => {
  /** Ein Lauf, dessen Eingabe Fundstellen hatte. */
  function mitEingabefehlern() {
    const run = laufAus(mitVerlauf());
    return {
      ...run,
      problems: [
        { code: "morning-out-of-range" as const, date: "2026-08-03", field: "morningScore", message: "x" },
        { code: "duplicate-date" as const, date: "2026-08-09", field: "date", message: "y" },
      ],
    };
  }

  it("sagt, wie viele Tage betroffen sind, und welche", () => {
    const { container } = zeichnen(mitEingabefehlern());
    expect(screen.getByText(s.problemsHeading)).toBeDefined();
    expect(container.textContent).toContain("2026-08-03");
    expect(container.textContent).toContain("2026-08-09");
  });

  it("und sagt zu jedem Fund, WAS nicht gelesen werden konnte", () => {
    // -------------------------------------------------------------------
    // BIS KARTE 2.7 STANDEN HIER NUR DIE TAGE.
    //
    // Der Grund war gut: `Problem.message` ist die technische Spur mit
    // Zeilennummer und Rohwert, teils englische Entwicklerprosa. Wer sie einer
    // lesenden Person hinstellt, hat ihr nicht geholfen.
    //
    // `problemText` gibt es jetzt — aus dem Motor, unter denselben drei
    // Sperrlisten wie jedes Urteil. Nie eine Zeichenkette aus dem Wörterbuch
    // der App: Der natürliche Satz für einen zu hohen Morgenwert wäre »trag
    // einen Wert zwischen 0 und 10 ein«, und das ist eine Anweisung.
    // -------------------------------------------------------------------
    const { container } = zeichnen(mitEingabefehlern());
    expect(container.textContent).toContain(problemText("morning-out-of-range", "de"));
    expect(container.textContent).toContain(problemText("duplicate-date", "de"));
  });

  it("und zeigt denselben Fund nicht fünfmal", () => {
    // Fünf Tage mit demselben Problem sind ein Satz mit fünf Daten. Fünfmal
    // derselbe Satz wäre eine Wand, in der die zweite Sorte Fund untergeht.
    const run = laufAus(mitVerlauf());
    const mitWiederholung: StoredRun = {
      ...run,
      problems: ["2026-08-03", "2026-08-04", "2026-08-05"].map((date) => ({
        code: "morning-out-of-range" as const,
        date,
        field: "morningScore",
        message: "x",
      })),
    };

    const { container } = zeichnen(mitWiederholung);
    const satz = problemText("morning-out-of-range", "de");
    const vorkommen = (container.textContent ?? "").split(satz).length - 1;
    expect(vorkommen).toBe(1);

    // Die drei Tage stehen trotzdem alle da.
    for (const tag of ["2026-08-03", "2026-08-04", "2026-08-05"]) {
      expect(container.textContent).toContain(tag);
    }
  });

  it("und sagt, dass die Urteile darauf stehen", () => {
    // Der Satz, auf den es ankommt. Die Zahl allein wäre eine Auskunft ohne
    // Folge; erst dieser Satz sagt, was sie für alles darüber bedeutet.
    zeichnen(mitEingabefehlern());
    expect(screen.getByText(s.problemsHint)).toBeDefined();
  });

  it("ein Lauf ohne Fundstellen sagt dazu nichts", () => {
    // Gegenprobe: Ein Abschnitt, der immer da ist, behauptete bei jedem Lauf,
    // es hätte Eingabefehler gegeben.
    const run = laufAus(mitVerlauf());
    expect(run.problems).toHaveLength(0);
    zeichnen(run);
    expect(screen.queryByText(s.problemsHeading)).toBeNull();
  });
});

describe("ReportView — der Beweis unter dem Satz", () => {
  it("zeigt zu jedem Befund die Zahlen dahinter", () => {
    // ---------------------------------------------------------------------
    // E7 NENNT DEN HAUPTBILDSCHIRM »EIN SATZ MIT SEINEM BEWEIS«.
    //
    // Bis Karte 2.6 hatte der Bericht nur den Satz. Die Zahlen standen in
    // `report.ts` — auf Deutsch, in einer Konsolenausgabe, für die App
    // unerreichbar, weil `check:boundary` das Kopieren zu Recht verbietet.
    // ---------------------------------------------------------------------
    const auswertung = mitVerlauf();
    const { container } = zeichnen(laufAus(auswertung));

    const nichtGruen = auswertung.flags.filter((f) => f.severity !== "green");
    expect(nichtGruen.length).toBeGreaterThan(0);
    for (const f of nichtGruen) {
      expect(
        container.textContent,
        `Beleg für ${f.kind} fehlt`,
      ).toContain(evidenceText(f, auswertung.config, "de"));
    }
  });

  it("und rechnet dabei gegen die Schwellen des gespeicherten Laufs", () => {
    // Der Beleg muss gegen dieselben Zahlen erklären, nach denen geurteilt
    // wurde. Dafür trägt jede Auswertung ihre eigene `config` mit sich
    // (Migration 0007). Diese Prüfung hält fest, dass die Ansicht sie auch
    // benutzt statt die heutige Voreinstellung zu nehmen: Ein Lauf mit
    // verschobenem Drift-Fenster muss die verschobene Zahl zeigen.
    // Der Langzeitverlauf, nicht der Ausgangswert — und die Wahl ist der halbe
    // Test.
    //
    // Zuerst stand hier `baseline_drift`. Den Befund GIBT es in dieser Fixtur,
    // aber er ist GRÜN, und grüne Befunde rendert die Ansicht nicht: In
    // »Auffälligkeiten« steht nur, was nicht grün ist. Die Zusicherung konnte
    // also nie zutreffen.
    //
    // `stagnation` liest `config.stagnation.windowDays` genauso und ist hier
    // bernsteinfarben, steht also auf dem Bildschirm.
    const auswertung = langerVerlauf();
    const run = laufAus(auswertung);
    const verschoben: StoredRun = {
      ...run,
      config: { ...run.config, stagnation: { ...run.config.stagnation, windowDays: 21 } },
    };

    // Kein Frühausstieg: Ein Test, der sich selbst überspringen darf, prüft
    // eines Tages nichts mehr, ohne dass jemand es sieht.
    const langzeit = run.flags.find((f) => f.kind === "stagnation" && f.severity !== "green");
    expect(
      langzeit,
      "Fixtur ohne sichtbaren Langzeitbefund — dann prüft diese Zeile nichts",
    ).toBeDefined();

    const { container } = zeichnen(verschoben);

    // Der GANZE Belegsatz, nicht die Ziffernfolge »21«.
    //
    // Zuerst stand hier `toContain("21")` — und die Mutation, die dem Bauteil
    // eine fremde Konfiguration unterschiebt, überlebte: »21« steht auch in
    // einem Datum wie 2026-06-21. Eine Zusicherung, die zufällig anderswo
    // erfüllt wird, prüft nichts.
    const erwartet = evidenceText(langzeit!, verschoben.config, "de");
    expect(erwartet).toContain("21 Tage");
    expect(container.textContent).toContain(erwartet);
  });

  it("die Zahlen stehen in deutscher Schreibweise", () => {
    // Der Konsolenbericht war hier mit sich selbst uneinig: »Verhältnis 1.41«
    // neben »effektiv 3,2 Trainingstage«. In einer Konsole fiel das nicht auf;
    // hier ist es das, was jemand sieht.
    const auswertung = mitVerlauf();
    const { container } = zeichnen(laufAus(auswertung));
    const text = container.textContent ?? "";
    // Ein Dezimalpunkt zwischen Ziffern hat hier nichts verloren. Datumsangaben
    // benutzen Bindestriche, sind also nicht betroffen.
    expect(text).not.toMatch(/\d\.\d\d(?!\d)/);
  });
});
