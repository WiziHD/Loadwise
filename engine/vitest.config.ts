import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      // Entry-point scripts and the fixture library itself are exercised by
      // running them, not by asserting on them.
      exclude: ["src/demo.ts", "src/calibrate.ts", "src/tagebuch.ts", "src/mutate.ts", "src/dials.ts", "src/profiles/types.ts", "src/index.ts", "src/fixtures.ts"],
      thresholds: {
        // The rules are the product. Nothing less than complete is acceptable
        // here — an unexecuted branch is where the first real bug hid.
        "src/rules/**/*.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        // Everything else carries a high floor. The remainder is defensive
        // code against inputs the type system already rules out.
        //
        // -------------------------------------------------------------------
        // RE-CALIBRATED FOR VITEST 4, AND THE OLD NUMBERS DO NOT COMPARE.
        //
        // The v8 provider counts differently now: statements went from 3771 to
        // 1129 and functions from 90 to 138 over the SAME code. The old floors
        // were set against the inflated count, so they read as a drop when
        // nothing dropped.
        //
        // Two real gaps turned up while sorting this out, and both were fixed
        // rather than accommodated: `milestoneText` and `progressBlockText`
        // were called by no test at all, and three of the five milestone
        // measure sources — morning score, symptom score, session minutes —
        // had never been executed.
        //
        // These are floors against regression, set just under what holds
        // today, not aspirations. What is left uncovered is defensive code and
        // a handful of import-parser branches; `src/rules/**` above stays at
        // 100 and that is the number the README promises.
        //
        // -------------------------------------------------------------------
        // ANGEHOBEN, NACHDEM DIE DREI SCHWÄCHSTEN DATEIEN DURCHGESEHEN WURDEN.
        //
        // Nicht durch Tests, die Zeilen abhaken, sondern durch die Frage, ob
        // jede Stelle überhaupt erreichbar ist. Drei waren es nicht und sind
        // weg; der Rest hat jetzt Tests mit einer Aussage — kaputte
        // Tagebuchdateien, ein Orakel, das an einem Szenario scheitert, der
        // Rand des Tagebuchs.
        //
        // Wieder Böden gegen Rückschritt, knapp unter dem, was heute hält —
        // keine Zielwerte. Wer sie durch Tests ohne Aussage erreichen will,
        // hat das Werkzeug missverstanden.
        // -------------------------------------------------------------------
        statements: 98,
        branches: 95,
        functions: 100,
        lines: 99,
      },
    },
  },
});
