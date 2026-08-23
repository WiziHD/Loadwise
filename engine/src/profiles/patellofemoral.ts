/**
 * Patellofemoral pain — pain around or behind the kneecap.
 *
 * ---------------------------------------------------------------------------
 * The profile that has to be honest about how little it can measure.
 *
 * The other three carry a test with a number: repetitions, centimetres, a
 * symmetry index. The established assessments here are largely about MOVEMENT
 * QUALITY — how the trunk and knee behave during a single-leg squat or a step
 * down — and a written diary cannot see any of it.
 *
 * The prognosis makes that worse rather than better. Only about a third of
 * people are pain-free a year after diagnosis; more than half report an
 * unfavourable outcome five to eight years on. A tool that offered confident
 * progress numbers against that background would be misleading precisely where
 * the stakes are highest.
 *
 * So this profile carries fewer values than the others and says so. That is
 * the finding, not a gap in the work.
 * ---------------------------------------------------------------------------
 */

import type { Profile, Provenance, RedFlag } from "./types.js";

const RED_FLAGS: RedFlag[] = [
  {
    key: "locking_giving_way",
    text: {
      de: "Ein Knie, das blockiert, einklemmt oder wegknickt, deutet auf etwas im Gelenk hin — Meniskus, Knorpel, Bandinstabilität. Das bildet dieses Profil nicht ab.",
      en: "A knee that locks, catches or gives way points to something inside the joint — meniscus, cartilage, ligament instability. This profile does not cover it.",
    },
  },
  {
    key: "effusion",
    text: {
      de: "Ein Erguss, also ein sichtbar geschwollenes Knie, gehört nicht zum Bild eines patellofemoralen Schmerzsyndroms.",
      en: "An effusion — a visibly swollen knee — does not belong to the picture of patellofemoral pain.",
    },
  },
  {
    key: "trauma_dislocation",
    text: {
      de: "Nach einem Anprall, einem Verdrehtrauma oder einer herausgesprungenen Kniescheibe geht es um eine strukturelle Verletzung und nicht um ein Belastungsproblem.",
      en: "After a blow, a twisting injury or a kneecap that came out of place, the question is a structural injury rather than a load problem.",
    },
  },
  {
    key: "night_pain",
    text: {
      de: "Schmerz in der Nacht und Ruheschmerz, der sich nicht bessert, passen nicht zum belastungsabhängigen Bild.",
      en: "Pain at night and pain at rest that does not settle do not fit the load-dependent picture.",
    },
  },
  {
    key: "systemic",
    text: {
      de: "Fieber, Wärme, Rötung oder Beschwerden an mehreren Gelenken gleichzeitig deuten auf eine andere Ursache als eine mechanische Überlastung.",
      en: "Fever, warmth, redness, or symptoms in several joints at once point to a cause other than mechanical overload.",
    },
  },
  {
    key: "adolescent_growth",
    text: {
      de: "Bei Jugendlichen im Wachstum sitzt vorderer Knieschmerz häufig an einer Wachstumsfuge. Dieses Profil unterscheidet das nicht.",
      en: "In growing adolescents, pain at the front of the knee often sits at a growth plate. This profile does not tell them apart.",
    },
  },
];

