/**
 * Der Physio-Bericht als Druckansicht.
 *
 * ---------------------------------------------------------------------------
 * DIE FALLE DIESER KARTE IST DER ZEITRAUM.
 *
 * Wer »letzte vier Wochen« wählt, sieht eine kürzere Liste. Das GESAMTURTEIL
 * bleibt aber die Aussage über den ganzen Verlauf bis zur Berechnung — es unter
 * einer Zeitraumüberschrift zu zeigen hiesse, einen Befund von vor zwei
 * Monaten dem gewählten Fenster zuzuschreiben.
 *
 * Die zweite Zusicherung ist die Karte selbst: Profilname, Profilversion,
 * Regelversion und Berechnungszeitpunkt müssen dastehen. Ohne sie ist ein
 * Ausdruck von vor drei Monaten nicht mehr einzuordnen, und niemand könnte
 * sagen, ob ein anderes Ergebnis am Körper oder an einer Profilverbesserung
 * liegt.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DEFAULT_CONFIG,
  verdictText,
  type Entry,
  type Flag,
  type SelfTest,
} from "loadwise-engine";
import { PrintReport } from "@/components/PrintReport";
import type { CoursePoint } from "@/components/CourseCurve";
import type { StoredRun } from "@/lib/db/types";
import { t } from "@/i18n/dictionary";

const s = t("de");

/** Neunzig Tage, damit ein Fenster von 28 wirklich etwas abschneidet. */
const EINTRAEGE: Entry[] = Array.from({ length: 90 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 5, 1));
  d.setUTCDate(d.getUTCDate() + i);
  return {
    date: d.toISOString().slice(0, 10),
    morningScore: 3,
    sessions: [],
  } as unknown as Entry;
});

const PUNKTE: CoursePoint[] = EINTRAEGE.map((e) => ({
  date: String(e.date),
  morning: 3,
  load: 10,
})) as unknown as CoursePoint[];

const flag = (forDate: string, reason: Flag["reason"]): Flag =>
  ({
    forDate,
    kind: "load_spike",
    severity: "amber",
    reason,
    ruleVersion: "r1",
    profileVersion: "p1",
    // Der vollstaendige Detailtyp. `evidenceText` liest auch die
    // ungewichteten Zahlen -- ein halbes Detail bringt es zu Fall, und genau
    // das ist beim ersten Lauf dieser Datei passiert.
    detail: {
      acute: 100,
      chronic: 50,
      ratio: 2,
      rawAcute: 90,
      rawChronic: 60,
      rawRatio: 1.5,
      daysCovered: 28,
    },
  }) as unknown as Flag;

const LAUF: StoredRun = {
  id: "lauf-1",
  computedAt: "2026-08-29T10:00:00.000Z",
  overall: { status: "judged", severity: "amber" },
  coverage: {} as StoredRun["coverage"],
  pending: [],
  problems: [],
  progress: { milestones: [], records: [], pending: [], episodeDay: null },
  // Die echte Config, nicht ein leeres Objekt: `evidenceText` rechnet gegen
  // die Schwellen, nach denen geurteilt wurde, und faellt sonst um.
  config: DEFAULT_CONFIG,
  lastDate: "2026-08-29" as StoredRun["lastDate"],
  profileKey: "achilles_midportion",
  profileVersion: "achilles_midportion.2026-08-20",
  ruleVersion: "rules.2026-08-24",
  // Einer im letzten Fenster, einer weit davor.
  flags: [flag("2026-08-20", "sharp-increase"), flag("2026-06-10", "rising-fast")],
  unreadableFlags: 0,
} as unknown as StoredRun;

const MESSUNGEN: SelfTest[] = [
  { type: "calf_raise", date: "2026-06-05" as SelfTest["date"], involved: 8, uninvolved: 20 },
  { type: "calf_raise", date: "2026-08-25" as SelfTest["date"], involved: 17, uninvolved: 21 },
];

function zeichnen(run: StoredRun | null = LAUF) {
  return render(
    <PrintReport
      run={run}
      entries={EINTRAEGE}
      points={PUNKTE}
      tests={MESSUNGEN}
      profileLabel="Achillessehne, mittlerer Abschnitt"
      strings={s.print}
      mainStrings={s.main}
      reportStrings={s.report}
      comparisonStrings={s.comparison}
      locale="de"
    />,
  );
}

describe("wonach beurteilt wurde", () => {
  /**
   * Die vier Angaben, die die Karte ausdrücklich fordert. Ohne sie ist ein
   * Ausdruck von vor drei Monaten nicht mehr einzuordnen.
   */
  it("nennt Profilname und Profilversion", () => {
    zeichnen();
    const kasten = document.querySelector("[data-basis]")!;
    expect(kasten.textContent).toContain("Achillessehne, mittlerer Abschnitt");
    expect(kasten.textContent).toContain("achilles_midportion.2026-08-20");
  });

  it("nennt die Regelversion", () => {
    zeichnen();
    expect(document.querySelector("[data-basis]")!.textContent).toContain("rules.2026-08-24");
  });

  it("nennt den Berechnungszeitpunkt", () => {
    zeichnen();
    expect(document.querySelector("[data-basis]")!.textContent).toContain("2026-08-29");
  });

  it("und den gewählten Zeitraum", () => {
    zeichnen();
    expect(document.querySelector("[data-basis]")!.textContent).toContain(s.print.periodAll);
  });
});

