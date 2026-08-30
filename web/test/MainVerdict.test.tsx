/**
 * Der Hauptbildschirm — ein Ort, drei Inhalte.
 *
 * ---------------------------------------------------------------------------
 * DIE REIHENFOLGE IST DIE ZUSICHERUNG, NICHT DAS AUSSEHEN.
 *
 * Befund verdrängt Genesung, Genesung verdrängt den Spiegel. Nie umgekehrt und
 * nie beides gross. Stünde »seit sechs Wochen besser« neben »gestern deutlich
 * stärker als sonst«, müsste die lesende Person entscheiden, was gilt — und
 * genau diese Entscheidung nimmt ihr der Motor mit derselben Asymmetrie ab.
 *
 * Deshalb ist `mainState` eine eigene, exportierte Funktion: Die Reihenfolge
 * lässt sich ohne Bildschirm befragen.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  evaluateEpisode,
  isRecovery,
  verdictText,
  DISCLAIMER,
  type Entry,
  type Evaluation,
} from "loadwise-engine";
import { MainVerdict, mainState } from "@/components/MainVerdict";
import { coursePoints } from "@/lib/course-points";
import { buildIndex } from "loadwise-engine";
import {
  toEvaluationRow,
  toStoredRun,
  type EvaluationRow,
  type FlagRow,
  type StoredRun,
} from "@/lib/db/types";
import { t } from "@/i18n/dictionary";

const s = t("de").main;
const kontext = { bodyRegion: "achilles" as const, profileKey: "achilles_midportion" };

/** Motorausgabe → Zeilen → zurück, wie im Betrieb. */
function laufAus(auswertung: Evaluation): StoredRun {
  const zeile = toEvaluationRow(auswertung, "lauf-1", "ep1") as unknown as EvaluationRow;
  const flagRows: FlagRow[] = auswertung.flags.map((f, i) => ({
    id: `f${i}`,
    evaluation_id: "lauf-1",
    episode_id: "ep1",
    computed_at: "2026-08-21T09:00:00Z",
    kind: f.kind,
    for_date: f.forDate,
    severity: f.severity,
    reason: f.reason,
    detail: f.detail,
    rule_version: f.ruleVersion,
    profile_version: f.profileVersion,
  }));
  const run = toStoredRun({ ...zeile, computed_at: "2026-08-21T09:00:00Z" }, flagRows);
  if (run === null) throw new Error("Fixtur kaputt");
  return run;
}

