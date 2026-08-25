import type { NextConfig } from "next";
import { STATIC_SECURITY_HEADERS } from "./src/lib/security-headers";

const config: NextConfig = {
  /**
   * `X-Powered-By: Next.js` stand in jeder Antwort. Kein Loch für sich, aber
   * es sagt einem Scanner kostenlos, welche Angriffe sich überhaupt lohnen.
   */
  poweredByHeader: false,

  /**
   * Die Kopfzeilen ohne Anfragebezug — hier und nicht im Proxy, weil der
   * statische Dateien absichtlich auslässt. Die Inhaltsrichtlinie braucht
   * dagegen einen Nonce je Anfrage und steht deshalb im Proxy.
   */
  async headers() {
    return [{ source: "/:path*", headers: STATIC_SECURITY_HEADERS }];
  },

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
     *
     * -----------------------------------------------------------------------
     * NEXT 16 MAKES TURBOPACK THE DEFAULT, AND THIS IS WHY WE OPT OUT.
     *
     * Turbopack has no equivalent of `extensionAlias`. It applies Node's ESM
     * rules literally, so `./tissue.js` means a file called tissue.js, and the
     * build fails on every one of the engine's internal imports.
     *
     * The two ways out are dropping the extensions in the engine, or staying on
     * webpack. Dropping them is the same trade the paragraph above already
     * refused, and it would cost more now than it did then: it would make the
     * engine unrunnable under plain Node, closing off a standalone use — a CLI,
     * a report generator — for the sake of one bundler.
     *
     * So: webpack, declared with `--webpack` in package.json rather than left
     * to be inferred. Next 16 refuses to guess, which is right of it.
     *
     * Revisit if webpack support is withdrawn. The decision to reopen then is
     * whether the engine stays portable ESM or becomes bundler-only.
     * -----------------------------------------------------------------------
     */
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default config;
