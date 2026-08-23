import type { NextConfig } from "next";

const config: NextConfig = {
  /**
   * The engine ships as TypeScript source, not as a built bundle.
   *
   * That is deliberate. A build step would mean two copies of the rules — the
   * one the 306 tests run against and the one the app actually ships — and the
   * day those diverge is the day a verdict changes without anybody deciding it.
   * Next transpiles the workspace package instead, so there is one source of
   * truth for what this product says.
   */
  transpilePackages: ["loadwise-engine"],

  typescript: {
    // A type error must never reach a deployment. The engine's whole safety
    // story is types — exhaustive records, literal `false`, discriminated
    // unions — and ignoring them at the build step would throw that away.
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  webpack: (config) => {
    /**
     * The engine writes `import { x } from "./tissue.js"` — the correct form
     * for ES modules, where the extension refers to the file that will exist at
     * runtime rather than the one on disk. Node resolves it; webpack does not,
     * and reports "Can't resolve ./tissue.js" for a file that is right there.
     *
     * Fixed here rather than in the engine. Rewriting 30 imports to drop the
     * extension would break `tsx`, the test runner and `npm run tagebuch` —
     * bending the source of truth to suit one consumer's bundler.
     */
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default config;
