/**
 * Die Zielliste — »drei von fünf«, und woran es hängt.
 *
 * ---------------------------------------------------------------------------
 * DIE ZÄHLUNG IST DIE KARTE.
 *
 * »So entsteht wie weit bin ich: fünf eigene Ziele, drei von fünf erreicht.
 * Fortschritt gegen den selbst erklärten Massstab. Der Massstab gehört dem
 * Nutzer.«
 *
 * Zwei Dinge müssen dafür stimmen und sind hier festgehalten: WAS gezählt wird
 * (nur was im Tagebuch belegt oder selbst eingetragen ist) und WOGEGEN (die
 * Zahl der eigenen Ziele, nicht eine Skala mit Ende).
 * ---------------------------------------------------------------------------
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  milestoneText,
  type Milestone,
  type MilestoneStatus,
  type ProgressReport,
} from "loadwise-engine";
import { MilestoneList, belegteZiele } from "@/components/MilestoneList";
import { t } from "@/i18n/dictionary";

vi.mock("@/app/actions/milestones", () => ({
  markMilestoneAction: vi.fn(),
  deleteMilestoneAction: vi.fn(),
}));
import { deleteMilestoneAction, markMilestoneAction } from "@/app/actions/milestones";

const abhaken = vi.mocked(markMilestoneAction);
const entfernen = vi.mocked(deleteMilestoneAction);
const s = t("de");

const HEUTE = "2026-08-20";

const ziel = (id: string, text: string, mitBedingung: boolean, markedReachedOn: string | null = null): Milestone =>
  ({
    id,
    origin: "user",
    label: { text, locale: "de" },
    createdOn: "2026-08-01",
    all: mitBedingung
      ? [
          {
            measure: { source: "morning_score" },
            direction: "at_most",
            value: 2,
            unit: "score_0_10",
          },
        ]
      : [],
    onDistinctDays: 1,
    markedReachedOn,
  }) as unknown as Milestone;

const status = (id: string, state: MilestoneStatus["state"], needed = 1, found = 0): MilestoneStatus =>
  ({
    id,
    state,
    qualifyingDays: Array.from({ length: found }, (_, i) => ({ date: `2026-08-0${i + 1}` })),
    needed,
    completedOn: null,
    blocked: null,
  }) as unknown as MilestoneStatus;

const bericht = (milestones: MilestoneStatus[]): ProgressReport =>
  ({ milestones, records: [], pending: [], episodeDay: null }) as ProgressReport;

function zeichnen(milestones: Milestone[], progress: ProgressReport | null) {
  return render(
    <MilestoneList
      locale="de"
      episodeId="e1"
      today={HEUTE}
      milestones={milestones}
      progress={progress}
      strings={s.goal}
      errorStrings={s.errors}
    />,
  );
}

beforeEach(() => {
  abhaken.mockReset();
  entfernen.mockReset();
  abhaken.mockResolvedValue({ ok: true });
  entfernen.mockResolvedValue({ ok: true });
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 7, 20, 10, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("die Zählung: drei von fünf", () => {
  const FUENF = [
    ziel("m1", "Wieder dreissig Minuten gehen", true),
    ziel("m2", "Treppe ohne Geländer", true),
    ziel("m3", "Ohne Angst einschlafen", false, "2026-08-10"),
    ziel("m4", "Wieder joggen", true),
    ziel("m5", "Einkauf tragen", true),
  ];

  it("zählt, was im Tagebuch belegt oder selbst eingetragen ist", () => {
    const p = bericht([
      status("m1", "recorded"),
      status("m2", "recorded"),
      status("m3", "marked-by-user"),
      status("m4", "not-in-record"),
      status("m5", "partly-recorded", 3, 1),
    ]);
    zeichnen(FUENF, p);

    expect(document.querySelector("[data-count]")!.textContent).toBe("3 von 5 im Tagebuch belegt");
  });

  it("zählt »teilweise« NICHT mit", () => {
    /**
     * `partly-recorded` heisst: einzelne Tage erfüllen es, noch nicht so viele
     * wie verlangt. Das als erreicht zu zählen wäre eine Aussage über die
     * Person, die das Tagebuch nicht deckt.
     */
    const p = bericht([status("m1", "partly-recorded", 3, 2)]);
    expect(belegteZiele(p.milestones)).toBe(0);
  });

  it("zählt »nicht im Tagebuch« und »nicht messbar« nicht mit", () => {
    const p = bericht([status("m1", "not-in-record"), status("m2", "not-measurable")]);
    expect(belegteZiele(p.milestones)).toBe(0);
  });

  it("zählt ein Ziel ohne Bedingung erst, wenn es abgehakt ist", () => {
    // `untracked` heisst: Das kann ein Tagebuch nicht sehen. Es mitzuzählen
    // hiesse, ein Ziel als erreicht zu führen, das niemand bestätigt hat.
    expect(belegteZiele([status("m1", "untracked")])).toBe(0);
    expect(belegteZiele([status("m1", "marked-by-user")])).toBe(1);
  });

  it("zeigt null von fünf, wenn nichts belegt ist", () => {
    const p = bericht(FUENF.map((z) => status(z.id, "not-in-record")));
    zeichnen(FUENF, p);
    expect(document.querySelector("[data-count]")!.textContent).toBe("0 von 5 im Tagebuch belegt");
  });

  it("zählt gegen die Zahl der eigenen Ziele, nicht gegen eine feste Skala", () => {
    /**
     * Der Massstab gehört dem Nutzer: Schreibt er ein sechstes Ziel, wird aus
     * »drei von fünf« ein »drei von sechs«, und niemand ist zurückgefallen.
     * Eine feste Skala behauptete das Gegenteil.
     */
    const sechs = [...FUENF, ziel("m6", "Wieder Velo fahren", true)];
    const p = bericht([status("m1", "recorded"), status("m2", "recorded"), status("m3", "marked-by-user")]);
    zeichnen(sechs, p);
    expect(document.querySelector("[data-count]")!.textContent).toBe("3 von 6 im Tagebuch belegt");
  });
});

