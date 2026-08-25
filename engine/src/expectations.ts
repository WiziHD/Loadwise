/**
 * What each scenario MEANS — written down independently of what the code does.
 *
 * ---------------------------------------------------------------------------
 * THE PROBLEM THIS SOLVES.
 *
 * An audit put it bluntly: the engine had no oracle. `Scenario` carried no
 * expected verdict, no test asserted that "Deutliche Verschlechterung" must not
 * come back green, and the only reference was `test/__golden__/report.txt` — a
 * photograph of current behaviour that `npm test -- -u` cheerfully rewrites.
 * 198 passing tests and complete branch coverage were therefore statements
 * about EXECUTION, not about correctness.
 *
 * The entries below are the missing half. Each one says what the scenario is
 * ABOUT: a week at triple volume is a sharp increase, and if the engine ever
 * stops calling it that, the suite must go red — no matter how confidently the
 * golden file has been regenerated in the meantime.
 *
 * Residual honesty: these expectations were written by the same person who
 * wrote the rules, so they are not independent evidence. They are, however,
 * statements of INTENT rather than records of OBSERVATION, and intent is the
 * thing a regression can violate.
 * ---------------------------------------------------------------------------
 */

import { evaluateEpisode } from "./evaluate.js";
import { SCENARIOS, type Scenario } from "./fixtures.js";
import { DEFAULT_CONFIG, type Config, type ReasonCode } from "./types.js";

export interface ScenarioExpectation {
  /** Why this scenario exists, in one line. */
  about: string;
  /** Verdicts the engine must produce here. */
  mustSay?: ReasonCode[];
  /** Verdicts that would be plainly wrong here. */
  mustNotSay?: ReasonCode[];
  /** True when calling this episode "all clear" would be a failure. */
  mustNotReassure?: boolean;
  /**
   * True when a clear verdict IS the right answer here.
   *
   * Added after the mutation harness showed that nothing in the oracle
   * depended on the coverage gates: an engine configured to demand all seven
   * rules would have declared every episode unjudgeable, and every assertion
   * would still have passed, because they all only inspected flags.
   */
  mustReassure?: boolean;
  /**
   * True when the record is too thin to judge and saying so is the answer.
   *
   * Guards the evidence gates from the other side. Lowering
   * `baseline.minEntries` to four would let the engine pronounce on five days
   * of diary, and without this nothing would have objected.
   */
  mustBeInsufficient?: boolean;
}

