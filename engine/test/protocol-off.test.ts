/**
 * The prescriptive layer is built, cited, versioned — and inert.
 *
 * ---------------------------------------------------------------------------
 * PROTOKOLLE.md §1 names the line this layer sits on the wrong side of, in so
 * many words: "Du bist in Phase 2, mach jetzt X" and "Freigabekriterien".
 * KONZEPT.md §13 says "Keine Protokolle, keine Diagnosen, keine Freigaben."
 * MDR Rule 11 puts software that supplies information for therapeutic
 * decisions at class IIa at the least — which is why Vivira and Kaia are
 * CE-marked medical devices and this is not.
 *
 * So the catalogue exists as data and NOTHING CONSUMES IT.
 *
 * Not a guarded consumer — none at all. `Protocol.enabled` is the literal type
 * `false`, so any `if (protocol.enabled) { ... }` has an unreachable body, and
 * unreachable bodies are this project's recurring defect (six found). A guard
 * that can never fire is exactly the thing the coverage rules forbid.
 *
 * The absence of a consumer is therefore the design, and it is what makes the
 * guarantee checkable by a grep rather than by care.
 * ---------------------------------------------------------------------------
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluateEpisode } from "../src/evaluate.js";
import { steadyRecovery, symmetricTests } from "../src/fixtures.js";
import { ALL_PROFILES, profileFor } from "../src/profiles/registry.js";
import type { Profile, Protocol } from "../src/profiles/types.js";
import type { Milestone } from "../src/progress.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** Every .ts file under src/, with its path relative to src/. */
function sourceFiles(dir = SRC, prefix = ""): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full, prefix === "" ? name : `${prefix}/${name}`));
    } else if (name.endsWith(".ts")) {
      out.push({ path: prefix === "" ? name : `${prefix}/${name}`, text: readFileSync(full, "utf8") });
    }
  }
  return out;
}

