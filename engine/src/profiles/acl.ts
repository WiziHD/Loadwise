/**
 * After anterior cruciate ligament reconstruction.
 *
 * ---------------------------------------------------------------------------
 * The only profile here with a surgical date, discrete phases, and published
 * criteria for leaving each one. That is why it exists — the milestone work
 * could not be designed properly against three tendinopathies, where progress
 * is genuinely gradual and the criteria are soft.
 *
 * It is also the only profile that carries a PROTOCOL, and the protocol is
 * SWITCHED OFF. `enabled` is the literal type `false`, no code outside this
 * directory so much as names the type, and a test greps for that. The reason
 * is in PROTOKOLLE.md §1: "Du bist in Phase 2, mach jetzt X" and
 * "Freigabekriterien" are the two examples given for crossing into regulated
 * territory, and MDR Rule 11 puts software supplying information for
 * therapeutic decisions at class IIa or above.
 *
 * THE EVIDENCE CUTS BOTH WAYS, AND BOTH HALVES BELONG HERE.
 *
 * For: not meeting a set of discharge criteria is associated with a fourfold
 * rupture risk, and criterion-based return is credited with a 75 to 84 per cent
 * reduction in reinjury.
 *
 * Against: that finding comes from 158 male professional footballers, and a
 * scoping review of the field concludes that passing these tests "has not
 * consistently identified who will or won't sustain another injury". No single
 * test has demonstrated predictive validity on its own.
 *
 * A catalogue that carried only the first half would be advertising, not data.
 * ---------------------------------------------------------------------------
 */

import type { Profile, Protocol, Provenance, RedFlag } from "./types.js";

const KYRITSIS: Provenance = {
  grade: "B",
  contested: true,
  source:
    "Kyritsis et al., BJSM 2016 — n=158 MALE PROFESSIONAL footballers. Six unmet discharge criteria: fourfold graft rupture risk; each 10 % drop in the hamstring-to-quadriceps ratio: 10.6-fold. Population is narrow and the transfer to a recreational athlete is an assumption",
};

const GRINDEM: Provenance = {
  grade: "B",
  source:
    "Grindem et al., BJSM 2016, Delaware-Oslo cohort — return at nine months or later together with symmetrical quadriceps strength substantially reduces reinjury; 75 to 84 % reduction reported across this and Kyritsis 2016",
};

const HOP_BATTERY: Provenance = {
  grade: "B",
  source:
    "Single, triple and crossover hop for distance, limb symmetry index at or above 90 % as the common passing mark; ICC 0.84 to 0.92. No single test has shown predictive validity alone",
};

const RED_FLAGS: RedFlag[] = [
  {
    key: "instability",
    text: {
      de: "Ein Knie, das nachgibt, wegknickt oder sich unsicher anfühlt, ist nach einer Kreuzbandplastik eine Lage für die operierende Person und nicht für ein Tagebuch.",
      en: "A knee that gives way, buckles or feels unsafe after a cruciate reconstruction is a matter for the surgeon, not for a diary.",
    },
  },
  {
    key: "effusion",
    text: {
      de: "Ein Erguss, der nach Belastung wiederkehrt oder zunimmt, ist ein Zeichen, dass das Gelenk mehr abbekommt, als es gerade verträgt. Ein Tagebuch misst ihn nicht.",
      en: "An effusion that returns or grows after loading is a sign the joint is taking more than it currently tolerates. A diary does not measure it.",
    },
  },
  {
    key: "locking",
    text: {
      de: "Ein blockierendes oder einklemmendes Knie kann auf einen Meniskusschaden oder ein Transplantatproblem hindeuten.",
      en: "A knee that locks or catches can point to meniscal damage or a problem with the graft.",
    },
  },
  {
    key: "infection",
    text: {
      de: "Fieber, zunehmende Rötung, Wärme oder Sekret an der Narbe gehören sofort zu einem Menschen und in keine Auswertung.",
      en: "Fever, spreading redness, warmth or discharge at the scar belong with a person immediately, and in no evaluation.",
    },
  },
  {
    key: "calf_dvt",
    text: {
      de: "Eine geschwollene, überwärmte Wade nach einer Operation ist keine Lage, die ein Tagebuch beurteilen kann.",
      en: "A swollen, warm calf after surgery is not a situation a diary can judge.",
    },
  },
  {
    key: "extension_deficit",
    text: {
      de: "Ein Knie, das sich nicht mehr ganz strecken lässt, ist nach dieser Operation ein eigenes Problem und keine Frage der Belastungssteuerung.",
      en: "A knee that will no longer straighten fully is a problem in its own right after this operation, not a question of load management.",
    },
  },
];

