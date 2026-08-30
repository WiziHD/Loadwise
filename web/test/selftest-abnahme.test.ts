import { describe, expect, it } from "vitest";
import {
  evaluateEpisode,
  verdictText,
  type DateStr,
  type Entry,
  type SelfTest,
} from "loadwise-engine";
import { validateSelfTest, type SelfTestPayload } from "@/lib/selftest-validation";

/**
 * Die Abnahmebedingung der Karte 3.1, als Test.
 *
 * ---------------------------------------------------------------------------
 * »DREI MESSUNGEN ÜBER SECHS WOCHEN ERZEUGEN EIN ASYMMETRIE-URTEIL.«
 *
 * Bis hierher war das eine Behauptung über eine Kette, deren erstes Glied
 * fehlte. Der Motor kann den Seitenvergleich seit Wochen, `verdicts.ts` liest
 * die Tabelle aus — und es gab keinen Weg, eine Messung hineinzubekommen.
 *
 * Dieser Test geht die Kette so weit, wie sie ohne Datenbank geht: drei
 * Nutzlasten in genau der Form, die `SelfTestForm` absendet, durch dieselben
 * Prüfregeln, die die Server-Aktion anwendet, in denselben Motoraufruf, den
 * `evaluateAndStore` macht. Was hier nicht mitläuft, ist Schreiben und Lesen —
 * dafür gibt es `check:verdicts` gegen die echte Datenbank.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS NICHT IM MOTOR STEHT.
 *
 * Der Motor hat 51 Szenarien und weiss längst, dass er einen Index rechnen
 * kann. Was er NICHT wissen kann, ist, ob das, was das Formular absendet, bei
 * ihm ankommt. Genau dazwischen lag die Lücke — und Lücken zwischen zwei
 * Bauteilen sind die Sorte, die beide für sich grün lässt.
 * ---------------------------------------------------------------------------
 */

const ERLAUBT = ["calf_raise", "single_hop", "rom"] as const;

/**
 * Sechs Wochen Fersenheber — und der Verlauf geht nach OBEN.
 *
 * 12/21 = 57 %, 15/21 = 71 %, 17/21 = 81 %. Bewusst der freundliche Fall: Er
 * endet bei Bernstein statt bei Rot und beweist damit, dass die Kette
 * unterscheidet, statt alles rot zu machen.
 *
 * Die gesunde Seite bleibt bei 21. Fiele sie mit, wäre der Index geschmeichelt
 * — das ist die »erodierende Referenz«, und die hat einen eigenen Zweig.
 */
const MESSUNGEN: SelfTestPayload[] = [
  { type: "calf_raise", date: "2026-07-06", involved: 12, uninvolved: 21, note: null },
  { type: "calf_raise", date: "2026-07-27", involved: 15, uninvolved: 21, note: null },
  { type: "calf_raise", date: "2026-08-17", involved: 17, uninvolved: 21, note: null },
];

/**
 * Ein Tagebuch, das für sich genommen GRÜN ist — und das ist der Kern.
 *
 * Der Morgenwert fällt über sechs Wochen von 5 auf 1, jede dritte Einheit ist
 * ein ruhiger Lauf. Alle sieben Regeln melden grün: kein Lastsprung, kein
 * Abdriften, Fortschritt seit Beginn, gleichmässig verteilt, jede Belastung
 * innerhalb von 24 Stunden abgeklungen.
 *
 * Ein erster Entwurf hatte hier 43 Tage konstant bei 3 — und erzeugte damit
 * selbst ein `stagnation/amber`. Der Test wäre grün gewesen und hätte nichts
 * bewiesen: Das Urteil kam gar nicht von den Messungen.
 */
function tagebuch(): Entry[] {
  const out: Entry[] = [];
  const start = new Date("2026-07-06T00:00:00Z");
  const ende = new Date("2026-08-17T00:00:00Z");
  const spanne = 43;
  let i = 0;
  for (let d = new Date(start); d <= ende; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push({
      date: d.toISOString().slice(0, 10) as DateStr,
      morningScore: Math.max(1, 5 - Math.floor((i / spanne) * 4)),
      sessions: i % 3 === 0 ? [{ activityKind: "run", durationMin: 30, rpe: 5 }] : [],
    } as Entry);
    i++;
  }
  return out;
}

const KONTEXT = {
  bodyRegion: "achilles",
  profileKey: "achilles_midportion",
  side: "left",
} as const;

