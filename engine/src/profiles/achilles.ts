/**
 * Achilles tendinopathy, mid-portion. The first researched profile.
 *
 * ---------------------------------------------------------------------------
 * Step 2 of the six-step procedure in PROTOKOLLE.md §5. The research it rests
 * on is PROFIL-ACHILLES.md, where every claim carries its source, its rank and
 * whether it is contested. This file carries the decisions.
 *
 * WHAT THE RESEARCH CHANGED, AND WHAT IT DID NOT.
 *
 * Three of the engine's founding assumptions turned out to have external
 * support, which is worth more than it sounds: they were reasoned, not read.
 *
 *   The 24-hour rule            Silbernagel 2007, adopted into guidelines.
 *   Rising week over week       Uncontested across every source found.
 *   Comparing a person to       Healthy people manage between 6 and 70 heel
 *   themselves, not a norm      raises. A norm would be meaningless.
 *
 * One assumption did not survive: `plyometric: 1.5`. And one thing the sources
 * say plainly is easy to get wrong in the other direction — see `HORIZON`.
 * ---------------------------------------------------------------------------
 */

import type { Profile, Provenance, RedFlag } from "./types.js";

/**
 * The single most important sentence of the whole research step.
 *
 * The 2007 randomised trial that the 24-hour rule comes from reported: "No
 * significant differences in the rate of improvements were found between the
 * groups, and both groups showed significant improvements compared with
 * baseline." Thirty-eight people, nineteen continuing to load under the
 * pain-monitoring model, nineteen resting for six weeks.
 *
 * The model is established as EQUIVALENT to rest, not as superior to it. The
 * benefit is that somebody need not give up their sport — not that the tendon
 * heals faster. Nothing this engine says may imply otherwise, which is a
 * content reason for the prediction ban in wording.ts on top of the regulatory
 * one it already had.
 */
const PAIN_MONITORING_SOURCE =
  "Silbernagel et al., Am J Sports Med 2007;35(6):897 — RCT, n=38; equivalence, not superiority";

const RED_FLAGS: RedFlag[] = [
  {
    key: "rupture",
    text: {
      de: "Ein plötzlicher Knall oder Schlag in der Wade, ein Wegknicken des Beins und ein Zehenstand, der nicht mehr gelingt — das ist keine Lage, die ein Tagebuch beurteilen kann.",
      en: "A sudden snap or blow in the calf, the leg giving way, and no longer being able to rise onto the toes — a diary cannot judge that situation.",
    },
  },
  {
    key: "dvt",
    text: {
      de: "Eine Wade, die geschwollen, gerötet und überwärmt ist, gehört zu einem Menschen und nicht in eine Auswertung.",
      en: "A calf that is swollen, reddened and warm belongs with a person, not in an evaluation.",
    },
  },
  {
    key: "posterior_impingement",
    text: {
      de: "Wenn der Druckschmerz vor der Sehne stärker ist als in der Sehne selbst, spricht das eher für ein hinteres Sprunggelenks-Impingement oder ein Os trigonum als für eine Reizung im mittleren Sehnenabschnitt.",
      en: "When pressure hurts more in front of the tendon than in the tendon itself, that points more towards posterior ankle impingement or an os trigonum than towards midportion tendon irritation.",
    },
  },
  {
    key: "bone_stress",
    text: {
      de: "Schmerz in der Nacht und ein eng umgrenzter Druckpunkt am Knochen passen nicht zum Bild einer Sehnenreizung.",
      en: "Pain at night and a sharply localised tender point on the bone do not fit the picture of tendon irritation.",
    },
  },
  {
    key: "nerve",
    text: {
      de: "Taubheit, Kribbeln oder ausstrahlende Beschwerden deuten auf eine Beteiligung von Nerven hin, die dieses Profil nicht abbildet.",
      en: "Numbness, tingling or radiating symptoms suggest nerve involvement, which this profile does not cover.",
    },
  },
  {
    key: "fluoroquinolone",
    text: {
      // The six-month tail is the whole reason this belongs in a profile rather
      // than in an intake form. Symptoms can start two hours after the first
      // dose and up to six months after the last one — nobody makes that
      // connection unprompted a third of a year later.
      de: "Fluorchinolon-Antibiotika machen Sehnen anfälliger für Risse, bis etwa sechs Monate nach der letzten Einnahme. Ein Tagebuch kann diesen Zusammenhang nicht erkennen.",
      en: "Fluoroquinolone antibiotics leave tendons more prone to rupture, for up to about six months after the last dose. A diary cannot see that connection.",
    },
  },
  {
    key: "corticosteroid",
    text: {
      de: "Auch nach einer Kortisongabe in die Nähe der Sehne ist das Gewebe anfälliger. In keinem Tagebucheintrag steht das.",
      en: "Tissue is also more prone to failure after a corticosteroid injection near the tendon. No diary entry records that.",
    },
  },
];

