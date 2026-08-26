/**
 * Ins Archiv und zurück.
 *
 * Dieses Bauteil existiert nur aus einem Grund: damit ein Fehlschlag ankommt.
 * Ein `form action={...}` auf der Seite sähe nach dem Klick genauso aus wie ein
 * Erfolg — dieselbe Stille, die den Tageseintrag sechs Datenverluste gekostet
 * hat. Und der Fall ist real: Ein UPDATE, das der Zugriffsschutz verbietet,
 * liefert **keinen Fehler** (SICHERHEIT.md Punkt 2, an der echten Datenbank
 * gemessen). Wen es trifft, ist nicht der Angreifer, sondern die Person, deren
 * Sitzung mitten in einer Korrektur abgelaufen ist.
 *
 * Ein Bauteil, dessen einziger Zweck eine Rückmeldung ist, ohne eine Prüfung
 * dieser Rückmeldung, ist ein Kommentar.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArchiveButton } from "@/components/ArchiveButton";
import { t } from "@/i18n/dictionary";

vi.mock("@/app/actions/episodes", () => ({
  setEpisodeArchivedAction: vi.fn(),
}));
import { setEpisodeArchivedAction } from "@/app/actions/episodes";

const archivieren = vi.mocked(setEpisodeArchivedAction);
const s = t("de");

const zeichnen = (archived = false) =>
  render(
    <ArchiveButton
      locale="de"
      episodeId="e1"
      archived={archived}
      strings={s.edit}
      errorStrings={s.errors}
    />,
  );

beforeEach(() => {
  archivieren.mockReset();
});

describe("ArchiveButton", () => {
  it("meldet, wenn das Archivieren nicht durchging", async () => {
    archivieren.mockResolvedValue({ ok: false, reason: "failed" });
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.click(screen.getByRole("button", { name: s.edit.archive }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(s.errors.notSaved));
  });

  it("auch wenn der Aufruf abbricht", async () => {
    archivieren.mockRejectedValue(new Error("Verbindung weg"));
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.click(screen.getByRole("button", { name: s.edit.archive }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(s.errors.notSaved));
  });

  it("und schweigt, wenn es durchging", async () => {
    // Gegenprobe: Ein Bauteil, das den Satz immer zeigt, bestünde beide
    // Prüfungen darüber.
    archivieren.mockResolvedValue({ ok: true });
    const nutzer = userEvent.setup();
    zeichnen();

    await nutzer.click(screen.getByRole("button", { name: s.edit.archive }));
    await waitFor(() => expect(archivieren).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("eine archivierte Episode bietet das Zurückholen an", () => {
    zeichnen(true);
    expect(screen.getByRole("button", { name: s.edit.unarchive })).toBeDefined();
    expect(screen.queryByRole("button", { name: s.edit.archive })).toBeNull();
  });
});
