import { describe, expect, it } from "vitest";
import { addDays } from "../src/dates.js";
import { buildIndex } from "../src/episode.js";
import {
  lingeringReaction,
  mildReaction,
  poorResponse,
  START,
  tooShort,
  session,
} from "../src/fixtures.js";
import { evaluateResponse24h } from "../src/rules/response24h.js";
import { DEFAULT_CONFIG, type DateStr, type Entry } from "../src/types.js";

const cfg = DEFAULT_CONFIG;
const run = (entries: Entry[], date: DateStr) =>
  evaluateResponse24h(buildIndex(entries), date, cfg);

/** Fourteen calm days so a baseline exists, then whatever the test needs. */
function withBaseline(tail: Partial<Entry>[], baselineScore = 2): Entry[] {
  const head: Entry[] = [];
  for (let i = 0; i < 14; i++) {
    head.push({ date: addDays(START, i), morningScore: baselineScore, sessions: [] });
  }
  const rest = tail.map((t, i) => ({
    date: addDays(START, 14 + i),
    morningScore: t.morningScore ?? baselineScore,
    sessions: t.sessions ?? [],
  }));
  return [...head, ...rest];
}

describe("24-hour rule", () => {
  it("declines to judge a day that was never recorded", () => {
    const result = run(withBaseline([{}]), "2020-01-01");
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("no-entry");
  });

  it("declines to judge a rest day", () => {
    const result = run(withBaseline([{}, {}]), addDays(START, 14));
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("rest-day");
  });

  it("declines to judge before a baseline exists", () => {
    const result = run(tooShort(), addDays(START, 1));
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("baseline-unavailable");
  });

  it("declines to judge when tomorrow was never recorded", () => {
    const result = run(withBaseline([{ sessions: [session(6, 40)] }]), addDays(START, 14));
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("next-day-missing");
  });

  it("passes a session that settles overnight", () => {
    const result = run(
      withBaseline([{ sessions: [session(6, 40)] }, { morningScore: 3 }]),
      addDays(START, 14),
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("green");
      expect(result.reason).toBe("settled-within-24h");
      expect(result.detail.delta).toBe(1);
    }
  });

  it("flags amber when a mild reaction clears within two days", () => {
    const result = run(mildReaction(), addDays(START, 20));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("amber");
      expect(result.reason).toBe("elevated-but-settled");
    }
  });

  it("flags red when a mild reaction is still there after 48 hours", () => {
    const result = run(lingeringReaction(), addDays(START, 20));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("red");
      expect(result.reason).toBe("still-elevated-after-48h");
      expect(result.detail.delta).toBe(3);
    }
  });

  it("flags red on a large reaction without waiting for the second day", () => {
    const result = run(
      withBaseline([{ sessions: [session(9, 60)] }, { morningScore: 8 }]),
      addDays(START, 14),
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.severity).toBe("red");
      expect(result.reason).toBe("large-reaction");
      expect(result.detail.followUpMorning).toBeNull();
    }
  });

  it("treats a severe reaction as large even when a follow-up day exists", () => {
    const result = run(poorResponse(), addDays(START, 20));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.reason).toBe("large-reaction");
      expect(result.detail.delta).toBe(5);
      expect(result.detail.followUpMorning).toBe(6);
    }
  });

  it("needs the second day before calling a mild reaction", () => {
    const result = run(
      withBaseline([{ sessions: [session(6, 40)] }, { morningScore: 5 }]),
      addDays(START, 14),
    );
    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") expect(result.reason).toBe("second-day-missing");
  });

  it("does not let one bad morning move the baseline", () => {
    // Thirteen calm days plus one very bad one. A mean would shift by ~0.5
    // and could turn a red verdict amber. The median must not budge.
    const head: Entry[] = [];
    for (let i = 0; i < 13; i++) head.push({ date: addDays(START, i), morningScore: 2, sessions: [] });
    head.push({ date: addDays(START, 13), morningScore: 9, sessions: [] });

    const entries: Entry[] = [
      ...head,
      { date: addDays(START, 14), morningScore: 2, sessions: [session(6, 40)] },
      { date: addDays(START, 15), morningScore: 6, sessions: [] },
      { date: addDays(START, 16), morningScore: 6, sessions: [] },
    ];

    const result = run(entries, addDays(START, 14));
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.detail.baseline).toBe(2);
      expect(result.severity).toBe("red");
    }
  });
});
