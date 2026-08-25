/**
 * Das zweite Argument von `npm run tagebuch`.
 *
 * ---------------------------------------------------------------------------
 * ES WAR EINE KÖRPERREGION, UND DAS WAR SEIT DEM REGISTRY-UMBAU ZU WENIG.
 *
 * Profile werden nach SCHLÜSSEL geführt, seit sich mehrere eine Region teilen.
 * Wer hier eine Region angab, bekam immer das Standardprofil — die anderen
 * waren von diesem Werkzeug aus unerreichbar.
 *
 * Warum das mehr ist als ein Bedienfehler: Dieses Werkzeug ist der Weg, auf
 * dem ein echtes Tagebuch in den Motor kommt, also der Weg für Schritt 5 des
 * Profilverfahrens — den EINZIGEN Schritt, der Schwellen wirklich validiert.
 * Ein Validierungsschritt, der das zu validierende Profil nicht auswählen
 * kann, validiert nichts.
 *
 * Gefunden bei der Abnahme der ersten Woche, nicht von einer Prüfung: Der
 * Aufruf steht so im Fahrplan, und er scheiterte mit »Unbekannte Körperregion
 * »achilles_midportion««.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { kontextAus } from "../src/tagebuch.js";
import { ALL_PROFILES, DEFAULT_PROFILE_FOR } from "../src/profiles/registry.js";

describe("ein Profilschlüssel", () => {
  it("wird zu Region UND Schlüssel", () => {
    const k = kontextAus("achilles_midportion");
    expect(k).toEqual({ bodyRegion: "achilles", profileKey: "achilles_midportion" });
  });

  it("erreicht auch ein Profil, das nicht der Standard seiner Region ist", () => {
    // Der eigentliche Punkt. Zwei Profile teilen sich `knee`; über die Region
    // ist immer nur eines von beiden erreichbar.
    const geteilt = ALL_PROFILES.filter((p) => p.bodyRegion === "knee");
    expect(geteilt.length).toBeGreaterThan(1);

    const nichtStandard = geteilt.find((p) => p.key !== DEFAULT_PROFILE_FOR.knee);
    if (nichtStandard === undefined) throw new Error("unerreichbar");

    const k = kontextAus(nichtStandard.key);
    expect(k).toEqual({ bodyRegion: "knee", profileKey: nichtStandard.key });
  });

  it("gilt für jedes registrierte Profil", () => {
    for (const p of ALL_PROFILES) {
      expect(kontextAus(p.key), p.key).toEqual({
        bodyRegion: p.bodyRegion,
        profileKey: p.key,
      });
    }
  });
});

describe("eine Körperregion", () => {
  it("bleibt zulässig — der alte Aufruf steht in Dokumenten", () => {
    // Ihn stillschweigend zu brechen wäre derselbe Fehler in klein.
    expect(kontextAus("patella")).toEqual({ bodyRegion: "patella" });
  });

  it("und ohne Argument gilt »nicht näher bestimmt«", () => {
    expect(kontextAus(undefined)).toEqual({ bodyRegion: "other" });
  });
});

describe("alles andere", () => {
  it("wird gemeldet, statt still zum Standardprofil zu werden", () => {
    const k = kontextAus("gibt_es_nicht");
    expect(k).toHaveProperty("fehler");
    if (!("fehler" in k)) throw new Error("unerreichbar");
    // Die Meldung muss nennen, was erlaubt ist — sonst rät man weiter.
    expect(k.fehler).toContain("achilles_midportion");
    expect(k.fehler).toContain("patella");
  });

  it("verwechselt einen Tippfehler nicht mit einer Region", () => {
    expect(kontextAus("achilles_midportio")).toHaveProperty("fehler");
    expect(kontextAus("Achilles")).toHaveProperty("fehler");
  });
});
