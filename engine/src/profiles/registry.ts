/**
 * Every profile by its own key, and every region with a default.
 *
 * ---------------------------------------------------------------------------
 * THIS USED TO BE `Record<BodyRegion, Profile>` — one profile per region — and
 * that shape had a ceiling nobody had hit yet.
 *
 * There are eleven regions. PROTOKOLLE.md §3 lists around SEVENTY clinically
 * real injury-and-region combinations. Patellofemoral pain and a reconstructed
 * cruciate ligament are both `knee`; patellar tendinopathy and a kneecap that
 * tracks badly are both about the front of the knee. A record keyed by region
 * can hold exactly one of each pair.
 *
 * With a single researched profile that was invisible. It would have broken on
 * the second one — after far more work had been built on top of it.
 *
 * So profiles are keyed by their own key, and regions carry a DEFAULT. Both
 * records stay exhaustive: a region without a default is still a compile
 * error, which is the guarantee worth keeping. Same discipline as
 * `ALL_REASON_CODES`, which has caught six dead branches in this project.
 * ---------------------------------------------------------------------------
 *
 * ---------------------------------------------------------------------------
 * WHY THESE ARE ALL GENERIC RIGHT NOW.
 *
 * This file lands the MECHANISM, not the knowledge. Every profile below
 * reproduces exactly what the engine already did — same tests, same
 * thresholds, same tissue factors — so the golden report must come out byte for
 * byte identical. That is the point: a refactor that provably changes nothing
 * is the only safe floor to put real profiles on.
 *
 * Step C in PROTOKOLLE.md replaced the Achilles entry with a researched one —
 * see profiles/achilles.ts. The other ten are still the mechanism only, and
 * test/profiles.test.ts holds them to that so a half-finished profile cannot
 * quietly ship as if it carried knowledge.
 * ---------------------------------------------------------------------------
 */

import { ACHILLES_MIDPORTION } from "./achilles.js";
import { ACL_RECONSTRUCTION } from "./acl.js";
import { GLUTEAL_TENDINOPATHY } from "./gluteal.js";
import { HAMSTRING_STRAIN } from "./hamstring.js";
import { PATELLAR_TENDINOPATHY } from "./patellar.js";
import { PATELLOFEMORAL_PAIN } from "./patellofemoral.js";
import { PLANTAR_FASCIOPATHY } from "./plantar.js";
import { ROTATOR_CUFF } from "./rotatorcuff.js";
import { TIBIAL_STRESS } from "./tibial.js";
import type { BodyRegion, Config, TestType } from "../types.js";
import type { Profile, ProfileKey } from "./types.js";

/** What every rule saw before profiles existed. */
const LEGACY_TESTS: TestType[] = ["calf_raise", "single_hop", "rom"];

const GENERIC_LIMITATIONS = {
  de: "Dieses Profil trägt kein verletzungsspezifisches Wissen. Es misst Belastung und Reaktion so, wie es der Motor für jede Verletzung tut — welche Selbsttests hier aussagekräftig sind und welche Schwellen gelten, ist noch nicht erarbeitet.",
  en: "This profile carries no injury-specific knowledge. It measures load and response the way the engine does for any injury — which self-tests mean anything here, and which thresholds apply, has not been worked out yet.",
};

function generic(region: BodyRegion, de: string, en: string): Profile {
  return {
    key: `generic_${region}`,
    version: "generic.2026-08-20",
    label: { de, en },
    bodyRegion: region,
    tests: LEGACY_TESTS,
    redFlags: [],
    limitations: GENERIC_LIMITATIONS,
    // Nothing here was chosen for this injury, so nothing here has provenance.
    // Grade D with no source is the honest shape of that: a reasoned estimate
    // whose reasoning is "this is what the engine did before profiles existed".
    evidence: {
      tests: { grade: "D", source: "Engine default, not chosen for this injury" },
      thresholds: { grade: "D", source: "Engine default, not chosen for this injury" },
      tissue: { grade: "D", source: "Engine default, not chosen for this injury" },
    },
  };
}

const REGISTERED: Profile[] = [
  // The first entry that carries knowledge instead of the engine's defaults.
  ACHILLES_MIDPORTION,
  TIBIAL_STRESS,
  PATELLAR_TENDINOPATHY,
  PATELLOFEMORAL_PAIN,
  ACL_RECONSTRUCTION,
  HAMSTRING_STRAIN,
  GLUTEAL_TENDINOPATHY,
  PLANTAR_FASCIOPATHY,
  ROTATOR_CUFF,
  generic("elbow", "Ellenbogen", "Elbow"),
  generic("back", "Rücken", "Back"),
  generic("other", "Nicht näher bestimmt", "Unspecified"),
];

/** Every profile, by its own key. Many profiles may share one body region. */
export const PROFILES: Record<ProfileKey, Profile> = Object.fromEntries(
  REGISTERED.map((p) => [p.key, p]),
);

/**
 * Which profile a body region falls back to when nothing more specific is said.
 *
 * Exhaustive on purpose: a region without a default is a compile error, exactly
 * as a region without a profile used to be. That guarantee is the reason the
 * old shape was worth keeping half of.
 */
export const DEFAULT_PROFILE_FOR: Record<BodyRegion, ProfileKey> = {
  achilles: ACHILLES_MIDPORTION.key,
  calf: TIBIAL_STRESS.key,
  patella: PATELLAR_TENDINOPATHY.key,
  knee: PATELLOFEMORAL_PAIN.key,
  hamstring: HAMSTRING_STRAIN.key,
  hip: GLUTEAL_TENDINOPATHY.key,
  foot: PLANTAR_FASCIOPATHY.key,
  shoulder: ROTATOR_CUFF.key,
  elbow: "generic_elbow",
  back: "generic_back",
  other: "generic_other",
};

/** A named profile, or nothing. Keys arrive from outside the type system. */
export function profileByKey(key: ProfileKey): Profile | undefined {
  return PROFILES[key];
}

export function profileFor(region: BodyRegion): Profile {
  // Both records are total, so neither lookup can miss — but a region arriving
  // as an unchecked string from a CLI argument or a database column still can.
  const key = DEFAULT_PROFILE_FOR[region];
  return (key === undefined ? undefined : PROFILES[key]) ?? PROFILES.generic_other!;
}

/** Every profile, for tests that must run against all of them. */
export const ALL_PROFILES: Profile[] = REGISTERED;

/**
 * Thresholds for one profile: the shipped defaults with its overrides applied.
 *
 * One level deep, which is exactly the shape of `Config` — every section is a
 * flat bag of numbers. A profile can move a threshold; it cannot invent one,
 * and it cannot reach into a section that does not exist.
 */
export function configFor(base: Config, profile: Profile): Config {
  if (!profile.config) return base;

  const merged: Config = structuredClone(base);
  for (const section of Object.keys(profile.config) as (keyof Config)[]) {
    Object.assign(merged[section], profile.config[section]);
  }
  return merged;
}
