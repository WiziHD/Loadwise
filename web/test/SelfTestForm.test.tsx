/**
 * Das Formular, ohne das der Seitenvergleich nie auf einer echten Messung lief.
 *
 * ---------------------------------------------------------------------------
 * WAS HIER SCHIEFGEHEN KANN, GEHT STILL SCHIEF.
 *
 * Eine falsch gespeicherte Messung sieht aus wie eine richtige. Sie erzeugt ein
 * Verhältnis, das Verhältnis erzeugt ein Urteil, und das Urteil steht dann in
 * derselben Schrift auf demselben Bildschirm wie ein zutreffendes. Es gibt
 * nichts, woran jemand den Unterschied sähe.
 *
 * Deshalb hat jede Prüfung hier ein Gegenstück in einer Regel, die vorher schon
 * einmal etwas gekostet hat: die halbe Paarung, die Null auf der verletzten
 * Seite, das Formular, das leer war und Vorhandenes überschrieb.
 * ---------------------------------------------------------------------------
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SelfTest, TestType } from "loadwise-engine";
import { SelfTestForm } from "@/components/SelfTestForm";
import { t } from "@/i18n/dictionary";

vi.mock("@/app/actions/self-tests", () => ({
  saveSelfTestAction: vi.fn(),
}));
import { saveSelfTestAction } from "@/app/actions/self-tests";

const speichern = vi.mocked(saveSelfTestAction);
const s = t("de");

const HEUTE = "2026-08-20";
const UHR = new Date(2026, 7, 20, 10, 0, 0);

const ACHILLES: TestType[] = ["calf_raise", "single_hop", "rom"];

function zeichnen(tests: readonly TestType[] = ACHILLES, existing: SelfTest[] = []) {
  return render(
    <SelfTestForm
      locale="de"
      episodeId="e1"
      serverToday={HEUTE}
      tests={tests}
      existing={existing}
      strings={s.selfTest}
      errorStrings={s.errors}
      saveLabel={s.actions.save}
    />,
  );
}

beforeEach(() => {
  speichern.mockReset();
  speichern.mockResolvedValue({ ok: true });
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(UHR);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("nur die Testarten, die das Profil führt", () => {
  it("bietet bei der Achillessehne alle drei an", () => {
    zeichnen();
    const auswahl = screen.getByLabelText(s.selfTest.type) as HTMLSelectElement;
    expect(auswahl.options).toHaveLength(3);
  });

  it("bietet bei einem Profil mit nur Beweglichkeit genau einen an", () => {
    // Die Schulter. Ein Wadenheber ergäbe dort eine Zahl, ein Verhältnis und
    // ein Urteil — und nichts davon bedeutete etwas.
    zeichnen(["rom"]);
    const auswahl = screen.getByLabelText(s.selfTest.type) as HTMLSelectElement;
    expect(auswahl.options).toHaveLength(1);
    expect(auswahl.options[0]!.textContent).toBe(s.selfTest.rom);
  });

  it("zeigt bei einem Profil ohne Selbsttest gar kein Formular", () => {
    // Ein leeres Auswahlfeld über zwei leeren Zahlenfeldern wäre schlimmer als
    // nichts: Es sähe aus, als fehlte etwas an der Person.
    zeichnen([]);
    expect(screen.getByText(s.selfTest.noneForProfile)).toBeTruthy();
    expect(screen.queryByLabelText(s.selfTest.involved)).toBeNull();
  });
});

describe("die Anleitung steht über dem Formular", () => {
  it("zeigt die Schritte aus dem Motor, nicht aus dem Wörterbuch", () => {
    zeichnen();
    const kasten = document.querySelector('[data-procedure="calf_raise"]');
    expect(kasten).toBeTruthy();
    expect(kasten!.querySelectorAll("li").length).toBeGreaterThan(3);
  });

  it("nennt den festgelegten Takt — 60, und nirgends 30", () => {
    /**
     * Der Grund, aus dem die Karte den Takt überhaupt erwähnt: 60/min (Toolkit)
     * gegen 30/min (PMC7249277) ist strittig, und ohne eine Festlegung sind
     * zwei Messungen derselben Person nicht vergleichbar.
     *
     * Geprüft wird hier NICHT der Motorwert — das tut
     * `engine/test/procedure.test.ts` —, sondern dass er den Bildschirm
     * erreicht. Ein Takt, den nur der Quelltext kennt, wirkt auf keine einzige
     * Messung.
     */
    zeichnen();
    const kasten = document.querySelector('[data-procedure="calf_raise"]')!;
    expect(kasten.textContent).toContain("60");
    expect(/\b30\b/.test(kasten.textContent ?? "")).toBe(false);
  });

  it("wechselt die Anleitung mit der Testart", () => {
    zeichnen(["single_hop"]);
    expect(document.querySelector('[data-procedure="single_hop"]')).toBeTruthy();
    expect(document.querySelector('[data-procedure="calf_raise"]')).toBeNull();
  });
});

