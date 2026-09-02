/**
 * Die Sperrseite — was sie sagt, und was sie NICHT einschliesst.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIESER ZUSTAND EINEN TEST BRAUCHT, OBWOHL ER HEUTE NIE AUFTRITT.
 *
 * Die Bezahlschranke ist aus (`lib/paywall.ts`). Ein Zustand, den niemand
 * rendert, ist trotzdem ein Zustand, den irgendwann jemand sieht — und dann
 * zum ersten Mal, im Betrieb.
 *
 * Geprüft wird das eine, worauf es hier ankommt: Die Seite sagt nicht bloss
 * »nicht enthalten«, sondern zeigt auf derselben Seite den Weg zu den eigenen
 * Daten. Ohne diesen Link liest sich eine Sperre wie ein Datenverlust.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PrintLocked } from "@/components/PrintLocked";
import { t } from "@/i18n/dictionary";

function stelle(locale: "en" | "de") {
  const s = t(locale);
  render(
    <PrintLocked
      locale={locale}
      episodeId="ep-1"
      strings={{
        heading: s.print.heading,
        locked: s.print.locked,
        lockedHint: s.print.lockedHint,
        back: s.diary.back,
        dataLink: s.account.link,
      }}
    />,
  );
  return s;
}

describe("die Sperrseite", () => {
  it("sagt, dass der Bericht nicht zur kostenlosen Fassung gehört", () => {
    const s = stelle("de");
    expect(screen.queryByText(s.print.locked)).not.toBeNull();
  });

  it("zeigt den Weg zu den eigenen Daten — der Punkt der ganzen Seite", () => {
    // Die eigentliche Zusicherung: Die Schranke nimmt niemandem seine Daten.
    // Ein Satz darüber genügt nicht, wenn der Weg dorthin fehlt.
    const s = stelle("en");
    const link = screen.getByRole("link", { name: s.account.link });
    expect(link.getAttribute("href")).toBe("/en/account");
  });

  it("führt zurück zur Episode statt in eine Sackgasse", () => {
    const s = stelle("de");
    const zurueck = screen.getByRole("link", { name: `← ${s.diary.back}` });
    expect(zurueck.getAttribute("href")).toBe("/de/episodes/ep-1");
  });

  it("zeigt kein Urteil und keine Zahl aus dem Tagebuch", () => {
    // Gegenprobe zur Sperre selbst: Wenn hier Inhalte des Berichts stünden,
    // wäre die Schranke keine. Die Seite bekommt weder Lauf noch Einträge —
    // das Bauteil kann sie gar nicht annehmen. Hier festgehalten, weil ein
    // späteres »nur die Zusammenfassung zeigen« genau so anfängt.
    const s = stelle("de");
    expect(screen.queryByText(s.report.heading)).toBeNull();
  });
});
