/**
 * Day N of the record — and which day it is counted from.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildIndex, episodeDay } from "../src/episode.js";
import { validateEpisodeStart } from "../src/validate.js";
import type { Entry } from "../src/types.js";

const ENTRIES: Entry[] = [
  { date: "2026-03-15", morningScore: 4, sessions: [] },
  { date: "2026-03-16", morningScore: 4, sessions: [] },
  { date: "2026-03-20", morningScore: 3, sessions: [] },
];

describe("episodeDay", () => {
  it("counts from the first entry when nothing was declared", () => {
    const index = buildIndex(ENTRIES, { bodyRegion: "achilles" });
    expect(episodeDay(index, "2026-03-15")).toEqual({ day: 1, anchor: "first-entry" });
    expect(episodeDay(index, "2026-03-20")).toEqual({ day: 6, anchor: "first-entry" });
  });

  it("counts from the declared start when there is one", () => {
    const index = buildIndex(ENTRIES, { bodyRegion: "achilles", startedOn: "2026-03-01" });
    expect(episodeDay(index, "2026-03-15")).toEqual({ day: 15, anchor: "declared" });
  });

  it("hands back the anchor with the number, never the number alone", () => {
    // The whole safety of the field. Somebody who began logging in week three
    // is on day one of the RECORD and day fifteen of the INJURY, and a caller
    // that received a bare 1 could present it as either.
    const record = buildIndex(ENTRIES, { bodyRegion: "achilles" });
    const injury = buildIndex(ENTRIES, { bodyRegion: "achilles", startedOn: "2026-03-01" });

    const a = episodeDay(record, "2026-03-15")!;
    const b = episodeDay(injury, "2026-03-15")!;

    expect(a.day).not.toBe(b.day);
    expect(a.anchor).not.toBe(b.anchor);
  });

  it("says nothing rather than counting backwards", () => {
    const index = buildIndex(ENTRIES, { bodyRegion: "achilles" });
    expect(episodeDay(index, "2026-03-01")).toBeNull();
    expect(episodeDay(buildIndex([], { bodyRegion: "achilles" }), "2026-03-01")).toBeNull();
  });
});

describe("a declared start is checked against the record", () => {
  it("refuses an episode that begins after its own first entry", () => {
    const result = validateEpisodeStart("2026-06-01", "2026-03-15");
    expect(result.ok).toBe(false);
    expect(result.problems[0]!.code).toBe("start-after-first-entry");
  });

  it("accepts a start before or on the first entry, and no start at all", () => {
    expect(validateEpisodeStart("2026-03-01", "2026-03-15").ok).toBe(true);
    expect(validateEpisodeStart("2026-03-15", "2026-03-15").ok).toBe(true);
    expect(validateEpisodeStart(undefined, "2026-03-15").ok).toBe(true);
    expect(validateEpisodeStart("2026-03-01", null).ok).toBe(true);
  });
});

describe("no rule reads the declared start", () => {
  it("keeps every verdict anchored to the record, not to a recollection", () => {
    // A literal grep, because the argument is not stylistic.
    //
    // `stagnation` takes its window origin from `index.first`, and report.ts
    // explains at length why that opening fortnight deliberately swallows the
    // fast early improvement almost everybody gets. Moving that origin to a
    // date somebody typed from memory — "March... or was it April?" — would
    // silently change shipped verdicts, and nothing would look wrong.
    //
    // `startedOn` renders a label. It decides nothing.
    const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "rules");
    const offenders: string[] = [];

    for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
      const text = readFileSync(join(dir, file), "utf8");
      if (text.includes("startedOn")) offenders.push(file);
    }

    expect(offenders, `these rules read the declared start: ${offenders.join(", ")}`).toEqual([]);
  });

  it("would notice if one did", () => {
    // Proof the grep above has teeth: it is a substring search, and a
    // substring search that never matched anything would look identical.
    expect("const start = context.startedOn;".includes("startedOn")).toBe(true);
  });
});
