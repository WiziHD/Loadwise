/**
 * Was eine korrigierte Episode erfüllen muss.
 *
 * ---------------------------------------------------------------------------
 * DIE ZWEITE TÜR DARF NICHT WEITER SEIN ALS DIE ERSTE.
 *
 * Das Anlegen nimmt die Körperregion aus dem Profil und nicht aus dem
 * Formular — zwei Profile teilen sich `knee`, und zwei Felder, die sich
 * widersprechen können, tun es irgendwann. Beim Korrigieren gilt dasselbe, und
 * diese Datei hält es fest: `EpisodePatch` hat gar kein Feld für die Region.
 *
 * Alles hier ist eine reine Funktion, also ohne eine einzige Attrappe prüfbar.
 * Eine Server-Aktion sieht aus wie ein Funktionsaufruf und ist ein
 * öffentlicher Endpunkt: Alles im Netz kann sie mit beliebigen Werten
 * aufrufen, und deshalb wird hier auch geprüft, was ein Formular nie schicken
 * würde.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE_FOR } from "loadwise-engine";
import {
  ALL_SIDES,
  startsInTheFuture,
  validateEpisodePatch,
  type EpisodePatch,
} from "@/lib/episode-validation";

const HEUTE = "2026-08-24";
const PROFIL = DEFAULT_PROFILE_FOR.achilles;

const gut = (over: Partial<EpisodePatch> = {}): EpisodePatch => ({
  profileKey: PROFIL,
  side: "left",
  startedOn: "2026-08-10",
  label: "Wade links",
  ...over,
});

describe("das Gute geht durch", () => {
  it("nimmt eine vollständige Korrektur an", () => {
    expect(validateEpisodePatch(gut(), HEUTE)).toBeNull();
  });

  it("nimmt jede Seite an, die es gibt", () => {
    for (const side of ALL_SIDES) {
      expect(validateEpisodePatch(gut({ side }), HEUTE), side).toBeNull();
    }
  });

  it("lässt Beginn und Bezeichnung weg", () => {
    expect(validateEpisodePatch(gut({ startedOn: null, label: null }), HEUTE)).toBeNull();
  });
});

describe("das Profil", () => {
  it("weist einen Schlüssel zurück, den es nicht gibt", () => {
    expect(validateEpisodePatch(gut({ profileKey: "gibt_es_nicht" }), HEUTE)).toBe(
      "unknown-profile",
    );
  });

  it("weist zurück, was gar kein Text ist", () => {
    // Eine Server-Aktion ist ein öffentlicher Endpunkt; hier kann alles ankommen.
    for (const müll of [null, undefined, 7, {}, []]) {
      expect(validateEpisodePatch(gut({ profileKey: müll }), HEUTE), String(müll)).toBe("invalid");
    }
  });
});

describe("die Seite", () => {
  it("weist alles zurück, was nicht eine der vier ist", () => {
    for (const müll of ["links", "LEFT", "", null, 3]) {
      expect(validateEpisodePatch(gut({ side: müll }), HEUTE), String(müll)).toBe("invalid");
    }
  });
});

describe("der Beginn", () => {
  it("weist ein Datum in der Zukunft zurück", () => {
    expect(validateEpisodePatch(gut({ startedOn: "2026-09-01" }), HEUTE)).toBe("future-start");
  });

  it("lässt den Tag nach dem Hostdatum durch", () => {
    // Der Server kennt das Ortsdatum der Person nicht. Vierzehn Stunden Versatz
    // sind der bewohnte Höchstwert, ein echtes Ortsdatum liegt also nie mehr
    // als einen Tag vor dem des Hosts. Wer das verbietet, sperrt jemanden in
    // Auckland aus.
    expect(validateEpisodePatch(gut({ startedOn: "2026-08-25" }), HEUTE)).toBeNull();
    expect(startsInTheFuture("2026-08-25", HEUTE)).toBe(false);
    expect(startsInTheFuture("2026-08-26", HEUTE)).toBe(true);
  });

  it("weist zurück, was kein Datum ist", () => {
    for (const müll of ["24.08.2026", "2026-8-1", "morgen", "", 20260824]) {
      expect(validateEpisodePatch(gut({ startedOn: müll }), HEUTE), String(müll)).toBe("invalid");
    }
  });
});

describe("die Bezeichnung", () => {
  it("weist eine leere zurück", () => {
    // Wer sie löschen will, schickt null. Ein leerer Text stünde sonst als
    // Überschrift da, wo der Profilname stehen sollte — sichtbar als eine
    // Zeile, die fehlt.
    expect(validateEpisodePatch(gut({ label: "" }), HEUTE)).toBe("invalid");
    expect(validateEpisodePatch(gut({ label: "   " }), HEUTE)).toBe("invalid");
  });

  it("weist eine zurück, die keine Überschrift mehr ist", () => {
    expect(validateEpisodePatch(gut({ label: "x".repeat(121) }), HEUTE)).toBe("invalid");
    expect(validateEpisodePatch(gut({ label: "x".repeat(120) }), HEUTE)).toBeNull();
  });
});

describe("die Körperregion", () => {
  it("ist gar kein Feld", () => {
    // Der Beleg für die Absicht: Wer sie mitschickt, ändert nichts. Die Region
    // folgt in der Aktion aus dem Profil.
    const mitRegion = { ...gut(), bodyRegion: "knee" } as EpisodePatch;
    expect(validateEpisodePatch(mitRegion, HEUTE)).toBeNull();
    expect(Object.keys(gut())).not.toContain("bodyRegion");
  });
});
