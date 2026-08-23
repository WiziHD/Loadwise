/**
 * Hamstring strain injury.
 *
 * ---------------------------------------------------------------------------
 * The first muscle in the collection, and muscles fail differently from
 * tendons: at a moment rather than over weeks. Somebody can name the stride it
 * happened on.
 *
 * That changes what the engine is for here. The gradual-overload rules — load
 * spike, baseline drift — describe the run-up to a tendon problem and have
 * little to say about a hamstring that tore during a sprint. What matters after
 * the event is the return, and the return is where this injury is dangerous:
 * close to a THIRD recur within the first year, and the second one is often
 * worse than the first.
 * ---------------------------------------------------------------------------
 */

import type { Profile, Provenance, RedFlag } from "./types.js";

const RED_FLAGS: RedFlag[] = [
  {
    key: "avulsion",
    text: {
      de: "Ein hörbarer Riss, ein grosser Bluterguss und die Unfähigkeit, das Bein zu strecken oder zu gehen, deuten auf eine schwere Verletzung bis hin zum knöchernen Ausriss am Sitzbein.",
      en: "An audible tear, a large bruise, and being unable to straighten the leg or walk point to a severe injury, up to a bony avulsion at the sitting bone.",
    },
  },
  {
    key: "sciatic",
    text: {
      de: "Taubheit, Kribbeln oder ausstrahlende Beschwerden bis in den Unterschenkel sprechen für eine Beteiligung des Ischiasnervs oder der Lendenwirbelsäule, die dieses Profil nicht abbildet.",
      en: "Numbness, tingling or symptoms radiating into the lower leg suggest sciatic nerve or lumbar spine involvement, which this profile does not cover.",
    },
  },
  {
    key: "sitting_pain",
    text: {
      de: "Ein Schmerz direkt am Sitzbein, der beim Sitzen am schlimmsten ist, passt eher zu einer Tendinopathie des Sehnenansatzes als zu einer Muskelverletzung — der Verlauf und die Rückkehr unterscheiden sich deutlich.",
      en: "Pain directly at the sitting bone that is worst when sitting fits an insertional tendinopathy better than a muscle injury, and the course and the return differ considerably.",
    },
  },
  {
    key: "calf_swelling",
    text: {
      de: "Eine geschwollene, überwärmte Wade nach einer Beinverletzung oder längerer Ruhigstellung ist keine Lage, die ein Tagebuch beurteilen kann.",
      en: "A swollen, warm calf after a leg injury or a period of immobility is not a situation a diary can judge.",
    },
  },
  {
    key: "no_progress",
    text: {
      de: "Eine Muskelverletzung, die nach Wochen keinerlei Fortschritt zeigt, wirft die Frage auf, ob die Einschätzung stimmt.",
      en: "A muscle injury showing no progress at all after weeks raises the question whether the assessment was right.",
    },
  },
];

const LIMITATIONS = {
  de:
    "Dieses Profil geht davon aus, dass eine ischiocrurale Muskelverletzung bereits festgestellt wurde. Es kann sie von nichts unterscheiden. " +
    "In Frage kommen: Tendinopathie des proximalen Ansatzes (Schmerz beim Sitzen), knöcherner Ausriss am Sitzbein, Reizung des Ischiasnervs, " +
    "referred pain aus Lendenwirbelsäule oder Iliosakralgelenk, Adduktoren- oder Gesässmuskelverletzungen sowie ein Kompartmentsyndrom des hinteren Oberschenkels. " +
    "**Das Grundproblem ist ein anderes als bei den Sehnen:** Eine Muskelverletzung geschieht in einem Moment. Die Regeln zur schleichenden Überlastung — Belastungsspitze, Ausgangswert-Drift — " +
    "beschreiben den Anlauf zu einem Sehnenproblem und haben über einen Riss beim Sprint wenig zu sagen. " +
    "Was zählt, ist die Rückkehr, und die etablierten Kriterien dafür kann ein Tagebuch nicht erheben: der Askling-H-Test misst aktive Dehnfähigkeit und Angst vor der Bewegung, " +
    "die isokinetische Kraftmessung braucht ein Gerät. Beide sind laientauglich nicht abbildbar. " +
    "Nahezu ein Drittel dieser Verletzungen kehrt im ersten Jahr zurück, und die zweite ist häufig schwerer als die erste.",
  en:
    "This profile assumes that a hamstring strain has already been established. It can distinguish it from nothing. " +
    "In question: proximal insertional tendinopathy (pain on sitting), bony avulsion at the sitting bone, sciatic nerve irritation, " +
    "pain referred from the lumbar spine or sacroiliac joint, adductor or gluteal injuries, and posterior thigh compartment syndrome. " +
    "**The underlying problem differs from the tendons:** a muscle injury happens in a moment. The gradual-overload rules — load spike, baseline drift — " +
    "describe the run-up to a tendon problem and have little to say about a tear during a sprint. " +
    "What counts is the return, and a diary cannot record the established criteria for it: the Askling H-test measures active flexibility and apprehension, " +
    "isokinetic testing needs a machine. Neither can be done alone at home. " +
    "Close to a third of these injuries recur within the first year, and the second is often worse than the first.",
};