export const EXPECTATIONS: Record<string, ScenarioExpectation> = {
  // --- Everyday courses ---
  steady: {
    about: "Sensible progression with symptoms fading — the engine should be quiet.",
    mustReassure: true,
    mustSay: ["settled-within-24h", "steady", "symmetric"],
    mustNotSay: ["sharp-increase", "baseline-rising", "no-progress-since-start"],
  },
  medicated: {
    about:
      "The same quiet course, but a painkiller was taken on the last few days. " +
      "The single most important expectation here is the NEGATIVE one: this must " +
      "NOT reassure. Four of the seven rules read the morning score, and a " +
      "painkiller lowers it chemically — an all-clear would then be a statement " +
      "about numbers that were measured through a dampener. The engine must " +
      "still report what it saw, and it must decline to call it fine.",
    mustReassure: false,
    mustSay: ["settled-within-24h", "steady"],
    mustNotSay: ["sharp-increase", "baseline-rising"],
  },
  slowImprovement: {
    about: "One point better over ten weeks. Slow, but it is progress.",
    mustReassure: true,
    mustSay: ["progress-since-start"],
    mustNotSay: ["no-progress-since-start"],
  },
  postOp: {
    about: "Long lay-off, then a cautious ramp that works.",
    mustSay: ["progress-since-start"],
    mustNotSay: ["sharp-increase"],
  },

  realAchilles: {
    // The only scenario here whose shape nobody on this side of the project
    // chose. Its own notes flag two days as reaction patterns; the engine has
    // to find both without reading a note, and it has to see the recovery.
    about: "Sixty days from 6 out of 10 to 1, with cross-training and a graded return to running.",
    mustSay: ["progress-since-start", "elevated-but-settled"],
    mustNotSay: ["baseline-rising", "no-progress-since-start", "return-from-zero"],
  },

  // --- Load ---
  overload: {
    about: "One week at roughly triple volume.",
    mustSay: ["sharp-increase"],
    mustNotSay: ["steady", "detraining"],
    mustNotReassure: true,
  },
  gentleRise: {
    about: "A step up of about forty percent — worth noticing, not alarming.",
    mustSay: ["rising-fast"],
    mustNotSay: ["sharp-increase", "detraining"],
  },
  detrained: {
    about: "Training stopped outright.",
    mustSay: ["detraining"],
    mustNotSay: ["steady", "sharp-increase"],
  },
  tapered: {
    about: "Volume cut by a third — a taper, not a stop.",
    mustSay: ["detraining"],
    mustNotSay: ["sharp-increase"],
  },
  allRest: {
    about: "A diary kept faithfully with no training in it at all.",
    mustSay: ["no-load-recorded"],
    mustNotSay: ["sharp-increase", "detraining"],
  },
  returnFromRest: {
    about: "Complete rest, then straight back into a real session.",
    mustSay: ["return-from-zero"],
    mustNotReassure: true,
  },
  crossTraining: {
    // Deliberately NOT listed as a false positive. Returning to running after
    // four weeks on the bike is a real fivefold jump in Achilles load, and the
    // engine is right to say so — the audit that raised this case framed it as
    // a defect and was wrong. What was missing was the second half of the
    // sentence, not a different verdict.
    about: "Same effort and minutes throughout; only the tissue being loaded changes.",
    mustSay: ["sharp-increase"],
    mustNotSay: ["return-from-zero"],
    mustNotReassure: true,
  },
  weekendWarrior: {
    about: "Two hours every Saturday, nothing else. Steady week to week, and still a risk pattern.",
    mustSay: ["load-concentrated", "steady"],
    mustNotReassure: true,
  },

  // --- Daily reaction ---
  poorSession: {
    about: "One session the tissue clearly did not tolerate.",
    mustSay: ["large-reaction"],
    mustNotReassure: true,
  },
  lingering: {
    about: "A middling reaction still present after 48 hours.",
    mustSay: ["still-elevated-after-48h"],
    // No `mustNotSay: ["settled-within-24h"]` here, and the reason is worth
    // recording: this scenario contains twenty ordinary training days before
    // the bad one, and those genuinely did settle overnight. `mustNotSay`
    // asks whether a verdict appears ANYWHERE in the episode, which is the
    // right question for the standing rules — one verdict each — and the wrong
    // one for the per-day rule. The oracle caught this on its first run, in
    // the expectation rather than in the engine.
    mustNotReassure: true,
  },
  mild: {
    about: "A middling reaction that clears within two days.",
    mustSay: ["elevated-but-settled"],
    mustNotSay: ["still-elevated-after-48h"],
  },

  // --- Slow deterioration ---
  grinder: {
    about: "A point worse per fortnight, slow enough that the daily rule never notices.",
    mustSay: ["baseline-creeping"],
    mustNotSay: ["baseline-stable"],
    mustNotReassure: true,
  },
  warmUp: {
    about: "It warms up. Every session felt fine, every morning was worse — the trap that belongs to tendons.",
    // The scenario that proves why two of these rules exist at all. Across
    // seventy days the 24-hour rule returned GREEN thirty-three times while
    // the morning baseline went from 2 out of 10 to 6, because the rolling
    // median rose with the person and every single day's delta stayed near
    // zero. Only the two rules that read a LEVEL rather than a DIFFERENCE
    // caught it. If either of these ever stops being said here, the engine
    // has gone blind to the most common way this injury gets worse.
    mustSay: ["worse-than-start", "baseline-creeping"],
    mustNotSay: ["progress-since-start", "baseline-stable", "no-progress-since-start"],
    mustNotReassure: true,
  },
  relapse: {
    about: "A setback in week five, recovered by week eight. The question is whether a verdict lets go.",
    // Every other worsening scenario in this library holds or keeps climbing,
    // so nothing tested whether the engine can take a warning BACK. It could
    // not: the summary line took the worst severity across the whole episode,
    // and four red days in week five made this course red on its last day —
    // seven weeks after the person had recovered. Once anything went red, no
    // all-clear was reachable again for the life of the episode.
    //
    // mustReassure is the assertion that matters here. The red days are still
    // reported as findings; what must not happen is that they keep setting
    // today's status.
    mustReassure: true,
    mustSay: ["progress-since-start", "baseline-stable"],
    mustNotSay: ["worse-than-start", "no-progress-since-start", "baseline-rising"],
  },
  settled: {
    about: "Ten weeks at 1 out of 10. Nothing left to improve, and that is not stagnation.",
    // Both halves matter. It must not be scolded for standing still, and it
    // must not be congratulated for an improvement that did not happen.
    mustSay: ["settled-near-zero"],
    mustNotSay: ["no-progress-since-start", "worse-than-start", "progress-since-start"],
  },
  creeping: {
    about: "Half a point per fortnight — under the magnitude threshold, caught by the streak.",
    // Two rules have to speak here, and they say different things. The drift
    // rule sees the SHAPE of the last few weeks; the long view sees that the
    // person is further from where they began than when they started. Calling
    // this "no progress" — which is what the engine did until the third verdict
    // existed — describes a standstill that is not what happened.
    mustSay: ["baseline-creeping", "worse-than-start"],
    mustNotSay: ["baseline-stable", "no-progress-since-start", "progress-since-start"],
  },
  stepped: {
    about: "One clear step worse that then holds.",
    mustSay: ["baseline-creeping", "worse-than-start"],
    mustNotSay: ["baseline-stable", "progress-since-start"],
  },
  deteriorating: {
    about: "Two points worse per fortnight.",
    mustSay: ["baseline-rising"],
    mustNotSay: ["baseline-stable", "baseline-creeping"],
    mustNotReassure: true,
  },
  plateau: {
    about: "Flat at 8 out of 10 for twelve weeks. Every difference-based rule reads zero.",
    // The distinction this scenario now guards: a standstill is NOT a
    // deterioration, and the engine must not blur them in either direction.
    mustSay: ["no-progress-since-start"],
    mustNotSay: ["progress-since-start", "worse-than-start"],
    mustNotReassure: true,
  },

  // --- Pain pattern ---
  worseningPattern: {
    about: "Pain moves from the evening to during the session while its intensity never changes.",
    mustSay: ["pattern-worsening"],
    mustNotSay: ["pattern-easing", "pattern-stable"],
    mustNotReassure: true,
  },
  subtleShift: {
    about: "The same movement, half a step.",
    mustSay: ["pattern-worsening"],
    mustNotSay: ["pattern-easing"],
  },
  easingPattern: {
    // The oracle rejected an earlier `mustReassure` here, and it was right to.
    // The pain PATTERN improves while the morning baseline sits flat at 2 for
    // eight weeks, so the long view reports no progress — correctly. A course
    // can improve on one axis and stand still on another; calling that "clean"
    // was the mistake, not the verdict.
    about: "Pain retreats from the load while the morning baseline does not move.",
    mustSay: ["pattern-easing"],
    mustNotSay: ["pattern-worsening"],
  },

  // --- Side to side ---
  cascade: {
    about: "92 to 84 percent. Falling, and now below the bar, so the deficit is the headline.",
    mustSay: ["mild-deficit"],
    mustNotSay: ["symmetric"],
    mustNotReassure: true,
  },
  openingScissors: {
    about: "98 to 92 percent. Every value acceptable; only the direction is the news.",
    mustSay: ["widening-gap"],
    mustNotSay: ["symmetric", "marked-deficit"],
    mustNotReassure: true,
  },
  erodingRef: {
    about: "Both sides losing a sixth of their capacity while the ratio holds steady.",
    mustSay: ["reference-eroding"],
    mustNotSay: ["symmetric"],
    mustNotReassure: true,
  },
  // --- Side-to-side, measured as hops ---
  //
  // These exist because a profile finally stopped watching heel raises. Every
  // paired measurement in this library was a calf raise, which was invisible
  // while all three test types were watched everywhere — and left four verdicts
  // unreachable for the first profile that narrowed its list.
  hopSymmetric: {
    about: "Hops around 96 percent and holding. Nothing to say.",
    mustReassure: true,
    mustSay: ["symmetric"],
    mustNotSay: ["mild-deficit", "marked-deficit", "widening-gap"],
  },
  hopMild: {
    about: "A stable mild hop deficit around 85 percent.",
    mustSay: ["mild-deficit"],
    mustNotSay: ["symmetric", "marked-deficit"],
    mustNotReassure: true,
  },
  hopMarked: {
    about: "A hop deficit well below the bar and staying there.",
    mustSay: ["marked-deficit"],
    mustNotSay: ["symmetric", "mild-deficit"],
    mustNotReassure: true,
  },
  hopWidening: {
    about: "Hops falling while every value is still green — the only case where the trend is the headline.",
    mustSay: ["widening-gap"],
    mustNotSay: ["symmetric"],
    mustNotReassure: true,
  },
  // --- Side-to-side, measured as range of motion ---
  //
  // `rom` was a declared test type with not one measurement anywhere until a
  // shoulder profile watched it alone.
  romSymmetric: {
    about: "Shoulder range around 96 percent of the other side and holding.",
    mustReassure: true,
    mustSay: ["symmetric"],
    mustNotSay: ["mild-deficit", "marked-deficit"],
  },
  romMild: {
    about: "A stable mild restriction around 85 percent.",
    mustSay: ["mild-deficit"],
    mustNotSay: ["symmetric", "marked-deficit"],
    mustNotReassure: true,
  },
  romMarked: {
    about: "A restriction well short of the other side and staying there.",
    mustSay: ["marked-deficit"],
    mustNotSay: ["symmetric", "mild-deficit"],
    mustNotReassure: true,
  },
  romWidening: {
    about: "Range falling while every value is still green.",
    mustSay: ["widening-gap"],
    mustNotSay: ["symmetric"],
    mustNotReassure: true,
  },
  romEroding: {
    about: "Both shoulders stiffening — the ratio holds while the person loses range.",
    mustSay: ["reference-eroding"],
    mustNotSay: ["symmetric"],
    mustNotReassure: true,
  },
  romStale: {
    about: "Range last measured two months ago. The rule declares its own evidence out of date.",
    mustNotSay: ["symmetric", "mild-deficit", "marked-deficit"],
  },

  erodingRefCalf: {
    about: "Both sides falling by about a sixth while the ratio barely moves — measured as heel raises.",
    // The same trap as erodingRef, for a profile that does not watch hops. The
    // ratio looks fine and the person is measurably weaker on both sides.
    mustSay: ["reference-eroding"],
    mustNotSay: ["symmetric"],
    mustNotReassure: true,
  },

  hopStale: {
    about: "Hop tests two months old. The rule declares its own evidence out of date.",
    mustNotSay: ["symmetric", "mild-deficit", "marked-deficit"],
  },

  improving: {
    about: "60 to 92 percent. Improvement must never read as a widening gap.",
    mustReassure: true,
    mustSay: ["symmetric"],
    mustNotSay: ["widening-gap", "marked-deficit"],
  },
  mildDeficit: {
    about: "A stable deficit around 85 percent, not moving.",
    mustSay: ["mild-deficit"],
    mustNotSay: ["symmetric", "widening-gap"],
  },
  markedDeficit: {
    about: "A stable deficit around 70 percent, not moving.",
    mustSay: ["marked-deficit"],
    mustNotSay: ["symmetric", "mild-deficit"],
    mustNotReassure: true,
  },
  staleTests: {
    about: "Self-tests from two months ago. They describe a body that no longer exists.",
    mustNotSay: ["symmetric", "mild-deficit", "marked-deficit", "widening-gap", "reference-eroding"],
  },

  // --- Thin or broken records ---
  impatient: {
    about: "Returns too early, over and over.",
    mustNotReassure: true,
  },
  dropout: {
    about: "A month logged, three weeks gone, then back.",
    mustBeInsufficient: true,
    mustNotReassure: true,
  },
  interrupted: {
    about: "Two holes punched in the middle of an otherwise complete record.",
    mustBeInsufficient: true,
    mustNotReassure: true,
  },
  sparse: {
    about: "Half the days missing throughout.",
    mustBeInsufficient: true,
    mustNotReassure: true,
  },
  tooShort: {
    about: "Five days in. Nothing can be said yet, and that is the correct answer.",
    mustBeInsufficient: true,
    mustNotReassure: true,
  },
};

