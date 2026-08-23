/**
 * The tissue matrix: 121 numbers that multiply every single load in the engine.
 *
 * An audit noted that no lens had ever opened this file, that the scenario
 * library touched four of its cells, and that the only test asserted the values
 * were numbers between 0 and 2 — under which a transposed row would pass
 * unnoticed while quietly rescaling everything downstream.
 *
 * The assertions below do not check the exact values. Those are declared
 * estimates and will move once the injury profiles bring evidence. What they
 * check is the ORDERING, which is the part that is not in dispute: running
 * loads an Achilles tendon and swimming does not, and if that ever inverts,
 * something has been typed into the wrong row.
 */

import { describe, expect, it } from "vitest";
import { tissueFactor, TISSUE_MATRIX } from "../src/tissue.js";
import type { ActivityKind, BodyRegion } from "../src/types.js";

const LOWER_LIMB: BodyRegion[] = ["achilles", "calf", "patella", "knee", "hamstring", "hip", "foot"];
const UPPER_LIMB: BodyRegion[] = ["shoulder", "elbow"];

const ALL_ACTIVITIES = Object.keys(TISSUE_MATRIX.achilles) as ActivityKind[];
const ALL_REGIONS = Object.keys(TISSUE_MATRIX) as BodyRegion[];

describe("the matrix is complete and sane", () => {
  it("gives every region a value for every activity", () => {
    for (const region of ALL_REGIONS) {
      for (const activity of ALL_ACTIVITIES) {
        expect(TISSUE_MATRIX[region][activity], `${region}/${activity}`).toBeTypeOf("number");
      }
    }
  });

  it("keeps every factor inside a defensible range", () => {
    for (const region of ALL_REGIONS) {
      for (const activity of ALL_ACTIVITIES) {
        const f = TISSUE_MATRIX[region][activity];
        expect(f, `${region}/${activity}`).toBeGreaterThanOrEqual(0);
        expect(f, `${region}/${activity}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("uses running on an Achilles as the reference point", () => {
    expect(tissueFactor("run", "achilles")).toBe(1.0);
  });
});

describe("orderings that are not in dispute", () => {
  it("loads a lower-limb tendon more by running than by cycling or swimming", () => {
    for (const region of ["achilles", "calf", "foot"] as BodyRegion[]) {
      expect(tissueFactor("run", region), `${region}: run vs cycle`).toBeGreaterThan(
        tissueFactor("cycle", region),
      );
      expect(tissueFactor("run", region), `${region}: run vs swim`).toBeGreaterThan(
        tissueFactor("swim", region),
      );
    }
  });

  it("loads a shoulder more by swimming than by running", () => {
    expect(tissueFactor("swim", "shoulder")).toBeGreaterThan(tissueFactor("run", "shoulder"));
    expect(tissueFactor("row", "shoulder")).toBeGreaterThan(tissueFactor("run", "shoulder"));
  });

  it("puts jumping above running for every lower-limb tendon", () => {
    for (const region of ["achilles", "calf", "patella", "knee", "foot"] as BodyRegion[]) {
      expect(tissueFactor("plyometric", region), region).toBeGreaterThanOrEqual(
        tissueFactor("run", region),
      );
    }
  });

  it("keeps upper-body work nearly irrelevant to a lower-limb injury", () => {
    // The concrete case: ninety minutes of upper-body strength must not count
    // as a heavy day for an Achilles tendon. Confirmed on the first real diary
    // this engine ever read.
    for (const region of LOWER_LIMB) {
      expect(tissueFactor("strength_upper", region), region).toBeLessThan(0.2);
    }
  });

  it("keeps lower-body work nearly irrelevant to an upper-limb injury", () => {
    for (const region of UPPER_LIMB) {
      expect(tissueFactor("strength_lower", region), region).toBeLessThan(0.2);
      expect(tissueFactor("run", region), region).toBeLessThan(0.2);
    }
  });

  it("treats the calf and the Achilles as one mechanical chain", () => {
    for (const activity of ALL_ACTIVITIES) {
      expect(tissueFactor(activity, "calf"), activity).toBe(tissueFactor(activity, "achilles"));
    }
  });

  it("gives the unknown region no opinion at all", () => {
    for (const activity of ALL_ACTIVITIES) {
      expect(tissueFactor(activity, "other"), activity).toBe(1.0);
    }
  });
});

describe("the fallback never hides a session", () => {
  it("falls back to 1.0, never to 0", () => {
    expect(tissueFactor(null, "achilles")).toBe(1.0);
    expect(tissueFactor(undefined, "achilles")).toBe(1.0);
    expect(tissueFactor("paragliding" as ActivityKind, "achilles")).toBe(1.0);
    expect(tissueFactor("run", "coccyx" as BodyRegion)).toBe(1.0);
  });

  it("means an unrecognised activity still shows up in the load curve", () => {
    // Discounting the unknown to nothing would hide exactly the sessions we
    // understand least — the opposite of what a cautious default should do.
    for (const region of ALL_REGIONS) {
      expect(tissueFactor("nordic-skiing" as ActivityKind, region), region).toBeGreaterThan(0);
    }
  });
});