describe("kein Balken — dieselbe Regel wie beim Seitenvergleich", () => {
  it("rendert kein progress, kein meter, keine Rolle progressbar", () => {
    const drei = [ziel("m1", "a", true), ziel("m2", "b", true), ziel("m3", "c", true)];
    zeichnen(drei, bericht([status("m1", "recorded")]));

    expect(document.querySelector("progress")).toBeNull();
    expect(document.querySelector("meter")).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("und kein Element mit datengetriebener Prozentbreite", () => {
    const drei = [ziel("m1", "a", true), ziel("m2", "b", true), ziel("m3", "c", true)];
    zeichnen(drei, bericht([status("m1", "recorded")]));

    const balken = [...document.querySelectorAll<HTMLElement>("*")].filter(
      (el) => el.tagName !== "TABLE" && /^\d+(\.\d+)?%$/.test(el.style.width ?? ""),
    );
    expect(balken.map((el) => el.outerHTML.slice(0, 60))).toEqual([]);
  });
});

describe("die eigenen Worte stehen unverändert da", () => {
  it("zeigt den Zieltext, wie er geschrieben wurde", () => {
    const eigenwillig = "Du schaffst das — 30 Minuten am Stück, weiter so!";
    zeichnen([ziel("m1", eigenwillig, false)], bericht([status("m1", "untracked")]));
    expect(screen.getByText(eigenwillig)).toBeTruthy();
  });

  it("und den Zustandssatz aus dem Motor daneben", () => {
    // Nicht aus dem Wörterbuch der App: »Im Tagebuch steht ein Tag, der das
    // erfüllt« ist eine Aussage über das Buch und unterliegt den Ban-Listen.
    zeichnen([ziel("m1", "Ziel", true)], bericht([status("m1", "recorded")]));
    expect(screen.getByText(milestoneText("recorded", "de"))).toBeTruthy();
  });
});

describe("selbst abhaken gibt es nur ohne prüfbare Bedingung", () => {
  it("bietet den Knopf bei einem Ziel ohne Bedingung", () => {
    zeichnen([ziel("m1", "Ohne Angst einschlafen", false)], bericht([status("m1", "untracked")]));
    expect(screen.getByRole("button", { name: s.goal.markReached })).toBeTruthy();
  });

  it("bietet ihn NICHT bei einem Ziel mit Bedingung", () => {
    /**
     * Ein Ziel mit Bedingung beantwortet das Tagebuch. Ein Häkchen daneben wäre
     * eine zweite, widersprechende Antwort auf dieselbe Frage — und welche
     * gölte, müsste dann jede lesende Stelle für sich entscheiden. Die
     * Datenbank setzt dasselbe mit `manual_tick_only_when_untracked` durch.
     */
    zeichnen([ziel("m1", "Morgenwert höchstens 2", true)], bericht([status("m1", "not-in-record")]));
    expect(screen.queryByRole("button", { name: s.goal.markReached })).toBeNull();
  });

  it("schickt das heutige Datum beim Abhaken", async () => {
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen([ziel("m1", "Ziel", false)], bericht([status("m1", "untracked")]));

    await nutzer.click(screen.getByRole("button", { name: s.goal.markReached }));
    await waitFor(() => expect(abhaken).toHaveBeenCalled());
    expect(abhaken.mock.calls[0]).toEqual(["de", "e1", "m1", HEUTE]);
  });

  it("und null beim Zurücknehmen", async () => {
    // Zurücknehmen muss gehen. Ein Häkchen, das bleibt, wäre eine Behauptung
    // über einen Menschen, die er selbst nicht mehr los wird.
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen([ziel("m1", "Ziel", false, "2026-08-10")], bericht([status("m1", "marked-by-user")]));

    await nutzer.click(screen.getByRole("button", { name: s.goal.unmarkReached }));
    await waitFor(() => expect(abhaken).toHaveBeenCalled());
    expect(abhaken.mock.calls[0]![3]).toBeNull();
  });

  it("sagt es, wenn das Abhaken schiefgeht", async () => {
    abhaken.mockResolvedValue({ ok: false, reason: "failed" });
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen([ziel("m1", "Ziel", false)], bericht([status("m1", "untracked")]));

    await nutzer.click(screen.getByRole("button", { name: s.goal.markReached }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(s.errors.notSaved));
  });
});

describe("entfernen fragt nach", () => {
  it("löscht nur nach Bestätigung", async () => {
    // Ein Ziel wird wirklich gelöscht, nicht archiviert. Was unwiderruflich
    // ist, bekommt einen zweiten Klick.
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    zeichnen([ziel("m1", "Ziel", true)], bericht([status("m1", "not-in-record")]));

    await nutzer.click(screen.getByRole("button", { name: s.goal.remove }));
    expect(entfernen).not.toHaveBeenCalled();
  });

  it("und löscht, wenn bestätigt wurde", async () => {
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    zeichnen([ziel("m1", "Ziel", true)], bericht([status("m1", "not-in-record")]));

    await nutzer.click(screen.getByRole("button", { name: s.goal.remove }));
    await waitFor(() => expect(entfernen).toHaveBeenCalledWith("de", "e1", "m1"));
  });
});

describe("der Stand, wenn es keinen gespeicherten Lauf gibt", () => {
  it("zeigt die Ziele trotzdem, nur ohne Zustandssatz", () => {
    // Ein neu angelegtes Ziel vor dem ersten Lauf. Die Ziele zu verschweigen,
    // weil das Urteil fehlt, wäre die schlechtere Antwort: Sie sind erfasst.
    zeichnen([ziel("m1", "Wieder joggen", true)], null);
    expect(screen.getByText("Wieder joggen")).toBeTruthy();
    expect(document.querySelector("[data-count]")!.textContent).toBe("0 von 1 im Tagebuch belegt");
  });

  it("sagt es, wenn es gar kein Ziel gibt", () => {
    zeichnen([], null);
    expect(screen.getByText(s.goal.listEmpty)).toBeTruthy();
    expect(document.querySelector("[data-count]")).toBeNull();
  });
});
