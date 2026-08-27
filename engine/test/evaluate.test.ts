import { describe, expect, it } from "vitest";
import { evaluateEpisode, unnamedBlocking } from "../src/evaluate.js";
import type { Overall, Pending, Severity } from "../src/types.js";
import {
  ACHILLES_CTX,
  overloadWeek,
  session,
  poorResponse,
  steadyRecovery,
  symmetricTests,
  theGrinder,
  tooShort,
  wideningWhileStillGreen,
  worseningPattern,
} from "../src/fixtures.js";
import { DEFAULT_CONFIG, RULE_VERSION, type Config } from "../src/types.js";

const severityOf = (o: Overall): Severity | null => (o.status === "judged" ? o.severity : null);

describe("episode evaluation", () => {
  it("produces nothing but pending items on a fresh episode", () => {
    const result = evaluateEpisode({ entries: tooShort() });
    expect(result.flags).toHaveLength(0);
    expect(result.overall.status).toBe("no-data");
    expect(result.pending.map((p) => p.kind)).toContain("load_spike");
  });

  it("stamps every flag with the rule version that produced it", () => {
    const result = evaluateEpisode({ entries: steadyRecovery(56), tests: symmetricTests() });
    expect(result.flags.length).toBeGreaterThan(0);
    for (const flag of result.flags) expect(flag.ruleVersion).toBe(RULE_VERSION);
  });

  it("keeps a clean episode green overall", () => {
    const result = evaluateEpisode({
      entries: steadyRecovery(56),
      tests: symmetricTests(),
      context: ACHILLES_CTX,
    });
    expect(severityOf(result.overall)).toBe("green");
  });

  it("reports the worst standing verdict as the overall one", () => {
    const result = evaluateEpisode({ entries: overloadWeek() });
    expect(severityOf(result.overall)).toBe("red");
    expect(result.flags.some((f) => f.kind === "load_spike" && f.severity === "red")).toBe(true);
  });

  it("surfaces a bad session even when everything else looks fine", () => {
    const result = evaluateEpisode({ entries: poorResponse(), tests: symmetricTests() });
    const bad = result.flags.filter((f) => f.kind === "response_24h" && f.severity === "red");
    expect(bad.length).toBeGreaterThan(0);
  });

  it("carries the asymmetry trend into the overall verdict", () => {
    const result = evaluateEpisode({
      entries: steadyRecovery(56),
      tests: wideningWhileStillGreen(),
      context: ACHILLES_CTX,
    });
    const flag = result.flags.find((f) => f.kind === "asymmetry");
    expect(flag?.reason).toBe("widening-gap");
    expect(severityOf(result.overall)).toBe("amber");
  });

  it("catches the grinder through the drift rule alone", () => {
    const result = evaluateEpisode({ entries: theGrinder(), context: ACHILLES_CTX });
    const drift = result.flags.find((f) => f.kind === "baseline_drift");
    const daily = result.flags.filter((f) => f.kind === "response_24h");
    expect(drift?.severity).not.toBe("green");
    expect(daily.every((f) => f.severity === "green")).toBe(true);
  });

  it("catches a shifting pain pattern through its own rule", () => {
    const result = evaluateEpisode({ entries: worseningPattern(), context: ACHILLES_CTX });
    const pattern = result.flags.find((f) => f.kind === "pain_pattern");
    expect(pattern?.reason).toBe("pattern-worsening");
  });

  it("runs all five rules when the data allows", () => {
    const result = evaluateEpisode({
      entries: theGrinder(),
      tests: symmetricTests(),
      context: ACHILLES_CTX,
    });
    const kinds = new Set(result.flags.map((f) => f.kind));
    expect(kinds).toContain("response_24h");
    expect(kinds).toContain("load_spike");
    expect(kinds).toContain("baseline_drift");
    expect(kinds).toContain("pain_pattern");
    expect(kinds).toContain("asymmetry");
  });

  it("never emits a flag for the final day of the 24-hour rule", () => {
    const entries = steadyRecovery(56);
    const result = evaluateEpisode({ entries });
    const judged = result.flags.filter((f) => f.kind === "response_24h").map((f) => f.forDate);
    expect(judged).not.toContain(entries[entries.length - 1]!.date);
    expect(new Set(judged).size).toBe(judged.length);
  });

  it("refuses to run on a broken configuration", () => {
    const broken: Config = structuredClone(DEFAULT_CONFIG);
    broken.response.greenMaxDelta = 9;
    expect(() => evaluateEpisode({ entries: steadyRecovery(28), config: broken })).toThrow();
  });

  it("weights the same diary differently for a different injured region", () => {
    // Identical sessions, identical days — only the injured tissue changes.
    const entries = steadyRecovery(56);
    const achilles = evaluateEpisode({ entries, context: { bodyRegion: "achilles" } });
    const shoulder = evaluateEpisode({ entries, context: { bodyRegion: "shoulder" } });

    const loadOf = (r: typeof achilles): number => {
      const f = r.flags.find((x) => x.kind === "load_spike");
      return f ? (f.detail as { acute: number }).acute : 0;
    };
    expect(loadOf(achilles)).toBeGreaterThan(loadOf(shoulder) * 5);
  });
});

