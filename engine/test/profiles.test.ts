/**
 * The profile mechanism.
 *
 * Three things have to hold, and they are in tension with each other:
 *
 *   1. A profile can change what the engine measures and where its lines sit.
 *   2. A profile can NOT break any guarantee the kernel makes.
 *   3. The prescriptive layer stays switched off until somebody qualified has
 *      looked at the intended purpose.
 *
 * The third is not a style preference. PROTOKOLLE.md records the finding:
 * software whose purpose is clinical guidance becomes a regulated medical
 * device, the Swiss MepV is deliberately aligned with the EU MDR, and
 * Switzerland is a third country on top of that. A profile that shipped with
 * `protocol.enabled` true would change what this product legally is.
 */

import { describe, expect, it } from "vitest";
import { evaluateEpisode } from "../src/evaluate.js";
import {
  ALL_PROFILES,
  DEFAULT_PROFILE_FOR,
  PROFILES,
  configFor,
  profileByKey,
  profileFor,
} from "../src/profiles/registry.js";
import type { Profile } from "../src/profiles/types.js";
import { SCENARIOS, steadyRecovery, symmetricTests, theGrinder } from "../src/fixtures.js";
import {
  ALL_BLOCKING_REASONS,
  ALL_REASON_CODES,
  DEFAULT_CONFIG,
  type BodyRegion,
} from "../src/types.js";

const REGIONS: BodyRegion[] = [
  "achilles", "calf", "patella", "knee", "hamstring", "hip",
  "foot", "shoulder", "elbow", "back", "other",
];

describe("the registry is complete", () => {
  it("has a profile for every body region", () => {
    // `Record<BodyRegion, Profile>` already makes a missing region a compile
    // error. This catches the other half: an entry that exists but is empty.
    for (const region of REGIONS) {
      expect(profileFor(region), region).toBeDefined();
      expect(profileFor(region).bodyRegion, region).toBe(region);
    }
  });

  it("gives every profile a key, a version and a stated limitation", () => {
    for (const p of ALL_PROFILES) {
      expect(p.key.length, p.key).toBeGreaterThan(0);
      expect(p.version.length, p.key).toBeGreaterThan(0);
      // Mandatory by design: a profile that does not say what it cannot tell
      // you is a profile that implies it knows everything.
      expect(p.limitations.de.length, p.key).toBeGreaterThan(20);
      expect(p.limitations.en.length, p.key).toBeGreaterThan(20);
    }
  });

  it("gives every profile at least one usable self-test", () => {
    for (const p of ALL_PROFILES) {
      expect(p.tests.length, p.key).toBeGreaterThan(0);
    }
  });

  it("declares provenance for everything it sets", () => {
    for (const p of ALL_PROFILES) {
      expect(Object.keys(p.evidence).length, p.key).toBeGreaterThan(0);
      for (const [what, prov] of Object.entries(p.evidence)) {
        expect(["A", "B", "C", "D"], `${p.key}/${what}`).toContain(prov.grade);
      }
    }
  });

  it("makes every graded claim citable", () => {
    // A letter without a citation cannot be argued with, and the calibration
    // step has to be able to ask "may this number move?". Grade D is the one
    // exception in principle — a reasoned estimate has no source to give — but
    // it still has to say what the reasoning was.
    for (const p of ALL_PROFILES) {
      for (const [what, prov] of Object.entries(p.evidence)) {
        expect(prov.source?.length ?? 0, `${p.key}/${what} (${prov.grade}) has no source`)
          .toBeGreaterThan(15);
      }
    }
  });

  it("falls back rather than crashing on a region that came from outside", () => {
    // Body regions arrive from CLI arguments and database columns, where the
    // type system's guarantees have already run out.
    expect(profileFor("coccyx" as BodyRegion).key).toBe("generic_other");
  });
});

describe("the prescriptive layer stays off", () => {
  it("ships no profile with a protocol switched on", () => {
    for (const p of ALL_PROFILES) {
      expect(p.protocol?.enabled ?? false, `${p.key} ships an enabled protocol`).toBe(false);
    }
  });
});

