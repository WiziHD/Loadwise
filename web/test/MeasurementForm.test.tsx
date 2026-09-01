/**
 * Eigene Masse — das Formular.
 *
 * ---------------------------------------------------------------------------
 * DIE WICHTIGSTE PRÜFUNG HIER PRÜFT EINE ABWESENHEIT.
 *
 * Es darf keine Vorschlagsliste geben, was zu messen sich lohnt. `MeasureKey`
 * ist im Motor absichtlich ein offener String, und der Kommentar dort nennt den
 * Grund: Eine solche Liste wäre ein klinisches Kriterium. Sie hierher zu
 * schreiben wäre der bequemste Weg über die Grenze, um die sich das ganze
 * Projekt sonst bemüht — und er sähe aus wie Benutzerfreundlichkeit.
 * ---------------------------------------------------------------------------
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Measurement, Unit } from "loadwise-engine";
import { MeasurementForm } from "@/components/MeasurementForm";
import { t } from "@/i18n/dictionary";

vi.mock("@/app/actions/measurements", () => ({
  saveMeasurementAction: vi.fn(),
}));
import { saveMeasurementAction } from "@/app/actions/measurements";

const speichern = vi.mocked(saveMeasurementAction);
const s = t("de");

const HEUTE = "2026-08-20";
const UHR = new Date(2026, 7, 20, 10, 0, 0);

const BEKANNT: { key: string; unit: Unit }[] = [
  { key: "Stehen", unit: "min" },
  { key: "Kniebeugen", unit: "reps" },
];

function zeichnen(known = BEKANNT, existing: Measurement[] = []) {
  return render(
    <MeasurementForm
      locale="de"
      episodeId="e1"
      serverToday={HEUTE}
      known={known}
      existing={existing}
      strings={s.measure}
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

describe("die App schlägt kein Mass vor", () => {
  it("bietet bei einer leeren Episode gar nichts an", () => {
    // Nicht »eine kurze Liste zum Einstieg«. Gar nichts.
    zeichnen([]);
    const liste = document.querySelector("#measureKeys");
    expect(liste).toBeTruthy();
    expect(liste!.querySelectorAll("option")).toHaveLength(0);
  });

  it("bietet nur an, was der Nutzer selbst benannt hat", () => {
    zeichnen();
    const werte = [...document.querySelectorAll("#measureKeys option")].map((o) =>
      o.getAttribute("value"),
    );
    expect(werte.sort()).toEqual(["Kniebeugen", "Stehen"]);
  });

  it("lässt einen völlig neuen Namen zu", async () => {
    // Eine `datalist` schränkt nicht ein. Wäre es ein `select`, wäre die
    // Auswahl die Liste — und die Liste wäre dann doch eine Vorgabe.
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.measure.name), "Wie weit bis zum Briefkasten");
    await nutzer.type(screen.getByLabelText(s.measure.value), "120");
    await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

    await waitFor(() => expect(speichern).toHaveBeenCalled());
    expect(speichern.mock.calls[0]![2]).toMatchObject({ key: "Wie weit bis zum Briefkasten" });
  });
});

describe("die Einheit friert ein, sobald das Mass sie hat", () => {
  it("zeigt bei einem neuen Mass die Auswahl", () => {
    zeichnen();
    expect(screen.getByLabelText(s.measure.unit).tagName).toBe("SELECT");
  });

  it("ersetzt sie bei einem bekannten Mass durch die feste Einheit", async () => {
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.measure.name), "Stehen");

    await waitFor(() => expect(document.querySelector("[data-frozen]")).toBeTruthy());
    expect(document.querySelector("[data-frozen]")!.getAttribute("data-frozen")).toBe("min");
    // Auf `select` geprüft und nicht auf die Rolle `combobox`: Das Namensfeld
    // trägt `list=` und ist damit selbst ein Combobox. Die erste Fassung dieser
    // Zeile hat deshalb das Namensfeld gefunden und wäre auch dann rot
    // geworden, wenn die Sperre einwandfrei funktioniert.
    expect(document.querySelector("select")).toBeNull();
  });

  it("nennt die Einheit im Klartext, statt sie nur zu sperren", async () => {
    // Wer Sekunden tippen will, wo Minuten stehen, soll SEHEN warum — sonst
    // hält er das Formular für kaputt und probiert es weiter.
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.measure.name), "Stehen");
    await waitFor(() =>
      expect(document.querySelector("[data-frozen]")!.textContent).toContain(s.measure.unitMin),
    );
  });

  it("friert auch bei anderer Schreibweise ein", async () => {
    // Sonst liesse sich die Sperre mit einem kleinen s umgehen.
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.measure.name), "stehen");
    await waitFor(() => expect(document.querySelector("[data-frozen]")).toBeTruthy());
  });

  it("gibt das Feld wieder frei, wenn der Name woandershin zeigt", async () => {
    // Die Gegenrichtung. Ohne sie bliebe die Auswahl für immer gesperrt,
    // sobald jemand einmal ein bekanntes Mass getippt hat.
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen();

    const feld = screen.getByLabelText(s.measure.name);
    await nutzer.type(feld, "Stehen");
    await waitFor(() => expect(document.querySelector("[data-frozen]")).toBeTruthy());

    await nutzer.clear(feld);
    await nutzer.type(feld, "Halten");
    await waitFor(() => expect(document.querySelector("[data-frozen]")).toBeNull());
  });

  it("schickt die eingefrorene Einheit mit, nicht die zuletzt gewählte", async () => {
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen();

    // Erst eine Einheit wählen, DANN ein bekanntes Mass tippen. Ohne das
    // Nachziehen ginge »reps« ans Netz, während »Stehen« in Minuten geführt
    // wird — und die Server-Aktion lehnte ab, ohne dass jemand verstünde warum.
    await nutzer.selectOptions(screen.getByLabelText(s.measure.unit), "reps");
    await nutzer.type(screen.getByLabelText(s.measure.name), "Stehen");
    await nutzer.type(screen.getByLabelText(s.measure.value), "8");
    await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

    await waitFor(() => expect(speichern).toHaveBeenCalled());
    expect(speichern.mock.calls[0]![2]).toMatchObject({ key: "Stehen", unit: "min" });
  });
});

describe("der Wert", () => {
  it("schickt eine getippte Null als 0", async () => {
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.measure.name), "Kniebeugen");
    await nutzer.type(screen.getByLabelText(s.measure.value), "0");
    await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

    await waitFor(() => expect(speichern).toHaveBeenCalled());
    expect(speichern.mock.calls[0]![2]!.value).toBe(0);
  });

  it("schickt ein leeres Feld als null", async () => {
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.measure.name), "Kniebeugen");
    await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

    await waitFor(() => expect(speichern).toHaveBeenCalled());
    expect(speichern.mock.calls[0]![2]!.value).toBeNull();
  });

  it("macht aus einem Komma einen Punkt", async () => {
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen([]);

    await nutzer.type(screen.getByLabelText(s.measure.name), "Wand");
    await nutzer.selectOptions(screen.getByLabelText(s.measure.unit), "cm");
    await nutzer.type(screen.getByLabelText(s.measure.value), "9,5");
    await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

    await waitFor(() => expect(speichern).toHaveBeenCalled());
    expect(speichern.mock.calls[0]![2]!.value).toBe(9.5);
  });
});

describe("was die Aktion ablehnt, steht auf dem Bildschirm", () => {
  const faelle = [
    { grund: "unit-conflict", text: s.measure.unitConflict },
    { grund: "key-missing", text: s.measure.keyMissing },
    { grund: "value-missing", text: s.measure.valueMissing },
    { grund: "out-of-range", text: s.measure.outOfRange },
    { grund: "future-date", text: s.measure.futureDate },
  ] as const;

  for (const fall of faelle) {
    it(`zeigt »${fall.grund}«`, async () => {
      speichern.mockResolvedValue({ ok: false, reason: fall.grund });
      const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      zeichnen();

      await nutzer.type(screen.getByLabelText(s.measure.name), "Kniebeugen");
      await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

      await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(fall.text));
    });
  }

  it("sagt es auch, wenn der Aufruf gar nicht ankommt", async () => {
    speichern.mockRejectedValue(new Error("Netz"));
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.measure.name), "Kniebeugen");
    await nutzer.click(screen.getByRole("button", { name: s.actions.save }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(s.errors.notSaved));
  });
});

describe("was schon dasteht, steht im Formular", () => {
  const VORHANDEN: Measurement[] = [
    { key: "Kniebeugen", date: HEUTE as Measurement["date"], value: 12, unit: "reps" },
  ];

  it("lädt den gespeicherten Wert, sobald Name und Tag darauf zeigen", async () => {
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen(BEKANNT, VORHANDEN);

    await nutzer.type(screen.getByLabelText(s.measure.name), "Kniebeugen");
    await waitFor(() =>
      expect((screen.getByLabelText(s.measure.value) as HTMLInputElement).value).toBe("12"),
    );
  });

  it("sagt vorher, dass Speichern ersetzt", async () => {
    const nutzer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    zeichnen(BEKANNT, VORHANDEN);

    await nutzer.type(screen.getByLabelText(s.measure.name), "Kniebeugen");
    await waitFor(() => expect(document.querySelector("[data-replacing]")).toBeTruthy());
  });

  it("sagt es nicht, solange der Name auf nichts zeigt", () => {
    zeichnen(BEKANNT, VORHANDEN);
    expect(document.querySelector("[data-replacing]")).toBeNull();
  });

  it("listet jeden Wert mit Mass und Einheit", () => {
    const drei: Measurement[] = [
      { key: "Kniebeugen", date: "2026-07-01" as Measurement["date"], value: 8, unit: "reps" },
      { key: "Stehen", date: "2026-07-01" as Measurement["date"], value: 4, unit: "min" },
      { key: "Kniebeugen", date: "2026-08-01" as Measurement["date"], value: 15, unit: "reps" },
    ];
    zeichnen(BEKANNT, drei);

    const liste = document.querySelector("[data-history]")!;
    expect(liste.querySelectorAll("li")).toHaveLength(3);
    // Die Einheit an jeder Zeile: Der Verlauf mischt Masse, und »4« neben »8«
    // ohne Einheit liest sich als dieselbe Sorte Zahl.
    expect(liste.textContent).toContain(s.measure.unitMin);
    expect(liste.textContent).toContain(s.measure.unitReps);
  });

  it("sagt, wenn es nichts gibt", () => {
    zeichnen();
    expect(screen.getByText(s.measure.historyEmpty)).toBeTruthy();
  });
});
