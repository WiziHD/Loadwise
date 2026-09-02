/**
 * Die Fortschritts-Ansicht — und die drei Dinge, die verboten sind.
 *
 * ---------------------------------------------------------------------------
 * DREI VERBOTE, DREI PRÜFUNGEN, UND ALLE DREI SICHERN EINE ABWESENHEIT.
 *
 * 1. **Kein Verb der Veränderung.** Nicht »besser«, nicht »+7«, nicht
 *    »Bestwert«. Für keinen Test dieser neun Profile ist belegt, wie weit zwei
 *    Messungen allein durch Zufall auseinanderliegen.
 * 2. **Kein Prozentbalken gegen einen Zielwert.** »12 von 15 = 80 %«
 *    behauptet, dass 12 und 15 sich bedeutsam unterscheiden.
 * 3. **Keine Serien, Abzeichen, Punkte.** Der Motor kann einen weggelassenen
 *    schlechten Tag nicht erkennen; eine Serie macht das Weglassen doppelt
 *    lohnend.
 *
 * Eine Abwesenheit zu sichern ist die schwierigste Sorte Prüfung: Niemand baut
 * einen Balken böswillig ein. Er kommt als Verbesserung — »die Zahlen allein
 * sagen so wenig«.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { claimText, type ProgressReport } from "loadwise-engine";
import { ProgressRecords } from "@/components/ProgressRecords";
import { t } from "@/i18n/dictionary";

const s = t("de");

const punkt = (date: string, value: number) => ({ date, value }) as never;

const reihe = (patch: Partial<Record<string, unknown>> = {}) =>
  ({
    measure: { source: "measurement", key: "Kniebeugen" },
    unit: "reps",
    series: [punkt("2026-03-12", 8), punkt("2026-06-14", 12), punkt("2026-08-16", 15)],
    first: punkt("2026-03-12", 8),
    latest: punkt("2026-08-16", 15),
    claim: { level: "not-a-standardised-test" as const, why: "not-a-standardised-test" as const },
    ...patch,
  }) as never;

const bericht = (patch: Partial<ProgressReport> = {}): ProgressReport =>
  ({ milestones: [], records: [], pending: [], episodeDay: null, ...patch }) as ProgressReport;

const zeichnen = (progress: ProgressReport | null) =>
  render(
    <ProgressRecords
      progress={progress}
      strings={s.progress}
      goalStrings={s.goal}
      unitStrings={s.measure}
      locale="de"
    />,
  );

describe("die Zahlen stehen da, mit Datum", () => {
  it("zeigt die erste und die jüngste Messung", () => {
    zeichnen(bericht({ records: [reihe()] }));

    const ersteZeile = document.querySelector("[data-first]")!.textContent!;
    const juengsteZeile = document.querySelector("[data-latest]")!.textContent!;
    expect(ersteZeile).toContain("2026-03-12");
    expect(ersteZeile).toContain("8");
    expect(juengsteZeile).toContain("2026-08-16");
    expect(juengsteZeile).toContain("15");
  });

  it("nennt sie »erste« und »jüngste«, nicht »schlechteste« und »beste«", () => {
    /**
     * Beides sind Angaben über die POSITION in einer Reihe. Der Motortyp sagt
     * es an `PersonalRecord.latest` selbst: »Not 'best': that word needs a
     * direction.« Eine Richtung hätte die App zu erfinden — und bei einem
     * Beschwerdewert zeigte sie in die andere Richtung als bei Wiederholungen.
     */
    zeichnen(bericht({ records: [reihe()] }));
    expect(document.querySelector("[data-first]")!.textContent).toContain(s.progress.firstReading);
    expect(document.querySelector("[data-latest]")!.textContent).toContain(
      s.progress.latestReading,
    );
  });

  it("zeigt die ganze Reihe, wenn sie mehr als zwei Punkte hat", () => {
    zeichnen(bericht({ records: [reihe()] }));
    const reiheText = document.querySelector("[data-series]")!.textContent!;
    expect(reiheText).toContain("2026-06-14");
    expect(reiheText).toContain("12");
  });

  it("und lässt sie weg, wenn erste und jüngste schon alles sind", () => {
    // Zwei Punkte zweimal untereinander zu zeigen wäre Lärm.
    const zwei = reihe({ series: [punkt("2026-03-12", 8), punkt("2026-08-16", 15)] });
    zeichnen(bericht({ records: [zwei] }));
    expect(document.querySelector("[data-series]")).toBeNull();
  });

  it("nennt die Einheit", () => {
    zeichnen(bericht({ records: [reihe()] }));
    expect(document.querySelector("[data-first]")!.textContent).toContain(s.measure.unitReps);
  });

  it("beschriftet die Messquelle mit den Worten des Nutzers", () => {
    // »Kniebeugen« hat er geschrieben. Übersetzt würde es nicht.
    zeichnen(bericht({ records: [reihe()] }));
    expect(screen.getByText("Kniebeugen")).toBeTruthy();
  });
});

