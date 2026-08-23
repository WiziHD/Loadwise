/**
 * Medial tibial stress syndrome — shin splints, and the bone-stress continuum.
 *
 * ---------------------------------------------------------------------------
 * THE PROFILE THAT MOVES THE ENGINE'S CENTRAL THRESHOLD, AND WHY IT HAS TO.
 *
 * PROTOKOLLE.md §5 left one question open for every profile: is the 24-hour
 * rule the right decision rule for THIS tissue? "Bei Sehnen ja — bei einer
 * Knochenstressreaktion womöglich nicht."
 *
 * The answer is no, and the sources are blunt about it. Load guidance for bone
 * stress asks for load that "does not produce symptoms during, after, or the
 * day following" — pain-FREE loading, not pain that settles. The reasoning is
 * mechanical rather than cautious: in a bone stress injury the remodelling is
 * already outpaced by the damage, so additional load adds to the damage rather
 * than driving adaptation.
 *
 * A tendon is the opposite case. Silbernagel's model exists precisely because a
 * tendon tolerates — and may need — load carried at some pain, provided it
 * settles by morning.
 *
 * So this profile sets `response.greenMaxDelta` to 0. It is the first threshold
 * any profile has moved, and the profile mechanism was built for exactly this.
 * ---------------------------------------------------------------------------
 */

import type { Profile, Provenance, RedFlag } from "./types.js";

const RED_FLAGS: RedFlag[] = [
  {
    key: "focal_bone_pain",
    text: {
      de: "Schmerz, der sich auf einen fingerbreiten Punkt am Knochen eingrenzen lässt, gehört zur Abklärung einer Stressfraktur und nicht in ein Tagebuch.",
      en: "Pain that narrows to a fingertip-sized point on the bone belongs to the assessment of a stress fracture, not to a diary.",
    },
  },
  {
    key: "night_rest_pain",
    text: {
      de: "Schmerz in Ruhe und in der Nacht spricht dafür, dass der Knochen mehr abbekommen hat, als eine Reizung der Knochenhaut erklärt.",
      en: "Pain at rest and at night suggests the bone has taken more than an irritation of its surface would explain.",
    },
  },
  {
    key: "compartment",
    text: {
      de: "Ein enges, prall wirkendes Spannungsgefühl, das nach wenigen Minuten Laufen einsetzt und in Ruhe rasch wieder verschwindet, passt eher zu einem Kompartmentsyndrom als zu einer Knochenreizung. Taubheit oder Fussheberschwäche gehören sofort zu einem Menschen.",
      en: "A tight, full feeling that starts after a few minutes of running and disappears quickly at rest fits a compartment syndrome better than a bone problem. Numbness or a dropping foot belongs with a person immediately.",
    },
  },
  {
    key: "female_athlete_triad",
    text: {
      de: "Wiederholte Knochenprobleme zusammen mit ausbleibender Regelblutung, geringer Energiezufuhr oder Essstörung deuten auf eine Ursache, die kein Belastungsplan löst.",
      en: "Repeated bone problems alongside absent periods, low energy availability or disordered eating point to a cause no load plan solves.",
    },
  },
  {
    key: "sudden_worsening",
    text: {
      de: "Ein plötzlicher, deutlich stärkerer Schmerz beim Laufen oder Abspringen ist keine Lage, die ein Tagebuch beurteilen kann.",
      en: "A sudden, distinctly sharper pain while running or pushing off is not a situation a diary can judge.",
    },
  },
];

const LIMITATIONS = {
  de:
    "Dieses Profil geht davon aus, dass ein Schienbeinkantensyndrom bereits festgestellt wurde. Es kann es von nichts unterscheiden — und das wiegt hier besonders schwer, weil es auf einem Kontinuum liegt: " +
    "Am anderen Ende steht die Ermüdungsfraktur, die dieselbe Stelle betrifft und andere Konsequenzen hat. " +
    "Weiter in Frage kommen: belastungsbedingtes Kompartmentsyndrom, Einklemmung des N. peroneus, Tendinopathie des M. tibialis posterior, popliteales Entrapment sowie ausstrahlende Beschwerden aus der Lendenwirbelsäule. " +
    "**Der wichtigste Vorbehalt betrifft das Messverfahren selbst:** Selbstberichtete Schmerzwerte sagen eine Stressfraktur der Tibia nicht vorher. Die klinische Beurteilung der Druckschmerzhaftigkeit am Knochen ist aussagekräftiger — " +
    "und genau die kann ein Tagebuch nicht erheben. Ein Werkzeug, das hier auf Zahlen aus einer Selbsteinschätzung aufbaut, arbeitet mit dem schwächeren der beiden Signale.",
  en:
    "This profile assumes that medial tibial stress syndrome has already been established. It can distinguish it from nothing — and that weighs particularly heavily here, because it sits on a continuum: " +
    "at the other end is a stress fracture, in the same place, with different consequences. " +
    "Also in question: exercise-related compartment syndrome, peroneal nerve entrapment, tibialis posterior tendinopathy, popliteal artery entrapment, and referred symptoms from the lumbar spine. " +
    "**The weightiest caveat concerns the measurement itself:** self-reported pain scores do not predict a tibial stress fracture. Clinical assessment of bony tenderness carries more information — " +
    "and that is exactly what a diary cannot establish. A tool built here on numbers from a self-rating is working with the weaker of the two signals.",
};

