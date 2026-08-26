/**
 * Die node-Hälfte eines Paars. Das Gegenstück heisst `umgebung.test.tsx`.
 *
 * ---------------------------------------------------------------------------
 * WARUM EINE TESTDATEI DIE TESTUMGEBUNG PRÜFT.
 *
 * `vitest.config.mts` behauptet: `.test.ts` läuft ohne Dokument, `.test.tsx`
 * mit. Diese Behauptung trägt eine Sicherung — ein Servermodul, das nach
 * `document` greift, soll hier auffliegen und nicht im Betrieb.
 *
 * Eine Sicherung, die niemand prüft, ist in diesem Projekt Dekoration. Fiele
 * die Trennung morgen weg — jemand setzt `environment: "jsdom"` für alles —,
 * bräche kein einziger anderer Test. Diese zwei Dateien brechen.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";

describe("die reine Umgebung", () => {
  it("hat kein Dokument", () => {
    expect(typeof document).toBe("undefined");
  });

  it("und kein Fenster", () => {
    expect(typeof window).toBe("undefined");
  });
});
