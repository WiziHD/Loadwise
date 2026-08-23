/**
 * Rotator-cuff-related shoulder pain.
 *
 * ---------------------------------------------------------------------------
 * The first profile at the upper limb, and it is the hardest test the tissue
 * matrix has faced.
 *
 * Every profile so far runs on legs. Load there is walking, running, hopping —
 * activities the diary records naturally and the matrix weighs sensibly. At a
 * shoulder none of that means anything: an hour of running loads this tendon
 * about as much as sitting still, while an hour of swimming is the heaviest
 * thing in the week.
 *
 * The matrix turned out to have anticipated this — swim 1.2, upper-body
 * strength 1.0, rowing 1.0, running 0.1 — so no override was needed. That is
 * worth stating plainly rather than quietly: the kernel did not have to change
 * for the upper limb, which is the strongest evidence so far that the
 * three-layer architecture holds.
 *
 * What does NOT hold is the self-test list. A heel raise and a hop say nothing
 * about a shoulder, and this profile is left with range of motion alone.
 * ---------------------------------------------------------------------------
 */

import type { Profile, Provenance, RedFlag } from "./types.js";

const RED_FLAGS: RedFlag[] = [
  {
    key: "trauma_weakness",
    text: {
      de: "Nach einem Sturz oder Ruck eine deutliche Kraftlosigkeit beim Anheben des Arms — das ist eine Lage für eine Untersuchung und nicht für ein Tagebuch.",
      en: "Marked weakness lifting the arm after a fall or a jolt is a matter for examination, not for a diary.",
    },
  },
  {
    key: "night_pain_lying",
    text: {
      de: "Schmerz, der nachts das Liegen auf der Schulter unmöglich macht und in Ruhe nicht nachlässt, passt nicht zum belastungsabhängigen Bild.",
      en: "Pain that makes lying on the shoulder impossible at night and does not ease at rest does not fit the load-dependent picture.",
    },
  },
  {
    key: "referred_cardiac",
    text: {
      de: "Schulterschmerz zusammen mit Druck auf der Brust, Atemnot, Übelkeit oder Ausstrahlung in Kiefer oder Arm ist ein Notfall und keine Frage der Belastungssteuerung.",
      en: "Shoulder pain together with chest pressure, breathlessness, nausea, or radiation into the jaw or arm is an emergency and not a question of load management.",
    },
  },
  {
    key: "neuro",
    text: {
      de: "Taubheit, Kribbeln oder Kraftverlust in Arm und Hand deuten auf eine Beteiligung von Nerven oder der Halswirbelsäule hin, die dieses Profil nicht abbildet.",
      en: "Numbness, tingling or loss of power in the arm and hand suggest nerve or cervical spine involvement, which this profile does not cover.",
    },
  },
  {
    key: "systemic",
    text: {
      de: "Fieber, Wärme, Rötung, nächtliches Schwitzen oder ungewollter Gewichtsverlust deuten auf eine andere Ursache als eine mechanische Überlastung.",
      en: "Fever, warmth, redness, night sweats or unintended weight loss point to a cause other than mechanical overload.",
    },
  },
  {
    key: "frozen",
    text: {
      de: "Eine Schulter, die sich auch passiv in alle Richtungen kaum noch bewegen lässt, ist ein eigenes Krankheitsbild und keine Belastungsfrage.",
      en: "A shoulder that barely moves in any direction even when moved by somebody else is a condition in its own right, not a load question.",
    },
  },
];

