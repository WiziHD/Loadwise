/**
 * Gluteal tendinopathy — pain at the outside of the hip.
 *
 * ---------------------------------------------------------------------------
 * The profile whose defining load is not a training session.
 *
 * This tendon group is irritated above all by COMPRESSION against the greater
 * trochanter: lying on that side at night, sitting with the legs crossed,
 * standing with the weight hanging on one hip. Every one of those is something
 * people do for hours without calling it activity, and the diary has no column
 * for any of it.
 *
 * So the engine's load figure — effort times minutes times a tissue factor —
 * misses the dominant exposure entirely. That is not a threshold to tune. It is
 * a limit of the data model, and it belongs in the limitations rather than in a
 * number that pretends otherwise.
 * ---------------------------------------------------------------------------
 */

import type { Profile, Provenance, RedFlag } from "./types.js";

const RED_FLAGS: RedFlag[] = [
  {
    key: "groin_pain",
    text: {
      de: "Schmerz in der Leiste statt aussen an der Hüfte, besonders beim Drehen des Beins, deutet eher auf das Hüftgelenk selbst als auf die Sehnenansätze.",
      en: "Pain in the groin rather than at the outside of the hip, particularly when turning the leg, points to the hip joint itself rather than the tendon insertions.",
    },
  },
  {
    key: "night_rest_pain",
    text: {
      de: "Schmerz, der auch ohne Liegen auf der Seite nachts anhält und in Ruhe nicht nachlässt, passt nicht zum belastungsabhängigen Bild.",
      en: "Pain that persists at night even without lying on that side and does not ease at rest does not fit the load-dependent picture.",
    },
  },
  {
    key: "bone_stress",
    text: {
      de: "Zunehmender Leisten- oder Hüftschmerz beim Auftreten, besonders nach einer Steigerung des Laufumfangs, gehört zur Abklärung einer Knochenstressreaktion des Schenkelhalses. Diese wird als Hochrisiko-Lokalisation geführt.",
      en: "Increasing groin or hip pain on weight bearing, particularly after a step up in running volume, belongs to the assessment of a femoral neck bone stress injury. That site is classed as high risk.",
    },
  },
  {
    key: "systemic",
    text: {
      de: "Fieber, Wärme, Rötung oder Beschwerden an mehreren Sehnenansätzen gleichzeitig deuten auf eine andere Ursache als eine mechanische Überlastung.",
      en: "Fever, warmth, redness, or symptoms at several tendon insertions at once point to a cause other than mechanical overload.",
    },
  },
  {
    key: "neuro",
    text: {
      de: "Taubheit, Kribbeln oder Kraftverlust im Bein sprechen für eine Beteiligung von Nerven oder der Lendenwirbelsäule, die dieses Profil nicht abbildet.",
      en: "Numbness, tingling or loss of power in the leg suggest nerve or lumbar spine involvement, which this profile does not cover.",
    },
  },
];

const LIMITATIONS = {
  de:
    "Dieses Profil geht davon aus, dass eine gluteale Tendinopathie bereits festgestellt wurde. Es kann sie von nichts unterscheiden. " +
    "In Frage kommen: Arthrose oder Labrumschaden im Hüftgelenk, Knochenstressreaktion des Schenkelhalses (Hochrisiko-Lokalisation), Schleimbeutelreizung, " +
    "Reizung des Tractus iliotibialis, ausstrahlende Beschwerden aus Lendenwirbelsäule oder Iliosakralgelenk sowie Nervenkompressionen. " +
    "Historisch wurde dieses Bild oft als »Bursitis trochanterica« geführt; heute gilt die Sehne als der häufigere Ursprung — wer noch mit der alten Bezeichnung behandelt wird, bekommt möglicherweise eine andere Strategie. " +
    "**Der wichtigste Vorbehalt betrifft die Datenquelle:** Der stärkste Reiz für diese Sehnen ist Kompression — Seitenlage in der Nacht, übereinandergeschlagene Beine, Stehen mit dem Gewicht auf einer Hüfte. " +
    "Nichts davon ist eine Trainingseinheit, und das Tagebuch hat für nichts davon eine Spalte. Die berechnete Belastung verfehlt damit die Hauptbelastung.",
  en:
    "This profile assumes that gluteal tendinopathy has already been established. It can distinguish it from nothing. " +
    "In question: hip joint arthritis or labral damage, femoral neck bone stress injury (a high-risk site), bursitis, " +
    "iliotibial band irritation, symptoms referred from the lumbar spine or sacroiliac joint, and nerve compression. " +
    "This picture was historically labelled trochanteric bursitis; the tendon is now regarded as the more common origin, and somebody still being treated under the old name may be on a different strategy. " +
    "**The weightiest caveat concerns the data source:** the strongest provocation for these tendons is compression — lying on that side at night, crossing the legs, standing with the weight on one hip. " +
    "None of that is a training session, and the diary has no column for any of it. The computed load therefore misses the dominant exposure.",
};

const EVIDENCE: Record<string, Provenance> = {
  "rule.response24h": {
    grade: "C",
    source:
      "Tendinopathy management generally uses symptom-guided progression, and this is a tendinopathy — but no trial establishes the rule for this site as Silbernagel 2007 does for the Achilles",
  },
  "rule.loadModel": {
    grade: "B",
    source:
      "The dominant provocation here is compression against the greater trochanter during sleep, sitting and standing. The engine's load model — effort times minutes — cannot see any of it. A limit of the DATA MODEL, not of a threshold",
  },
  "tests.calf_raise": { grade: "C", source: "REMOVED. Calf endurance carries no information about the hip abductors" },
  "tests.single_hop": {
    grade: "C",
    source: "Single-leg loading is relevant here, but hopping is a high load for an irritated tendon and no consensus battery exists",
  },
  "tests.rom": { grade: "C", source: "Hip range of motion is a standard impairment measure at this joint" },
  "tests.singleLegStance": {
    grade: "C",
    source:
      "Single-leg stance for thirty seconds is described as a provocation test for this site. It is lay-performable but is scored by pain rather than by a number, and no measurement error was found",
  },
  "tests.measurementError": { grade: "D", source: "No MDC found for a lay-performable test at this site" },
  "tissue.matrix": {
    grade: "D",
    source: "The hip column of the tissue matrix is an estimate throughout, as it was before this profile existed",
  },
  horizon: {
    grade: "C",
    source: "No dependable long-term cohort figure was retrieved for this condition in this search",
  },
};

const HORIZON = {
  typicalWeeks: [12, 52] as [number, number],
  note: {
    de: "Der Verlauf wird wie bei anderen Sehnenreizungen in Monaten berichtet. Eine belastbare Langzeitzahl wurde für diese Lokalisation nicht beschafft. Das beschreibt Studiengruppen und sagt nichts über einen einzelnen Verlauf.",
    en: "The course is reported in months, as with other tendon problems. No dependable long-term figure was obtained for this site. This describes study groups and says nothing about any one course.",
  },
};

export const GLUTEAL_TENDINOPATHY: Profile = {
  key: "gluteal_tendinopathy",
  version: "gluteal_tendinopathy.2026-08-21",
  label: { de: "Gluteale Sehnenansätze", en: "Gluteal tendons" },
  bodyRegion: "hip",

  tests: ["single_hop", "rom"],

  redFlags: RED_FLAGS,
  limitations: LIMITATIONS,
  horizon: HORIZON,
  evidence: EVIDENCE,
};