function datum(i: number): string {
  const d = new Date(2026, 5, 1 + i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ein Rückfall ganz am Ende — es gibt einen aktuellen Befund. */
const mitBefund = (): Evaluation =>
  evaluateEpisode({
    entries: Array.from({ length: 30 }, (_, i) => ({
      date: datum(i),
      morningScore: i === 28 ? 8 : 2,
      sessions:
        i === 27
          ? [{ activityKind: "run" as const, durationMin: 110, rpe: 9 }]
          : i % 4 === 0
            ? [{ activityKind: "run" as const, durationMin: 35, rpe: 5 }]
            : [],
    })),
    context: kontext,
  });

/**
 * Ein Verlauf, der besser wird und keinen aktuellen Befund trägt.
 *
 * Der Morgenwert sinkt über die Wochen — daraus entsteht
 * `progress-since-start`, eine der drei Genesungsaussagen, die ohne Selbsttests
 * auskommen.
 */
const mitGenesung = (): Evaluation =>
  evaluateEpisode({
    entries: Array.from({ length: 60 }, (_, i) => ({
      date: datum(i),
      morningScore: Math.max(1, 6 - Math.floor(i / 10)),
      sessions: [{ activityKind: "walk" as const, durationMin: 30, rpe: 3 }],
    })),
    context: kontext,
  });

/** Fünf Tage: der Motor hat zu wenig für alles. */
const zuFrueh = (): Evaluation =>
  evaluateEpisode({
    entries: Array.from({ length: 5 }, (_, i) => ({
      date: datum(i),
      morningScore: [2, 4, 5, 5, 7][i] ?? 2,
      sessions: [],
    })),
    context: kontext,
  });

function punkteVon(auswertung: Evaluation, entries: Entry[]) {
  return coursePoints(buildIndex(entries, kontext), auswertung.lastDate);
}

const zeichnen = (auswertung: Evaluation, entries: Entry[]) =>
  render(
    <MainVerdict
      run={laufAus(auswertung)}
      points={punkteVon(auswertung, entries)}
      strings={s}
      locale="de"
    />,
  );

/**
 * Die Einträge zu einer Fixtur, noch einmal.
 *
 * Die Auswertung nimmt sie nicht mit heraus — `Evaluation` trägt Urteile, nicht
 * die Rohdaten. Für die Kurve braucht es beides, und beides zweimal zu bauen
 * ist die kleinere Übel gegenüber einer Fixtur, die eine dritte Sache
 * zurückgibt.
 */
const tageVon = (n: number, bau: (i: number) => Partial<Entry>): Entry[] =>
  Array.from({ length: n }, (_, i) => ({ date: datum(i), morningScore: 2, sessions: [], ...bau(i) }));

describe("mainState — Warnung geht vor Ermutigung", () => {
  it("ein aktueller Befund gewinnt", () => {
    const run = laufAus(mitBefund());
    const zustand = mainState(run);
    expect(zustand.kind).toBe("finding");
    if (zustand.kind === "finding") expect(zustand.flag.severity).not.toBe("green");
  });

  it("ohne Befund kommt die Genesung", () => {
    const auswertung = mitGenesung();
    const zustand = mainState(laufAus(auswertung));
    expect(zustand.kind).toBe("recovery");
    if (zustand.kind === "recovery") {
      // Und zwar ein Urteil, das der Motor als Genesung führt — nicht das
      // blosse Ausbleiben eines Befunds.
      expect(isRecovery(zustand.flag.reason)).toBe(true);
    }
  });

  it("und ohne beides der Spiegel", () => {
    expect(mainState(laufAus(zuFrueh())).kind).toBe("mirror");
  });

  it("bei mehreren Befunden gewinnt der schwerste", () => {
    const run = laufAus(mitBefund());
    const zustand = mainState(run);
    if (zustand.kind !== "finding") throw new Error("kein Befund");

    // Kein anderer aktueller Befund darf schwerer sein. Ohne diese Zeile könnte
    // der Bildschirm bei einem roten und einem bernsteinfarbenen Tag den
    // bernsteinfarbenen zeigen.
    const rang = { green: 0, amber: 1, red: 2 } as const;
    for (const f of run.flags) {
      if (f.severity === "green") continue;
      expect(rang[f.severity]).toBeLessThanOrEqual(rang[zustand.flag.severity]);
    }
  });
});

describe("MainVerdict — der Satz und sein Beweis", () => {
  it("zeigt den Urteilssatz aus dem Motor, nicht einen eigenen", () => {
    const auswertung = mitBefund();
    const zustand = mainState(laufAus(auswertung));
    if (zustand.kind !== "finding") throw new Error("kein Befund");

    const { container } = zeichnen(auswertung, tageVon(30, () => ({})));
    expect(container.textContent).toContain(verdictText(zustand.flag.reason, "de"));
  });

  it("und trägt die Zweckbestimmung", () => {
    const auswertung = mitBefund();
    const { container } = zeichnen(auswertung, tageVon(30, () => ({})));
    expect(container.textContent).toContain(DISCLAIMER.de);
  });

  it("die Genesungszeile ist grün, nie bernstein oder rot", () => {
    const auswertung = mitGenesung();
    const zustand = mainState(laufAus(auswertung));
    if (zustand.kind !== "recovery") throw new Error("keine Genesung");

    zeichnen(auswertung, tageVon(60, () => ({})));
    const zeile = screen.getByText(verdictText(zustand.flag.reason, "de"));
    expect(zeile.style.color).toBe("var(--green)");
  });
});

describe("MainVerdict — der Spiegel deutet nicht", () => {
  const auswertung = zuFrueh();
  const eintraege = tageVon(5, (i) => ({ morningScore: [2, 4, 5, 5, 7][i] ?? 2 }));

  it("gibt die eigenen Zahlen zurück", () => {
    const { container } = zeichnen(auswertung, eintraege);
    expect(container.textContent).toContain("2 · 4 · 5 · 5 · 7");
  });

  it("ohne Pfeil, ohne Richtungswort", () => {
    // ---------------------------------------------------------------------
    // E10, BEDINGUNG 1: KEINE DEUTUNG, IN KEINER FORM.
    //
    // Ein »↑« wäre eine Behauptung über einen Trend aus fünf Punkten — genau
    // das, was der Motor über eine Regel verweigert. Wer das Zeichen
    // hinzufügt, hat die achte Regel gebaut, nur ohne Test.
    // ---------------------------------------------------------------------
    const { container } = zeichnen(auswertung, eintraege);
    const text = container.textContent ?? "";
    for (const verboten of ["↑", "↓", "→", "steigend", "fallend", "besser", "schlechter"]) {
      expect(text, `»${verboten}« im Spiegel`).not.toContain(verboten);
    }
  });

  it("und benutzt nicht die Farben der Urteile", () => {
    const { container } = zeichnen(auswertung, eintraege);
    const farbig = [...container.querySelectorAll<HTMLElement>("[style*='color']")];
    for (const el of farbig) {
      for (const urteilsfarbe of ["var(--green)", "var(--amber)", "var(--red)"]) {
        expect(el.style.color, `Urteilsfarbe im Spiegel: ${el.textContent?.slice(0, 40)}`).not.toBe(
          urteilsfarbe,
        );
      }
    }
  });

  it("die Balken zeigen, wie nah der Motor am Sprechen ist", () => {
    // Nicht, wie fleissig jemand einträgt — das ist der Unterschied zu einem
    // Streak (E8) und der ganze Punkt. Gemessen werden die beiden Bedingungen,
    // die der Motor selbst stellt.
    const run = laufAus(auswertung);
    const { container } = zeichnen(auswertung, eintraege);
    const text = container.textContent ?? "";
    expect(text).toContain(`${run.coverage.rulesReporting} von ${run.coverage.rulesTotal}`);

    // Und die Zeile, die nichts sagt, steht nicht da.
    //
    // »0 von 0 Tagen beurteilt« war wörtlich wahr — ohne erfasste Belastung
    // erwartet die 24-Stunden-Regel keinen Tag — und las sich auf dem
    // Bildschirm wie ein Fehler. Ausgerechnet in der ersten Woche, wo es der
    // einzige Satz mit Zahlen ist.
    expect(text).not.toContain("0 von 0");
  });
});

describe("CourseCurve — Lücken bleiben Lücken", () => {
  it("zeichnet keine Linie über einen Tag ohne Eintrag", () => {
    // Eine Linie über ein Loch behauptet, der Wert sei dazwischen gleichmässig
    // gewandert. Das weiss niemand — und bei einem Tagebuch, das über Wochen
    // lückenhaft geführt wird, wäre es die häufigste Behauptung auf dem Schirm.
    const mitLuecke = tageVon(60, (i) => ({
      morningScore: Math.max(1, 6 - Math.floor(i / 10)),
      sessions: [{ activityKind: "walk" as const, durationMin: 30, rpe: 3 }],
    })).filter((_, i) => i < 20 || i > 30);

    const auswertung = evaluateEpisode({ entries: mitLuecke, context: kontext });
    const punkte = coursePoints(buildIndex(mitLuecke, kontext), auswertung.lastDate);

    // Die Lücke ist in den Punkten da …
    expect(punkte.some((p) => p.morning === null)).toBe(true);

    const { container } = render(
      <MainVerdict run={laufAus(auswertung)} points={punkte} strings={s} locale="de" />,
    );

    // … und die Kurve zerfällt dadurch in mehr als eine Strecke.
    const pfade = container.querySelectorAll("path");
    expect(pfade.length).toBeGreaterThan(1);
  });

  it("ein lückenloser Verlauf ist eine einzige Strecke", () => {
    // Gegenprobe: Eine Kurve, die IMMER zerfällt, bestünde die Prüfung darüber.
    const auswertung = mitGenesung();
    const eintraege = tageVon(60, (i) => ({
      morningScore: Math.max(1, 6 - Math.floor(i / 10)),
      sessions: [{ activityKind: "walk" as const, durationMin: 30, rpe: 3 }],
    }));
    const punkte = coursePoints(buildIndex(eintraege, kontext), auswertung.lastDate);
    expect(punkte.every((p) => p.morning !== null)).toBe(true);

    const { container } = render(
      <MainVerdict run={laufAus(auswertung)} points={punkte} strings={s} locale="de" />,
    );
    expect(container.querySelectorAll("path")).toHaveLength(1);
  });

  it("und die Kurve sagt einer Vorlesesoftware, was sie zeigt", () => {
    // Ein SVG ohne Beschreibung ist für jemanden, der die Seite vorgelesen
    // bekommt, schlicht nicht da — und mit ihm der halbe Bildschirm.
    const auswertung = mitBefund();
    zeichnen(auswertung, tageVon(30, () => ({})));
    const bild = screen.getByRole("img");
    expect(bild.getAttribute("aria-label")).toBeTruthy();
    expect(bild.getAttribute("aria-label")).not.toMatch(/\{\w+\}/);
  });
});

describe("CourseCurve — die Markierung sitzt auf dem Tag, um den es geht", () => {
  it("markiert genau den Tag des Befunds", () => {
    // ---------------------------------------------------------------------
    // E7: »Das Auge geht Satz → Markierung → ah, dort.«
    //
    // Ohne die Markierung wäre die Kurve ein Bild neben einem Satz, und die
    // lesende Person müsste selbst suchen, welcher Tag gemeint ist. Genau
    // diese Suche ist der Unterschied zwischen einem Beweis und einer
    // Dekoration.
    // ---------------------------------------------------------------------
    const auswertung = mitBefund();
    const zustand = mainState(laufAus(auswertung));
    if (zustand.kind !== "finding") throw new Error("kein Befund");

    const eintraege = tageVon(30, (i) => ({ morningScore: i === 28 ? 8 : 2 }));
    const punkte = punkteVon(auswertung, eintraege);
    const { container } = zeichnen(auswertung, eintraege);

    const linie = container.querySelector("line");
    expect(linie, "keine Markierung gezeichnet").not.toBeNull();

    const index = punkte.findIndex((p) => p.date === zustand.flag.forDate);
    expect(index, "der Befundtag liegt gar nicht im gezeichneten Bereich").toBeGreaterThanOrEqual(0);

    // ---------------------------------------------------------------------
    // GEPRÜFT WIRD DIE STELLE IN DER REIHE, NICHT DIE RECHNUNG.
    //
    // Hier stand zuerst die x-Formel aus dem Bauteil abgeschrieben. Die brach,
    // sobald die Achse einen Rand bekam — obwohl an der Zusicherung nichts
    // falsch war. Eine Prüfung, die die Umsetzung nachbaut, prüft sie gegen
    // sich selbst.
    //
    // Danach stand hier »die Markierung steht, wo der grosse Punkt steht«. Das
    // war noch schlechter: Beide kommen aus derselben Variablen, also hielt die
    // Zusicherung auch dann, wenn die Markierung auf dem FALSCHEN Tag sass —
    // die Mutation »markIndex = 0« überlebte sie.
    //
    // Die Punkte werden in Reihenfolge gezeichnet. Der hervorgehobene muss also
    // an derselben Stelle der Reihe stehen wie der Befundtag unter den Tagen
    // MIT Eintrag. Das bindet die Markierung an das Datum und nicht an sich
    // selbst.
    // ---------------------------------------------------------------------
    const kreise = [...container.querySelectorAll("circle")];
    const hervorgehoben = kreise.findIndex((k) => Number(k.getAttribute("r")) > 3);
    expect(hervorgehoben, "kein hervorgehobener Punkt").toBeGreaterThanOrEqual(0);

    const mitEintrag = punkte.filter((p) => p.morning !== null);
    const erwartetePosition = mitEintrag.findIndex((p) => p.date === zustand.flag.forDate);
    expect(hervorgehoben).toBe(erwartetePosition);

    expect(Number(linie!.getAttribute("x1"))).toBeCloseTo(
      Number(kreise[hervorgehoben]!.getAttribute("cx")),
      1,
    );

    const punkt = kreise[hervorgehoben]!;

    // Und er darf nicht auf der Kante liegen: Ein Befund am letzten Tag ist der
    // Normalfall, nicht der Randfall.
    const cx = Number(punkt!.getAttribute("cx"));
    expect(cx).toBeGreaterThan(0);
    expect(cx).toBeLessThan(600);
  });

  it("und markiert nichts, wenn es nichts zu markieren gibt", () => {
    // Gegenprobe: Eine Kurve, die immer eine Linie zeichnet, bestünde die
    // Prüfung darüber — und stellte im Spiegel eine Markierung ohne Bezug hin.
    const auswertung = zuFrueh();
    const { container } = zeichnen(
      auswertung,
      tageVon(5, (i) => ({ morningScore: [2, 4, 5, 5, 7][i] ?? 2 })),
    );
    expect(mainState(laufAus(auswertung)).kind).toBe("mirror");
    expect(container.querySelector("line")).toBeNull();
  });
});
