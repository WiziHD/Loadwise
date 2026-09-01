/**
 * Die Asymmetrie-Ansicht.
 *
 * ---------------------------------------------------------------------------
 * ZWEI PRÜFUNGEN HIER SIND DIE KARTE SELBST, UND EINE PRÜFT EINE ABWESENHEIT.
 *
 * 1. **`reference-eroding` muss ankommen.** Der Motor meldet ihn, wenn auch die
 *    gesunde Seite absinkt — dann steigt das Verhältnis oder bleibt stehen,
 *    während die Person auf beiden Seiten schwächer wird. Der Code ist gebaut,
 *    hat drei Szenarien in der Erwartungsdatei und wäre ohne diese Anzeige
 *    umsonst gebaut.
 *
 * 2. **Kein Balken gegen 100 %.** Ein Fortschrittsbalken hätte ein Ende, und
 *    ein Ende ist ein Ziel. Der Index ist ein Verhältnis: 100 % heisst »beide
 *    Seiten gleich«, nicht »fertig« und nicht »freigegeben«. Ein Balken machte
 *    daraus stillschweigend eine Freigabeanzeige.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SELF_COMPARISON, verdictText, type Flag, type SelfTest } from "loadwise-engine";
import { SideComparison } from "@/components/SideComparison";
import { t } from "@/i18n/dictionary";

const s = t("de");

const MESSUNGEN: SelfTest[] = [
  { type: "calf_raise", date: "2026-07-06" as SelfTest["date"], involved: 12, uninvolved: 21 },
  { type: "calf_raise", date: "2026-07-27" as SelfTest["date"], involved: 15, uninvolved: 21 },
  { type: "calf_raise", date: "2026-08-17" as SelfTest["date"], involved: 17, uninvolved: 21 },
];

/**
 * Der Fall, um den es geht: Die verletzte Seite bleibt gleich, die GESUNDE
 * fällt. Das Verhältnis steigt von 57 % auf 80 %, und niemand ist besser
 * geworden.
 */
const ERODIEREND: SelfTest[] = [
  { type: "calf_raise", date: "2026-07-06" as SelfTest["date"], involved: 12, uninvolved: 21 },
  { type: "calf_raise", date: "2026-07-27" as SelfTest["date"], involved: 12, uninvolved: 17 },
  { type: "calf_raise", date: "2026-08-17" as SelfTest["date"], involved: 12, uninvolved: 15 },
];

const flag = (reason: Flag["reason"], type = "calf_raise"): Flag =>
  ({
    key: `asymmetry-${reason}`,
    kind: "asymmetry",
    severity: reason === "symmetric" ? "green" : "amber",
    reason,
    forDate: "2026-08-17",
    detail: { type },
  }) as unknown as Flag;

const zeichnen = (tests = MESSUNGEN, flags: Flag[] = []) =>
  render(<SideComparison tests={tests} flags={flags} strings={s.comparison} locale="de" />);

