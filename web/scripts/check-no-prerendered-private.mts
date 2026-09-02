/**
 * Nothing that depends on WHO is asking may be baked into a static file.
 *
 * This exists because the build summary is misleading. `next build` prints
 * `● (SSG) prerendered as static HTML` next to every route that has
 * `generateStaticParams`, including routes that read cookies and therefore
 * render on demand. Reading that table, the home page — which lists a person's
 * injuries — looks prerendered. It is not; the prerender manifest is the
 * authority, and it lists only `/_not-found`.
 *
 * A future refactor could make that untrue without anything looking wrong:
 * hoist the auth check into a layout, wrap a query in `unstable_cache`, add
 * `export const dynamic = "force-static"` to silence a warning. The result
 * would be one person's episode list served to everyone, and it would fail
 * silently and permanently.
 *
 * The list of injuries somebody is tracking is the most sensitive thing this
 * product holds. So: an allowlist, and everything else is an error.
 *
 * Run AFTER a build. Without `.next/prerender-manifest.json` it says so and
 * fails, rather than passing on a missing file.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Routes with no per-person content. Adding to this list is a decision.
 *
 * `/_global-error` arrived with Next 16 and the check caught it on the first
 * build after the upgrade — which is the point of having it. It is the
 * framework's own last-resort error page: it renders a fixed sentence, reads
 * nothing, and cannot reach a database.
 *
 * `/en/signin` and `/de/signin` USED TO STAND HERE, and matched nothing. The
 * sign-in page reads `searchParams`, so it renders on demand and never appears
 * in the manifest at all — the two lines were a standing permission for
 * something that was not happening. An allowlist entry that never fires is
 * worse than an absent one: it reads as a decision somebody weighed, and it
 * would have silently covered the day that page DID turn static.
 */
const PUBLIC_ROUTES = new Set(["/_not-found", "/_global-error"]);

const MANIFEST = resolve(process.cwd(), ".next/prerender-manifest.json");

function fail(message: string): never {
  console.error(`\nPrerender check FAILED\n\n${message}\n`);
  process.exit(1);
}

function main(): void {
  if (!existsSync(MANIFEST)) {
    fail(`No ${MANIFEST}.\nRun \`next build\` first — this check reads the build output.`);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    routes?: Record<string, unknown>;
    dynamicRoutes?: Record<string, unknown>;
  };

  const prerendered = [
    ...Object.keys(manifest.routes ?? {}),
    ...Object.keys(manifest.dynamicRoutes ?? {}),
  ];

  const leaked = prerendered.filter((route) => !PUBLIC_ROUTES.has(route));

  if (leaked.length > 0) {
    fail(
      `These routes are baked into static files, and at least one of them\n` +
        `renders per-person content:\n\n` +
        leaked.map((r) => `  ${r}`).join("\n") +
        `\n\nEither the route must not read user data, or it must stay dynamic.\n` +
        `If it genuinely holds nothing personal, add it to PUBLIC_ROUTES in\n` +
        `scripts/check-no-prerendered-private.mts — deliberately.`,
    );
  }

  console.log(
    `No private route is prerendered: ${prerendered.length} static ` +
      `${prerendered.length === 1 ? "route" : "routes"}, all on the allowlist.`,
  );
}

main();
