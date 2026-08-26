/**
 * Der einzige Weg in die App.
 *
 * ---------------------------------------------------------------------------
 * WARUM GERADE HIER EIN FALSCHER SATZ TEUER IST.
 *
 * Wer sich nicht anmelden kann, sieht nichts weiter von diesem Produkt. Und
 * die beiden Fehlschläge verlangen entgegengesetztes Handeln: »Das sieht nicht
 * nach einer E-Mail-Adresse aus« heisst *ändere etwas*, »Der Link konnte nicht
 * gesendet werden« heisst *versuch es genauso nochmal*. Sie zu vertauschen
 * schickt jemanden in die falsche Richtung, während er ausgesperrt ist.
 *
 * Die beiden Prüfungen unten sind deshalb gegenseitige Gegenproben: Ein
 * Bauteil, das immer denselben Satz zeigt, fällt bei einer von beiden durch.
 * ---------------------------------------------------------------------------
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInForm } from "@/components/SignInForm";
import { t } from "@/i18n/dictionary";

vi.mock("@/app/actions/auth", () => ({
  requestSignInLink: vi.fn(),
}));
import { requestSignInLink } from "@/app/actions/auth";

const anfordern = vi.mocked(requestSignInLink);
const s = t("de");

const zeichnen = () => render(<SignInForm locale="de" strings={s.auth} />);
const knopf = () => screen.getByRole("button", { name: s.auth.send });

async function absenden() {
  const nutzer = userEvent.setup();
  zeichnen();
  await nutzer.type(screen.getByLabelText(s.auth.emailLabel), "wade@example.test");
  await nutzer.click(knopf());
}

beforeEach(() => {
  anfordern.mockReset();
});

describe("SignInForm", () => {
  it("nennt bei einer unbrauchbaren Adresse genau das", async () => {
    anfordern.mockResolvedValue({ ok: false, reason: "invalid-email" });
    await absenden();

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(s.auth.invalidEmail));
    expect(screen.queryByText(s.auth.sendFailed)).toBeNull();
  });

  it("und bei einem gescheiterten Versand den anderen Satz", async () => {
    anfordern.mockResolvedValue({ ok: false, reason: "send-failed" });
    await absenden();

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(s.auth.sendFailed));
    expect(screen.queryByText(s.auth.invalidEmail)).toBeNull();
  });

  it("verbindet den Fehlschlag mit dem Feld, zu dem er gehört", async () => {
    // Ein Satz, der neben einem Feld steht, wird von einer Vorlesesoftware
    // nicht mitgelesen — sie liest die Beschriftung. Ohne diese Verbindung
    // hört jemand »E-Mail-Adresse« und erfährt nie, was daran nicht ging.
    anfordern.mockResolvedValue({ ok: false, reason: "invalid-email" });
    await absenden();

    const feld = await screen.findByLabelText(s.auth.emailLabel);
    await waitFor(() => expect(feld.getAttribute("aria-invalid")).toBe("true"));
    const id = feld.getAttribute("aria-describedby");
    expect(id).not.toBeNull();
    expect(document.getElementById(id as string)?.textContent).toBe(s.auth.invalidEmail);
  });

  it("ohne Fehlschlag hängt am Feld kein Hinweis", () => {
    // Gegenprobe: Ein Feld, das immer auf einen Fehler zeigt, bestünde die
    // Prüfung darüber — und wäre für eine Vorlesesoftware dauerhaft kaputt.
    zeichnen();
    const feld = screen.getByLabelText(s.auth.emailLabel);
    expect(feld.getAttribute("aria-describedby")).toBeNull();
    expect(feld.getAttribute("aria-invalid")).toBeNull();
  });

  it("nach dem Versand steht das Formular nicht mehr da", async () => {
    // Sonst tippt jemand die Adresse ein zweites Mal, weil nichts sichtbar
    // passiert ist — und verbraucht dabei die Ratenbegrenzung, die für alle
    // gilt (siehe SICHERHEIT.md Punkt 5).
    anfordern.mockResolvedValue({ ok: true });
    await absenden();

    await waitFor(() => expect(screen.getByRole("status")).toBeDefined());
    expect(screen.getByText(s.auth.sent)).toBeDefined();
    expect(screen.getByText(s.auth.sentDetail)).toBeDefined();
    expect(screen.queryByRole("button", { name: s.auth.send })).toBeNull();
  });
});
