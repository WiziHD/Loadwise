/**
 * Patellar tendinopathy — jumper's knee.
 *
 * ---------------------------------------------------------------------------
 * The first profile that narrows what the engine looks at.
 *
 * PROTOKOLLE.md gives the reason the whole programme exists in one line: a calf
 * raise says everything about an Achilles tendon and nothing about a tennis
 * elbow. Until now every profile still watched all three test types, because
 * for an Achilles tendon all three happen to be right.
 *
 * For a patellar tendon a heel raise is close to meaningless. It loads the calf
 * and the Achilles; the knee extensors barely take part. So this profile stops
 * looking at it — and that is the mechanism doing what it was built for rather
 * than a difference manufactured to look busy.
 * ---------------------------------------------------------------------------
 */

import type { Profile, Provenance, RedFlag } from "./types.js";

const RED_FLAGS: RedFlag[] = [
  {
    key: "locking_giving_way",
    text: {
      de: "Ein Knie, das blockiert, einklemmt oder wegknickt, deutet auf etwas im Gelenk hin — das bildet dieses Profil nicht ab.",
      en: "A knee that locks, catches or gives way points to something inside the joint, which this profile does not cover.",
    },
  },
  {
    key: "effusion_warmth",
    text: {
      de: "Ein geschwollenes, überwärmtes Knie, besonders mit Fieber, gehört zu einem Menschen und nicht in eine Auswertung.",
      en: "A swollen, warm knee, particularly with a fever, belongs with a person and not in an evaluation.",
    },
  },
  {
    key: "night_pain",
    text: {
      de: "Dauerschmerz, der sich in Ruhe nicht bessert, und Schmerz, der nachts den Schlaf stört, passen nicht zum Bild einer belastungsabhängigen Sehnenreizung.",
      en: "Constant pain that does not settle with rest, and pain that disturbs sleep at night, do not fit the picture of a load-dependent tendon irritation.",
    },
  },
  {
    key: "cannot_bear_weight",
    text: {
      de: "Wer nicht mehr auf dem Bein stehen kann, hat keine Lage, die ein Tagebuch beurteilen könnte.",
      en: "Being unable to bear weight on the leg is not a situation a diary can judge.",
    },
  },
  {
    key: "adolescent_apophysis",
    text: {
      de: "Bei Jugendlichen im Wachstum sitzt der Schmerz an der Vorderseite des Knies oft an der Wachstumsfuge (Sinding-Larsen-Johansson, Morbus Osgood-Schlatter) und nicht in der Sehne. Dieses Profil unterscheidet das nicht.",
      en: "In growing adolescents, pain at the front of the knee often sits at a growth plate (Sinding-Larsen-Johansson, Osgood-Schlatter) rather than in the tendon. This profile does not tell them apart.",
    },
  },
  {
    key: "corticosteroid",
    text: {
      de: "Nach einer Kortisongabe in die Nähe der Sehne ist das Gewebe anfälliger. In keinem Tagebucheintrag steht das.",
      en: "Tissue is more prone to failure after a corticosteroid injection near the tendon. No diary entry records that.",
    },
  },
];

const LIMITATIONS = {
  de:
    "Dieses Profil geht davon aus, dass eine Reizung der Patellasehne bereits festgestellt wurde. Es kann sie von nichts unterscheiden. " +
    "Der vordere Knieschmerz hat viele Ursachen, die sich ähnlich anfühlen: patellofemorales Schmerzsyndrom (die wichtigste Verwechslung — dort " +
    "reibt oder knirscht es hinter der Kniescheibe, und der Druckschmerz sitzt an den Facetten statt am unteren Pol), Hoffa-Fettkörper-Impingement, " +
    "Schleimbeutelentzündungen vor und unter der Kniescheibe, Sinding-Larsen-Johansson und Morbus Osgood-Schlatter bei Jugendlichen, " +
    "Meniskus- und Knorpelschäden, Arthrose, entzündlich-rheumatische Erkrankungen, sowie selten Knochentumoren wie ein Osteoidosteom. " +
    "Das Leitzeichen der Sehnenreizung — Druckschmerz genau am unteren Pol der Kniescheibe, der mit der Anforderung an die Kniestrecker zunimmt — " +
    "kann ein Tagebuch nicht erheben. " +
    "Der einbeinige Decline Squat ist der etablierte Provokationstest, hat aber keinen publizierten Messfehler; er wird hier als eigenes Mass geführt, nicht als Seitenvergleich.",
  en:
    "This profile assumes that patellar tendon irritation has already been established. It can distinguish it from nothing. " +
    "Pain at the front of the knee has many causes that feel alike: patellofemoral pain (the important confusion — there it grinds behind the kneecap " +
    "and tenderness sits along the facets rather than at the lower pole), Hoffa fat pad impingement, bursitis in front of and beneath the kneecap, " +
    "Sinding-Larsen-Johansson and Osgood-Schlatter in adolescents, meniscal and cartilage damage, arthritis, inflammatory rheumatic disease, " +
    "and rarely bone tumours such as an osteoid osteoma. " +
    "The hallmark of the tendon problem — tenderness precisely at the lower pole of the kneecap, rising with the demand on the knee extensors — " +
    "is not something a diary can establish. " +
    "The single-leg decline squat is the established provocation test but has no published measurement error; it is carried here as its own measure, not as a side comparison.",
};