const LIMITATIONS = {
  de:
    "Dieses Profil geht davon aus, dass eine Reizung der Rotatorenmanschette bereits festgestellt wurde. Es kann sie von nichts unterscheiden. " +
    "In Frage kommen unter anderem: Teil- oder Komplettriss der Manschette, Schleimbeutelreizung, Reizung der langen Bizepssehne, Schäden am Labrum, " +
    "Arthrose im Schulter- oder Schultereckgelenk, Kalkschulter, adhäsive Kapsulitis, Instabilität, ausstrahlende Beschwerden aus der Halswirbelsäule sowie fortgeleitete Schmerzen aus Brust und Bauchraum. " +
    "**Zur Messbarkeit:** Dieses Profil trägt als Selbsttest nur die Beweglichkeit. Ein Fersenheber und ein Sprungtest sagen über eine Schulter nichts, und ein laientauglicher Krafttest mit belastbaren Zahlen wurde nicht gefunden. " +
    "Der etablierte Fragebogen SPADI (Test-Retest-ICC ab 0,89) ist ein periodisches Mass und keine Tagebuchzeile. " +
    "**Zur Belastung:** Die Gewebematrix wiegt hier Schwimmen, Rudern und Oberkörperkraft schwer und Laufen praktisch nicht — das ist plausibel, aber für die Schulter ebenso wenig gemessen wie für die Sehnen der Beine. " +
    "Und der wichtigste Reiz an einer Schulter ist oft gar keine Sporteinheit, sondern Überkopfarbeit im Beruf. Die erfasst das Tagebuch nicht.",
  en:
    "This profile assumes that rotator-cuff-related shoulder pain has already been established. It can distinguish it from nothing. " +
    "In question, among others: partial or full-thickness cuff tear, bursitis, long head of biceps irritation, labral damage, " +
    "arthritis of the shoulder or acromioclavicular joint, calcific tendinopathy, adhesive capsulitis, instability, referred symptoms from the cervical spine, and pain referred from the chest or abdomen. " +
    "**On measurability:** this profile carries range of motion as its only self-test. A heel raise and a hop say nothing about a shoulder, and no lay-performable strength test with dependable figures was found. " +
    "The established SPADI questionnaire (test-retest ICC from 0.89) is a periodic measure, not a diary line. " +
    "**On loading:** the tissue matrix weighs swimming, rowing and upper-body strength heavily here and running barely at all — plausible, but as unmeasured for the shoulder as it is for the leg tendons. " +
    "And the most important load on a shoulder is often not a training session at all but overhead work in a job. The diary does not record that.",
};

const EVIDENCE: Record<string, Provenance> = {
  "rule.response24h": {
    grade: "C",
    source:
      "Symptom-guided load progression is the general approach for this tendon group, but no trial establishes the 24-hour rule here as Silbernagel 2007 does for the Achilles",
  },
  "tests.rom": {
    grade: "B",
    source: "Shoulder range of motion is a standard impairment measure and one of the few a person can record alone",
  },
  "tests.calf_raise": {
    grade: "A",
    source: "REMOVED. The reason the whole profile programme exists: a calf raise carries no information about a shoulder",
  },
  "tests.single_hop": {
    grade: "A",
    source: "REMOVED for the same reason",
  },
  "tests.spadi": {
    grade: "B",
    source:
      "Shoulder Pain and Disability Index: test-retest ICC from 0.89, up to 0.93 in rotator cuff tear. A periodic questionnaire, scored 0 to 100, not a daily diary line",
  },
  "tests.measurementError": {
    grade: "D",
    source: "No MDC found for any lay-performable shoulder self-test in this population",
  },
  "tissue.matrix": {
    grade: "C",
    source:
      "No override was needed: the shipped matrix already weighs swim 1.2, upper-body strength 1.0, row 1.0 and run 0.1 for this region. Plausible and unmeasured — but the kernel did not have to change for the upper limb",
  },
  "tissue.occupational": {
    grade: "C",
    source:
      "Overhead work is a recognised load for this tendon group and the diary has no category for it. A real gap in the DATA MODEL rather than in this profile",
  },
  horizon: {
    grade: "C",
    source: "No dependable long-term cohort figure was retrieved for this condition in this search",
  },
};

const HORIZON = {
  typicalWeeks: [12, 52] as [number, number],
  note: {
    de: "Der Verlauf wird in Monaten berichtet. Eine belastbare Langzeitzahl wurde für diese Diagnose nicht beschafft — die Spanne ist entsprechend weich. Das beschreibt Studiengruppen und sagt nichts über einen einzelnen Verlauf.",
    en: "The course is reported in months. No dependable long-term figure was obtained for this diagnosis, so this range is correspondingly soft. It describes study groups and says nothing about any one course.",
  },
};

export const ROTATOR_CUFF: Profile = {
  key: "rotator_cuff",
  version: "rotator_cuff.2026-08-21",
  label: { de: "Rotatorenmanschette", en: "Rotator cuff" },
  bodyRegion: "shoulder",

  // Range of motion alone. Neither of the other two means anything here, and
  // requiring them would block the engine on data nobody will ever record.
  tests: ["rom"],

  redFlags: RED_FLAGS,
  limitations: LIMITATIONS,
  horizon: HORIZON,
  evidence: EVIDENCE,
};