describe("a profile changes what it is allowed to change", () => {
  it("decides which self-tests the engine looks at", () => {
    const narrow: Profile = { ...profileFor("achilles"), key: "t", tests: ["calf_raise"] };
    const wide: Profile = { ...profileFor("achilles"), key: "t", tests: ["calf_raise", "single_hop"] };

    const entries = steadyRecovery(56);
    const tests = symmetricTests(); // calf_raise only

    const a = evaluateEpisode({ entries, tests, profile: narrow });
    const b = evaluateEpisode({ entries, tests, profile: wide });

    // Same data; the wider profile simply has one more test type it is waiting
    // on, and says so.
    expect(a.flags.filter((f) => f.kind === "asymmetry").length).toBe(1);
    expect(b.flags.filter((f) => f.kind === "asymmetry").length).toBe(1);
  });

  it("shifts a threshold without touching any rule", () => {
    const strict: Profile = {
      ...profileFor("achilles"),
      key: "t",
      config: { drift: { amberRise: 0.25, redRise: 0.5 } },
    };
    const entries = theGrinder();

    const shipped = evaluateEpisode({ entries, context: { bodyRegion: "achilles" } });
    const tightened = evaluateEpisode({ entries, profile: strict });

    const driftOf = (r: typeof shipped): string | undefined =>
      r.flags.find((f) => f.kind === "baseline_drift")?.severity;

    expect(driftOf(shipped)).toBe("amber");
    expect(driftOf(tightened)).toBe("red");
  });

  it("reweights a tissue factor without touching the shared matrix", () => {
    const sparing: Profile = { ...profileFor("achilles"), key: "t", tissue: { run: 0.1 } };
    const entries = steadyRecovery(56);

    const normal = evaluateEpisode({ entries, context: { bodyRegion: "achilles" } });
    const reweighted = evaluateEpisode({ entries, profile: sparing });

    const acuteOf = (r: typeof normal): number => {
      const f = r.flags.find((x) => x.kind === "load_spike");
      return f && f.kind === "load_spike" ? f.detail.acute : 0;
    };

    expect(acuteOf(normal)).toBeGreaterThan(acuteOf(reweighted) * 5);
    // The ratio is scale-free, so the verdict must be unmoved by this.
    expect(reweighted.flags.find((f) => f.kind === "load_spike")?.reason).toBe(
      normal.flags.find((f) => f.kind === "load_spike")?.reason,
    );
  });

  it("merges overrides onto the defaults rather than replacing a section", () => {
    const p: Profile = { ...profileFor("achilles"), key: "t", config: { drift: { amberRise: 3 } } };
    const merged = configFor(DEFAULT_CONFIG, p);

    expect(merged.drift.amberRise).toBe(3);
    // Everything it did not mention has to survive intact.
    expect(merged.drift.redRise).toBe(DEFAULT_CONFIG.drift.redRise);
    expect(merged.drift.windowDays).toBe(DEFAULT_CONFIG.drift.windowDays);
    expect(merged.spike).toEqual(DEFAULT_CONFIG.spike);
  });
});

describe("a profile cannot break the kernel", () => {
  it("stamps every flag with both the rule and the profile version", () => {
    // A verdict is reproducible only if both halves are recorded. Improving a
    // profile must not silently rewrite what somebody was told last month.
    for (const region of REGIONS) {
      const r = evaluateEpisode({
        entries: steadyRecovery(56),
        tests: symmetricTests(),
        context: { bodyRegion: region },
      });
      for (const f of r.flags) {
        expect(f.profileVersion, `${region}/${f.kind}`).toBe(profileFor(region).version);
        expect(f.ruleVersion.length, `${region}/${f.kind}`).toBeGreaterThan(0);
      }
    }
  });

  it("holds the kernel invariants under every profile", () => {
    const entries = steadyRecovery(56);
    const tests = symmetricTests();

    for (const profile of ALL_PROFILES) {
      const result = evaluateEpisode({ entries, tests, profile });
      const dates = new Set(entries.map((e) => e.date));
      const testDates = new Set(tests.map((t) => t.date));

      for (const flag of result.flags) {
        const pool = flag.kind === "asymmetry" ? testDates : dates;
        expect(pool.has(flag.forDate), `${profile.key}: ${flag.forDate}`).toBe(true);
      }

      // Coverage limits reassurance, never a warning — under every profile.
      if (result.overall.status === "judged" && result.overall.severity === "green") {
        expect(
          result.coverage.rulesReporting,
          `${profile.key} cleared on too few rules`,
        ).toBeGreaterThanOrEqual(DEFAULT_CONFIG.coverage.minRulesReporting);
      }
    }
  });

  it("is refused outright when its thresholds are incoherent", () => {
    // A profile is data, and data can be wrong. The configuration guard has to
    // apply to a profile's overrides exactly as it applies to the defaults.
    const broken: Profile = {
      ...profileFor("achilles"),
      key: "t",
      config: { response: { greenMaxDelta: 9 } },
    };
    expect(() => evaluateEpisode({ entries: steadyRecovery(28), profile: broken })).toThrow();
  });

  it("reports which profile produced the evaluation", () => {
    const r = evaluateEpisode({ entries: steadyRecovery(28), context: { bodyRegion: "patella" } });
    expect(r.profile.bodyRegion).toBe("patella");
  });
});