describe("der Rand des Tagebuchs — heute ist eben heute", () => {
  /**
   * -------------------------------------------------------------------------
   * EIN FEHLENDES MORGEN IST KEINE LÜCKE.
   *
   * Die 24-Stunden-Regel braucht bei einer mittleren Reaktion den ÜBERNÄCHSTEN
   * Tag, um zu entscheiden, ob sie sich gelegt hat. Fehlt der, weil das
   * Tagebuch dort einfach aufhört, ist das kein blinder Fleck, sondern der
   * Kalender.
   *
   * `isTrailingEdge` unterscheidet die beiden Fälle. Für `next-day-missing`
   * war das belegt, für `second-day-missing` nie — der Zweig war in 340 Tests
   * kein einziges Mal gelaufen. Ohne ihn meldete jedes Tagebuch an seinem
   * letzten Trainingstag eine Lücke, die keine ist, und diese Meldung würde
   * jeden Tag aufs Neue erscheinen.
   *
   * Der Gegenfall steht daneben: dasselbe Loch MITTEN im Verlauf muss gemeldet
   * werden. Sonst prüfte dieser Test nur, dass die Regel schweigt.
   * -------------------------------------------------------------------------
   */
  const tag = (n: number): string => `2026-03-${String(n).padStart(2, "0")}`;

  /** Training, am Tag darauf eine mittlere Reaktion, danach nichts mehr. */
  const bisTag = (letzter: number) => {
    const entries = [];
    for (let i = 1; i <= letzter; i++) {
      const date = tag(i) as `${number}-${number}-${number}`;
      if (i === letzter - 1) entries.push({ date, morningScore: 2, sessions: [session(6, 45)] });
      else if (i === letzter) entries.push({ date, morningScore: 5, sessions: [] });
      else entries.push({ date, morningScore: 2, sessions: [] });
    }
    return entries;
  };

  const gruende = (entries: ReturnType<typeof bisTag>) =>
    evaluateEpisode({ entries, context: ACHILLES_CTX }).pending.map((p) => p.reason);

  it("meldet keinen fehlenden Folgetag am Ende des Tagebuchs", () => {
    expect(gruende(bisTag(20))).not.toContain("second-day-missing");
  });

  it("meldet ihn aber, sobald das Tagebuch danach weitergeht", () => {
    // Dasselbe Loch, nur nicht mehr am Rand: Nach der Reaktion kommen weitere
    // Tage, der übernächste fehlt trotzdem. Jetzt ist es ein blinder Fleck.
    const entries = bisTag(20);
    for (let i = 23; i <= 30; i++) {
      entries.push({ date: tag(i) as `${number}-${number}-${number}`, morningScore: 2, sessions: [] });
    }
    expect(gruende(entries)).toContain("second-day-missing");
  });
});

/**
 * Blockadegründe, die zu keiner Regel gehören.
 *
 * ---------------------------------------------------------------------------
 * DIE FUNKTION EXISTIERT, DAMIT ES SIE NUR EINMAL GIBT.
 *
 * `pending` trägt je Eintrag den Namen einer Regel. Manche Gründe haben keine —
 * ein Schmerzmittel in den betrachteten Tagen gehört zu keiner der sieben und
 * hält die Entwarnung trotzdem zurück. Genau diese standen einmal
 * ausschliesslich in `overall.blocking` und erreichten den Bildschirm nie.
 *
 * Der Konsolenbericht und der Bericht der App brauchen beide dieselbe Auswahl.
 * Ohne diese Funktion gäbe es sie zweimal, und die eine Fassung würde repariert
 * und die andere nicht.
 * ---------------------------------------------------------------------------
 */
describe("unnamedBlocking", () => {
  const pending: Pending[] = [
    { kind: "asymmetry", reason: "no-tests" },
    { kind: "response_24h", reason: "baseline-unavailable" },
  ];

  it("nennt den Grund, den keine Regel trägt", () => {
    const overall: Overall = {
      status: "insufficient",
      blocking: ["no-tests", "baseline-unavailable", "medication-in-window"],
    };
    expect(unnamedBlocking(overall, pending)).toEqual(["medication-in-window"]);
  });

  it("und wiederholt nicht, was schon bei einer Regel steht", () => {
    // Die Gegenprobe zur Zeile darüber: Eine Umsetzung, die einfach
    // `overall.blocking` zurückgäbe, bestünde die erste Prüfung nicht — aber
    // eine, die immer alles filtert, käme durch. Hier steht ausdrücklich, dass
    // die schon genannten WEGfallen.
    const overall: Overall = { status: "insufficient", blocking: ["no-tests"] };
    expect(unnamedBlocking(overall, pending)).toEqual([]);
  });

  it("bei einem beurteilten Lauf gibt es keine", () => {
    expect(unnamedBlocking({ status: "judged", severity: "green" }, pending)).toEqual([]);
  });

  it("und bei einem Lauf ohne Daten auch nicht", () => {
    expect(unnamedBlocking({ status: "no-data" }, pending)).toEqual([]);
  });
});
