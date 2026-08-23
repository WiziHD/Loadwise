/**
 * Run the engine over a real, hand-kept diary file.
 *
 *   npm run tagebuch -- ../tagebuch.csv
 *   npm run tagebuch -- ../tagebuch.csv patella
 *
 * This is the command that closes the one acceptance condition TECHNIK.md sets
 * for Phase 0. Until it has been run on real data, every threshold in this
 * engine has only ever been checked against fixtures generated from the same
 * assumptions the thresholds encode.
 */

import { readFileSync } from "node:fs";
import { parseDiary, parseTests } from "./import.js";
import { reportScenario } from "./report.js";
import type { BodyRegion, SelfTest } from "./types.js";

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

function main(): void {
  const [path, regionArg, testPath] = process.argv.slice(2);

  if (!path) {
    console.error("Aufruf: npm run tagebuch -- <tagebuch.csv> [körperregion] [selbsttests.csv]");
    console.error(`Regionen: ${REGIONS.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const region = (regionArg ?? "other") as BodyRegion;
  if (!REGIONS.includes(region)) {
    console.error(`Unbekannte Körperregion »${regionArg}«.`);
    console.error(`Erlaubt: ${REGIONS.join(", ")}`);
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
      context: { bodyRegion: region },
    }),
  );

  console.log("");
  console.log("Die entscheidende Frage ist nicht, ob oben Zahlen stehen, sondern ob");
  console.log("unter »Auffälligkeiten« etwas steht, das du selbst nicht gesehen hättest.");
}

main();
