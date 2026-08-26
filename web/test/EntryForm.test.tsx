/**
 * Das Formular, das öfter benutzt wird als alles andere zusammen.
 *
 * ---------------------------------------------------------------------------
 * DREI DER SECHS DATENVERLUSTE LAGEN GENAU HIER — UND KEINER WAR EIN
 * LOGIKFEHLER.
 *
 * Der Kopf von `EntryForm.tsx` führt sie auf: React 19 leerte nach einem
 * FEHLGESCHLAGENEN Absenden das Formular; der Zustand `failed` wurde gesetzt
 * und nie gezeigt; und ein leeres Formular überschrieb eine bereits erfasste
 * Einheit mit null — bei gemeldetem »Gespeichert.«
 *
 * Alle drei sind behoben, und alle drei waren bis heute **von nichts
 * gesichert**. Ein Umbau, der sie zurückbringt, hätte 93 grüne Tests gehabt.
 *
 * Diese Datei ist das Netz darunter. Jede Prüfung hier hat ein reales
 * Gegenstück in der Fehlerliste.
 * ---------------------------------------------------------------------------
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Entry } from "loadwise-engine";
import { EntryForm } from "@/components/EntryForm";
import { t } from "@/i18n/dictionary";

// Die Server-Aktion ist ein HTTP-Endpunkt und redet mit der Datenbank. Hier
// wird geprüft, was das Bauteil aus ihrer ANTWORT macht — nicht die Aktion.
vi.mock("@/app/actions/episodes", () => ({
  saveEntryAction: vi.fn(),
}));
import { saveEntryAction } from "@/app/actions/episodes";

const speichern = vi.mocked(saveEntryAction);
const s = t("de");

/**
 * Der Tag, an dem diese Tests spielen — eingefroren, und das ist Pflicht.
 *
 * `EntryForm` fragt beim Einhängen das GERÄT, welcher Tag ist, und korrigiert
 * damit die Schätzung des Servers (siehe `deviceToday`). Ohne feste Uhr hinge
 * jede Prüfung hier am Kalender des Rechners, auf dem sie läuft: Eine Fixtur
 * mit einem festen Datum wäre am Tag ihrer Entstehung grün und am nächsten
 * Morgen rot.
 *
 * `shouldAdvanceTime`, weil userEvent selbst Zeitgeber benutzt — eine
 * stehende Uhr liesse jeden Tastendruck hängen.
 */
const HEUTE = "2026-08-20";
const UHR = new Date(2026, 7, 20, 10, 0, 0);

function zeichnen(entries: Entry[] = []) {
  return render(
    <EntryForm
      locale="de"
      episodeId="e1"
      serverToday={HEUTE}
      entries={entries}
      strings={s.entry}
      errorStrings={s.errors}
      activityLabels={s.activities}
      saveLabel={s.actions.save}
    />,
  );
}

/** Ein Tag, der schon erfasst ist — mit einer Einheit, die verloren gehen kann. */
const ERFASSTER_TAG: Entry = {
  date: HEUTE,
  morningScore: 3,
  sessions: [{ activityKind: "cycle", durationMin: 75, rpe: 4 }],
  note: "Wade beim Antritt gespürt",
};

const knopf = () => screen.getByRole("button", { name: s.actions.save });
const tippen = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

beforeEach(() => {
  speichern.mockReset();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(UHR);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EntryForm — wenn das Speichern schiefgeht", () => {
  it("sagt es, statt zu schweigen", async () => {
    speichern.mockResolvedValue({ ok: false, reason: "failed" });
    const nutzer = tippen();
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.entry.morning), "4");
    await nutzer.click(knopf());

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(s.errors.notSaved));
    // Die Gegenprobe zur Zeile darüber: Ein Bauteil, das immer »Gespeichert.«
    // sagt, bestünde die erste Zusicherung nicht — aber eines, das GAR nichts
    // unterscheidet, käme durch. Deshalb wird auch das Gegenteil geprüft.
    expect(screen.queryByText(s.entry.saved)).toBeNull();
  });

  it("behält, was jemand getippt hat", async () => {
    speichern.mockResolvedValue({ ok: false, reason: "load-incomplete" });
    const nutzer = tippen();
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.entry.morning), "4");
    await nutzer.type(screen.getByLabelText(s.entry.note), "Wade zog beim Antritt");
    await nutzer.click(knopf());

    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());

    // Der eigentliche Fund: Der Hinweis erklärte, was auszufüllen sei — und
    // die Felder, auf die er sich bezog, hatte React schon geleert.
    expect((screen.getByLabelText(s.entry.morning) as HTMLInputElement).value).toBe("4");
    expect((screen.getByLabelText(s.entry.note) as HTMLTextAreaElement).value).toBe(
      "Wade zog beim Antritt",
    );
    expect((screen.getByLabelText(s.entry.date) as HTMLInputElement).value).toBe(HEUTE);
  });

  it("auch dann, wenn die Aktion gar nicht erst ankommt", async () => {
    // saveEntryAction liefert `failed` nur für Fehler, die WÄHREND des Laufs
    // auftraten. Eine tote Verbindung, eine Auslieferung mitten im Absenden
    // oder ein 500er lassen den Aufruf abbrechen. Ohne den catch im Bauteil
    // bliebe das unbehandelt, der Knopf ginge auf, und nichts erschiene.
    speichern.mockRejectedValue(new Error("Verbindung weg"));
    const nutzer = tippen();
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.entry.morning), "4");
    await nutzer.click(knopf());

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(s.errors.notSaved));
  });
});