const EVIDENCE: Record<string, Provenance> = {
  "rule.response24h": {
    grade: "B",
    contested: true,
    source:
      "THE RULE DOES NOT TRANSFER UNCHANGED. Bone stress load guidance asks for load that produces no symptoms during, after, or the day following — pain-free rather than pain that settles. Tendon guidance explicitly permits the opposite. Hence greenMaxDelta 0 for this profile",
  },
  "config.response.settledWithinDelta": {
    grade: "C",
    source:
      "Follows greenMaxDelta to 0, and the configuration guard requires it: a settling threshold looser than the green one would make settled a weaker claim than never elevated. For bone the honest reading of settled is back to the usual level, not within one point of it",
  },
  "config.stagnation.minWeeks": {
    grade: "C",
    source:
      "Lowered from 6 to 4 because the reported course here can resolve inside six weeks, and a long view that first speaks at six would arrive after the question had answered itself. Four weeks is the mechanical floor — two non-overlapping fourteen-day windows",
  },
  "config.response.greenMaxDelta": {
    grade: "B",
    source:
      "Set to 0 rather than the shipped 1. In a bone stress injury remodelling is already outpaced by the damage, so additional load adds to the damage instead of driving adaptation. Any morning above the usual level is therefore worth naming, not tolerating",
  },
  "tests.calf_raise": {
    grade: "C",
    source:
      "The soleus is a principal target of loading programmes here, so calf endurance is a defensible measure — but it is not an established outcome test for this diagnosis",
  },
  "tests.rom": {
    grade: "C",
    source: "Ankle dorsiflexion is a standard impairment measure; no figure specific to this condition was found",
  },
  "tests.single_hop": {
    grade: "C",
    source: "REMOVED. Hopping is a high bone load and has no business being a prerequisite for the engine to speak here",
  },
  "tests.selfReportLimit": {
    grade: "B",
    source:
      "Self-reported pain scores are not predictive of medial tibial stress fracture; clinical assessment of tibial tenderness carries more information and a diary cannot record it",
  },
  "tissue.run": {
    grade: "C",
    source: "Repetitive impact is the mechanism here, so running dominates and surface hardness matters — the latter is not something the engine records",
  },
  "tissue.cycle_swim_row": {
    grade: "D",
    source: "No tibial bone loading data found for the three. Estimates, as everywhere else",
  },
  horizon: {
    grade: "C",
    source:
      "No dependable long-term cohort figure was found for this condition in this search. The reported range is weeks to months and depends heavily on where on the continuum somebody sits",
  },
};

const HORIZON = {
  typicalWeeks: [6, 26] as [number, number],
  note: {
    de: "Der Verlauf wird in Wochen bis Monaten berichtet und hängt stark davon ab, wie weit die Knochenreizung fortgeschritten ist. Eine belastbare Langzeitzahl wurde nicht gefunden. Das beschreibt Studiengruppen und sagt nichts über einen einzelnen Verlauf.",
    en: "The course is reported in weeks to months and depends heavily on how far the bone irritation has progressed. No dependable long-term figure was found. This describes study groups and says nothing about any one course.",
  },
};

export const TIBIAL_STRESS: Profile = {
  key: "medial_tibial_stress",
  version: "medial_tibial_stress.2026-08-21",
  label: { de: "Schienbeinkante", en: "Medial tibial stress" },
  bodyRegion: "calf",

  tests: ["calf_raise", "rom"],

  // The first thresholds any profile has moved, and each carries its own
  // argument. See EVIDENCE above.
  config: {
    response: { greenMaxDelta: 0, settledWithinDelta: 0 },
    stagnation: { minWeeks: 4 },
  },

  redFlags: RED_FLAGS,
  limitations: LIMITATIONS,
  horizon: HORIZON,
  evidence: EVIDENCE,
};
