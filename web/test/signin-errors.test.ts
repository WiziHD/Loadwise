/**
 * Die Gründe, aus denen jemand auf der Anmeldeseite landet statt in der App.
 *
 * ---------------------------------------------------------------------------
 * EIN GRUND WURDE GESENDET UND NIE GEZEIGT.
 *
 * `auth/callback` leitet auf zwei Codes um. Die Seite rannte einen ab. Wer mit
 * `missing-code` ankam, sah eine Seite, auf der nichts passiert war — kein
 * Fehler, kein Protokolleintrag, keine Möglichkeit für die App, es zu merken.
 *
 * Diese Datei prüft, was der Typ nicht kann: dass zu jedem Grund ein Satz
 * existiert, dass er in BEIDEN Sprachen dasteht und dass die beiden Sprachen
 * nicht dieselbe kopierte Zeile sind.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { SIGNIN_ERRORS, signInErrorFrom, signInErrorText } from "@/lib/signin-errors";
import { DICTIONARY } from "@/i18n/dictionary";
import { LOCALES } from "@/i18n/config";

describe("signInErrorFrom", () => {
  it("erkennt jeden Grund, den der Rückweg schicken kann", () => {
    for (const grund of SIGNIN_ERRORS) {
      expect(signInErrorFrom(grund)).toBe(grund);
    }
  });

  it("macht aus etwas Unbekanntem keine Meldung", () => {
    // Ein Code aus einem alten Lesezeichen oder von Hand hingeschrieben. Dann
    // ist die gewöhnliche Anmeldeseite die richtige Antwort — eine erfundene
    // Fehlermeldung wäre eine Auskunft über etwas, das die App nicht weiss.
    expect(signInErrorFrom("gibt-es-nicht")).toBeNull();
    expect(signInErrorFrom("")).toBeNull();
    expect(signInErrorFrom(undefined)).toBeNull();
  });

  it("nimmt einen Grund nicht bloss, weil er ähnlich aussieht", () => {
    expect(signInErrorFrom("link-expired ")).toBeNull();
    expect(signInErrorFrom("LINK-EXPIRED")).toBeNull();
  });
});

describe("signInErrorText", () => {
  it("hat für jeden Grund in jeder Sprache einen Satz", () => {
    for (const locale of LOCALES) {
      for (const grund of SIGNIN_ERRORS) {
        const text = signInErrorText(grund, DICTIONARY[locale].auth);
        expect(text.trim(), `${locale}: ${grund}`).not.toBe("");
      }
    }
  });

  it("sagt zu verschiedenen Gründen Verschiedenes", () => {
    // Sonst wäre der zweite Grund zwar abgedeckt und trotzdem unsichtbar —
    // genau der Zustand, den diese Karte beendet, nur eine Ebene tiefer.
    for (const locale of LOCALES) {
      const saetze = SIGNIN_ERRORS.map((g) => signInErrorText(g, DICTIONARY[locale].auth));
      expect(new Set(saetze).size, `${locale}`).toBe(SIGNIN_ERRORS.length);
    }
  });

  it("ist übersetzt und nicht kopiert", () => {
    for (const grund of SIGNIN_ERRORS) {
      expect(signInErrorText(grund, DICTIONARY.de.auth)).not.toBe(
        signInErrorText(grund, DICTIONARY.en.auth),
      );
    }
  });
});