describe("EntryForm — wenn es klappt", () => {
  it("sagt genau das", async () => {
    speichern.mockResolvedValue({ ok: true });
    const nutzer = tippen();
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.entry.morning), "4");
    await nutzer.click(knopf());

    // role="status" und nicht "alert": Eine Vorlesesoftware unterbricht bei
    // einer Warnung und wartet bei einer Meldung. »Gespeichert.« ist keine
    // Warnung.
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe(s.entry.saved));
    expect(screen.queryByText(s.errors.notSaved)).toBeNull();
  });
});

describe("EntryForm — ein Tag, der schon erfasst ist", () => {
  it("steht im Formular, statt leer zu sein", () => {
    zeichnen([ERFASSTER_TAG]);

    // DER TEUERSTE DER SECHS FUNDE. `saveEntry` schreibt die GANZE Zeile. Ein
    // leeres Formular für einen Tag mit »Velofahren 75′ · Anstrengung 4« machte
    // daraus »keine Aktivität« — und meldete Erfolg. Für den Motor wird die
    // Last des Tages still null, und die 24-Stunden-Regel verliert genau den
    // Trainingstag, für den es sie gibt.
    expect((screen.getByLabelText(s.entry.morning) as HTMLInputElement).value).toBe("3");
    expect(screen.getByDisplayValue(s.activities.cycle)).toBeDefined();
    expect(screen.getByDisplayValue("75")).toBeDefined();
    expect(screen.getByDisplayValue("4")).toBeDefined();
  });

  it("und sagt vorher, dass Speichern ihn ersetzt", () => {
    zeichnen([ERFASSTER_TAG]);
    expect(screen.getByText(s.entry.replacing)).toBeDefined();
  });

  it("ein Tag ohne Eintrag sagt das nicht", () => {
    // Gegenprobe: Ein Bauteil, das den Hinweis immer zeigt, bestünde die
    // Prüfung darüber ebenso.
    zeichnen();
    expect(screen.queryByText(s.entry.replacing)).toBeNull();
  });
});

describe("EntryForm — welcher Tag ist überhaupt", () => {
it("korrigiert die Schätzung des Servers", () => {
    // DER FEHLER, DER SICH IN DER ENTWICKLUNG NICHT ZEIGEN KANN: Dort sind
    // Server und Browser dieselbe Maschine. Ein Host, der in UTC läuft,
    // antwortet »gestern« für jeden östlich von Greenwich, der nach seiner
    // eigenen Mitternacht erfasst — also genau dann, wenn jemand einen
    // Trainingstag einträgt. Aufgefallen wäre es zum ersten Mal im Betrieb,
    // still, an den Tagen, die für die 24-Stunden-Regel am meisten zählen.
    //
    // Der Server rät »gestern«; erfasst ist der heutige Tag. Ohne die
    // Korrektur stünde ein leeres Formular für einen Tag, der schon Daten hat.
    render(
      <EntryForm
        locale="de"
        episodeId="e1"
        serverToday="2026-08-19"
        entries={[ERFASSTER_TAG]}
        strings={s.entry}
        errorStrings={s.errors}
        activityLabels={s.activities}
        saveLabel={s.actions.save}
      />,
    );
    expect((screen.getByLabelText(s.entry.date) as HTMLInputElement).value).toBe(HEUTE);
    expect(screen.getByText(s.entry.replacing)).toBeDefined();
  });

  it("und springt nicht, wenn der Server schon richtig lag", () => {
    // Die andere Richtung, und sie ist keine Zierde: Diese Prüfung stand hier
    // zuerst mit `serverToday = HEUTE` als angebliche Prüfung der KORREKTUR —
    // und war damit leer. Wo Server und Gerät sich einig sind, ändert das
    // Abschalten der Korrektur nichts, also konnte sie nicht fehlschlagen.
    //
    // Aufgefallen ist das erst beim Mutationslauf: Die Mutation »das Gerät
    // korrigiert nicht« riss nur EINE der beiden Prüfungen um. Was sie hier
    // jetzt prüft, ist das Gegenteil und fällt bei einer Korrektur, die immer
    // zuschlägt: Das Formular darf einem nicht unter den Fingern wegspringen.
    zeichnen([ERFASSTER_TAG]);
    expect((screen.getByLabelText(s.entry.date) as HTMLInputElement).value).toBe(HEUTE);
    expect((screen.getByLabelText(s.entry.morning) as HTMLInputElement).value).toBe("3");
  });
});

describe("EntryForm — ohne Verbindung", () => {
  it("wird gar nicht erst gesendet", async () => {
    const echt = Object.getOwnPropertyDescriptor(Navigator.prototype, "onLine");
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    try {
      const nutzer = tippen();
      zeichnen();

      await nutzer.type(screen.getByLabelText(s.entry.morning), "4");
      await nutzer.click(knopf());

      await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(s.errors.offline));
      // Die wichtigere Hälfte: »Bitte noch einmal« zu jemandem ohne Verbindung
      // ist eine Lüge mit einem Knopf daran. Es darf nichts abgeschickt worden
      // sein, gegen das man es erneut versuchen könnte.
      expect(speichern).not.toHaveBeenCalled();
    } finally {
      if (echt !== undefined) Object.defineProperty(Navigator.prototype, "onLine", echt);
      delete (window.navigator as unknown as Record<string, unknown>).onLine;
    }
  });
});