/**
 * Twenty conditions that present like this one — verbatim from Table 2 of the
 * Achilles Tendinopathy Toolkit (University of British Columbia, Oct 2021).
 *
 * A diary can separate none of them from a tendinopathy. That is not a defect
 * of the implementation but a property of the data source, and it is the honest
 * headline of what this profile does not know.
 */
const LIMITATIONS = {
  de:
    "Dieses Profil geht davon aus, dass eine Reizung im mittleren Abschnitt der Achillessehne bereits festgestellt wurde. Es kann sie von nichts unterscheiden. " +
    "Mindestens zwanzig Zustände zeigen sich ähnlich: retrokalkaneare Bursitis, Reizung des N. suralis, Kalkaneus- oder Tibia-Stressfraktur, Tarsaltunnelsyndrom, " +
    "Os trigonum, Tendinopathie des M. flexor hallucis longus, Tendinopathie oder Riss des M. tibialis posterior, Sprunggelenksarthrose, akzessorischer M. soleus, " +
    "osteochondraler Defekt des Talus, Verletzung der Plantarissehne, hinteres Sprunggelenks-Impingement, akuter Teil- oder Komplettriss der Achillessehne, " +
    "Plantarfasziitis, belastungsbedingtes Kompartmentsyndrom der tiefen Flexorenloge, Schmerzausstrahlung aus dem lumbosakralen Bereich, Achilles-Paratendinitis " +
    "mit Krepitation, ansatznahe Achillessehnen-Tendinopathie und Haglund-Ferse. " +
    "Für Radfahren, Schwimmen und Rudern liegen keine Daten zur Achillessehnenlast vor; diese drei Gewebefaktoren sind Schätzungen.",
  en:
    "This profile assumes that midportion Achilles tendon irritation has already been established. It can distinguish it from nothing. " +
    "At least twenty conditions present similarly: retrocalcaneal bursitis, sural nerve irritation, calcaneal or tibial stress fracture, tarsal tunnel syndrome, " +
    "os trigonum, flexor hallucis longus tendinopathy, tibialis posterior tendinopathy or rupture, ankle arthritis, accessory soleus, " +
    "talus osteochondral defect, plantaris tendon injury, posterior ankle impingement, acute partial or complete Achilles rupture, " +
    "plantar fasciitis, exercise-related compartment syndrome of the deep flexor compartment, referred pain from the lumbosacral spine, Achilles paratendonitis " +
    "with crepitus, insertional Achilles tendinopathy and Haglund's deformity. " +
    "No Achilles loading data was found for cycling, swimming or rowing; those three tissue factors are estimates.",
};

