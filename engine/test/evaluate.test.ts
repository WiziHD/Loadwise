import { describe, expect, it } from "vitest";
import { evaluateEpisode } from "../src/evaluate.js";
import type { Overall, Severity } from "../src/types.js";
import {
  ACHILLES_CTX,
  overloadWeek,
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
