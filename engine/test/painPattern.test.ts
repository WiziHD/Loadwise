import { describe, expect, it } from "vitest";
import { buildIndex } from "../src/episode.js";
import {
  build,
  easingPattern,
  steadyRecovery,
  worseningPattern,
  session,
} from "../src/fixtures.js";
import { evaluatePainPattern } from "../src/rules/painPattern.js";
import { DEFAULT_CONFIG, type DateStr, type Entry } from "../src/types.js";

const cfg = DEFAULT_CONFIG;
const run = (entries: Entry[], date: DateStr) =>
  evaluatePainPattern(buildIndex(entries), date, cfg);
const lastDate = (entries: Entry[]): DateStr => entries[entries.length - 1]!.date;

describe("pain pattern rule", () => {
  it("declines to judge without enough symptom reports", () => {
    // A diary with no symptom entries carries no timing information at all.
    const entries = build(Array.from({ length: 60 }, () => ({ morningScore: 2 })));
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("too-few-symptom-reports");
  });

  it("stays quiet when the pattern holds still", () => {
    const entries = steadyRecovery(56);
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.reason).toBe("pattern-stable");
      expect(result.severity).toBe("green");
      expect(Math.abs(result.detail.change)).toBeLessThan(cfg.pattern.worseningShift);
    }
  });

  it("warns when the pain moves closer to the load", () => {
    // Evening, then after, then during — while the reported intensity never
    // changes. Nothing else in the engine can see this.
    const entries = worseningPattern();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.reason).toBe("pattern-worsening");
      expect(result.severity).toBe("amber");
      expect(result.detail.recent).toBeGreaterThan(result.detail.previous);
    }
  });

  it("recognises the reverse as improvement", () => {
    const entries = easingPattern();
    const result = run(entries, lastDate(entries));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.reason).toBe("pattern-easing");
      expect(result.severity).toBe("green");
      expect(result.detail.change).toBeLessThan(0);
    }
  });

  it("ignores sessions that hurt nowhere", () => {
    // A pain-free session carries no timing. Counting it as a zero would drag
    // the average toward whichever end of the scale is numerically lower.
    const withPainFree = build([
      ...Array.from({ length: 21 }, () => ({
        sessions: [session(5, 30)],
        morningScore: 2,
        symptomScore: 0,
        symptomTiming: "during" as const,
      })),
      ...Array.from({ length: 21 }, () => ({
        sessions: [session(5, 30)],
        morningScore: 2,
        symptomScore: 0,
        symptomTiming: "evening" as const,
      })),
    ]);
    const result = run(withPainFree, lastDate(withPainFree));
    expect(result.status).toBe("insufficient");
  });

  it("weights a severe report more heavily than a mild one", () => {
    const mostlyMildEvening = build([
      ...Array.from({ length: 21 }, (_, i) => ({
        sessions: [session(5, 30)],
        morningScore: 2,
        symptomScore: i % 3 === 0 ? 2 : 0,
        symptomTiming: "evening" as const,
      })),
      ...Array.from({ length: 21 }, (_, i) => ({
        sessions: [session(5, 30)],
        morningScore: 2,
        symptomScore: i % 3 === 0 ? 9 : 0,
        symptomTiming: "during" as const,
      })),
    ]);
    const result = run(mostlyMildEvening, lastDate(mostlyMildEvening));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.detail.recent).toBeCloseTo(3, 5);
      expect(result.detail.previous).toBeCloseTo(1, 5);
    }
  });
});
