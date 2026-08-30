/**
 * Kennt der gespeicherte Lauf den neuesten Tag?
 *
 * ---------------------------------------------------------------------------
 * DIESE PRÜFUNG SCHLIESST EIN VERSPRECHEN, DAS NUR IN EINEM KOMMENTAR STAND.
 *
 * `saveEntryAction` rechnet nach jedem Eintrag neu und schluckt einen
 * Fehlschlag dabei. Das ist richtig — der Tag ist gespeichert, und »konnte
 * nicht gespeichert werden« würde jemanden dazu bringen, ihn ein zweites Mal
 * einzutippen.
 *
 * Der Kommentar rechtfertigte das Schweigen aber so: *»gespeichert, aber das
 * Urteil hinkt« ist ein Satz für die Seite, die das Urteil zeigt. Karte 2.3
 * rendert es.* **Karte 2.3 hat es nicht gerendert.** Bis zur Abnahme von Woche
 * 2 gab es also einen Bildschirm, der ein Urteil ohne den neuesten Tag zeigte,
 * und nichts, was das sagte.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import type { StoredRun } from "@/lib/db/types";
import { runIsBehind } from "@/lib/run-freshness";

/** Nur die zwei Felder, um die es geht. Der Rest spielt für diese Frage keine Rolle. */
const lauf = (lastDate: string | null): StoredRun =>
  ({ lastDate }) as unknown as StoredRun;

describe("runIsBehind", () => {
  it("ein Lauf bis gestern kennt den heutigen Eintrag nicht", () => {
    expect(runIsBehind(lauf("2026-08-20"), "2026-08-21")).toBe(true);
  });

  it("ein Lauf bis zum neuesten Tag ist aktuell", () => {
    expect(runIsBehind(lauf("2026-08-21"), "2026-08-21")).toBe(false);
  });

  it("ohne Einträge gibt es nichts, wovon er zurückliegen könnte", () => {
    expect(runIsBehind(lauf(null), null)).toBe(false);
    expect(runIsBehind(lauf("2026-08-21"), null)).toBe(false);
  });

  it("ein Lauf über ein leeres Tagebuch kennt jeden späteren Eintrag nicht", () => {
    // `lastDate: null` heisst »hat über nichts gerechnet«. Gibt es inzwischen
    // einen Tag, ist der Lauf zurück — und ohne diese Zeile wäre der Vergleich
    // gegen null einfach falsch statt wahr.
    expect(runIsBehind(lauf(null), "2026-08-21")).toBe(true);
  });

  it("und ein Lauf, der WEITER reicht als das Tagebuch, gilt nicht als zurück", () => {
    // Gegenprobe zur Richtung des Vergleichs. Der Fall entsteht, wenn jemand
    // einen Tag korrigiert und dabei nach hinten datiert; das ist kein Grund,
    // einen Hinweis über Aktualität zu zeigen.
    expect(runIsBehind(lauf("2026-08-25"), "2026-08-21")).toBe(false);
  });
});
