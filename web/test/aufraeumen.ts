/**
 * Läuft vor jeder Bauteildatei (`.test.tsx`).
 *
 * Testing Library räumt von selbst auf, wenn `afterEach` global verfügbar ist.
 * Hier ist es das nicht — dieses Projekt hat `globals` bewusst nicht gesetzt,
 * damit jede Testdatei zeigt, woher `describe` und `expect` kommen. Also wird
 * das Aufräumen von Hand angemeldet.
 *
 * Ohne diese Zeilen bleibt das Bauteil des vorigen Tests im Dokument stehen.
 * Das äussert sich nicht als »vergessen aufzuräumen«, sondern als
 * »getByRole findet zwei Knöpfe« — ein Fehlschlag, der auf die falsche Zeile
 * zeigt und in der falschen Datei gesucht wird.
 */
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
