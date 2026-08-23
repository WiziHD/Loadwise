/**
 * Which thresholds actually matter?
 *
 * Every dial in DEFAULT_CONFIG is a judgement call. Some are load-bearing: move
 * them a little and half the scenario library changes verdict. Others could be
 * moved by a factor of two and nothing would happen at all.
 *
 * This is NOT an attempt to find the right values — real diary data is the only
 * thing that can settle those. The purpose is to know WHICH values are worth
 * arguing about, so that when real data arrives we look at the four dials that
 * decide something instead of all sixteen.
 *
 * Method: sweep one dial at a time, render the verdict distribution across
 * every scenario, and measure how far the dial can move before that
 * distribution changes. A short distance means knife-edge.
 *
 * Run with: npm run calibrate
 */

import { assertConfig } from "./config.js";
import { evaluateEpisode } from "./evaluate.js";
import { SCENARIOS } from "./fixtures.js";
import { ALL_PROFILES } from "./profiles/registry.js";
import type { Profile } from "./profiles/types.js";
import { DIALS, type Dial } from "./dials.js";
import { DEFAULT_CONFIG, type Config } from "./types.js";

/** Compact fingerprint of what the whole library says under one configuration. */
function signature(config: Config, profile?: Profile): string {
  const parts: string[] = [];
  for (const scenario of SCENARIOS) {
    const result = evaluateEpisode({
      entries: scenario.entries,
      tests: scenario.tests,
      // With a profile forced, every scenario is read as if it were THIS
      // injury. That is the only way to ask "which dial decides something for
      // an Achilles tendon" rather than "for whatever mix the library happens
      // to carry".
      context: profile ? undefined : scenario.context,
      profile,
      config,
      skipValidation: true,
    });
    // The reason code is part of the fingerprint on purpose. Without it, a
    // threshold move that swaps one verdict for another of the same severity
    // reads as "no effect" and the dial is reported ROBUST when it is not.
    const summary = result.flags
      .map((f) => `${f.kind}=${f.reason}`)
      .sort()
      .join(",");
    const overall =
      result.overall.status === "judged" ? result.overall.severity : result.overall.status;
    parts.push(`${scenario.key}:${overall}:[${summary}]`);
  }
  return parts.join("|");
}

interface Sweep {
  value: number;
  signature: string | null;
  invalid: boolean;
}

function sweep(dial: Dial, profile?: Profile): Sweep[] {
  return dial.values.map((value) => {
    const config: Config = structuredClone(DEFAULT_CONFIG);
    dial.set(config, value);
    try {
      assertConfig(config);
    } catch {
      return { value, signature: null, invalid: true };
    }
    return { value, signature: signature(config, profile), invalid: false };
  });
}

interface DialReport {
  key: string;
  current: number;
  distinctOutcomes: number;
  nearestFlip: number | null;
  unit: string;
}

function analyse(dial: Dial, profile?: Profile): DialReport {
  const results = sweep(dial, profile);
  const valid = results.filter((r) => !r.invalid);
  const current = dial.get(DEFAULT_CONFIG);

  const distinct = new Set(valid.map((r) => r.signature)).size;

  // Signature produced by the value we actually ship.
  const baseConfig: Config = structuredClone(DEFAULT_CONFIG);
  dial.set(baseConfig, current);
  const baseSignature = signature(baseConfig, profile);

  let nearestFlip: number | null = null;
  for (const r of valid) {
    if (r.signature === baseSignature) continue;
    const distance = Math.abs(r.value - current);
    if (nearestFlip === null || distance < nearestFlip) nearestFlip = distance;
  }

  return {
    key: dial.key,
    current,
    distinctOutcomes: distinct,
    nearestFlip,
    unit: dial.unit ?? "",
  };
}

function verdictOf(report: DialReport): string {
  if (report.distinctOutcomes <= 1) return "TOT      keine Wirkung im geprüften Bereich";
  if (report.nearestFlip === null) return "TOT      kippt nirgends im geprüften Bereich";
  const relative = report.current === 0 ? Infinity : report.nearestFlip / Math.abs(report.current);
  if (relative <= 0.15) return "KRITISCH kippt schon bei kleiner Änderung";
  if (relative <= 0.4) return "SENSIBEL reagiert spürbar";
  return "ROBUST   verträgt deutliche Verschiebung";
}

/** Just the word, without the explanation that follows it in the table. */
const ratingOf = (report: DialReport): string => verdictOf(report).split(" ")[0]!;