/**
 * A profile carries knowledge as soon as any one of its values is graded above
 * a reasoned estimate. That single line separates the two sets of rules below,
 * and it means a profile cannot drift into the researched set by accident —
 * upgrading one grade brings the whole checklist with it.
 */
const isResearched = (p: Profile): boolean =>
  Object.values(p.evidence).some((e) => e.grade !== "D");

describe("a profile is either the mechanism or the knowledge, never half", () => {
  it("keeps every un-researched profile at exactly what the engine did before", () => {
    // The point of landing the mechanism separately from the knowledge: if an
    // un-researched profile ever starts overriding things, something shipped
    // that nobody looked up.
    for (const p of ALL_PROFILES.filter((x) => !isResearched(x))) {
      expect(p.config, `${p.key} overrides thresholds`).toBeUndefined();
      expect(p.tissue, `${p.key} overrides tissue factors`).toBeUndefined();
      expect(p.tests, `${p.key} narrows the test types`).toEqual([
        "calf_raise",
        "single_hop",
        "rom",
      ]);
      expect(p.redFlags, `${p.key} names red flags without research behind them`).toEqual([]);
    }
  });

  it("holds every researched profile to the full checklist", () => {
    // PROTOKOLLE.md §5 step 6: a profile is finished when the red flags are
    // written, the horizon is recorded, and what it does not know is stated.
    // Asserting that here is what stops a half-done profile shipping as if it
    // were done.
    const researched = ALL_PROFILES.filter(isResearched);
    expect(researched.length, "no researched profile exists yet").toBeGreaterThan(0);

    for (const p of researched) {
      expect(p.redFlags.length, `${p.key} has no red flags`).toBeGreaterThan(0);
      expect(p.horizon, `${p.key} has no reported horizon`).toBeDefined();
      expect(p.limitations.de.length, `${p.key} limitations too thin`).toBeGreaterThan(200);
      expect(p.limitations.en.length, `${p.key} limitations too thin`).toBeGreaterThan(200);
      expect(p.version, `${p.key} still carries a generic version`).not.toContain("generic");
    }
  });

  it("keeps the long view able to speak before the injury is expected to resolve", () => {
    // The reason `horizon` is a field and not a paragraph.
    //
    // `stagnation.minWeeks` was picked by feel. Against a reported horizon it
    // becomes checkable: a rule that only observes "nothing has changed" after
    // the point where most people have recovered tells nobody anything. Six
    // weeks against a reported floor of twelve leaves it room to be useful.
    for (const p of ALL_PROFILES) {
      if (!p.horizon) continue;
      const cfg = configFor(DEFAULT_CONFIG, p);
      const [floorWeeks] = p.horizon.typicalWeeks;
      expect(
        cfg.stagnation.minWeeks,
        `${p.key}: the long view stays silent past the reported floor of ${floorWeeks} weeks`,
      ).toBeLessThan(floorWeeks);
    }
  });
});