describe("beide Seiten stehen absolut da, nicht nur das Verhältnis", () => {
  it("zeigt je Messung die verletzte UND die gesunde Seite", () => {
    zeichnen();
    const zellen = [...document.querySelectorAll("td")].map((z) => z.textContent);
    // 12/21, 15/21, 17/21 — jede Zahl einzeln, nicht nur das Verhältnis.
    expect(zellen).toContain("12");
    expect(zellen).toContain("15");
    expect(zellen).toContain("17");
    expect(zellen.filter((z) => z === "21")).toHaveLength(3);
  });

  it("zeigt das Verhältnis daneben, gerundet", () => {
    zeichnen();
    const zellen = [...document.querySelectorAll("td")].map((z) => z.textContent);
    expect(zellen).toContain("57 %");
    expect(zellen).toContain("71 %");
    expect(zellen).toContain("81 %");
  });

  it("macht aus einer Bezugsseite von null kein Verhältnis von null Prozent", () => {
    // Ohne die Prüfung stünde hier `Infinity %` oder `0 %` — beides eine Zahl,
    // die eine Messung behauptet, die es nicht gibt.
    const kaputt: SelfTest[] = [
      { type: "calf_raise", date: "2026-07-06" as SelfTest["date"], involved: 5, uninvolved: 0 },
    ];
    zeichnen(kaputt);
    const zellen = [...document.querySelectorAll("td")].map((z) => z.textContent);
    expect(zellen).toContain(s.comparison.noIndex);
    expect(zellen.join(" ")).not.toContain("%");
  });

  it("nennt die Einheit einmal je Tabelle, statt sie in jede Zelle zu schreiben", () => {
    zeichnen();
    const beschriftung = document.querySelector("caption")!;
    expect(beschriftung.textContent).toContain(s.comparison.unitReps);
  });

  it("zeigt gar nichts, wenn es keine Messung gibt", () => {
    // Eine leere Tabelle mit Überschrift wäre eine Auskunft über nichts.
    const { container } = zeichnen([]);
    expect(container.innerHTML).toBe("");
  });
});