/** A catalogue shaped exactly as a real one would be. */
const CATALOGUE: Protocol = {
  enabled: false,
  provenance: { grade: "B", source: "Testkatalog, steht in keiner Leitlinie" },
  phases: [
    {
      key: "rebuild",
      order: 1,
      label: { de: "Aufbau", en: "Rebuild" },
      provenance: { grade: "B", source: "Testkatalog, steht in keiner Leitlinie" },
      exitCriteria: [
        {
          kind: "test-lsi",
          test: "calf_raise",
          minPercent: 90,
          provenance: { grade: "B", source: "Testkatalog, steht in keiner Leitlinie" },
        },
        {
          kind: "time-since-start",
          minWeeks: 12,
          provenance: { grade: "B", source: "Testkatalog, steht in keiner Leitlinie" },
        },
        {
          kind: "observation",
          statement: {
            de: "Kein Erguss über eine Andeutung hinaus.",
            en: "Effusion no more than a trace.",
          },
          provenance: { grade: "B", source: "Testkatalog, steht in keiner Leitlinie" },
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

describe("nothing outside the profile layer knows the catalogue exists", () => {
  it("has no consumer anywhere in src/", () => {
    // A1. Stronger than a runtime guard, and it dodges the dead-branch problem
    // entirely: there is nothing to guard because there is nothing that reads.
    const NAMES = ["Protocol", "ProtocolPhase", "Criterion"];
    const offenders: string[] = [];

    // Comments are stripped first, and that distinction is the whole point.
    //
    // The first version of this guard fired on progress.ts — for a COMMENT
    // explaining that it had borrowed the literal-false lock from here. A
    // guard that forbids describing the design is a guard against
    // documentation. What must not exist is a line of CODE that reads the
    // catalogue.
    const codeOnly = (text: string): string =>
      text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");

    for (const file of sourceFiles()) {
      if (file.path.startsWith("profiles/")) continue;
      const code = codeOnly(file.text);
      for (const name of NAMES) {
        if (new RegExp(`\\b${name}\\b`).test(code)) offenders.push(`${file.path}: ${name}`);
      }
    }

    expect(
      offenders,
      `the prescriptive layer has grown a consumer: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("would notice if one appeared", () => {
    // Teeth for the grep above. A regex that matched nothing anywhere would
    // pass identically to one that is working.
    const planted = 'import type { Protocol } from "./profiles/types.js";';
    expect(/\bProtocol\b/.test(planted)).toBe(true);
  });
});

describe("a catalogue changes nothing while it is off", () => {
  const GOAL: Milestone = {
    id: "own",
    origin: "user",
    label: { text: "wieder zwanzig Fersenheber", locale: "de" },
    createdOn: "2026-03-02",
    all: [
      {
        measure: { source: "self_test", type: "calf_raise", side: "involved" },
        direction: "at_least",
        value: 15,
        unit: "reps",
      },
    ],
    onDistinctDays: 1,
  };

  const run = (profile: Profile) =>
    evaluateEpisode({
      entries: steadyRecovery(56),
      tests: symmetricTests(),
      profile,
      milestones: [GOAL],
    });

  it("leaves the verdict and the progress report untouched", () => {
    // A2.
    for (const base of ALL_PROFILES) {
      const without = run(base);
      const with_ = run({ ...base, key: `${base.key}_t`, protocol: CATALOGUE });

      expect(with_.overall, base.key).toEqual(without.overall);
      expect(with_.progress.milestones, base.key).toEqual(without.progress.milestones);
      expect(with_.progress.records.length, base.key).toBe(without.progress.records.length);
      expect(with_.progress.pending, base.key).toEqual(without.progress.pending);
    }
  });

  it("would notice a catalogue criterion appearing among the user's own goals", () => {
    // A3 — the teeth. The comparison above would pass unchanged if the progress
    // report happened to be empty, so here is what a leak actually looks like:
    // published criteria concatenated onto the list a person wrote themselves.
    const clean = run(profileFor("achilles"));
    expect(clean.progress.milestones.length, "nothing to compare against").toBeGreaterThan(0);

    const leaked = {
      ...clean.progress,
      milestones: [
        ...clean.progress.milestones,
        ...CATALOGUE.phases.flatMap((p) =>
          p.exitCriteria.map((_, i) => ({
            id: `${p.key}_${i}`,
            state: "not-in-record" as const,
            qualifyingDays: [],
            needed: 1,
            completedOn: null,
            blocked: null,
          })),
        ),
      ],
    };

    expect(
      leaked.milestones,
      "the comparison in the test above cannot see a leak",
    ).not.toEqual(clean.progress.milestones);
  });

  it("ships no profile with the layer switched on", () => {
    for (const p of ALL_PROFILES) {
      expect(p.protocol?.enabled ?? false, `${p.key} ships an enabled protocol`).toBe(false);
    }
  });
});

describe("a catalogue that ships must be citable", () => {
  it("carries provenance on the protocol, every phase and every criterion", () => {
    // A4. Same rule as "makes every graded claim citable": a criterion nobody
    // can argue with is a criterion nobody can audit — and this is the layer
    // where an uncheckable number would eventually become advice.
    const carriers: { what: string; source?: string }[] = [
      { what: "protocol", source: CATALOGUE.provenance.source },
      ...CATALOGUE.phases.map((p) => ({ what: `phase ${p.key}`, source: p.provenance.source })),
      ...CATALOGUE.phases.flatMap((p) =>
        p.exitCriteria.map((c, i) => ({
          what: `${p.key}/criterion ${i}`,
          source: c.provenance.source,
        })),
      ),
    ];

    for (const { what, source } of carriers) {
      expect(source?.length ?? 0, `${what} has no source`).toBeGreaterThan(15);
    }
  });

  it("can express a criterion no diary is able to check", () => {
    // The honest variant. Omitting it would make a catalogue look complete
    // when three of its criteria are invisible to a written record.
    const unmeasurable = CATALOGUE.phases[0]!.exitCriteria.filter((c) => c.kind === "observation");
    expect(unmeasurable.length).toBeGreaterThan(0);
  });
});