const EVIDENCE: Record<string, Provenance> = {
  "rule.response24h": {
    grade: "B",
    source:
      "Progressive tendon loading protocols gate each stage on pain during a single-leg squat, and the same next-morning settling rule is used as for the Achilles (JOSPT 2015; PTLE trial)",
  },
  "rule.painThreshold": {
    grade: "B",
    contested: true,
    source:
      "Progression at VAS 3 or below on the single-leg squat (PTLE protocol), against the 5-of-10 used for tendinopathy generally. Both are published; the lower figure is specific to this tendon",
  },

  "tests.single_hop": {
    grade: "B",
    source:
      "The patellar tendon is an energy-storage tendon; hop tests load exactly that function. Same battery as in the knee literature generally",
  },
  "tests.rom": {
    grade: "C",
    source: "Knee range of motion is a standard impairment measure at this joint; no figure specific to this tendon was found",
  },
  "tests.calf_raise": {
    grade: "B",
    source:
      "REMOVED for this profile. A heel raise loads the calf and the Achilles; the knee extensors barely take part, so it carries no information about this tendon",
  },
  "tests.declineSquat": {
    grade: "A",
    source:
      "Single-leg decline squat at 25 degrees is the established provocation test (JOSPT 2015). Recorded here as a measurement, because it is scored by pain rather than by comparing sides",
  },
  "tests.measurementError": {
    grade: "D",
    source:
      "No MDC published for the single-leg decline squat in this population. VISA-P has a reported minimal important change above 13 points, but that is a questionnaire and not this test",
  },

  "tissue.plyometric": {
    grade: "C",
    contested: true,
    source:
      "Two readings disagree and the shipped value sits between them. Peak force: landing from a jump reaches up to 17 body weights against 4.7 to 6.9 for running, which would put jumping at 2.5 to 3.6 times running. " +
      "Per-minute impulse: a jumping session has perhaps a third of the ground contacts, which brings the two close to level. The engine sums per minute, so neither reading alone settles it",
  },
  "tissue.hike": {
    grade: "C",
    source:
      "Descending is the demanding direction for the knee extensors — eccentric work under body weight — which is why this sits well above walking",
  },
  "tissue.cycle": {
    grade: "D",
    source:
      "No patellar tendon loading data found for cycling. Held above the Achilles value because the knee extensors do the work of pedalling, which is reasoning rather than measurement",
  },

  "horizon": {
    grade: "B",
    source:
      "5-year follow-up after physical therapy (2025): 76 % felt recovered. 11-year follow-up in elite volleyball: around one fifth retired because of it, though most structural changes had normalised",
  },
};

const HORIZON = {
  typicalWeeks: [12, 52] as [number, number],
  persistent: { share: 0.24, afterYears: 5 },
  note: {
    de: "In Studien wird die Erholung in Monaten berichtet. Fünf Jahre nach Physiotherapie fühlten sich rund drei Viertel erholt — ein knappes Viertel also nicht. Das beschreibt Studiengruppen und sagt nichts über einen einzelnen Verlauf.",
    en: "Studies report recovery in months. Five years after physiotherapy about three quarters felt recovered, which leaves close to a quarter who did not. This describes study groups and says nothing about any one course.",
  },
};

export const PATELLAR_TENDINOPATHY: Profile = {
  key: "patellar_tendinopathy",
  version: "patellar_tendinopathy.2026-08-21",
  label: { de: "Patellasehne", en: "Patellar tendon" },
  bodyRegion: "patella",

  // The heel raise is gone, and that is the point of the whole programme.
  tests: ["single_hop", "rom"],

  redFlags: RED_FLAGS,
  limitations: LIMITATIONS,
  horizon: HORIZON,
  evidence: EVIDENCE,
};