describe("die Einheit gehört zur Testart", () => {
  it("nennt Wiederholungen beim Fersenheber", () => {
    zeichnen(["calf_raise"]);
    expect(screen.getAllByText(s.selfTest.unitReps).length).toBe(2);
  });

  it("nennt Zentimeter beim Einbeinsprung", () => {
    zeichnen(["single_hop"]);
    expect(screen.getAllByText(s.selfTest.unitCm).length).toBe(2);
  });

  it("nennt Grad bei der Beweglichkeit", () => {
    zeichnen(["rom"]);
    expect(screen.getAllByText(s.selfTest.unitDeg).length).toBe(2);
  });
});

describe("null auf der verletzten Seite ist eine Messung", () => {
  it("schickt 0 als 0, nicht als fehlend", async () => {
    /**
     * `Number("")` ist 0. Genau deshalb muss ein LEERES Feld als null ankommen
     * — sonst wäre jede nicht gemachte Messung die schlechtestmögliche. Dieser
     * Test hält die andere Richtung fest: Eine getippte 0 muss durchkommen.
     * Sie ist Tag eins einer Reha und die aussagekräftigste Messung überhaupt.
     */
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen(["calf_raise"]);

    await nutzer.type(screen.getByLabelText(s.selfTest.involved), "0");
    await nutzer.type(screen.getByLabelText(s.selfTest.uninvolved), "18");
    await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

    await waitFor(() => expect(speichern).toHaveBeenCalled());
    expect(speichern.mock.calls[0]![2]).toMatchObject({ involved: 0, uninvolved: 18 });
  });

  it("schickt ein leeres Feld als null", async () => {
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen(["calf_raise"]);

    await nutzer.type(screen.getByLabelText(s.selfTest.uninvolved), "18");
    await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

    await waitFor(() => expect(speichern).toHaveBeenCalled());
    expect(speichern.mock.calls[0]![2]!.involved).toBeNull();
  });
});

describe("ein Komma ist eine Nachkommastelle, kein Fehler", () => {
  it("macht aus 112,5 die Zahl 112.5", async () => {
    // Auf einer Schweizer Tastatur tippt niemand »112.5«. Ohne diese Umwandlung
    // wäre die Eingabe NaN und die Meldung »ausserhalb des Bereichs« — für eine
    // vollkommen richtige Messung.
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen(["single_hop"]);

    await nutzer.type(screen.getByLabelText(s.selfTest.involved), "112,5");
    await nutzer.type(screen.getByLabelText(s.selfTest.uninvolved), "130");
    await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

    await waitFor(() => expect(speichern).toHaveBeenCalled());
    expect(speichern.mock.calls[0]![2]).toMatchObject({ involved: 112.5, uninvolved: 130 });
  });
});

