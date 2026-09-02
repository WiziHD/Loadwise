/**
 * Das Löschformular — der eine Knopf in dieser App, der nichts zurücklässt.
 *
 * ---------------------------------------------------------------------------
 * HIER IST EIN FALSCHER GRÜNER TEST TEURER ALS SONST WO.
 *
 * Überall sonst kostet ein Fehler einen Eintrag oder ein Urteil. Hier kostet
 * er das Tagebuch eines Menschen, unwiderruflich und ohne Kopie. Deshalb
 * prüfen diese Zeilen vor allem, wann NICHT gelöscht wird.
 * ---------------------------------------------------------------------------
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { t } from "@/i18n/dictionary";

vi.mock("@/app/actions/account", () => ({ deleteAccountAction: vi.fn() }));
import { deleteAccountAction } from "@/app/actions/account";

const loeschen = vi.mocked(deleteAccountAction);
const s = t("de");

const zeichnen = () => render(<DeleteAccountForm locale="de" strings={s.account} />);
const knopf = () => screen.getByRole("button", { name: s.account.deleteButton });

beforeEach(() => {
  loeschen.mockReset();
  loeschen.mockResolvedValue({ ok: false, reason: "failed" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ohne das getippte Wort passiert nichts", () => {
  it("der Knopf ist gesperrt, solange das Feld leer ist", () => {
    zeichnen();
    expect((knopf() as HTMLButtonElement).disabled).toBe(true);
  });

  it("und bleibt gesperrt bei einem falschen Wort", async () => {
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.account.deleteConfirmLabel), "loeschen bitte");
    expect((knopf() as HTMLButtonElement).disabled).toBe(true);
  });

  it("die Aktion wird dabei nie aufgerufen", async () => {
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.account.deleteConfirmLabel), "x");
    await nutzer.click(knopf());
    expect(loeschen).not.toHaveBeenCalled();
  });

  it("gibt den Knopf frei, sobald das Wort stimmt", async () => {
    // Die Gegenprobe. Ohne sie könnte der Knopf für immer gesperrt sein und
    // die drei Prüfungen darüber wären trotzdem grün.
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.account.deleteConfirmLabel), s.account.deleteConfirmWord);
    await waitFor(() => expect((knopf() as HTMLButtonElement).disabled).toBe(false));
  });

  it("und nimmt das Wort auch klein geschrieben an", async () => {
    // Wer »löschen« statt »LÖSCHEN« tippt, hat verstanden, worum es geht. Ihn
    // an der Grossschreibung scheitern zu lassen wäre eine Hürde ohne Zweck.
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.type(
      screen.getByLabelText(s.account.deleteConfirmLabel),
      s.account.deleteConfirmWord.toLowerCase(),
    );
    await waitFor(() => expect((knopf() as HTMLButtonElement).disabled).toBe(false));
  });
});

describe("was die Aktion zurückmeldet, steht auf dem Bildschirm", () => {
  it("zeigt »Wort stimmt nicht«", async () => {
    loeschen.mockResolvedValue({ ok: false, reason: "not-confirmed" });
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.account.deleteConfirmLabel), s.account.deleteConfirmWord);
    await nutzer.click(knopf());

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(s.account.deleteNotConfirmed),
    );
  });

  it("und »ist nicht durchgegangen«", async () => {
    loeschen.mockResolvedValue({ ok: false, reason: "failed" });
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.account.deleteConfirmLabel), s.account.deleteConfirmWord);
    await nutzer.click(knopf());

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(s.account.deleteFailed));
  });

  it("beide Meldungen sagen, dass nichts gelöscht wurde", () => {
    /**
     * Der wichtigste Satz an dieser Stelle. »Fehlgeschlagen« allein liesse
     * jemanden im Unklaren, ob sein Tagebuch noch da ist — und zwar an dem
     * Punkt, an dem er es am dringendsten wissen will.
     */
    expect(s.account.deleteNotConfirmed).toContain("nichts gelöscht");
    expect(s.account.deleteFailed).toContain("nichts gelöscht");
  });
});

describe("der Erfolgsfall", () => {
  it("wird nicht als Fehler gezeigt", async () => {
    /**
     * Gelingt das Löschen, leitet die Aktion weiter — und `redirect` wirft.
     * Ein `catch`, das daraus eine Fehlermeldung machte, zeigte jemandem
     * »ist nicht durchgegangen«, während sein Konto gerade verschwunden ist.
     */
    loeschen.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.account.deleteConfirmLabel), s.account.deleteConfirmWord);
    await nutzer.click(knopf());

    await waitFor(() => expect(loeschen).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("schickt das getippte Wort und das erwartete mit", async () => {
    // Das erwartete Wort kommt aus der Sprache der Seite. Es in der Aktion
    // fest zu verdrahten hiesse, dass eine deutsche Oberfläche ein englisches
    // Wort verlangt.
    loeschen.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.type(screen.getByLabelText(s.account.deleteConfirmLabel), s.account.deleteConfirmWord);
    await nutzer.click(knopf());

    await waitFor(() => expect(loeschen).toHaveBeenCalled());
    expect(loeschen.mock.calls[0]).toEqual([
      "de",
      s.account.deleteConfirmWord,
      s.account.deleteConfirmWord,
    ]);
  });
});

describe("der Warnsatz steht vor dem Feld, nicht darunter", () => {
  it("nennt, was verschwindet, und dass es keine Kopie gibt", () => {
    zeichnen();
    const text = document.body.textContent!;
    expect(text).toContain(s.account.deleteIntro);
    expect(s.account.deleteIntro).toContain("keine Kopie");
  });

  it("und weist auf die Sicherung hin", () => {
    // E5: Löschen darf nur, wer vorher exportieren konnte. Der Satz ist die
    // Stelle, an der diese Regel dem Menschen begegnet.
    expect(s.account.deleteIntro).toContain("Sicherung");
  });
});