const LIMITATIONS = {
  de:
    "Dieses Profil setzt eine erfolgte Kreuzbandplastik voraus und ersetzt keine Nachsorge. Es kann nichts diagnostizieren. " +
    "Ein Tagebuch sieht die Dinge nicht, an denen die Rückkehr in den Sport nach der Literatur tatsächlich hängt: Erguss, volle Streckung und Beugung, isokinetische Kraftmessung, " +
    "Landetechnik und Bewegungsqualität, sowie die psychologische Bereitschaft (ACL-RSI). " +
    "Begleitverletzungen sind die Regel und nicht die Ausnahme — Meniskus, Knorpel, Innenband — und jede davon hat eigene Vorgaben, die dieses Profil nicht kennt. " +
    "Der eingebaute Kriterienkatalog ist AUSGESCHALTET und wird von keiner Zeile Code gelesen. Er ist recherchiert und belegt, aber er darf niemandem sagen, wo er steht. " +
    "Und die Kriterien selbst sind schwächer, als ihre Verbreitung vermuten lässt: Die stärkste Zahl stammt aus 158 männlichen Profifussballern, und eine Übersichtsarbeit hält fest, dass das Bestehen dieser Tests nicht zuverlässig vorhersagt, wer sich erneut verletzt.",
  en:
    "This profile presumes a completed cruciate reconstruction and replaces no follow-up care. It can diagnose nothing. " +
    "A diary cannot see the things the literature says return to sport actually turns on: effusion, full extension and flexion, isokinetic strength testing, " +
    "landing technique and movement quality, and psychological readiness (ACL-RSI). " +
    "Concomitant injuries are the rule rather than the exception — meniscus, cartilage, medial ligament — and each carries its own constraints this profile does not know. " +
    "The built-in criteria catalogue is SWITCHED OFF and is read by no line of code. It is researched and cited, but it may tell nobody where they stand. " +
    "And the criteria themselves are weaker than their currency suggests: the strongest figure comes from 158 male professional footballers, and a scoping review records that passing these tests does not reliably identify who will be injured again.",
};

/**
 * Built, cited, versioned — and inert.
 *
 * Every criterion carries its own provenance rather than inheriting one from
 * the phase, because the phases and the numbers come from different papers and
 * a reader should be able to argue with each separately.
 *
 * Two of the four criteria below are `observation`: an effusion no greater than
 * a trace, and full range of motion. They are real, published, load-bearing —
 * and no written record can establish either. Leaving them out would make this
 * catalogue look complete when it is not.
 */
