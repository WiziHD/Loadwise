/**
 * Welches Profil eine Episode trägt — und was passiert, wenn keines passt.
 *
 * ---------------------------------------------------------------------------
 * DER RÜCKFALL IST STILL, UND DAS IST DAS PROBLEM.
 *
 * `profileOf` nimmt zuerst das benannte Profil, dann das Standardprofil der
 * Körperregion. Der zweite Fall tritt ein, sobald ein Profilschlüssel umbenannt
 * oder entfernt wird — und dann zeigt die App den Namen einer ANDEREN
 * Verletzung an, ohne Kennzeichen. Zwei Profile teilen sich `knee`.
 *
 * Der Rückfall ist richtig: Eine Episode ohne beurteilbares Profil wäre
 * schlimmer als eine mit dem Standardprofil. Aber er muss sichtbar sein, und
 * heute ist er es nicht. Das Wörterbuch enthält den Satz dafür und benutzt ihn
 * nicht (Karte H15).
 *
 * Diese Datei hält das Verhalten fest, damit die Reparatur später eine
 * Entscheidung ist und keine Überraschung.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { ALL_PROFILES, DEFAULT_PROFILE_FOR, profileFor } from "loadwise-engine";
import { profileOf, toPickerProfile } from "@/lib/profile-view";

describe("profileOf", () => {
  it("nimmt das benannte Profil", () => {
    const p = profileOf({ body_region: "knee", profile_key: "patellofemoral_pain" });
    expect(p.key).toBe("patellofemoral_pain");
  });

  it("nimmt das Standardprofil der Region, wenn keines benannt ist", () => {
    const p = profileOf({ body_region: "achilles", profile_key: null });
    expect(p.key).toBe(DEFAULT_PROFILE_FOR.achilles);
  });

  it("fällt bei einem unbekannten Schlüssel auf die Region zurück — still", () => {
    // Genau der Fall, der eintritt, wenn ein Profil umbenannt wird. Die Episode
    // wird dann unter einem anderen Profil beurteilt, und nichts sagt es.
    const p = profileOf({ body_region: "knee", profile_key: "gibt_es_nicht" });
    expect(p.key).toBe(DEFAULT_PROFILE_FOR.knee);
    // Festgehalten, weil es weh tut: Der angezeigte Name ist dann der einer
    // anderen Verletzung als der, die jemand ausgewählt hat.
    expect(p.key).not.toBe("gibt_es_nicht");
  });

  it("liefert für jede Region ein Profil, ohne Ausnahme", () => {
    // Die Registry ist erschöpfend typgeprüft; hier wird belegt, dass die
    // Zusicherung auch zur Laufzeit hält.
    for (const region of Object.keys(DEFAULT_PROFILE_FOR) as (keyof typeof DEFAULT_PROFILE_FOR)[]) {
      expect(profileOf({ body_region: region, profile_key: null }).key)
        .toBe(profileFor(region).key);
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

  it("kopiert die Testliste, statt sie zu teilen", () => {
    // Der Wähler ist ein Client-Bauteil; was hinübergeht, darf keine Referenz
    // auf Motordaten sein, die jemand versehentlich verändert.
    const achilles = ALL_PROFILES.find((p) => p.key === "achilles_midportion")!;
    const view = toPickerProfile(achilles, "de");
    expect(view.tests).toEqual([...achilles.tests]);
    expect(view.tests).not.toBe(achilles.tests);
  });
});
