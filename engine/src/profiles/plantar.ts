/**
 * Plantar fasciopathy — plantar heel pain.
 *
 * ---------------------------------------------------------------------------
 * The profile whose limitations section is the most important thing in it.
 *
 * Entrapment of the first branch of the lateral plantar nerve — Baxter's nerve
 * — is reported to account for up to a fifth of plantar heel pain, and it
 * produces symptoms INDISTINGUISHABLE from a plantar fasciopathy. A calcaneal
 * stress fracture presents as heel pain that worsens after a step up in
 * activity or a harder surface, which is also what an overloaded fascia does.
 *
 * So roughly one person in five who believes they have this does not, and no
 * diary can tell them apart. That is not a caveat to bury at the end — it is
 * the headline of what this profile knows.
 * ---------------------------------------------------------------------------
 */

import type { Profile, Provenance, RedFlag } from "./types.js";

const RED_FLAGS: RedFlag[] = [
  {
    key: "nerve",
    text: {
      de: "Brennen, Kribbeln oder Taubheit an der Ferse sprechen für eine Nervenbeteiligung — am häufigsten der erste Ast des N. plantaris lateralis. Das fühlt sich an wie eine Fasziopathie und ist keine.",
      en: "Burning, tingling or numbness at the heel points to nerve involvement, most often the first branch of the lateral plantar nerve. It feels like a fasciopathy and is not one.",
    },
  },
  {
    key: "bone_stress",
    text: {
      de: "Fersenschmerz, der nach einer Steigerung des Umfangs oder einem Wechsel auf harten Untergrund stetig zunimmt und auch nachts da ist, passt eher zu einer Stressreaktion des Fersenbeins.",
      en: "Heel pain that grows steadily after a step up in volume or a change to a harder surface, and is there at night as well, fits a stress reaction of the heel bone better.",
    },
  },
  {
    key: "fat_pad",
    text: {
      de: "Ein Schmerz mitten unter der Ferse, der sich nach dem Einlaufen nicht bessert, kann vom Fettpolster kommen statt von der Faszie.",
      en: "Pain in the middle of the underside of the heel that does not ease once warmed up can come from the fat pad rather than the fascia.",
    },
  },
  {
    key: "bilateral_systemic",
    text: {
      de: "Fersenschmerz auf beiden Seiten, besonders bei jüngeren Menschen und zusammen mit Beschwerden an anderen Sehnenansätzen, kann auf eine entzündlich-rheumatische Ursache hindeuten.",
      en: "Heel pain on both sides, particularly in younger people and alongside symptoms at other tendon insertions, can point to an inflammatory rheumatic cause.",
    },
  },
  {
    key: "swelling_warmth",
    text: {
      de: "Eine geschwollene, gerötete oder überwärmte Ferse gehört zu einem Menschen und nicht in eine Auswertung.",
      en: "A swollen, reddened or warm heel belongs with a person, not in an evaluation.",
    },
  },
  {
    key: "corticosteroid",
    text: {
      de: "Nach einer Kortisongabe in die Ferse ist das Gewebe anfälliger, und ein Riss der Faszie ist beschrieben. In keinem Tagebucheintrag steht das.",
      en: "Tissue is more prone to failure after a corticosteroid injection into the heel, and rupture of the fascia has been described. No diary entry records that.",
    },
  },
];