/**
 * Which dials a RESEARCHED profile rates differently from the shipped defaults.
 *
 * Step 4 of the procedure asks the calibration to run against the profile
 * library, and this is the answer worth having. The full table repeated eleven
 * times would be noise; what matters is the difference, because a dial that is
 * robust in general and knife-edge for one injury is exactly the dial that
 * injury's thresholds have to argue about first.
 *
 * Only researched profiles are examined. Running this for ten profiles that
 * reproduce the engine defaults would print ten identical tables and imply work
 * that did not happen.
 */
function profileDeltas(baseline: Map<string, string>): string[] {
  const out: string[] = [];
  const researched = ALL_PROFILES.filter((p) =>
    Object.values(p.evidence).some((e) => e.grade !== "D"),
  );

  if (researched.length === 0) {
    out.push("Kein recherchiertes Profil vorhanden — nichts zu vergleichen.");
    return out;
  }

  for (const profile of researched) {
    const diffs: string[] = [];
    for (const dial of DIALS) {
      const mine = ratingOf(analyse(dial, profile));
      const base = baseline.get(dial.key);
      if (base !== undefined && mine !== base) {
        diffs.push(`  ${dial.key.padEnd(30)} ${base} → ${mine}`);
      }
    }
    out.push(`${profile.key} (${profile.version})`);
    out.push(
      diffs.length === 0
        ? "  Keine Abweichung — dieselben Schwellen entscheiden hier dasselbe."
        : diffs.join("\n"),
    );
    out.push("");
  }
  return out;
}

export function runCalibration(): string {
  const out: string[] = [];
  const line = (c = "-"): string => c.repeat(84);

  out.push(line("="));
  out.push("SCHWELLENWERT-EMPFINDLICHKEIT");
  out.push(line("="));
  out.push(`Geprüft über ${SCENARIOS.length} Szenarien. Gemessen wird, wie weit sich ein Wert`);
  out.push("verschieben lässt, bevor sich irgendein Urteil in der Bibliothek ändert.");
  out.push("");
  out.push("Dies sagt NICHT, welcher Wert richtig ist — nur, welcher überhaupt etwas entscheidet.");
  out.push(line());
  out.push(
    "Schwelle".padEnd(28) +
      "Aktuell".padStart(9) +
      "Varianten".padStart(11) +
      "Kippt ab".padStart(11) +
      "  Bewertung",
  );
  out.push(line());

  const reports = DIALS.map((dial) => analyse(dial));

  for (const report of reports) {
    const current = `${report.current}${report.unit}`;
    const flip = report.nearestFlip === null ? "—" : `±${Math.round(report.nearestFlip * 1000) / 1000}`;
    out.push(
      report.key.padEnd(28) +
        current.padStart(9) +
        String(report.distinctOutcomes).padStart(11) +
        flip.padStart(11) +
        "  " +
        verdictOf(report),
    );
  }

  out.push(line("="));

  const critical = reports.filter((r) => verdictOf(r).startsWith("KRITISCH"));
  const dead = reports.filter((r) => verdictOf(r).startsWith("TOT"));

  out.push("");
  if (critical.length > 0) {
    out.push("Beim Abgleich mit echten Daten zuerst hierauf schauen:");
    for (const r of critical) out.push(`  · ${r.key}`);
  } else {
    out.push("Keine Schwelle steht auf Messers Schneide.");
  }

  if (dead.length > 0) {
    out.push("");
    out.push("Ohne Wirkung auf die aktuelle Szenario-Bibliothek — entweder unkritisch");
    out.push("oder es fehlt ein Szenario, das sie überhaupt anspricht:");
    for (const r of dead) out.push(`  · ${r.key}`);
  }

  out.push("");
  out.push(line("="));
  out.push("JE RECHERCHIERTEM PROFIL — WEICHT DIE BEWERTUNG AB?");
  out.push(line("="));
  out.push("Dieselbe Bibliothek, aber jedes Szenario als DIESE Verletzung gelesen.");
  out.push("Eine Schwelle, die allgemein robust ist und für eine Verletzung auf");
  out.push("Messers Schneide steht, ist genau die, um die es dort zuerst geht.");
  out.push("");
  for (const l of profileDeltas(new Map(reports.map((r) => [r.key, ratingOf(r)])))) out.push(l);

  out.push(line("="));
  return out.join("\n");
}

console.log(runCalibration());
