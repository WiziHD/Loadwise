/**
 * Das Wörterbuch der App.
 *
 * Dass beide Sprachen dieselben Schlüssel tragen, garantiert der Typ
 * (`Record<Locale, Strings>`) — eine fehlende Sprache ist ein Übersetzungs-
 * fehler, kein Testfall. Was der Typ NICHT sieht, steht hier:
 *
 *   - ein Eintrag, der leer ist
 *   - ein Eintrag, der in beiden Sprachen gleich lautet, also nie übersetzt
 *     wurde und nur so aussieht
 *
 * Der zweite Fall ist der, der durchrutscht: Ein kopierter englischer Satz im
 * deutschen Block sieht im Code völlig normal aus.
 */

import { describe, expect, it } from "vitest";
import { DICTIONARY, t } from "@/i18n/dictionary";
import { LOCALES } from "@/i18n/config";

/** Jeder Satz im Wörterbuch, mit seinem Pfad. */
function walk(value: unknown, path: string[] = []): Array<{ path: string; text: string }> {
  if (typeof value === "string") return [{ path: path.join("."), text: value }];
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, inner]) => walk(inner, [...path, key]));
}

/**
 * Was in beiden Sprachen gleich sein DARF.
 *
 * Kurz und mit Begründung gehalten: Jeder Eintrag hier ist eine Ausnahme von
 * der Regel, und eine Ausnahmeliste, die wächst, ist eine Regel, die stirbt.
 */
const GLEICH_ERLAUBT = new Set([
  "appName", // Ein Produktname wird nicht übersetzt.
  "entry.everydayNormal", // »Normal« ist in beiden Sprachen dasselbe Wort.
]);

describe("kein Eintrag ist leer", () => {
  for (const locale of LOCALES) {
    it(`${locale}`, () => {
      for (const { path, text } of walk(t(locale))) {
        expect(text.trim(), `${locale}: ${path} ist leer`).not.toBe("");
      }
    });
  }
});

describe("kein Eintrag ist bloss kopiert statt übersetzt", () => {
  it("deutsch und englisch unterscheiden sich überall, wo sie es sollen", () => {
    const de = new Map(walk(DICTIONARY.de).map((e) => [e.path, e.text]));
    const en = new Map(walk(DICTIONARY.en).map((e) => [e.path, e.text]));

    const gleich: string[] = [];
    for (const [path, text] of de) {
      if (GLEICH_ERLAUBT.has(path)) continue;
      if (en.get(path) === text) gleich.push(`${path}: "${text}"`);
    }

    expect(gleich, `Diese Einträge lauten in beiden Sprachen gleich:\n  ${gleich.join("\n  ")}`)
      .toEqual([]);
  });

  it("und die Ausnahmeliste enthält nichts Erfundenes", () => {
    // Eine Ausnahme für einen Schlüssel, den es nicht mehr gibt, verdeckt
    // später einen echten Fund.
    const alle = new Set(walk(DICTIONARY.de).map((e) => e.path));
    for (const path of GLEICH_ERLAUBT) {
      expect(alle.has(path), `Ausnahme für ${path}, den es nicht gibt`).toBe(true);
    }
  });
});

describe("t()", () => {
  it("liefert für jede Sprache ein Wörterbuch", () => {
    for (const locale of LOCALES) {
      expect(t(locale)).toBe(DICTIONARY[locale]);
    }
  });
});
