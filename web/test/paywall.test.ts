import { describe, expect, it } from "vitest";
import {
  ALL_GATED_FEATURES,
  PAYWALL_TRIGGER,
  isLocked,
  paywallEnabled,
} from "@/lib/paywall";

/**
 * Die Bezahlschranke: gebaut, geprüft, aus.
 *
 * ---------------------------------------------------------------------------
 * ZWEI ZUSICHERUNGEN, UND DIE ZWEITE IST KEINE GESCHÄFTSENTSCHEIDUNG.
 *
 * 1. **Sie ist aus**, und zwar bei allem ausser einem ausdrücklichen »an«.
 *    Der Standardwert eines Schalters, den niemand kennt, muss der harmlose
 *    sein.
 *
 * 2. **Sie kann die eigenen Daten nicht verschliessen.** Export und
 *    Kontolöschung sind kein Leistungsmerkmal, sondern die Bedingung dafür,
 *    dass dieses Produkt jemandem angeboten werden darf. Das ist über den Typ
 *    erzwungen — und hier zusätzlich namentlich festgehalten, weil eine
 *    Union sich leise erweitern lässt.
 *
 * Dazu die Gegenprobe, ohne die der Rest nichts wert wäre: Die Schranke greift
 * nachweislich, wenn man sie einschaltet. Ein Schalter, der nie etwas tut, ist
 * kein ausgeschalteter Schalter — er ist keiner.
 * ---------------------------------------------------------------------------
 */

const AUS: Record<string, string | undefined> = {};
const AN: Record<string, string | undefined> = { LOADWISE_PAYWALL: "an" };

describe("aus, solange nicht ausdrücklich etwas anderes dasteht", () => {
  it("ist aus ohne die Variable", () => {
    expect(paywallEnabled(AUS)).toBe(false);
  });

  it("ist aus bei jedem anderen Wert", () => {
    /**
     * Ein versehentlich gesetztes `LOADWISE_PAYWALL=` oder `=false` würde bei
     * einer Prüfung auf »nicht leer« zu einer eingeschalteten Schranke. Das
     * ist die Sorte Fehler, die niemand beim Lesen sieht und jeder Nutzer.
     */
    for (const wert of ["", "false", "aus", "0", "true", "on", "ja", "AN"]) {
      expect(paywallEnabled({ LOADWISE_PAYWALL: wert }), wert).toBe(false);
    }
  });

  it("ist an bei genau »an«", () => {
    // Die Gegenprobe. Ohne sie wäre ein Schalter, der immer aus ist, von
    // einem funktionierenden nicht zu unterscheiden.
    expect(paywallEnabled(AN)).toBe(true);
  });
});

describe("was die Schranke verschliessen kann — und was nicht", () => {
  it("verschliesst nichts, solange sie aus ist", () => {
    for (const feature of ALL_GATED_FEATURES) {
      expect(isLocked(feature, AUS), feature).toBe(false);
    }
  });

  it("verschliesst die erklärten Merkmale, wenn sie an ist", () => {
    for (const feature of ALL_GATED_FEATURES) {
      expect(isLocked(feature, AN), feature).toBe(true);
    }
  });

  it("verschliesst NIE Export, Löschung, Tagebuch oder Datenschutz", () => {
    /**
     * DIE EINE GRENZE, DIE HIER KEINE GESCHÄFTSENTSCHEIDUNG IST.
     *
     * Export und Kontolöschung sind die Bedingung, unter der es diese App
     * geben darf — Gesundheitsdaten nach Art. 9 DSGVO, siehe E21. Das
     * Tagebuch bleibt frei, weil das Konzept es so entschieden hat.
     *
     * Der Typ erzwingt es bereits: `GatedFeature` ist eine geschlossene Union,
     * und diese Namen stehen nicht darin. Diese Prüfung hält es NAMENTLICH
     * fest, weil eine Union sich leise erweitern lässt — und weil ein
     * Compilerfehler an einer Stelle, die niemand anfasst, nie ausgelöst wird.
     */
    for (const verboten of ["export", "account-deletion", "diary", "privacy", "entry-form"]) {
      expect(
        (ALL_GATED_FEATURES as readonly string[]).includes(verboten),
        `»${verboten}« steht in ALL_GATED_FEATURES und darf dort nicht stehen`,
      ).toBe(false);
    }
  });

  it("lässt einen Namen offen, der gar nicht als verschliessbar erklärt ist", () => {
    // Zur Laufzeit ist ein Merkmalsname eine beliebige Zeichenkette — aus einer
    // Konfiguration, aus einem Pfadsegment. Was nicht ausdrücklich erklärt
    // wurde, bleibt offen: die sichere Richtung.
    expect(isLocked("export" as never, AN)).toBe(false);
    expect(isLocked("account-deletion" as never, AN)).toBe(false);
  });
});

describe("der Auslöser steht als Zahl da, nicht als »irgendwann«", () => {
  it("nennt fünfzig Personen und dreissig Tage", () => {
    /**
     * Aus `KONZEPT.md`: *»Die Bezahlschranke geht an, sobald 50 Personen
     * mindestens 30 Tage lang Einträge gemacht haben.«*
     *
     * Die Zahl hier festzuhalten ist die halbe Entscheidung: »Gratis, bis wir
     * viele Nutzer haben« ist laut demselben Abschnitt die häufigste Art, wie
     * ein Produkt nie Geld verdient.
     */
    expect(PAYWALL_TRIGGER.people).toBe(50);
    expect(PAYWALL_TRIGGER.days).toBe(30);
  });
});