const LIMITATIONS = {
  de:
    "Dieses Profil geht davon aus, dass ein patellofemorales Schmerzsyndrom bereits festgestellt wurde. Es kann es von nichts unterscheiden. " +
    "In Frage kommen unter anderem: Patellasehnen-Tendinopathie (dort sitzt der Druckschmerz genau am unteren Pol der Kniescheibe), Hoffa-Fettkörper-Impingement, " +
    "Knorpelschaden hinter der Kniescheibe, Meniskusschaden, Plica-Syndrom, Schleimbeutelentzündung, Instabilität nach Patellaluxation, beginnende Arthrose, " +
    "Ansatzbeschwerden am Tractus iliotibialis sowie ausstrahlende Beschwerden aus Hüfte oder Lendenwirbelsäule. " +
    "Der wichtigere Vorbehalt betrifft aber die Messung selbst: Die etablierten Untersuchungen — einbeinige Kniebeuge, Step-Down, Beurteilung von Rumpf- und Beinachse — " +
    "bewerten die BEWEGUNGSQUALITÄT und nicht eine Zahl. Ein schriftliches Tagebuch sieht davon nichts. " +
    "Belastbare quantitative Fortschrittskriterien, wie sie für die Achillessehne oder nach einer Kreuzbandplastik existieren, wurden für diese Diagnose nicht gefunden. " +
    "Dieses Profil trägt deshalb weniger Werte als die anderen — und das ist der Befund, nicht eine Lücke in der Arbeit.",
  en:
    "This profile assumes that patellofemoral pain has already been established. It can distinguish it from nothing. " +
    "In question, among others: patellar tendinopathy (there the tenderness sits precisely at the lower pole of the kneecap), Hoffa fat pad impingement, " +
    "cartilage damage behind the kneecap, meniscal damage, plica syndrome, bursitis, instability after a patellar dislocation, early osteoarthritis, " +
    "iliotibial band problems, and referred symptoms from the hip or lumbar spine. " +
    "The weightier caveat concerns the measurement itself: the established assessments — single-leg squat, step down, judgement of trunk and limb alignment — " +
    "rate MOVEMENT QUALITY rather than a number. A written diary sees none of it. " +
    "Dependable quantitative progression criteria, of the kind that exist for the Achilles tendon or after a cruciate reconstruction, were not found for this diagnosis. " +
    "This profile therefore carries fewer values than the others — and that is the finding, not a gap in the work.",
};

const EVIDENCE: Record<string, Provenance> = {
  "rule.response24h": {
    grade: "C",
    source:
      "Load management for patellofemoral pain follows the same symptom-guided principle, but no trial establishes the 24-hour rule for this diagnosis as Silbernagel 2007 does for the Achilles tendon",
  },
  "tests.single_hop": {
    grade: "C",
    source:
      "Hop tests are used at the knee generally, but the JOSPT 2019 guideline centres on squats, step-downs and single-leg squats — which assess movement quality rather than a distance",
  },
  "tests.rom": {
    grade: "C",
    source: "Knee range of motion is a standard impairment measure at this joint",
  },
  "tests.calf_raise": {
    grade: "B",
    source: "REMOVED for this profile. A heel raise carries no information about the knee extensors or the kneecap",
  },
  "tests.notMeasurable": {
    grade: "A",
    source:
      "JOSPT 2019 guideline: assessment centres on movement coordination during squatting, step-downs and single-leg squats, judged on trunk and limb behaviour. None of it is a number a diary can hold",
  },
  "tests.measurementError": {
    grade: "D",
    source: "No MDC found for any lay-performable test in this population",
  },
  "tissue.hike": {
    grade: "C",
    source:
      "Descending stairs and slopes is the classic provoking load here — the step-down test exists because it reproduces exactly that",
  },
  horizon: {
    grade: "B",
    contested: false,
    source:
      "Systematic reviews and long-term cohorts: only about a third are pain-free one year after diagnosis; more than half report an unfavourable outcome at 5 to 8 years; recurrence is reported in up to 90 %",
  },
};

const HORIZON = {
  typicalWeeks: [12, 104] as [number, number],
  persistent: { share: 0.5, afterYears: 5 },
  note: {
    de: "Der Verlauf ist in Studien deutlich ungünstiger als bei den Sehnen: Nur etwa ein Drittel ist ein Jahr nach der Diagnose schmerzfrei, und mehr als die Hälfte berichtet nach fünf bis acht Jahren ein unbefriedigendes Ergebnis. Das beschreibt Studiengruppen und sagt nichts über einen einzelnen Verlauf.",
    en: "Studies report a distinctly less favourable course than for the tendons: only about a third are pain-free a year after diagnosis, and more than half report an unsatisfactory outcome at five to eight years. This describes study groups and says nothing about any one course.",
  },
};

export const PATELLOFEMORAL_PAIN: Profile = {
  key: "patellofemoral_pain",
  version: "patellofemoral_pain.2026-08-21",
  label: { de: "Patellofemorales Schmerzsyndrom", en: "Patellofemoral pain" },
  bodyRegion: "knee",

  tests: ["single_hop", "rom"],

  redFlags: RED_FLAGS,
  limitations: LIMITATIONS,
  horizon: HORIZON,
  evidence: EVIDENCE,
};
