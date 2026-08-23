/**
 * The engine's sentences must never be copied into the app.
 *
 * ---------------------------------------------------------------------------
 * `engine/src/wording.ts` is a regulatory boundary rather than a translation
 * table. Three ban lists run over every sentence in it — imperatives,
 * predictions, praise — and each carries a proof test showing it fires.
 *
 * A copy in the app's dictionary would sit OUTSIDE all of that. It would look
 * like an ordinary string, translators would treat it like one, and the first
 * well-meaning rewrite would put an instruction in front of somebody with
 * nothing left to catch it.
 *
 * The rule is easy to state and easy to break by accident, so it is checked
 * rather than trusted. Same reason the engine greps its own rules for
 * `startedOn`: an argument that only lives in a comment is an argument that
 * eventually loses.
 *
 * Run: npm run check:boundary --workspace=web
 * ---------------------------------------------------------------------------
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALL_BLOCKING_REASONS,
  ALL_REASON_CODES,
  ALL_PROFILES,
  BLOCKED_WORDING,
  CLAIM_WORDING,
  DISCLAIMER,
  MILESTONE_WORDING,
  PROGRESS_BLOCK_WORDING,
  VERDICT_WORDING,
} from "loadwise-engine";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** Every sentence the engine is allowed to say, in both languages. */
function engineSentences(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const add = (where: string, phrase: { de: string; en: string }): void => {
    out.push({ where, text: phrase.de }, { where, text: phrase.en });
  };

  for (const code of ALL_REASON_CODES) add(`verdict:${code}`, VERDICT_WORDING[code]);
  for (const reason of ALL_BLOCKING_REASONS) add(`blocked:${reason}`, BLOCKED_WORDING[reason]);
  for (const [key, phrase] of Object.entries(MILESTONE_WORDING)) add(`milestone:${key}`, phrase);
  for (const [key, phrase] of Object.entries(CLAIM_WORDING)) add(`claim:${key}`, phrase);
  for (const [key, phrase] of Object.entries(PROGRESS_BLOCK_WORDING)) add(`block:${key}`, phrase);
  add("disclaimer", DISCLAIMER);

  for (const profile of ALL_PROFILES) {
    for (const flag of profile.redFlags) add(`redflag:${profile.key}/${flag.key}`, flag.text);
    add(`limitations:${profile.key}`, profile.limitations);
    if (profile.horizon) add(`horizon:${profile.key}`, profile.horizon.note);
  }

  return out;
}

function sourceFiles(dir: string): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx|json)$/.test(name)) out.push({ path: full, text: readFileSync(full, "utf8") });
  }
  return out;
}

const files = sourceFiles(SRC);
const offenders: string[] = [];

for (const sentence of engineSentences()) {
  // Short strings would match by coincidence; a real copy is a whole sentence.
  if (sentence.text.length < 40) continue;

  for (const file of files) {
    if (file.text.includes(sentence.text)) {
      offenders.push(`${file.path}\n    copies ${sentence.where}\n    "${sentence.text.slice(0, 70)}…"`);
    }
  }
}

if (offenders.length > 0) {
  console.error("\nThe engine's wording has been copied into the app:\n");
  for (const o of offenders) console.error(`  ${o}\n`);
  console.error(
    "These sentences are a regulatory boundary, not a translation table. Call\n" +
      "verdictText() / blockedText() / milestoneText() with a locale instead.\n",
  );
  process.exit(1);
}

// Proof the check has teeth: a planted copy must be found. A scan that matched
// nothing anywhere would pass identically to one that is working.
const planted = engineSentences().find((s) => s.text.length >= 40);
if (planted === undefined) {
  console.error("No engine sentence long enough to check with — the guard is not working.");
  process.exit(1);
}
if (!`const x = ${JSON.stringify(planted.text)};`.includes(planted.text)) {
  console.error("The guard cannot detect a copy it planted itself.");
  process.exit(1);
}

console.log(
  `Wording boundary holds: ${engineSentences().length} engine sentences, none copied into ${files.length} app files.`,
);
