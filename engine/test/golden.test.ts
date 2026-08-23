/**
 * The frozen report.
 *
 * `buildReport()` renders every scenario exactly as a user would read it. That
 * text is stored and compared on every run, so any change in engine behaviour
 * shows up as a readable diff — which threshold moved, which scenario flipped,
 * which verdict disappeared.
 *
 * When a change is intended, run `npm test -- -u` and READ the diff before
 * accepting it. That reading is the point of the file.
 */

import { describe, expect, it } from "vitest";
import { buildReport } from "../src/report.js";
import { SCENARIOS } from "../src/fixtures.js";

describe("golden report", () => {
  it("matches the stored output", async () => {
    await expect(buildReport()).toMatchFileSnapshot("./__golden__/report.txt");
  });

  it("is deterministic across runs", () => {
    // The fixtures use a seeded generator. If this ever fails, some rule or
    // fixture reached for the clock or real randomness, and every stored
    // comparison below becomes worthless.
    expect(buildReport()).toBe(buildReport());
  });

  it("covers every scenario in the library", () => {
    const report = buildReport();
    for (const scenario of SCENARIOS) {
      expect(report, `missing scenario: ${scenario.key}`).toContain(scenario.title);
    }
  });
});