const EVIDENCE: Record<string, Provenance> = {
  // --- The decision rules themselves ---
  "rule.response24h": {
    grade: "A",
    source: `${PAIN_MONITORING_SOURCE}; adopted in BJSM and Dutch multidisciplinary guidelines`,
  },
  "rule.baselineDrift": {
    grade: "A",
    source: "Uncontested across all sources: pain and stiffness must not rise week over week",
  },

  // --- Self-tests ---
  "tests.calf_raise": {
    grade: "A",
    source: "UBC Achilles Tendinopathy Toolkit 2021 — 'the main impairment measure'; JOSPT CPG recommends heel-raise endurance",
  },
  "tests.single_hop": {
    grade: "B",
    source: "PMC7249277 (2020) — plyometric quotient ICC 0.83–0.94; hop tests recommended in JOSPT CPG",
  },
  "tests.rom": {
    grade: "B",
    source: "JOSPT CPG — ankle dorsiflexion range of motion listed under physical impairment measures",
  },
  "tests.protocol": {
    grade: "C",
    contested: true,
    source: "Metronome pace disputed: 60/min (UBC Toolkit 2021) vs 30/min (PMC7249277). Must be fixed before self-testing ships",
  },
  "tests.measurementError": {
    grade: "D",
    source: "No MDC published for the heel-rise test in this population. Without one, no defensible 'this change is real' threshold",
  },

  // --- Why comparison is to the person, not to a norm ---
  "asymmetry.selfComparison": {
    grade: "B",
    source: "UBC Toolkit 2021 — healthy adults aged 20–59 range from 6 to 70 repetitions; an absolute norm cannot carry a verdict",
  },
  "asymmetry.sideToSide": {
    grade: "B",
    source: "UBC Toolkit 2021 — 'in healthy individuals, minimum side-to-side differences were recorded'",
  },
  "asymmetry.referenceEroding": {
    grade: "B",
    source: "LSI literature (JOSPT 2017): the uninvolved limb declines more than the involved one over years. Transferred from ACL evidence — the mechanism, not the population",
  },

  // --- Tissue factors ---
  "tissue.walk": {
    grade: "C",
    contested: true,
    source:
      "Peak force per step would put walking at 0.57–0.86 of running (2.63 kN vs 3.06–4.64 kN). " +
      "The body-weight groupings give 0.21–0.43. The engine sums load PER MINUTE, so the impulse reading applies and 0.3 sits inside it — but that reading is a choice",
  },
  "tissue.plyometric": {
    grade: "C",
    source:
      "Running, jumping and hopping are reported as ONE band, 5.13–6.35 body weights. The band spans a factor of 1.24, " +
      "so the previous 1.5 exceeded the entire reported spread. Direction (dynamic and unilateral loads more) is supported; the magnitude is bounded by that band",
  },
  "tissue.court_sport": {
    grade: "D",
    source: "No direct data found. Cutting and acceleration plausibly exceed steady running, magnitude unsupported",
  },
  "tissue.cycle_swim_row": {
    grade: "D",
    source:
      "No Achilles loading data found for any of the three. Uncomfortable, because the tissue-weighting result on the first real 60-day course rests on exactly these",
  },

  // --- Thresholds ---
  "spread.minEffectiveDays": {
    grade: "C",
    source:
      "PMC7249277 reports recovery days by intensity: light 0, medium 2, high 3. Three recovery days caps a week at two high sessions, " +
      "and the invented threshold of 2 effective days lands on the same number. The mapping from 'high sessions' to 'effective days' is inference, hence C not B",
  },
  "stagnation.minWeeks": {
    grade: "C",
    source:
      "Left at 6 deliberately. The reported horizon is months, so six weeks might look premature — but this dial is an EVIDENCE GATE, not a clinical threshold, " +
      "and raising it would silence the rule for a quarter of a year. In this engine silence is the more dangerous output. Checked against HORIZON by test",
  },

  horizon: {
    grade: "B",
    source: "PMC7249277 (2020); 10-year prospective cohort, J Sports Sci (2023); 8-year observational follow-up",
  },
};

/**
 * What the literature reports about how long this takes.
 *
 * Recorded because it makes `stagnation.minWeeks` auditable rather than felt.
 * The rule must be able to speak well before the lower bound, which is checked
 * in test/profiles.test.ts — 6 weeks against a floor of 12.
 *
 * The other half matters just as much: full symptomatic recovery does not mean
 * the tendon has recovered its function or structure (PMC7249277). That gap is
 * where the reported 27–44% reinjury rate on rushed returns lives, and it is
 * why this engine does not treat "no pain" as "done".
 */
const HORIZON = {
  typicalWeeks: [12, 52] as [number, number],
  persistent: { share: 0.19, afterYears: 10 },
  note: {
    de: "In Studien wird die Erholung in Monaten berichtet, nicht in Wochen. Rund ein Fünftel der Betroffenen hat nach zehn Jahren noch Beschwerden, und Beschwerdefreiheit bedeutet nicht, dass Funktion und Gewebe wiederhergestellt sind. Das beschreibt Studiengruppen und sagt nichts über einen einzelnen Verlauf.",
    en: "Studies report recovery in months rather than weeks. About one fifth still have symptoms after ten years, and freedom from symptoms does not mean function and tissue have recovered. This describes study groups and says nothing about any one course.",
  },
};

export const ACHILLES_MIDPORTION: Profile = {
  key: "achilles_midportion",
  version: "achilles_midportion.2026-08-20",
  label: { de: "Achillessehne, mittlerer Abschnitt", en: "Achilles tendon, mid-portion" },
  bodyRegion: "achilles",

  // All three survive the research, and no difference is manufactured to make
  // the profile look busier than the evidence warrants. The heel raise is the
  // main measure, the hop test is valid but is itself a top-band load, and
  // dorsiflexion range sits in the guideline's impairment list.
  tests: ["calf_raise", "single_hop", "rom"],

  // The only value the research moved. Everything else is left at the region
  // default on purpose: changing a number the sources do not speak to would be
  // inventing precision, which is the failure mode this whole programme exists
  // to avoid.
  tissue: { plyometric: 1.2 },

  redFlags: RED_FLAGS,
  limitations: LIMITATIONS,
  horizon: HORIZON,
  evidence: EVIDENCE,
};
