/**
 * Welche Sprache ein Pfad bekommt — und welcher keine bekommen darf.
 *
 * ---------------------------------------------------------------------------
 * HIER SASS DER FEHLER, DER JEDEN ANMELDELINK ZERSTÖRT HAT.
 *
 * Die Umleitung hängte vor jeden Pfad ohne Sprachpräfix eine Sprache — auch vor
 * `/auth/callback`, das absichtlich ausserhalb von `[locale]` liegt, weil seine
 * Adresse in einer E-Mail steht, die Tage später geöffnet wird. Aus dem Link
 * wurde `/de/auth/callback`, das es nicht gibt, und jeder Anmeldeversuch endete
 * in einem 404.
 *
 * Die Route sagte in ihrem eigenen Kommentar, sie liege bewusst ausserhalb. Es
 * hat nichts genützt: Ein Kommentar ist kein Wächter. Diese Datei ist einer.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, isLocale, localeFrom, localeRouteFor, preferredLocale } from "@/i18n/config";

describe("der Anmeldecallback darf keine Sprache bekommen", () => {
  it("leitet /auth/callback nicht um", () => {
    expect(localeRouteFor("/auth/callback", "de").redirectTo).toBeNull();
  });

  it("gilt für alles unter /auth", () => {
    expect(localeRouteFor("/auth/confirm", null).redirectTo).toBeNull();
    expect(localeRouteFor("/auth", null).redirectTo).toBeNull();
  });

  it("nennt trotzdem eine Sprache, weil die Kopfzeile sie braucht", () => {
    // Die Nicht-gefunden-Grenze bekommt nie Routenparameter. Ohne diese
    // Kopfzeile wäre der 404 die einzige Seite des Produkts, die nicht weiss,
    // in welcher Sprache sie steht.
    expect(localeRouteFor("/auth/callback", "de-CH,de;q=0.9").locale).toBe("de");
  });
});

describe("alles andere ohne Sprachpräfix wird umgeleitet", () => {
  it("leitet die Wurzel auf die gewünschte Sprache", () => {
    expect(localeRouteFor("/", "de").redirectTo).toBe("/de");
    expect(localeRouteFor("/", "en").redirectTo).toBe("/en");
  });

  it("behält den Pfad beim Umleiten", () => {
    expect(localeRouteFor("/episodes/abc", "de").redirectTo).toBe("/de/episodes/abc");
  });

  it("lässt einen Pfad in Ruhe, der schon eine Sprache trägt", () => {
    expect(localeRouteFor("/de/episodes/abc", "en").redirectTo).toBeNull();
    // Und zwar die aus dem Pfad, nicht die aus dem Browser. Wer einen Link in
    // einer Sprache bekommt, soll ihn in dieser Sprache sehen.
    expect(localeRouteFor("/de/episodes/abc", "en").locale).toBe("de");
  });
});

describe("preferredLocale liest den Accept-Language-Header", () => {
  it("nimmt die erste unterstützte Sprache in der gewünschten Reihenfolge", () => {
    expect(preferredLocale("de-CH,de;q=0.9,en;q=0.8")).toBe("de");
    expect(preferredLocale("en-GB,en;q=0.9,de;q=0.8")).toBe("en");
  });

  it("achtet auf die Gewichtung und nicht auf die Reihenfolge im Text", () => {
    // Ein Browser darf die Einträge in beliebiger Reihenfolge senden; die
    // q-Werte entscheiden. Eine Zerlegung, die nur den ersten Eintrag nimmt,
    // läge hier falsch.
    expect(preferredLocale("en;q=0.3,de;q=0.9")).toBe("de");
  });

  it("überspringt Sprachen, die es hier nicht gibt", () => {
    expect(preferredLocale("fr-CH,fr;q=0.9,de;q=0.5")).toBe("de");
  });

  it("fällt auf die Standardsprache zurück, wenn nichts passt", () => {
    expect(preferredLocale("fr,it,ja")).toBe(DEFAULT_LOCALE);
    expect(preferredLocale(null)).toBe(DEFAULT_LOCALE);
    expect(preferredLocale("")).toBe(DEFAULT_LOCALE);
  });

  it("stolpert nicht über Unfug", () => {
    // Ein Header kommt aus dem Netz. Er darf alles sein.
    expect(preferredLocale(",,,")).toBe(DEFAULT_LOCALE);
    expect(preferredLocale("de;q=abc")).toBe(DEFAULT_LOCALE);
    expect(preferredLocale(";;;q=")).toBe(DEFAULT_LOCALE);
  });
});

describe("localeFrom und isLocale", () => {
  it("nimmt an, was es gibt", () => {
    expect(localeFrom("de")).toBe("de");
    expect(localeFrom("en")).toBe("en");
  });

  it("fällt bei allem anderen auf die Standardsprache zurück", () => {
    expect(localeFrom("fr")).toBe(DEFAULT_LOCALE);
    expect(localeFrom(undefined)).toBe(DEFAULT_LOCALE);
    expect(localeFrom("")).toBe(DEFAULT_LOCALE);
  });

  it("isLocale ist streng", () => {
    expect(isLocale("de")).toBe(true);
    expect(isLocale("DE")).toBe(false);
    expect(isLocale("de-CH")).toBe(false);
  });
});