/** Genau der Weg, den die Server-Aktion nimmt: prüfen, dann in den Motor. */
function durchDieKette(nutzlasten: SelfTestPayload[]): SelfTest[] {
  return nutzlasten.map((p) => {
    const problem = validateSelfTest(p, ERLAUBT, "2026-08-30");
    // Ein abgewiesener Wert darf nicht stillschweigend im Motor landen. Wirft
    // hier, statt ihn zu übergehen — sonst könnte dieser Test grün werden,
    // während zwei der drei Messungen gar nicht dabei waren.
    if (problem !== null) throw new Error(`${p.date}: ${problem}`);
    return {
      type: p.type as SelfTest["type"],
      date: p.date as DateStr,
      involved: p.involved as number,
      uninvolved: p.uninvolved as number,
    };
  });
}

const tests = durchDieKette(MESSUNGEN);
const mitMessungen = evaluateEpisode({ entries: tagebuch(), tests, context: KONTEXT });
const ohneMessungen = evaluateEpisode({ entries: tagebuch(), tests: [], context: KONTEXT });

describe("drei Messungen über sechs Wochen erzeugen ein Asymmetrie-Urteil", () => {
  const asymmetrie = mitMessungen.flags.filter((f) => f.kind === "asymmetry");

  it("kommt bei allen drei Messungen durch die Prüfregeln", () => {
    expect(tests).toHaveLength(3);
  });

  it("liefert überhaupt ein Asymmetrie-Flag", () => {
    // Der Kern der Karte. Vorher war diese Zahl unter allen Umständen 0 —
    // nicht weil die Regel schwieg, sondern weil `tests` immer leer ankam.
    expect(asymmetrie).toHaveLength(1);
  });

  it("urteilt auf der jüngsten Messung, nicht auf der ersten", () => {
    // 17/21 = 81 %, also Bernstein. Auf der ersten Messung (57 %) wäre es rot
    // — der Unterschied ist der ganze Sinn eines Verlaufs.
    expect(asymmetrie[0]!.severity).toBe("amber");
    expect(asymmetrie[0]!.reason).toBe("mild-deficit");
  });

  it("zeigt auf den Tag der jüngsten Messung", () => {
    const detail = asymmetrie[0]!.detail as { measuredOn: string };
    expect(detail.measuredOn).toBe("2026-08-17");
  });

  it("trägt alle drei Messungen im Verlauf, nicht nur die letzte", () => {
    // Sonst wäre es ein Einzelwert mit einem Datum davor, und eine
    // Verlaufsansicht hätte nichts zu zeichnen.
    const detail = asymmetrie[0]!.detail as { history: number[] };
    expect(detail.history).toHaveLength(3);
    expect(detail.history[0]).toBeLessThan(detail.history[2]!);
  });

  it("hat einen Satz, den ein Mensch lesen kann — aus dem Motor", () => {
    // Ein Flag ohne Wortlaut erreicht keinen Bildschirm. Der Satz kommt aus
    // `VERDICT_WORDING`, nicht aus dem Wörterbuch der App; `check:boundary`
    // hält das fest.
    expect(verdictText(asymmetrie[0]!.reason, "de").length).toBeGreaterThan(10);
  });
});

describe("und das ist der Unterschied, den dieses Produkt verkauft", () => {
  /**
   * DASSELBE TAGEBUCH SAGT OHNE MESSUNGEN GRÜN.
   *
   * Das ist nicht bloss eine Gegenprobe, sondern die Aussage des ganzen
   * Konzepts in zwei Zeilen: Sieben Regeln über sechs Wochen Tagebuch finden
   * nichts — Morgenwerte fallen, Last ist gleichmässig, jede Einheit klingt
   * innerhalb von 24 Stunden ab. Ein Schmerztagebuch wäre hier fertig und
   * zufrieden.
   *
   * Die verletzte Seite schafft in diesem Moment 81 % der gesunden. Nur der
   * Seitenvergleich sieht das, und ohne ein Formular dafür hätte es niemand je
   * gesehen.
   */
  it("ohne Messungen: grün", () => {
    expect(ohneMessungen.overall).toEqual({ status: "judged", severity: "green" });
  });

  it("mit denselben sechs Wochen und drei Messungen: bernstein", () => {
    expect(mitMessungen.overall).toEqual({ status: "judged", severity: "amber" });
  });

  it("und der Unterschied ist genau ein Flag", () => {
    // Nicht »irgendetwas hat sich geändert«: Die Messungen fügen einen Befund
    // hinzu und verändern keinen bestehenden. Ginge daneben noch etwas anderes
    // von grün auf bernstein, wäre die Zuschreibung oben geraten.
    expect(mitMessungen.flags).toHaveLength(ohneMessungen.flags.length + 1);
    expect(ohneMessungen.flags.every((f) => f.severity === "green")).toBe(true);
  });

  it("ohne Messungen gibt es kein einziges Asymmetrie-Flag", () => {
    expect(ohneMessungen.flags.filter((f) => f.kind === "asymmetry")).toHaveLength(0);
  });
});