describe("der Befund der erodierenden Referenz kommt an", () => {
  it("zeigt den Satz des Motors, wenn das Flag ihn trägt", () => {
    /**
     * Die Prüfung, um die es in dieser Karte geht.
     *
     * Der Motor sieht, dass die gesunde Seite absinkt, und meldet
     * `reference-eroding`. Erreichte der Satz den Bildschirm nicht, zeigte die
     * Ansicht ein Verhältnis, dessen Nenner wegbricht — steigend, plausibel
     * und bedeutungslos.
     */
    zeichnen(ERODIEREND, [flag("reference-eroding")]);
    expect(screen.getByText(verdictText("reference-eroding", "de"))).toBeTruthy();
  });

  it("und stellt ihn ÜBER die Zahlen, nicht darunter", () => {
    // Wer liest, soll wissen, worauf er blickt, bevor er die Zahlen aufnimmt.
    // Ein Nachsatz käme zu spät — das Verhältnis ist dann schon aufgenommen.
    zeichnen(ERODIEREND, [flag("reference-eroding")]);
    const kasten = document.querySelector('[data-comparison="calf_raise"]')!;
    const befund = kasten.querySelector("[data-verdict]")!;
    const tabelle = kasten.querySelector("table")!;
    expect(befund.compareDocumentPosition(tabelle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("zeigt keinen Befund, wenn der Lauf keinen trägt", () => {
    // Die Gegenprobe: Ohne sie liesse sich nicht unterscheiden, ob die Ansicht
    // das Flag liest oder immer denselben Satz zeigt.
    zeichnen(ERODIEREND, []);
    expect(document.querySelector("[data-verdict]")).toBeNull();
  });

  it("ordnet den Befund seiner Testart zu", () => {
    /**
     * Sonst stünde der Befund des Fersenhebers über der Tabelle des
     * Einbeinsprungs — und damit ein Urteil über eine Messung, die es nie
     * gesehen hat.
     */
    const gemischt: SelfTest[] = [
      ...MESSUNGEN,
      { type: "single_hop", date: "2026-08-17" as SelfTest["date"], involved: 96, uninvolved: 122 },
    ];
    zeichnen(gemischt, [flag("reference-eroding", "calf_raise")]);

    const fersenheber = document.querySelector('[data-comparison="calf_raise"]')!;
    const sprung = document.querySelector('[data-comparison="single_hop"]')!;
    expect(fersenheber.querySelector("[data-verdict]")).toBeTruthy();
    expect(sprung.querySelector("[data-verdict]")).toBeNull();
  });
});

describe("kein Fortschrittsbalken gegen hundert Prozent", () => {
  /**
   * Diese Prüfung sichert eine ABWESENHEIT, und das ist der Grund, aus dem sie
   * schwer zu erhalten ist: Niemand fügt einen Balken böswillig hinzu. Er
   * kommt als Verbesserung — »die Zahl allein sagt so wenig« —, und mit ihm
   * kommt ein Ende, das ein Ziel ist.
   *
   * 100 % heisst »beide Seiten gleich«. Nicht gesund, nicht fertig, nicht
   * freigegeben. Ein Balken machte daraus eine Freigabeanzeige, und das ist
   * die Linie aus PROTOKOLLE.md §1.
   */
  it("rendert kein progress- und kein meter-Element", () => {
    zeichnen(MESSUNGEN, [flag("mild-deficit")]);
    expect(document.querySelector("progress")).toBeNull();
    expect(document.querySelector("meter")).toBeNull();
  });

  it("rendert nichts mit der Rolle progressbar", () => {
    zeichnen(MESSUNGEN, [flag("mild-deficit")]);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByRole("meter")).toBeNull();
  });

  /**
   * Die Form, die ein Balken ohne `progress`-Element annimmt: ein div mit
   * `width: 81%`, aus dem Index gerechnet. An der Rolle ist das nicht zu
   * erkennen, nur an der Breite.
   *
   * `<table>` ist ausgenommen, und das ist eine bewusste Lücke mit Grund: Eine
   * Tabelle mit `width: 100%` ist Layout und kommt in jeder zweiten Ansicht
   * vor. Ein Balken dagegen trägt eine Breite, die aus Daten stammt — die ist
   * fast nie glatt 100 %, und an den drei Zeilen dieser Fixtur (57, 71, 81)
   * würde sie sofort auffallen.
   *
   * Was damit durchginge: ein Balken, der ausgerechnet bei genau 100 % steht.
   * Festgehalten, statt verschwiegen.
   */
  const prozentbreiten = (wurzel: ParentNode) =>
    [...wurzel.querySelectorAll<HTMLElement>("*")].filter(
      (el) => el.tagName !== "TABLE" && /^\d+(\.\d+)?%$/.test(el.style.width ?? ""),
    );

  it("und keinen Balken, der über eine Breite in Prozent gebaut ist", () => {
    zeichnen(MESSUNGEN, [flag("mild-deficit")]);
    expect(prozentbreiten(document).map((el) => el.outerHTML.slice(0, 80))).toEqual([]);
  });

  it("würde einen solchen Balken auch finden", () => {
    // Gegenprobe zur Zeile darüber. Ohne sie wäre nicht sichtbar, dass das
    // Suchmuster überhaupt etwas trifft — und die Ausnahme für `table` macht
    // genau das zu einer echten Frage.
    const { container } = render(<div style={{ width: "81%" }} />);
    expect(prozentbreiten(container)).toHaveLength(1);
  });
});

describe("der Vorbehalt und die Zweckbestimmung", () => {
  it("zeigt den Satz zum Selbstvergleich aus dem Motor", () => {
    // Er trägt die belegte Zahl — Gesunde erreichen 6 bis 70 Wiederholungen —
    // und steht deshalb unter den Ban-Listen, nicht im Wörterbuch der App.
    zeichnen();
    expect(screen.getByText(SELF_COMPARISON.de)).toBeTruthy();
  });

  it("nennt darin, dass mit der eigenen Seite verglichen wird", () => {
    zeichnen();
    expect(SELF_COMPARISON.de).toContain("eigenen anderen Seite");
    expect(SELF_COMPARISON.de).toContain("6 und 70");
  });

  it("trägt die Zweckbestimmung, weil sie ein Urteil zeigt", () => {
    // `check:boundary` verlangt es von jeder Datei, die `verdictText` ruft.
    // Hier steht es zusätzlich als Prüfung: Der Wächter sieht den Import, nicht
    // die Ausgabe.
    zeichnen(MESSUNGEN, [flag("mild-deficit")]);
    expect(screen.getByText(/Loadwise dokumentiert und ordnet/)).toBeTruthy();
  });
});
