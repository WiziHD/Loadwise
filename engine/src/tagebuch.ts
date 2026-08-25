/**
 * Run the engine over a real, hand-kept diary file.
 *
 *   npm run tagebuch -- ../tagebuch.csv
 *   npm run tagebuch -- ../tagebuch.csv achilles_midportion
 *   npm run tagebuch -- ../tagebuch.csv achilles_midportion ../selbsttests.csv
 *
 * This is the command that closes the one acceptance condition TECHNIK.md sets
 * for Phase 0. Until it has been run on real data, every threshold in this
 * engine has only ever been checked against fixtures generated from the same
 * assumptions the thresholds encode.
 *
 * ---------------------------------------------------------------------------
 * DAS ZWEITE ARGUMENT WAR EINE KÖRPERREGION, UND DAS WAR SEIT DEM
 * REGISTRY-UMBAU ZU WENIG.
 *
 * Profile werden seither nach SCHLÜSSEL geführt, nicht nach Region — genau
 * deshalb, weil sich mehrere eine Region teilen: `patellofemoral_pain` und
 * `acl_reconstruction` liegen beide auf `knee`. Wer hier eine Region angab,
 * bekam immer das Standardprofil dieser Region; die anderen waren von diesem
 * Werkzeug aus schlicht unerreichbar.
 *
 * Das ist nicht irgendein Werkzeug. Es ist der Weg, auf dem ein echtes
 * Tagebuch in den Motor kommt — also der Weg für Schritt 5, den EINZIGEN
 * Schritt des Profilverfahrens, der Schwellen wirklich validiert. Ein
 * Validierungsschritt, der das zu validierende Profil nicht auswählen kann,
 * validiert nichts.
 *
 * Regionen bleiben zulässig: Der alte Aufruf steht in Dokumenten, und ihn
 * stillschweigend zu brechen wäre derselbe Fehler in klein. Ein Schlüssel
 * gewinnt, wenn beides passt.
 * ---------------------------------------------------------------------------
 */

import { readFileSync } from "node:fs";
import { parseDiary, parseTests } from "./import.js";
import { reportScenario } from "./report.js";
import { ALL_PROFILES, profileByKey } from "./profiles/registry.js";
import type { BodyRegion, EpisodeContext, SelfTest } from "./types.js";

const REGIONS: BodyRegion[] = [
  "achilles",
  "calf",
  "patella",
  "knee",
  "hamstring",
  "hip",
  "foot",
  "shoulder",
  "elbow",
  "back",
  "other",
];

/**
 * Das zweite Argument: ein Profilschlüssel oder eine Körperregion.
 *
 * Der Schlüssel gewinnt. Beide Formen aufzulösen kostet vier Zeilen und hält
 * jeden dokumentierten Aufruf am Leben.
 */
export function kontextAus(arg: string | undefined): EpisodeContext | { fehler: string } {
  if (arg === undefined) return { bodyRegion: "other" };

  const profil = profileByKey(arg);
  if (profil !== undefined) {
    return { bodyRegion: profil.bodyRegion as BodyRegion, profileKey: profil.key };
  }

  if (REGIONS.includes(arg as BodyRegion)) return { bodyRegion: arg as BodyRegion };

  return {
    fehler:
      `»${arg}« ist weder ein Profil noch eine Körperregion.\n\n` +
      `Profile:\n  ${ALL_PROFILES.map((p) => p.key).join("\n  ")}\n\n` +
      `Regionen (nehmen das Standardprofil der Region):\n  ${REGIONS.join(", ")}`,
  };
}

function main(): void {
  const [path, profilArg, testPath] = process.argv.slice(2);

  if (!path) {
    console.error("Aufruf: npm run tagebuch -- <tagebuch.csv> [profil|körperregion] [selbsttests.csv]");
    console.error(`Profile: ${ALL_PROFILES.map((p) => p.key).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const context = kontextAus(profilArg);
  if ("fehler" in context) {
    console.error(context.fehler);
    process.exitCode = 1;
    return;
  }

  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.error(`Datei nicht lesbar: ${path}`);
    process.exitCode = 1;
    return;
  }

  const { entries, problems } = parseDiary(text);

  // The third argument is what makes the side-to-side rule reachable at all.
  //
  // Until this existed the call below passed `tests: []` as a literal, so the
  // product's stated differentiator had never once been run on a measurement
  // somebody actually took. The rule was finished; the road to it was not.
  let tests: SelfTest[] = [];
  if (testPath) {
    let testText: string;
    try {
      testText = readFileSync(testPath, "utf8");
    } catch {
      console.error(`Testdatei nicht lesbar: ${testPath}`);
      process.exitCode = 1;
      return;
    }

    const parsed = parseTests(testText);
    tests = parsed.tests;

    if (parsed.problems.length > 0) {
      console.log(`${parsed.problems.length} Problem(e) in der Testdatei:`);
      for (const p of parsed.problems) console.log(`  ! ${p.message}`);
      console.log("");
    }
    if (parsed.measurements.length > 0) {
      console.log(
        `${parsed.measurements.length} eigene Messung(en) gelesen — sie werden hier noch nicht ausgewertet.`,
      );
      console.log("");
    }
  }

  if (problems.length > 0) {
    console.log(`${problems.length} Problem(e) beim Einlesen:`);
    for (const p of problems) console.log(`  ! ${p.message}`);
    console.log("");
  }

  if (entries.length === 0) {
    console.log("Keine verwertbaren Zeilen gefunden.");
    process.exitCode = problems.length > 0 ? 1 : 0;
    return;
  }

  console.log(
    reportScenario({
      key: "tagebuch",
      title: `Eigenes Tagebuch — ${path}`,
      entries,
      tests,
      context,
    }),
  );

  console.log("");
  console.log("Die entscheidende Frage ist nicht, ob oben Zahlen stehen, sondern ob");
  console.log("unter »Auffälligkeiten« etwas steht, das du selbst nicht gesehen hättest.");
}

main();
