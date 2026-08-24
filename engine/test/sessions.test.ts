/**
 * Mehrere Einheiten an einem Tag — und die Alltagslast, die noch nicht zählt.
 *
 * ---------------------------------------------------------------------------
 * WAS HIER BEWIESEN WIRD, UND WARUM ES ZWEI VERSCHIEDENE DINGE SIND.
 *
 * `sessions` ist eine Verhaltensänderung: Ein Tag mit zwei Einheiten trägt ab
 * jetzt die Summe beider. Vorher war nur eine erfassbar, und die Last des Tages
 * fiel zu niedrig aus — ausgerechnet an den Tagen mit der höchsten. Genau die
 * Tage, für die die Lastspitzen-Regel existiert.
 *
 * `everydayLoad` ist KEINE Verhaltensänderung. Der Wert wird erfasst und von
 * keiner Regel gelesen. Das ist eine Entscheidung, kein Versehen — und der Test
 * hält sie fest, damit sie nicht versehentlich rückgängig gemacht wird.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { buildIndex, loadAt } from "../src/episode.js";
import { session } from "../src/fixtures.js";
import { isRestDay, loadOf } from "../src/load.js";
import { ALL_EVERYDAY_LOADS, type Entry, type EpisodeContext } from "../src/types.js";

const ACHILLES: EpisodeContext = { bodyRegion: "achilles" };

const tag = (over: Partial<Entry> = {}): Entry => ({
  date: "2026-03-02",
  morningScore: 2,
  sessions: [],
  ...over,
});

describe("ein Tag kann mehrere Einheiten haben", () => {
  it("zählt beide zusammen", () => {
    // Morgens laufen, abends Kraft. Vorher war nur eines erfassbar.
    const doppelt = tag({ sessions: [session(6, 40, "run"), session(5, 30, "strength_lower")] });
    const nurLauf = tag({ sessions: [session(6, 40, "run")] });
    const nurKraft = tag({ sessions: [session(5, 30, "strength_lower")] });

    expect(loadOf(doppelt, ACHILLES)).toBeCloseTo(
      loadOf(nurLauf, ACHILLES) + loadOf(nurKraft, ACHILLES),
      10,
    );
  });

  it("gewichtet jede Einheit nach ihrem eigenen Gewebefaktor", () => {
    // Der eigentliche Grund, warum die Summe je Einheit gebildet werden muss
    // und nicht über zusammengezählte Minuten: Laufen und Schwimmen belasten
    // eine Achillessehne völlig verschieden. Wer beides an einem Tag macht,
    // hätte bei zusammengezählten Minuten den falschen Faktor auf beidem.
    const gemischt = tag({ sessions: [session(6, 30, "run"), session(6, 30, "swim")] });
    const zweimalLaufen = tag({ sessions: [session(6, 30, "run"), session(6, 30, "run")] });

    expect(loadOf(gemischt, ACHILLES)).toBeLessThan(loadOf(zweimalLaufen, ACHILLES));
  });

  it("bleibt für einen einzelnen Tag genau so gross wie vorher", () => {
    // 6 × 40 × 1.0 für Laufen auf eine Achillessehne. Das ist der Bezugspunkt
    // der ganzen Gewebematrix, und er darf sich durch diesen Umbau nicht
    // verschoben haben — sonst wäre jede Schwelle im Motor neu zu eichen.
    expect(loadOf(tag({ sessions: [session(6, 40, "run")] }), ACHILLES)).toBe(240);
  });

  it("ist ohne Einheit ein Ruhetag, mit einer nicht", () => {
    expect(isRestDay(tag())).toBe(true);
    expect(isRestDay(tag({ sessions: [session(5, 30)] }))).toBe(false);
  });

  it("trägt die Summe auch durch den Index", () => {
    const index = buildIndex(
      [tag({ sessions: [session(6, 40, "run"), session(4, 20, "run")] })],
      ACHILLES,
    );
    expect(loadAt(index, "2026-03-02")).toBe(6 * 40 + 4 * 20);
  });
});

describe("die Alltagslast wird erfasst und NICHT verrechnet", () => {
  it("ändert die Last eines Tages nicht", () => {
    // Absichtlich so. Verrechnen liesse sich das nur mit einem
    // Umrechnungsfaktor, den es nicht belegt gibt — und ein geschätzter landet
    // im Zähler UND im Nenner des Belastungsverhältnisses. Ein zu grosser zieht
    // jedes Verhältnis gegen 1 und macht die Lastspitzen-Regel still stumm.
    //
    // Erfassen kann man nicht nachholen, rechnen schon. Deshalb zuerst das
    // Erfassen — dieselbe Bauform wie `Protocol`: gebaut und ausgeschaltet.
    const ruhig = tag({ everydayLoad: "sitting" });
    const vielAufDenBeinen = tag({ everydayLoad: "very-active" });

    expect(loadOf(ruhig, ACHILLES)).toBe(0);
    expect(loadOf(vielAufDenBeinen, ACHILLES)).toBe(0);
  });

  it("macht aus einem Ruhetag keinen Trainingstag", () => {
    expect(isRestDay(tag({ everydayLoad: "very-active" }))).toBe(true);
  });

  it("kennt genau vier Stufen, und die Liste ist erschöpfend", () => {
    // Eine fünfte Stufe im Typ ohne Eintrag hier wäre ein Übersetzungsfehler —
    // dieselbe Disziplin wie bei ALL_REASON_CODES.
    expect([...ALL_EVERYDAY_LOADS]).toEqual(["sitting", "normal", "on-feet", "very-active"]);
  });

  it("darf fehlen, ohne dass etwas kaputtgeht", () => {
    // Wer die App vor dieser Änderung benutzt hat, hat für jeden alten Tag
    // keinen Wert. Das muss ein zulässiger Zustand bleiben und darf nicht als
    // »sitzend« gelesen werden — das wäre eine erfundene Angabe.
    expect(loadOf(tag({ everydayLoad: null }), ACHILLES)).toBe(0);
    expect(loadOf(tag(), ACHILLES)).toBe(0);
  });
});
