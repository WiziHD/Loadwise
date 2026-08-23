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
        statements: 98,
        branches: 95,
        functions: 100,
        lines: 98,
      },
    },
  },
});