const PROTOCOL: Protocol = {
  enabled: false,
  provenance: {
    grade: "B",
    source:
      "Assembled from Grindem 2016, Kyritsis 2016 and the return-to-sport testing literature. Not a guideline in itself, and not a substitute for the treating clinician's protocol",
  },
  phases: [
    {
      key: "hop_testing_allowed",
      order: 1,
      label: { de: "Sprungtests zulässig", en: "Hop testing allowed" },
      provenance: {
        grade: "C",
        source:
          "Hop testing described as possible from about twelve weeks after surgery IF the preceding criteria are met; the timing varies between protocols",
      },
      exitCriteria: [
        { kind: "time-since-start", minWeeks: 12, provenance: { grade: "C", source: "Hop testing from roughly twelve weeks post-operatively, where criteria allow" } },
        {
          kind: "observation",
          statement: {
            de: "Erguss höchstens angedeutet, volle Beweglichkeit, kein Schmerz beim einbeinigen Hüpfen.",
            en: "Effusion no more than a trace, full range of motion, no pain on single-leg hopping.",
          },
          provenance: {
            grade: "B",
            source:
              "Stated pre-conditions for hop testing: trace or less effusion, full knee range of motion, no pain with single-leg hopping. None of the three is visible to a diary",
          },
        },
      ],
    },
    {
      key: "return_to_running",
      order: 2,
      label: { de: "Rückkehr zum Laufen", en: "Return to running" },
      provenance: {
        grade: "C",
        source: "Some clinicians use 80 % limb symmetry on hop testing as one component of readiness to begin running",
      },
      exitCriteria: [
        { kind: "test-lsi", test: "single_hop", minPercent: 80, provenance: { grade: "C", source: "80 % limb symmetry used by some as one component of readiness to start running" } },
      ],
    },
    {
      key: "return_to_sport",
      order: 3,
      label: { de: "Rückkehr in den Sport", en: "Return to sport" },
      provenance: GRINDEM,
      exitCriteria: [
        { kind: "time-since-start", minWeeks: 39, provenance: GRINDEM },
        { kind: "test-lsi", test: "single_hop", minPercent: 90, provenance: HOP_BATTERY },
        {
          kind: "observation",
          statement: {
            de: "Quadrizepskraft mindestens neunzig Prozent der Gegenseite, isokinetisch gemessen.",
            en: "Quadriceps strength at least ninety per cent of the other side, measured isokinetically.",
          },
          provenance: KYRITSIS,
        },
      ],
    },
  ],
};

const EVIDENCE: Record<string, Provenance> = {
  "rule.response24h": {
    grade: "C",
    source:
      "The 24-hour settling rule is tendon-derived. After a reconstruction the governing signals are effusion and stability, neither of which a diary records — so the rule applies here by transfer, not by evidence",
  },
  "tests.single_hop": { grade: "B", source: HOP_BATTERY.source! },
  "tests.rom": {
    grade: "B",
    source: "Full knee range of motion is a stated pre-condition for hop testing and a standard impairment measure after this operation",
  },
  "tests.calf_raise": {
    grade: "C",
    source: "REMOVED for this profile. Calf endurance is not among the reported return-to-sport criteria after this operation",
  },
  "tests.notMeasurable": {
    grade: "A",
    source:
      "Effusion, isokinetic strength, landing mechanics and psychological readiness (ACL-RSI, threshold 65 to 70) all appear in the criteria and none can be recorded in a written diary",
  },
  "tests.measurementError": {
    grade: "D",
    source: "Hop-test reliability is reported (ICC 0.84 to 0.92) but no MDC in a comparable population was found",
  },
  "criteria.predictiveValue": {
    grade: "B",
    contested: true,
    source:
      "The honest counterweight: a scoping review concludes passing these tests has not consistently identified who will or will not sustain another injury, and no single test has predictive validity alone",
  },
  "criteria.population": { grade: "B", contested: true, source: KYRITSIS.source! },
  horizon: {
    grade: "B",
    source:
      "Return at nine months or later is the point at which reinjury risk falls substantially (Grindem 2016); each month of delay between six and nine months is reported to reduce it further",
  },
};

const HORIZON = {
  typicalWeeks: [39, 104] as [number, number],
  note: {
    de: "In Studien treten deutlich weniger erneute Verletzungen auf, wenn die Rückkehr in den Sport frühestens neun Monate nach der Operation erfolgt. Das beschreibt Studiengruppen und sagt nichts über einen einzelnen Verlauf.",
    en: "Studies report substantially fewer further injuries when return to sport happens no earlier than nine months after surgery. This describes study groups and says nothing about any one course.",
  },
};

export const ACL_RECONSTRUCTION: Profile = {
  key: "acl_reconstruction",
  version: "acl_reconstruction.2026-08-21",
  label: { de: "Nach Kreuzbandplastik", en: "After cruciate reconstruction" },
  bodyRegion: "knee",

  tests: ["single_hop", "rom"],

  redFlags: RED_FLAGS,
  limitations: LIMITATIONS,
  horizon: HORIZON,
  evidence: EVIDENCE,
  protocol: PROTOCOL,
};