describe("was die Aktion ablehnt, steht auf dem Bildschirm", () => {
  const faelle: { grund: "half-pairing" | "reference-side-zero" | "out-of-range" | "future-date"; text: string }[] = [
    { grund: "half-pairing", text: s.selfTest.halfPairing },
    { grund: "reference-side-zero", text: s.selfTest.referenceSideZero },
    { grund: "out-of-range", text: s.selfTest.outOfRange },
    { grund: "future-date", text: s.selfTest.futureDate },
  ];

  for (const fall of faelle) {
    it(`zeigt »${fall.grund}«`, async () => {
      // Ein Zustand, der gesetzt und nie gezeigt wird, war einer der sechs
      // Datenverluste im Tageseintrag. Hier wird jeder einzeln geprüft.
      speichern.mockResolvedValue({ ok: false, reason: fall.grund });
      const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      zeichnen(["calf_raise"]);

      await nutzer.type(screen.getByLabelText(s.selfTest.uninvolved), "18");
      await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

      await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(fall.text));
    });
  }

  it("sagt es auch, wenn der Aufruf gar nicht ankommt", async () => {
    // Die Zusage lehnt ab, statt »failed« zurückzugeben: tote Verbindung,
    // Neuausrollung mitten im Absenden, 500er. Ohne den Fang bliebe der Knopf
    // stehen und nichts erschiene.
    speichern.mockRejectedValue(new Error("Netz"));
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen(["calf_raise"]);

    await nutzer.type(screen.getByLabelText(s.selfTest.uninvolved), "18");
    await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(s.errors.notSaved));
  });

  it("meldet Erfolg als Status, nicht als Warnung", async () => {
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen(["calf_raise"]);

    await nutzer.type(screen.getByLabelText(s.selfTest.involved), "12");
    await nutzer.type(screen.getByLabelText(s.selfTest.uninvolved), "18");
    await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

    await waitFor(() => expect(screen.getByText(s.selfTest.saved)).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("was schon dasteht, steht im Formular — vor dem Speichern", () => {
  const VORHANDEN: SelfTest[] = [
    { type: "calf_raise", date: HEUTE as SelfTest["date"], involved: 9, uninvolved: 21 },
  ];

  it("lädt die gespeicherte Messung in die Felder", () => {
    // Das Formular des Tageseintrags war einmal immer leer, und ein
    // nachgetragener Wert löschte, was daneben stand — gemeldet als
    // »Gespeichert.«. Hier ersetzt ein Upsert über (Episode, Testart, Tag).
    zeichnen(ACHILLES, VORHANDEN);
    expect((screen.getByLabelText(s.selfTest.involved) as HTMLInputElement).value).toBe("9");
    expect((screen.getByLabelText(s.selfTest.uninvolved) as HTMLInputElement).value).toBe("21");
  });

  it("sagt vorher, dass Speichern ersetzt", () => {
    zeichnen(ACHILLES, VORHANDEN);
    expect(document.querySelector("[data-replacing]")).toBeTruthy();
  });

  it("sagt es nicht, wenn für diesen Tag nichts dasteht", () => {
    zeichnen(ACHILLES, []);
    expect(document.querySelector("[data-replacing]")).toBeNull();
  });

  it("räumt die Felder, wenn die Testart woandershin zeigt", async () => {
    /**
     * Die Gegenrichtung, und ohne sie wäre das Vorladen ein Fehler statt einer
     * Hilfe: Die 9 aus dem Fersenheber bliebe stehen, während »Einbeinsprung«
     * gewählt ist — und würde als Sprungweite von neun Zentimetern gespeichert.
     */
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen(ACHILLES, VORHANDEN);

    await nutzer.selectOptions(screen.getByLabelText(s.selfTest.type), "single_hop");

    await waitFor(() =>
      expect((screen.getByLabelText(s.selfTest.involved) as HTMLInputElement).value).toBe(""),
    );
    expect(document.querySelector("[data-replacing]")).toBeNull();
  });
});

describe("der bisherige Verlauf", () => {
  it("sagt, wenn es nichts gibt", () => {
    zeichnen();
    expect(screen.getByText(s.selfTest.historyEmpty)).toBeTruthy();
  });

  it("listet jede Messung mit ihrer Einheit", () => {
    const drei: SelfTest[] = [
      { type: "calf_raise", date: "2026-07-01" as SelfTest["date"], involved: 9, uninvolved: 21 },
      { type: "calf_raise", date: "2026-07-22" as SelfTest["date"], involved: 14, uninvolved: 21 },
      { type: "single_hop", date: "2026-08-12" as SelfTest["date"], involved: 96, uninvolved: 122 },
    ];
    zeichnen(ACHILLES, drei);

    const liste = document.querySelector("[data-history]")!;
    expect(liste.querySelectorAll("li")).toHaveLength(3);
    // Die Einheit steht an jeder Zeile, nicht nur an der obersten: Der Verlauf
    // mischt Testarten, und »96 / 122« ohne Einheit neben »14 / 21« liest sich
    // als dieselbe Messung mit anderen Zahlen.
    expect(liste.textContent).toContain(s.selfTest.unitReps);
    expect(liste.textContent).toContain(s.selfTest.unitCm);
  });
});