describe("der Zeitraum engt ein, was aufgelistet wird", () => {
  it("zeigt ohne Fenster beide Auffälligkeiten", () => {
    zeichnen();
    expect(document.querySelectorAll("[data-finding]")).toHaveLength(2);
  });

  it("und mit einem Fenster von 28 Tagen nur die eine darin", async () => {
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.click(screen.getByRole("button", { name: /28/ }));

    const befunde = [...document.querySelectorAll("[data-finding]")];
    expect(befunde).toHaveLength(1);
    expect(befunde[0]!.textContent).toContain("2026-08-20");
  });

  it("schneidet auch die Messungen ab", async () => {
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.click(screen.getByRole("button", { name: /28/ }));

    const messungen = document.querySelector("[data-tests]")!.textContent!;
    expect(messungen).toContain("2026-08-25");
    expect(messungen).not.toContain("2026-06-05");
  });

  it("sagt es, wenn im Zeitraum nichts liegt", async () => {
    const nutzer = userEvent.setup();
    render(
      <PrintReport
        run={{ ...LAUF, flags: [flag("2026-06-10", "rising-fast")] } as StoredRun}
        entries={EINTRAEGE}
        points={PUNKTE}
        tests={[]}
        profileLabel="X"
        strings={s.print}
        mainStrings={s.main}
        reportStrings={s.report}
        comparisonStrings={s.comparison}
        locale="de"
      />,
    );

    await nutzer.click(screen.getByRole("button", { name: /28/ }));
    expect(screen.getByText(s.print.findingsEmpty)).toBeTruthy();
    expect(screen.getByText(s.print.testsEmpty)).toBeTruthy();
  });

  it("rechnet das Fenster vom jüngsten ERFASSTEN Tag, nicht von heute", async () => {
    /**
     * Wer zwei Wochen nichts eingetragen hat und »letzte vier Wochen« wählt,
     * bekäme sonst eine halb leere Seite und den Eindruck, es fehlten Daten.
     *
     * Die Uhr steht hier bewusst weit nach dem letzten Eintrag: Rechnete die
     * Ansicht von heute, fiele auch der Befund vom 20.08. aus dem Fenster.
     */
    // `shouldAdvanceTime`, weil `userEvent` selbst Zeitgeber benutzt -- eine
    // stehende Uhr laesst jeden Klick haengen. Dieselbe Falle steht im Kopf
    // von `EntryForm.test.tsx`, und sie hat hier prompt wieder zugeschlagen.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 11, 24));
    try {
      const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      zeichnen();
      await nutzer.click(screen.getByRole("button", { name: /28/ }));
      expect(document.querySelectorAll("[data-finding]")).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("das Gesamturteil gehört NICHT unter den Zeitraum", () => {
  it("steht in einem eigenen Abschnitt", () => {
    zeichnen();
    expect(document.querySelector("[data-overall]")).toBeTruthy();
  });

  it("und sagt dazu, worauf es sich bezieht", () => {
    /**
     * Die Falle dieser Karte. Ohne diesen Satz schriebe ein Ausdruck über
     * »letzte vier Wochen« ein Urteil zu, das aus einem Befund von vor zwei
     * Monaten stammt.
     */
    zeichnen();
    expect(document.querySelector("[data-overall]")!.textContent).toContain(
      s.print.overallScope,
    );
  });

  it("ändert sich nicht, wenn der Zeitraum wechselt", async () => {
    const nutzer = userEvent.setup();
    zeichnen();
    const vorher = document.querySelector("[data-overall]")!.textContent;

    await nutzer.click(screen.getByRole("button", { name: /28/ }));
    expect(document.querySelector("[data-overall]")!.textContent).toBe(vorher);
  });
});

describe("die Sätze kommen aus dem Motor", () => {
  it("zeigt den Urteilssatz, nicht einen eigenen", () => {
    zeichnen();
    expect(screen.getByText(verdictText("sharp-increase", "de"))).toBeTruthy();
  });

  it("und trägt die Zweckbestimmung — auf Papier wichtiger als sonst wo", () => {
    // Ein Ausdruck wird ohne die App gelesen, oft von jemandem, der sie nie
    // gesehen hat. `check:boundary` verlangt den Satz von jeder Datei, die
    // `verdictText` ruft; hier steht er zusätzlich als Prüfung.
    zeichnen();
    expect(screen.getByText(/Loadwise dokumentiert und ordnet/)).toBeTruthy();
  });
});

describe("was auf Papier nichts zu suchen hat", () => {
  it("markiert Zeitraumwahl und Druckknopf als bildschirmeigen", () => {
    /**
     * `@media print` blendet alles mit `data-screen-only` aus. Ein Knopf auf
     * einem Ausdruck ist kein Schönheitsfehler, sondern eine Aufforderung, die
     * ins Leere geht.
     */
    zeichnen();
    const nurBildschirm = document.querySelector("[data-screen-only]")!;
    expect(nurBildschirm.textContent).toContain(s.print.printButton);
    expect(nurBildschirm.textContent).toContain(s.print.periodAll);
  });

  it("markiert die Abschnitte des Berichts NICHT so", () => {
    // Die Gegenprobe: Wäre der Bericht selbst als bildschirmeigen markiert,
    // käme ein leeres Blatt aus dem Drucker.
    zeichnen();
    for (const teil of ["[data-basis]", "[data-overall]", "[data-findings]", "[data-tests]"]) {
      expect(document.querySelector(teil)!.closest("[data-screen-only]"), teil).toBeNull();
    }
  });
});

describe("ohne gespeicherten Lauf", () => {
  it("sagt die Seite das, statt leer zu bleiben", () => {
    zeichnen(null);
    expect(screen.getByText(s.print.noRun)).toBeTruthy();
  });

  it("und trägt die Zweckbestimmung trotzdem", () => {
    zeichnen(null);
    expect(screen.getByText(/Loadwise dokumentiert und ordnet/)).toBeTruthy();
  });
});