describe("no verdict goes dark under a profile", () => {
  /** Everything the engine manages to say when the whole library is read as one injury. */
  const voiceOf = (profile: Profile) => {
    const reasons = new Set<string>();
    const blocking = new Set<string>();
    for (const s of SCENARIOS) {
      const r = evaluateEpisode({
        entries: s.entries,
        tests: s.tests,
        profile,
        skipValidation: true,
      });
      for (const f of r.flags) reasons.add(f.reason);
      for (const p of r.pending) blocking.add(p.reason);
      if (r.overall.status === "insufficient") for (const b of r.overall.blocking) blocking.add(b);
    }
    return { reasons, blocking };
  };

  it("would notice a profile that silenced a rule", () => {
    // Proof that the check above has teeth, because today it passes for all
    // eleven profiles and would look identical if it were testing nothing.
    //
    // A profile that waits ninety-nine weeks before the long view may speak
    // silences that rule completely — and silently, since a rule that says
    // nothing raises nothing. Four verdicts disappear.
    const muted: Profile = {
      ...profileFor("achilles"),
      key: "t",
      config: { stagnation: { minWeeks: 99 } },
    };

    const { reasons } = voiceOf(muted);
    const lost = ALL_REASON_CODES.filter((c) => !reasons.has(c));

    expect(lost, "a profile can silence a rule and the check does not see it").toContain(
      "worse-than-start",
    );
    expect(lost.length).toBeGreaterThan(1);
  });

  it("lets every profile reach every verdict and every blocking reason", () => {
    // The reachability discipline, extended one level down.
    //
    // Until now this was checked across the library with its MIXED contexts,
    // which answers a different question: whether the engine can say a thing
    // at all, somewhere. It cannot catch a profile whose own thresholds make
    // one of its verdicts unreachable — the rule would simply go quiet for
    // that injury, and nothing would fail.
    //
    // Today no profile shifts a threshold, so this passes everywhere and looks
    // like decoration. It is the opposite: it is the tripwire for the first
    // profile that does. Dead branches are this project's recurring bug and
    // have been found six times; a dead branch that is dead only for one
    // injury is the version nobody would notice.
    //
    // A profile that legitimately cannot reach a verdict should fail here and
    // be argued about, not pass silently.
    for (const profile of ALL_PROFILES) {
      const { reasons, blocking } = voiceOf(profile);

      const mute = ALL_REASON_CODES.filter((c) => !reasons.has(c));
      expect(mute, `${profile.key} can never say: ${mute.join(", ")}`).toEqual([]);

      const unreachable = ALL_BLOCKING_REASONS.filter((c) => !blocking.has(c));
      expect(
        unreachable,
        `${profile.key} never explains itself with: ${unreachable.join(", ")}`,
      ).toEqual([]);
    }
  });
});

describe("one region can carry several injuries", () => {
  it("keeps a default for every region", () => {
    // The half of the old guarantee worth keeping: a region with no default
    // is still a compile error, and this catches the other half — a default
    // that names a profile which does not exist.
    for (const region of REGIONS) {
      const key = DEFAULT_PROFILE_FOR[region];
      expect(key, region).toBeDefined();
      expect(profileByKey(key), `${region} defaults to ${key}, which is not registered`)
        .toBeDefined();
    }
  });

  it("lets two profiles share a body region", () => {
    // The entire reason the registry was re-keyed, asserted rather than
    // assumed. Patellofemoral pain and a reconstructed cruciate ligament are
    // both `knee`; patellar tendinopathy is the front of the same joint. A
    // record keyed by region could hold exactly one of them, and with a single
    // researched profile nobody would ever have noticed.
    const a: Profile = { ...profileFor("knee"), key: "knee_one" };
    const b: Profile = { ...profileFor("knee"), key: "knee_two" };

    const registry: Record<string, Profile> = { ...PROFILES, knee_one: a, knee_two: b };

    expect(registry.knee_one!.bodyRegion).toBe("knee");
    expect(registry.knee_two!.bodyRegion).toBe("knee");
    expect(registry.knee_one).not.toBe(registry.knee_two);
  });

  it("prefers a named profile over the region's default", () => {
    // How a caller says which knee injury they mean.
    const named = evaluateEpisode({
      entries: steadyRecovery(28),
      context: { bodyRegion: "knee", profileKey: "achilles_midportion" },
    });
    const byRegion = evaluateEpisode({
      entries: steadyRecovery(28),
      context: { bodyRegion: "knee" },
    });

    expect(named.profile.key).toBe("achilles_midportion");
    expect(byRegion.profile.key).toBe(DEFAULT_PROFILE_FOR.knee);
  });

  it("falls back rather than crashing on a key that came from outside", () => {
    // Profile keys arrive from CLI arguments and database columns, where the
    // type system has already run out.
    const result = evaluateEpisode({
      entries: steadyRecovery(28),
      context: { bodyRegion: "knee", profileKey: "nonesuch" },
    });
    expect(result.profile.key).toBe(DEFAULT_PROFILE_FOR.knee);
  });

  it("registers every profile under its own key", () => {
    for (const p of ALL_PROFILES) {
      expect(profileByKey(p.key), `${p.key} is not reachable by its own key`).toBe(p);
    }
    expect(Object.keys(PROFILES).length).toBe(ALL_PROFILES.length);
  });
});