/**
 * Run the whole library against a configuration and report every expectation
 * it violates.
 *
 * Shared by `test/oracle.test.ts` and `src/mutate.ts` on purpose: the mutation
 * harness has to ask exactly the question the test asks, or "the suite would
 * have caught this" becomes a guess.
 *
 * ---------------------------------------------------------------------------
 * WARUM `scenarios` EIN PARAMETER IST.
 *
 * Nicht, um andere Bibliotheken zu prüfen — beide Aufrufer nehmen den
 * Standard, die geteilte Frage bleibt dieselbe. Sondern weil zwei der Wächter
 * hier ÜBER DIE KONFIGURATION NICHT AUSLÖSBAR sind: Sie greifen, wenn ein
 * SZENARIO nicht mehr das ist, was seine Erwartung behauptet — wenn jemand die
 * Löcher aus `sparse` herausnimmt, oder ein Szenario ohne Erwartung dazukommt.
 *
 * Ohne diesen Parameter wären beide Zweige unprüfbar, und ein Wächter, der nie
 * ausgelöst hat, ist in diesem Projekt Dekoration. Siehe test/oracle.test.ts.
 * ---------------------------------------------------------------------------
 */
export function violations(
  config: Config = DEFAULT_CONFIG,
  scenarios: Scenario[] = SCENARIOS,
): string[] {
  const found: string[] = [];

  for (const scenario of scenarios) {
    const expectation = EXPECTATIONS[scenario.key];
    if (!expectation) {
      // ---------------------------------------------------------------------
      // HIER STAND `continue`, UND DAS WAR EIN LOCH IM PRÜFER SELBST.
      //
      // Ein Szenario ohne Erwartung wurde stillschweigend übersprungen. Der
      // Test in oracle.test.ts fängt so einen Waisen zwar ab — aber
      // `npm run mutate` ruft diese Funktion direkt auf, ohne jenen Test. Wer
      // ein Szenario hinzufügt und die Erwartung vergisst, bekam dort einen
      // Mutationsscore, der ein Szenario mitzählte, das nichts behauptet.
      //
      // Ein Prüfer, der leise weniger prüft, ist schlimmer als einer, der
      // fehlschlägt.
      // ---------------------------------------------------------------------
      found.push(`${scenario.key}: keine Erwartung — dieses Szenario behauptet nichts`);
      continue;
    }

    const result = evaluateEpisode({
      entries: scenario.entries,
      tests: scenario.tests,
      context: scenario.context,
      config,
      skipValidation: true,
    });
    const said = new Set(result.flags.map((f) => f.reason));

    for (const reason of expectation.mustSay ?? []) {
      if (!said.has(reason)) found.push(`${scenario.key}: fehlt »${reason}«`);
    }
    for (const reason of expectation.mustNotSay ?? []) {
      if (said.has(reason)) found.push(`${scenario.key}: sagt fälschlich »${reason}«`);
    }
    const judgedGreen =
      result.overall.status === "judged" && result.overall.severity === "green";

    if (expectation.mustNotReassure && judgedGreen) {
      found.push(`${scenario.key}: meldet Entwarnung`);
    }
    if (expectation.mustReassure && !judgedGreen) {
      found.push(`${scenario.key}: entwarnt nicht, obwohl der Verlauf sauber ist`);
    }
    if (expectation.mustBeInsufficient) {
      // Deliberately not "must not judge at all": a genuine finding still
      // passes through a thin record, because coverage limits reassurance and
      // never a warning. What must hold is that the engine does not CLEAR the
      // episode, and that it names what it is waiting for.
      if (judgedGreen) found.push(`${scenario.key}: entwarnt auf zu dünner Grundlage`);
      // ---------------------------------------------------------------
      // ZWEI GRÜNDE ZÄHLEN HIER NICHT, UND DER ZWEITE HAT DIE PRÜFUNG
      // LEERLAUFEN LASSEN.
      //
      // `no-tests` war schon ausgenommen: Selbsttests sind eine eigene
      // Eingabe neben dem Tagebuch, in 29 von 51 Szenarien fehlen sie, und sie
      // mitzuzählen machte diese Prüfung einmal trivial wahr.
      //
      // `baseline-unavailable` ist derselbe Fehler eine Ebene tiefer, und er
      // stand hier noch: Der Grund erscheint in 48 von 51 Szenarien. Er MUSS
      // das, denn die ersten `baseline.windowDays` Tage einer Episode können
      // per Konstruktion keinen Ausgangswert haben — auch bei einem lückenlos
      // geführten Tagebuch. Solange er zählte, war »der Motor nennt etwas«
      // für JEDEN Verlauf erfüllt, dünn oder nicht. Ein Wächter, der nie
      // scheitern kann, prüft nichts.
      //
      // Was übrig bleibt, sagt etwas über DIESEN Verlauf: zu wenige Tage, zu
      // grosse Lücken, ein fehlender Folgetag, zu wenige Beschwerdeangaben.
      // Alle vier dünnen Szenarien nennen weiterhin mindestens einen davon;
      // ein vollständiger Verlauf nennt keinen, und dann greift diese Zeile.
      // ---------------------------------------------------------------
      const strukturell = new Set(["no-tests", "baseline-unavailable"]);
      const aboutTheRecord = result.pending.filter((p) => !strukturell.has(p.reason));
      if (aboutTheRecord.length === 0) {
        found.push(`${scenario.key}: nennt nicht, was am Verlauf selbst fehlt`);
      }
    }
  }

  return found;
}