const LIMITATIONS = {
  de:
    "Dieses Profil geht davon aus, dass eine Reizung der Plantarfaszie bereits festgestellt wurde. Es kann sie von nichts unterscheiden — und hier wiegt das schwerer als bei jeder anderen Verletzung in dieser Sammlung. " +
    "Die Einklemmung des ersten Astes des N. plantaris lateralis (Baxter-Nerv) macht Berichten zufolge bis zu einem Fünftel aller plantaren Fersenschmerzen aus und ist symptomatisch nicht von einer Fasziopathie zu trennen. " +
    "Weiter kommen in Frage: Stressfraktur des Fersenbeins, Atrophie des Fersenfettpolsters, Tarsaltunnelsyndrom, Einklemmung des N. calcaneus medialis, Reizung der kurzen Fußmuskeln, " +
    "Ansatztendinopathien bei entzündlich-rheumatischen Erkrankungen sowie ausstrahlende Beschwerden aus der Lendenwirbelsäule. " +
    "Der Windlass-Test und die Druckschmerzhaftigkeit am Ansatz sind Untersuchungsbefunde, die ein Tagebuch nicht erheben kann. " +
    "Für die Belastung der Plantarfaszie beim Radfahren, Schwimmen und Rudern liegen keine Daten vor.",
  en:
    "This profile assumes that plantar fascia irritation has already been established. It can distinguish it from nothing — and here that weighs more heavily than for any other injury in this collection. " +
    "Entrapment of the first branch of the lateral plantar nerve (Baxter's nerve) is reported to account for up to a fifth of plantar heel pain and cannot be told apart from a fasciopathy by symptoms. " +
    "Also in question: calcaneal stress fracture, atrophy of the heel fat pad, tarsal tunnel syndrome, entrapment of the medial calcaneal nerve, irritation of the small foot muscles, " +
    "insertional tendinopathy in inflammatory rheumatic disease, and referred symptoms from the lumbar spine. " +
    "The windlass test and tenderness at the insertion are examination findings a diary cannot establish. " +
    "No plantar fascia loading data exists for cycling, swimming or rowing.",
};

const EVIDENCE: Record<string, Provenance> = {
  "rule.response24h": {
    grade: "B",
    source:
      "Load progression guidance for plantar heel pain uses the same next-morning settling rule as tendon work: symptoms stable or improving, no sharp pain, back toward baseline by the following morning",
  },
  "tests.calf_raise": {
    grade: "B",
    source:
      "The high-load protocol (Rathleff) is built on single-leg heel raises with a towel under the toes, which tensions the fascia through the windlass mechanism. The same movement is therefore the natural self-test",
  },
  "tests.rom": {
    grade: "C",
    source: "Ankle dorsiflexion is a standard impairment measure at this joint; no figure specific to this condition was found",
  },
  "tests.single_hop": {
    grade: "C",
    source:
      "REMOVED for this profile. Hopping is an appropriate late-stage load but it is not an established measure here, and requiring it would block the engine on data most people will never record",
  },
  "tests.protocol": {
    grade: "B",
    contested: true,
    source:
      "Published heel-raise progressions differ: 3 x 25 double-leg, then 3 x 15 single-leg, then 3-4 x 8-15 on a step. The Rathleff protocol prescribes slow repetitions every second day. Neither is a measurement protocol for a self-test",
  },
  "tests.measurementError": {
    grade: "D",
    source:
      "No MDC published for the heel-raise test in this population. One study of adolescents reports 2 repetitions; another sets 6 from published test-retest data — different populations, and neither is this one",
  },
  "tissue.walk": {
    grade: "C",
    source:
      "Standing and walking are the loads people with this condition report as provoking, which puts walking higher here relative to running than it sits for a tendon",
  },
  "tissue.cycle_swim_row": {
    grade: "D",
    source: "No plantar fascia loading data found for any of the three. Estimates, as for every other profile",
  },
  horizon: {
    grade: "C",
    source:
      "Commonly described as self-limiting over months to a year, but no long-term cohort with a clear persistence figure was found for this condition in this search. The horizon below is therefore wider and softer than the Achilles one",
  },
};

const HORIZON = {
  typicalWeeks: [12, 52] as [number, number],
  note: {
    de: "Der Verlauf wird in Monaten bis zu einem Jahr berichtet. Eine belastbare Langzeitzahl, wie viele Menschen nach Jahren noch Beschwerden haben, wurde für diese Verletzung nicht gefunden — die Spanne ist deshalb weicher als bei den Sehnen.",
    en: "The course is reported in months up to about a year. No dependable long-term figure for how many still have symptoms after years was found for this condition, so this range is softer than the tendon ones.",
  },
};

export const PLANTAR_FASCIOPATHY: Profile = {
  key: "plantar_fasciopathy",
  version: "plantar_fasciopathy.2026-08-21",
  label: { de: "Plantarfaszie", en: "Plantar fascia" },
  bodyRegion: "foot",

  tests: ["calf_raise", "rom"],

  redFlags: RED_FLAGS,
  limitations: LIMITATIONS,
  horizon: HORIZON,
  evidence: EVIDENCE,
};
