/**
 * Die ersten zwei Wochen.
 *
 * ---------------------------------------------------------------------------
 * ZWEI ZUSICHERUNGEN, UND DIE ZWEITE IST DIE UNAUFFÄLLIGE.
 *
 * 1. **Keine erfundene Auswertung.** Was noch fehlt, sagt der Motor über
 *    `blockedText`. Kein Satz von hier, kein Ladebalken, kein erster Befund.
 *
 * 2. **Der Abschnitt verschwindet zur richtigen Zeit.** `insufficient` als
 *    Bedingung wäre falsch: Es tritt auch nach Monaten auf, wenn ein
 *    Schmerzmittel im Fenster liegt. Wer seit zwölf Wochen einträgt, bekäme
 *    dann »die ersten zwei Wochen« zu lesen.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DEFAULT_CONFIG, blockedText } from "loadwise-engine";
import { FirstDays, inFirstDays } from "@/components/FirstDays";
import type { StoredRun } from "@/lib/db/types";
import { t } from "@/i18n/dictionary";

const s = t("de");

const lauf = (patch: Partial<StoredRun> = {}): StoredRun =>
  ({
    id: "lauf-1",
    computedAt: "2026-08-29T10:00:00.000Z",
    overall: { status: "insufficient", blocking: ["history-too-short"] },
    coverage: {} as StoredRun["coverage"],
    pending: [],
    problems: [],
    progress: { milestones: [], records: [], pending: [], episodeDay: null },
    config: DEFAULT_CONFIG,
    lastDate: "2026-08-29",
    profileKey: "achilles_midportion",
    profileVersion: "p1",
    ruleVersion: "r1",
    flags: [],
    unreadableFlags: 0,
    ...patch,
  }) as unknown as StoredRun;

const zeichnen = (run: StoredRun | null, entryCount: number) =>
  render(
    <FirstDays
      run={run}
      entryCount={entryCount}
      limitations="Dieses Profil kann eine Reizung von nichts unterscheiden."
      strings={s.firstDays}
      locale="de"
    />,
  );

describe("wann der Abschnitt steht — und wann nicht mehr", () => {
  it("steht, solange es keinen Lauf gibt", () => {
    expect(inFirstDays(null, 0)).toBe(true);
    expect(inFirstDays(null, 3)).toBe(true);
  });

  it("steht, solange zu wenige Tage erfasst sind", () => {
    // `DEFAULT_CONFIG.baseline.minEntries` ist 10.
    expect(inFirstDays(lauf(), 0)).toBe(true);
    expect(inFirstDays(lauf(), 9)).toBe(true);
  });

  it("verschwindet, sobald der Motor einen Vergleichswert haben KANN", () => {
    expect(inFirstDays(lauf(), 10)).toBe(false);
    expect(inFirstDays(lauf(), 40)).toBe(false);
  });

  it("hängt an der Config DES LAUFS, nicht an DEFAULT_CONFIG", () => {
    /**
     * Ein Profil, das die Schwelle verschiebt, verschiebt damit auch, wie
     * lange diese Ansicht steht. Gegen `DEFAULT_CONFIG` zu prüfen hiesse, dass
     * ein Profil mit einer anderen Schwelle die falsche Ansicht bekommt — und
     * zwar ohne dass irgendetwas rot würde.
     */
    const streng = lauf({
      config: {
        ...DEFAULT_CONFIG,
        baseline: { ...DEFAULT_CONFIG.baseline, minEntries: 20 },
      } as StoredRun["config"],
    });
    expect(inFirstDays(streng, 15)).toBe(true);
    expect(inFirstDays(lauf(), 15)).toBe(false);
  });

  it("bleibt NICHT stehen, nur weil das Urteil »nicht genug« lautet", () => {
    /**
     * Die unauffällige Zusicherung. `insufficient` tritt auch nach Monaten
     * auf — etwa wenn ein Schmerzmittel im Fenster liegt. Wer seit zwölf
     * Wochen einträgt, darf dann nicht »die ersten zwei Wochen« lesen.
     */
    const langerVerlauf = lauf({
      overall: { status: "insufficient", blocking: ["medication-in-window"] } as StoredRun["overall"],
    });
    expect(inFirstDays(langerVerlauf, 84)).toBe(false);
  });
});