const EVIDENCE: Record<string, Provenance> = {
  "rule.response24h": {
    grade: "C",
    source:
      "Pain perception is the most commonly used guide for progression after a hamstring injury across the reviewed protocols, but no trial establishes the 24-hour rule for muscle as Silbernagel 2007 does for tendon",
  },
  "rule.gradualOverload": {
    grade: "C",
    source:
      "The load-spike and drift rules describe the approach to a gradual tendon problem. A muscle tears in a moment; those rules retain value for the RETURN but not for the event",
  },
  "tests.single_hop": {
    grade: "C",
    source: "Hop tests appear among performance measures after this injury, though no consensus battery exists",
  },
  "tests.rom": {
    grade: "B",
    source: "Active flexibility is central here — the Askling H-test is built on it, though the test itself needs an examiner",
  },
  "tests.calf_raise": { grade: "C", source: "REMOVED. Calf endurance carries no information about the hamstrings" },
  "tests.asklingH": {
    grade: "B",
    source:
      "Askling H-test: protocols using it report the lowest reinjury rates, 1.3 to 3.6 %. Experts reached no consensus on including it. It requires an examiner and cannot be a diary line",
  },
  "tests.measurementError": { grade: "D", source: "No MDC found for a lay-performable hamstring test in this population" },
  "config.stagnation.minWeeks": {
    grade: "C",
    source:
      "Lowered from 6 to 4, the mechanical floor. A muscle injury raises the return question within the first month, and a long view that first speaks at six weeks would arrive after the decision had been made",
  },
  "recurrence": {
    grade: "B",
    source: "Close to one third recur within the first year after return to sport, with the subsequent injury often more severe",
  },
  horizon: {
    grade: "C",
    contested: true,
    source:
      "Return times differ sharply by protocol and by severity: 12 to 25 days reported where isokinetic testing guided the decision. That is a return-to-play figure from athletes, not a recovery figure for a recreational adult",
  },
};

const HORIZON = {
  // Not [3, 26]. Three weeks was the fastest RETURN TO PLAY reported in
  // professional athletes with instrumented testing behind them, and a return
  // to play is not a recovery. A test caught the confusion: the long view
  // cannot speak before four weeks — two non-overlapping fortnights — so a
  // three-week floor would have made the rule structurally useless here, and
  // that would have looked like a rule working rather than a number being wrong.
  typicalWeeks: [6, 52] as [number, number],
  persistent: { share: 0.3, afterYears: 1 },
  note: {
    de: "Die berichteten Zeiten schwanken stark mit dem Schweregrad und der Studienpopulation — bei Profisportlern mit apparativer Testung 12 bis 25 Tage bis zur Rückkehr, was keine Aussage über Genesung ist. Nahezu ein Drittel verletzt sich im ersten Jahr erneut. Das beschreibt Studiengruppen und sagt nichts über einen einzelnen Verlauf.",
    en: "Reported times vary sharply with severity and study population — 12 to 25 days to return where instrumented testing guided the decision, which is not a statement about recovery. Close to a third are injured again within the first year. This describes study groups and says nothing about any one course.",
  },
};

export const HAMSTRING_STRAIN: Profile = {
  key: "hamstring_strain",
  version: "hamstring_strain.2026-08-21",
  label: { de: "Ischiocrurale Muskulatur", en: "Hamstring" },
  bodyRegion: "hamstring",

  // The return question is live early after a muscle injury, so the long view
  // is allowed to speak from four weeks — its mechanical floor — rather than six.
  config: { stagnation: { minWeeks: 4 } },

  tests: ["single_hop", "rom"],

  redFlags: RED_FLAGS,
  limitations: LIMITATIONS,
  horizon: HORIZON,
  evidence: EVIDENCE,
};