describe("kein Verb der Veränderung", () => {
  /**
   * Die Wörter, die hier nicht stehen dürfen. Jedes einzelne behauptet, dass
   * der Abstand zwischen zwei Zahlen etwas bedeutet — und genau das ist für
   * keinen Test dieser neun Profile belegt.
   */
  const VERBOTEN = [
    "besser",
    "verbessert",
    "verbesserung",
    "bestwert",
    "steigerung",
    "gesteigert",
    "fortschritt gemacht",
    "zugelegt",
    "geschafft",
    "rekord",
    "+",
  ];

  it("kommt in der gerenderten Ansicht nicht vor", () => {
    zeichnen(bericht({ records: [reihe()] }));
    const text = document.body.textContent!.toLowerCase();

    // Erst der Nachweis, dass überhaupt etwas dasteht. Eine Ansicht, die
    // nichts rendert, bestünde jede Verbotsprüfung — und das ist genau die
    // Sorte grüner Test, die dieses Projekt sonst als vakuum verfolgt.
    expect(text.length).toBeGreaterThan(100);

    const treffer = VERBOTEN.filter((w) => text.includes(w));
    expect(treffer, `Verbotene Wörter in der Ansicht: ${treffer.join(", ")}`).toEqual([]);
  });

  it("würde ein solches Wort auch finden", () => {
    // Die Gegenprobe. Ohne sie wäre nicht sichtbar, dass die Liste trifft —
    // ein Tippfehler in einem der Wörter machte die Prüfung still wirkungslos.
    const gepflanzt = [
      "Deine Werte haben sich verbessert.",
      "Neuer Bestwert: 15 Wiederholungen.",
      "Du hast 7 zugelegt.",
    ];
    for (const satz of gepflanzt) {
      const t = satz.toLowerCase();
      expect(
        VERBOTEN.some((w) => t.includes(w)),
        `nicht gefangen: "${satz}"`,
      ).toBe(true);
    }
  });

  it("rechnet keine Differenz aus", () => {
    // 15 minus 8 ist 7. Stünde die Zahl irgendwo, wäre sie eine Behauptung
    // über einen Abstand, den niemand einordnen kann.
    zeichnen(bericht({ records: [reihe()] }));
    const zahlen = document.querySelector("[data-first]")!.parentElement!.textContent!;
    expect(zahlen).not.toContain("7");
  });

  it("zeigt stattdessen den Vorbehalt des Motors", () => {
    const r = reihe({ claim: { level: "recorded-only", why: "no-mdc-established" } });
    zeichnen(bericht({ records: [r] }));

    expect(
      screen.getByText(claimText({ level: "recorded-only", why: "no-mdc-established" }, "de")),
    ).toBeTruthy();
  });

  it("und zwar direkt unter den Zahlen, nicht als Fussnote", () => {
    // Weiter unten wäre er ein Nachsatz zu etwas, das schon gelesen ist.
    const r = reihe({ claim: { level: "recorded-only", why: "no-mdc-established" } });
    zeichnen(bericht({ records: [r] }));

    const eintrag = document.querySelector("[data-record]")!;
    const zahlen = eintrag.querySelector("[data-first]")!.closest("p")!;
    const vorbehalt = eintrag.querySelector("[data-claim]")!;
    expect(zahlen.compareDocumentPosition(vorbehalt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("gibt für jede Art von Vorbehalt einen Satz aus", () => {
    // Die Gegenprobe zur Zeile davor: Ohne sie liesse sich nicht sehen, ob die
    // Ansicht den Grund liest oder immer denselben Satz zeigt.
    const gruende = ["no-mdc-established", "mdc-contested", "mdc-not-graded", "not-a-standardised-test"] as const;
    const gesehen = new Set<string>();

    for (const why of gruende) {
      const { unmount } = zeichnen(bericht({ records: [reihe({ claim: { level: "recorded-only", why } })] }));
      gesehen.add(document.querySelector("[data-claim]")!.textContent!);
      unmount();
    }
    expect(gesehen.size).toBe(4);
  });
});

describe("kein Balken und keine Serie", () => {
  it("rendert kein progress, kein meter, keine Rolle progressbar", () => {
    zeichnen(bericht({ records: [reihe()] }));
    expect(document.querySelector("progress")).toBeNull();
    expect(document.querySelector("meter")).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("und kein Element mit datengetriebener Prozentbreite", () => {
    zeichnen(bericht({ records: [reihe()] }));
    const balken = [...document.querySelectorAll<HTMLElement>("*")].filter(
      (el) => el.tagName !== "TABLE" && /^\d+(\.\d+)?%$/.test(el.style.width ?? ""),
    );
    expect(balken.map((el) => el.outerHTML.slice(0, 60))).toEqual([]);
  });

  it("nennt keine Serie, kein Abzeichen, keine Punktzahl", () => {
    /**
     * Der Motor kann einen weggelassenen schlechten Tag nicht erkennen — das
     * ist dokumentiert und unlösbar. Eine Serie macht das Weglassen doppelt
     * lohnend, und eine gerissene Serie bestraft jemanden dafür, dass sein Knie
     * nicht mitgespielt hat.
     */
    zeichnen(bericht({ records: [reihe()] }));
    const text = document.body.textContent!.toLowerCase();
    for (const wort of ["serie", "streak", "abzeichen", "punkte", "level", "stufe"]) {
      expect(text.includes(wort), `»${wort}« steht in der Ansicht`).toBe(false);
    }
  });
});

describe("Gründe, die an keinem einzelnen Ziel hängen", () => {
  it("bekommen hier einen Ort", () => {
    // Die je Ziel hängenden zeigt `MilestoneList`. Diese hätten sonst gar
    // keinen — gesetzt und nie gezeigt, der Standardfehler dieses Projekts.
    const p = bericht({
      records: [reihe()],
      pending: [{ milestoneId: null, reason: "no-mdc-established" }] as never,
    });
    zeichnen(p);
    expect(document.querySelector('[data-pending="no-mdc-established"]')).toBeTruthy();
  });

  it("die an einem Ziel hängen, nicht", () => {
    const p = bericht({
      records: [reihe()],
      pending: [{ milestoneId: "m1", reason: "no-mdc-established" }] as never,
    });
    zeichnen(p);
    expect(document.querySelector("[data-pending]")).toBeNull();
  });
});

describe("wenn es nichts zu zeigen gibt", () => {
  it("sagt die Ansicht das, statt leer zu bleiben", () => {
    zeichnen(bericht());
    expect(screen.getByText(s.progress.empty)).toBeTruthy();
  });

  it("auch ohne gespeicherten Lauf", () => {
    zeichnen(null);
    expect(screen.getByText(s.progress.empty)).toBeTruthy();
  });
});

describe("die Zweckbestimmung", () => {
  it("hängt am Bauteil, nicht an der Seite", () => {
    zeichnen(bericht({ records: [reihe()] }));
    expect(screen.getByText(/Loadwise dokumentiert und ordnet/)).toBeTruthy();
  });
});