describe("was noch fehlt, sagt der Motor", () => {
  it("gibt die Blockade-Gründe des Laufs aus", () => {
    const mitGruenden = lauf({
      pending: [
        { reason: "baseline-unavailable" },
        { reason: "history-too-short" },
      ] as unknown as StoredRun["pending"],
    });
    zeichnen(mitGruenden, 3);

    expect(screen.getByText(blockedText("baseline-unavailable", "de"))).toBeTruthy();
    expect(screen.getByText(blockedText("history-too-short", "de"))).toBeTruthy();
  });

  it("nennt denselben Grund nur einmal", () => {
    // `pending` trägt sie je Tag und Regel. Nach zehn Tagen stünde »für einen
    // Vergleichswert fehlen noch Einträge« zehnmal untereinander.
    const zehnmal = lauf({
      pending: Array.from({ length: 10 }, () => ({
        reason: "baseline-unavailable",
      })) as unknown as StoredRun["pending"],
    });
    zeichnen(zehnmal, 9);

    expect(document.querySelectorAll("[data-missing] li")).toHaveLength(1);
  });

  it("lässt einen Grund weg, den diese Fassung nicht kennt", () => {
    // Sonst stünde dort eine leere Zeile — oder es stürzte ab. Die übrigen
    // Gründe stimmen weiter, und die Liste behauptet nicht, vollständig zu sein.
    const kaputt = lauf({
      pending: [
        { reason: "aus-einer-anderen-fassung" },
        { reason: "history-too-short" },
      ] as unknown as StoredRun["pending"],
    });
    zeichnen(kaputt, 3);

    expect(document.querySelectorAll("[data-missing] li")).toHaveLength(1);
  });

  it("sagt es in Worten, wenn es noch gar keinen Grund gibt", () => {
    // Am Tag null gibt es keinen Lauf und damit keine Gründe. Ein leerer
    // Abschnitt wäre die Antwort, gegen die diese ganze Karte gebaut ist.
    zeichnen(null, 0);
    expect(screen.getByText(s.firstDays.missingNothingYet)).toBeTruthy();
  });
});

describe("was passiert ist, und die Frage für morgen", () => {
  it("zählt die eigenen Tage gegen die Zahl aus der Config", () => {
    zeichnen(lauf(), 3);
    expect(document.querySelector("[data-recorded]")!.textContent).toBe("3 von 10 Tagen");
  });

  it("stellt eine Frage, keine Anweisung", () => {
    /**
     * »Trag morgen früh deinen Morgenwert ein« wäre regulatorisch harmlos und
     * trotzdem die falsche Form: Sie sagt, was jemand tun soll, an genau der
     * Stelle, an der die App sonst peinlich genau nichts sagt.
     */
    zeichnen(lauf(), 1);
    const frage = document.querySelector("[data-tomorrow]")!.textContent!;
    expect(frage.endsWith("?")).toBe(true);
    for (const wort of ["trag ein", "solltest", "musst", "denk daran"]) {
      expect(frage.toLowerCase().includes(wort), wort).toBe(false);
    }
  });

  it("erklärt, warum vor dem Aufstehen", () => {
    // Der Wert soll vergleichbar sein, und ein Morgen nach zwei Stunden
    // Bürostuhl ist es nicht mehr.
    zeichnen(lauf(), 1);
    expect(document.querySelector("[data-tomorrow]")!.textContent).toContain("bevor du aufstehst");
  });
});

describe("was die App ist, was sie nicht ist, und was das Profil nicht kann", () => {
  it("sagt beides, bevor irgendeine Zahl kommt", () => {
    zeichnen(lauf(), 1);
    expect(screen.getByText(s.firstDays.whatThisIs)).toBeTruthy();
    expect(screen.getByText(s.firstDays.whatThisIsNot)).toBeTruthy();
  });

  it("und der Satz »was nicht« nennt die drei Dinge beim Namen", () => {
    for (const wort of ["behandelt nicht", "keine Diagnose", "keine Anweisungen"]) {
      expect(s.firstDays.whatThisIsNot, wort).toContain(wort);
    }
  });

  it("zeigt die Grenzen des Profils — hier, nicht nur beim Anlegen", () => {
    /**
     * `ProfilePicker` zeigt sie vor dem Anlegen. Das ist der richtige Zeitpunkt
     * für die Entscheidung und der falsche, um sie zu behalten: Wer ein
     * Formular ausfüllt, liest den Satz über zwanzig Differentialdiagnosen
     * nicht zu Ende.
     */
    zeichnen(lauf(), 1);
    expect(
      screen.getByText("Dieses Profil kann eine Reizung von nichts unterscheiden."),
    ).toBeTruthy();
  });

  it("trägt die Zweckbestimmung — am Tag 1 wichtiger als sonst wo", () => {
    zeichnen(lauf(), 1);
    expect(screen.getByText(/Loadwise dokumentiert und ordnet/)).toBeTruthy();
  });
});

describe("kein Ladebalken, kein erfundener Befund", () => {
  it("rendert nichts mit der Rolle progressbar", () => {
    // Ein Ladebalken behauptet, es passiere etwas. Es passiert nichts — es
    // fehlen Tage, und das ist eine andere Auskunft.
    zeichnen(lauf(), 1);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(document.querySelector("progress")).toBeNull();
  });

  it("und keine Urteilsfarbe", () => {
    // Grün, Bernstein oder Rot hier wären ein Urteil, das der Motor
    // ausdrücklich verweigert.
    zeichnen(lauf(), 1);
    const html = document.body.innerHTML;
    for (const farbe of ["var(--green)", "var(--amber)", "var(--red)"]) {
      expect(html.includes(farbe), farbe).toBe(false);
    }
  });
});
