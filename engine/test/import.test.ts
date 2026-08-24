/**
 * Reading a real diary file.
 *
 * The importer is deliberately forgiving about form and strict about content:
 * a spreadsheet that saved with semicolons must still work, a value that is
 * not a number must be reported rather than guessed at.
 */

import { describe, expect, it } from "vitest";
import { session } from "../src/fixtures.js";
import { parseDiary } from "../src/import.js";
import { evaluateEpisode } from "../src/evaluate.js";
import { validateEntries } from "../src/validate.js";

const HEADER = "datum,morgen,aktivitaet,minuten,anstrengung,beschwerden,zeitpunkt,notiz";

const codes = (problems: { code: string }[]): string[] => problems.map((p) => p.code);

describe("diary import", () => {
  it("reads a plain comma file", () => {
    const { entries, problems } = parseDiary(
      [HEADER, "2026-08-21,3,laufen,30,5,4,danach,", "2026-08-22,4,,,,,,"].join("\n"),
    );
    expect(problems).toEqual([]);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      date: "2026-08-21",
      morningScore: 3,
      sessions: [session(5, 30, "run")],
      symptomScore: 4,
      symptomTiming: "after",
    });
    // A rest day: only the two fields that matter.
    expect(entries[1]).toMatchObject({ date: "2026-08-22", morningScore: 4, sessions: [] });
  });

  it("reads the semicolon dialect a German spreadsheet produces", () => {
    const { entries, problems } = parseDiary(
      ["datum;morgen;aktivitaet;minuten;anstrengung", "2026-08-21;3;rad;40;6"].join("\r\n"),
    );
    expect(problems).toEqual([]);
    expect(entries[0]).toMatchObject({ sessions: [session(6, 40, "cycle")] });
  });

  it("survives a byte-order mark and blank lines", () => {
    const { entries, problems } = parseDiary(
      "﻿" + [HEADER, "", "2026-08-21,3,,,,,,", ""].join("\n"),
    );
    expect(problems).toEqual([]);
    expect(entries).toHaveLength(1);
  });

  it("does not care about column order", () => {
    const { entries, problems } = parseDiary(
      ["morgen,notiz,datum", "3,schlecht geschlafen,2026-08-21"].join("\n"),
    );
    expect(problems).toEqual([]);
    expect(entries[0]).toMatchObject({ date: "2026-08-21", morningScore: 3, sessions: [], note: "schlecht geschlafen" });
  });

  it("accepts German and English labels alike", () => {
    const de = parseDiary(["datum,morgen,zeitpunkt,beschwerden", "2026-08-21,3,während,5"].join("\n"));
    const en = parseDiary(["date,morning,timing,pain", "2026-08-21,3,during,5"].join("\n"));
    expect(de.entries[0]!.symptomTiming).toBe("during");
    expect(en.entries[0]!.symptomTiming).toBe("during");
  });

  it("keeps a separator that sits inside a quoted note", () => {
    const { entries } = parseDiary(
      [HEADER, '2026-08-21,3,,,,,,"Wade fest, aber besser"'].join("\n"),
    );
    expect(entries[0]!.note).toBe("Wade fest, aber besser");
  });

  it("skips an untouched template row instead of complaining", () => {
    const { entries, problems } = parseDiary([HEADER, ",,,,,,,", "2026-08-21,3,,,,,,"].join("\n"));
    expect(problems).toEqual([]);
    expect(entries).toHaveLength(1);
  });

  it("reports a malformed date by line and moves on", () => {
    const { entries, problems } = parseDiary(
      [HEADER, "21.08.2026,3,,,,,,", "2026-08-22,4,,,,,,"].join("\n"),
    );
    expect(codes(problems)).toEqual(["invalid-date"]);
    expect(problems[0]!.message).toContain("Zeile 2");
    expect(entries).toHaveLength(1);
  });

  it("refuses to guess at a missing morning score", () => {
    const { entries, problems } = parseDiary([HEADER, "2026-08-21,,laufen,30,5,,,"].join("\n"));
    expect(codes(problems)).toEqual(["not-a-number"]);
    expect(entries).toHaveLength(0);
  });

  it("reports a typo in any numeric column, not just the morning score", () => {
    // Found by running the command on a real-looking file: `abc` in the
    // minutes column became null, which turned a session into a rest day and
    // bent the load curve downward with no warning at all.
    const { entries, problems } = parseDiary([HEADER, "2026-08-21,3,laufen,abc,5,,,"].join("\n"));
    expect(codes(problems)).toContain("not-a-number");
    expect(problems[0]!.field).toBe("minuten");
    expect(problems[0]!.message).toContain("abc");
    expect(entries).toHaveLength(1); // the row is still returned, flagged
  });

  it("does not mistake an empty numeric cell for a typo", () => {
    const { problems } = parseDiary([HEADER, "2026-08-21,3,,,,,,"].join("\n"));
    expect(problems).toEqual([]);
  });

  it("names an unknown activity rather than silently dropping it", () => {
    const { problems } = parseDiary([HEADER, "2026-08-21,3,paragliding,30,5,,,"].join("\n"));
    expect(codes(problems)).toContain("unknown-activity");
    expect(problems[0]!.message).toContain("paragliding");
  });

  it("names an unknown symptom timing and says what is allowed", () => {
    const { problems } = parseDiary([HEADER, "2026-08-21,3,laufen,30,5,4,morgens,"].join("\n"));
    expect(codes(problems)).toContain("unknown-timing");
    expect(problems[0]!.message).toContain("danach");
  });

  it("insists on a date column and a morning column", () => {
    expect(codes(parseDiary(["morgen,minuten", "3,30"].join("\n")).problems)).toEqual(["missing-column"]);
    expect(codes(parseDiary(["datum,minuten", "2026-08-21,30"].join("\n")).problems)).toEqual(["missing-column"]);
  });

  it("reports an empty file", () => {
    expect(codes(parseDiary("").problems)).toEqual(["empty-file"]);
    expect(codes(parseDiary("\n\n  \n").problems)).toEqual(["empty-file"]);
  });

  it("produces entries the rest of the engine accepts unchanged", () => {
    // The point of the whole file: what comes out here must be able to go
    // straight into the rules with no further massaging.
    const rows = [HEADER];
    for (let i = 0; i < 40; i++) {
      const day = String(21 + i).padStart(2, "0");
      const date = i < 10 ? `2026-08-${day}` : `2026-09-${String(i - 9).padStart(2, "0")}`;
      rows.push(i % 7 < 4 ? `${date},3,laufen,30,5,3,danach,` : `${date},3,,,,,,`);
    }

    const { entries, problems } = parseDiary(rows.join("\n"));
    expect(problems).toEqual([]);
    expect(validateEntries(entries).ok).toBe(true);

    const result = evaluateEpisode({ entries, context: { bodyRegion: "achilles" } });
    expect(result.problems).toEqual([]);
    expect(result.flags.length).toBeGreaterThan(0);
  });
});
