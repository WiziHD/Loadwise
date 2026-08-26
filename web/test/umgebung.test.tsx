/**
 * Die jsdom-Hälfte. Siehe `umgebung.test.ts` für die Begründung des Paars.
 *
 * Zusätzlich zur Umgebung wird hier das Aufräumen geprüft: `aufraeumen.ts`
 * meldet `cleanup` von Hand an, weil dieses Projekt `globals` nicht setzt.
 * Fehlt es, steht das Bauteil des vorigen Tests noch im Dokument — und der
 * Fehlschlag zeigt dann auf eine ganz andere Datei.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

describe("die Bauteilumgebung", () => {
  it("hat ein Dokument", () => {
    expect(typeof document).toBe("object");
  });

  it("rendert ein Bauteil", () => {
    render(<p>Wade</p>);
    expect(screen.getByText("Wade")).toBeDefined();
  });

  it("und der vorige Test steht nicht mehr da", () => {
    expect(screen.queryByText("Wade")).toBeNull();
  });
});
