/**
 * Welches Profil eine Episode trägt — und was passiert, wenn keines passt.
 *
 * ---------------------------------------------------------------------------
 * DER RÜCKFALL WAR STILL. JETZT SAGT ER SICH AN.
 *
 * `profileOf` nimmt zuerst das benannte Profil, dann das Standardprofil der
 * Körperregion. Der zweite Fall tritt ein, sobald ein Profilschlüssel umbenannt
 * oder entfernt wird — und dann wird die Episode unter einem ANDEREN Profil
 * beurteilt. Zwei Profile teilen sich `knee`.
 *
 * Der Rückfall selbst ist richtig: Eine Episode ganz ohne Profil wäre schlimmer
 * als eine mit dem Standardprofil der Region. Falsch war, dass nichts es sagte.
 * Wer eine Patellasehne führt, bekam »patellofemorales Schmerzsyndrom« in der
 * Überschrift — ohne Kennzeichen, von einem Gesundheitstagebuch.
 *
 * Deshalb liefert `profileOf` ein Paar. Wer an das Profil will, muss an der
 * Kennzeichnung vorbei; den bequemen und falschen Aufruf gibt es nicht mehr.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { ALL_PROFILES, DEFAULT_PROFILE_FOR, profileFor } from "loadwise-engine";
import { profileOf, toPickerProfile } from "@/lib/profile-view";

describe("profileOf", () => {
  it("nimmt das benannte Profil", () => {
    const r = profileOf({ body_region: "knee", profile_key: "patellofemoral_pain" });
    expect(r.profile.key).toBe("patellofemoral_pain");
    expect(r.substituted).toBe(false);
  });

  it("nimmt das Standardprofil der Region, wenn keines benannt ist — ohne Warnung", () => {
    // Eine Episode aus der Zeit vor benannten Profilen. Die zu kennzeichnen
    // hiesse, auf jede alte Episode eine Warnung zu setzen — und damit allen
    // beizubringen, sie zu übersehen.
    const r = profileOf({ body_region: "achilles", profile_key: null });
    expect(r.profile.key).toBe(DEFAULT_PROFILE_FOR.achilles);
    expect(r.substituted).toBe(false);
  });

  it("kennzeichnet den Rückfall bei einem unbekannten Schlüssel", () => {
    // Genau der Fall, der eintritt, wenn ein Profil umbenannt wird.
    const r = profileOf({ body_region: "knee", profile_key: "gibt_es_nicht" });
    expect(r.profile.key).toBe(DEFAULT_PROFILE_FOR.knee);
    expect(r.substituted).toBe(true);
  });

  it("kennzeichnet auch, wenn das Standardprofil zufällig gepasst hätte", () => {
    // Die Falle: Ist der kaputte Schlüssel derselbe wie der Standard, sähe ein
    // Vergleich der Namen keinen Unterschied. Die Kennzeichnung hängt daran,
    // ob der GESPEICHERTE Schlüssel aufgelöst werden konnte, nicht daran, ob
    // das Ergebnis anders aussieht.
    const standard = DEFAULT_PROFILE_FOR.knee;
    const r = profileOf({ body_region: "knee", profile_key: standard + "_alt" });
    expect(r.profile.key).toBe(standard);
    expect(r.substituted).toBe(true);
  });

  it("liefert für jede Region ein Profil, ohne Ausnahme", () => {
    // Die Registry ist erschöpfend typgeprüft; hier wird belegt, dass die
    // Zusicherung auch zur Laufzeit hält.
    for (const region of Object.keys(DEFAULT_PROFILE_FOR) as (keyof typeof DEFAULT_PROFILE_FOR)[]) {
      const r = profileOf({ body_region: region, profile_key: null });
      expect(r.profile.key).toBe(profileFor(region).key);
      expect(r.substituted).toBe(false);
    }
  });
});

describe("toPickerProfile", () => {
  it("flacht ein Profil auf Zeichenketten ab, in der gewählten Sprache", () => {
    const achilles = ALL_PROFILES.find((p) => p.key === "achilles_midportion")!;

    const de = toPickerProfile(achilles, "de");
    const en = toPickerProfile(achilles, "en");

    expect(de.key).toBe("achilles_midportion");
    expect(de.label).toBe(achilles.label.de);
    expect(en.label).toBe(achilles.label.en);
    // Zwei Sprachen, die denselben Satz liefern, hiesse: eine ist nicht
    // übersetzt. Diese Texte sind Prosa, keine Symbole.
    expect(de.limitations).not.toBe(en.limitations);
  });

  it("nennt ein Profil recherchiert, sobald ein Wert besser als eine Schätzung ist", () => {
    const achilles = ALL_PROFILES.find((p) => p.key === "achilles_midportion")!;
    expect(toPickerProfile(achilles, "de").researched).toBe(true);
  });

  it("nennt ein Profil aus lauter Schätzungen NICHT recherchiert", () => {
    // Die drei generischen Profile tragen nur Grad D. Sie müssen sich im Wähler
    // als »nur Mechanik« zu erkennen geben, statt Wissen vorzutäuschen.
    const generisch = ALL_PROFILES.find((p) => p.key === "generic_other")!;
    expect(toPickerProfile(generisch, "de").researched).toBe(false);
  });

  it("gibt jedem Profil einen Grenzentext in beiden Sprachen", () => {
    // Der Text steht im Wähler VOR dem Anlegen der Episode. Ein Profil ohne ihn
    // würde behaupten, es könne mehr unterscheiden, als es kann.
    for (const profile of ALL_PROFILES) {
      for (const locale of ["de", "en"] as const) {
        const view = toPickerProfile(profile, locale);
        expect(view.limitations.trim(), `${profile.key}/${locale}`).not.toBe("");
        expect(view.label.trim(), `${profile.key}/${locale}`).not.toBe("");
      }
    }
  });

  it("trägt nur, was der Wähler auch zeigt", () => {
    // `tests: string[]` stand hier einmal: berechnet, kopiert, über die
    // Server/Client-Grenze geschickt — und von keinem Bauteil gerendert. Nur
    // ein Test las es, und ein Test ist kein Bildschirm.
    //
    // Diese Zusicherung ersetzt ihn, weil sie die Richtung hält, in der der
    // Fehler entsteht: Ein Feld darf nur hinüber, wenn es dort gebraucht wird.
    const achilles = ALL_PROFILES.find((p) => p.key === "achilles_midportion")!;
    const view = toPickerProfile(achilles, "de");
    expect(Object.keys(view).sort()).toEqual([
      "bodyRegion",
      "key",
      "label",
      "limitations",
      "researched",
    ]);
  });});
