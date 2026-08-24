/**
 * Synthetic diary series.
 *
 * Two jobs. Some scenarios push a single rule against its boundary; others are
 * realistic course types used to see whether the whole engine says something
 * sensible about a plausible human being.
 *
 * Randomness is seeded, so a failing test fails the same way twice — this file
 * must never become a source of flaky results.
 *
 * These stand in until real diary data exists. They can show that the rules
 * behave as specified; they cannot show that the rules are clinically right.
 */

import { ACHILLES_60_DAYS } from "./course-achilles.js";
import { addDays } from "./dates.js";
import type {
  ActivityKind,
  DateStr,
  Entry,
  EpisodeContext,
  SelfTest,
  SymptomTiming,
  Session,
} from "./types.js";

export const START: DateStr = "2026-03-02"; // a Monday

export const ACHILLES_CTX: EpisodeContext = { bodyRegion: "achilles", side: "left" };
const PATELLA_CTX: EpisodeContext = { bodyRegion: "patella" };
const FOOT_CTX: EpisodeContext = { bodyRegion: "foot" };
const SHOULDER_CTX: EpisodeContext = { bodyRegion: "shoulder" };
export const KNEE_CTX: EpisodeContext = { bodyRegion: "patella", side: "right" };

/** Deterministic pseudo-random, mulberry32. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DayPlan {
  activity?: ActivityKind;
  rpe?: number;
  durationMin?: number;
  morningScore: number;
  symptomScore?: number;
  symptomTiming?: SymptomTiming;
}

/**
 * Eine Einheit, kurz geschrieben.
 *
 * Für Szenarien und Tests. Die Reihenfolge ist Anstrengung, dann Minuten —
 * so, wie man einen Trainingstag beschreibt (»sechs, vierzig Minuten«), und
 * nicht wie die Datenbank die Spalten sortiert.
 */
export const session = (
  rpe: number,
  durationMin: number,
  activityKind: ActivityKind = "run",
): Session => ({ activityKind, durationMin, rpe });

export function build(plans: DayPlan[], start: DateStr = START): Entry[] {
  return plans.map((plan, i) => ({
    date: addDays(start, i),
    morningScore: plan.morningScore,
    // Ein Plan beschreibt höchstens eine Einheit — so waren alle fünfzig
    // Szenarien geschrieben. Sie werden dadurch zu einer Liste mit null oder
    // einem Eintrag, und die Summe ist derselbe Wert wie vorher. Die
    // Golden-Datei muss deshalb byteweise gleich bleiben.
    sessions:
      plan.rpe && plan.durationMin
        ? [{ activityKind: plan.activity ?? "run", durationMin: plan.durationMin, rpe: plan.rpe }]
        : [],
    symptomScore: plan.symptomScore ?? null,
    symptomTiming: plan.symptomTiming ?? null,
  }));
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

// ---------------------------------------------------------------------------
// Boundary scenarios — one rule each
// ---------------------------------------------------------------------------

/** Sensible progression, symptoms slowly fading, stable pain pattern. */
export function steadyRecovery(days = 56, seed = 1): Entry[] {
  const rnd = seeded(seed);
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const week = Math.floor(i / 7);
    const trains = i % 7 < 4;
    const drift = 3 - (i / days) * 2;
    const morningScore = clamp(Math.round(drift + (rnd() - 0.5)), 0, 10);
    plans.push(
      trains
        ? {
            rpe: 5,
            durationMin: Math.round(30 * Math.pow(1.05, week)),
            morningScore,
            symptomScore: 3,
            symptomTiming: "after",
          }
        : { morningScore },
    );
  }
  return build(plans);
}

/** Four normal weeks, then one week at roughly triple the volume. */
/**
 * Ein ruhiger Verlauf — mit einem Schmerzmittel in den letzten Tagen.
 *
 * ---------------------------------------------------------------------------
 * DAS SZENARIO, DAS DEN UNTERSCHIED ZWISCHEN »GUT« UND »GEDÄMPFT GEMESSEN«
 * VORFÜHRT.
 *
 * Von `steadyRecovery` nicht zu unterscheiden, ausser in einem Feld: An den
 * letzten Tagen wurde ein Schmerzmittel genommen. Ohne diese Angabe würde der
 * Motor Entwarnung geben, und sie wäre eine Aussage über Werte, die chemisch
 * gesenkt wurden — vier der sieben Regeln lesen den Morgenwert.
 *
 * Mit ihr sagt er »noch nicht genug beurteilt« und nennt den Grund. Er DEUTET
 * nichts: dass die Besserung an den Tabletten liegen könnte, wäre eine
 * klinische Aussage. Er verweigert nur die Entwarnung.
 *
 * Warum ein eigenes Szenario und nicht ein Feld in einem bestehenden: Die
 * anderen fünfzig behalten damit ihre Bedeutung, und die Golden-Datei zeigt den
 * Unterschied als eigenen Abschnitt statt als verschobenes Urteil.
 */
export function onMedication(days = 70): Entry[] {
  // Auf einem Verlauf aufgebaut, der unter JEDEM Profil ruhig bleibt — auch
  // unter dem Schienbein-Profil, das strenger ist als die anderen. Sonst greift
  // dort eine Warnung, und die geht der Entwarnung korrekt vor: Dann käme die
  // Medikationssperre gar nicht zur Sprache, und der Grund waere unter diesem
  // Profil unerreichbar.
  const entries = settledNearZero(days);
  // Die letzten drei Tage. Sie liegen im Fenster, das die Entwarnung betrifft.
  return entries.map((e, i) => (i >= days - 3 ? { ...e, painMedication: true } : e));
}

export function overloadWeek(seed = 2): Entry[] {
  const rnd = seeded(seed);
  const plans: DayPlan[] = [];
  for (let i = 0; i < 35; i++) {
    const spikeWeek = i >= 28;
    const trains = i % 7 < 4 || spikeWeek;
    const morningScore = clamp(Math.round(2 + (rnd() - 0.5)), 0, 10);
    plans.push(
      trains
        ? { rpe: spikeWeek ? 8 : 5, durationMin: spikeWeek ? 75 : 30, morningScore }
        : { morningScore },
    );
  }
  return build(plans);
}

/** A moderate step up — enough to notice, not enough to alarm. */
export function gentleIncrease(): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < 35; i++) {
    const lastWeek = i >= 28;
    const trains = i % 7 < 4;
    plans.push(
      trains
        ? { rpe: 5, durationMin: lastWeek ? 42 : 30, morningScore: 2 }
        : { morningScore: 2 },
    );
  }
  return build(plans);
}

/** One session the tissue clearly does not tolerate. */
export function poorResponse(): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < 20; i++) {
    plans.push(
      i % 7 < 4
        ? { rpe: 4, durationMin: 25, morningScore: 2, symptomScore: 2, symptomTiming: "evening" }
        : { morningScore: 2 },
    );
  }
  plans.push({ rpe: 9, durationMin: 60, morningScore: 2, symptomScore: 7, symptomTiming: "during" });
  plans.push({ morningScore: 7 });
  plans.push({ morningScore: 6 });
  plans.push({ morningScore: 3 });
  return build(plans);
}

/** A middling reaction that is gone within two days. */
export function mildReaction(): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < 20; i++) {
    plans.push(i % 7 < 4 ? { rpe: 4, durationMin: 25, morningScore: 2 } : { morningScore: 2 });
  }
  plans.push({ rpe: 6, durationMin: 45, morningScore: 2 });
  plans.push({ morningScore: 5 });
  plans.push({ morningScore: 2 });
  return build(plans);
}

/** A middling reaction that is still there two days later. */
export function lingeringReaction(): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < 20; i++) {
    plans.push(i % 7 < 4 ? { rpe: 4, durationMin: 25, morningScore: 2 } : { morningScore: 2 });
  }
  plans.push({ rpe: 6, durationMin: 45, morningScore: 2 });
  plans.push({ morningScore: 5 });
  plans.push({ morningScore: 5 });
  plans.push({ morningScore: 3 });
  return build(plans);
}

/** Trained for three weeks, then stopped. */
export function detrained(): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < 28; i++) {
    const lastWeek = i >= 21;
    plans.push(
      lastWeek ? { morningScore: 2 } : { rpe: 6, durationMin: 45, morningScore: 2 },
    );
  }
  return build(plans);
}

/**
 * Volume cut back by roughly a third — a taper, not a stop.
 *
 * Added after the first calibration run showed spike.amberBelow deciding
 * nothing: the only reduction in the library went straight to zero, so no
 * sweep of that threshold could ever cross the ratio. A dial with no scenario
 * to act on looks robust when it is merely untested.
 */
export function taperedOff(): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < 28; i++) {
    const lastWeek = i >= 21;
    plans.push(
      i % 7 < 4
        ? { rpe: 5, durationMin: lastWeek ? 20 : 30, morningScore: 2 }
        : { morningScore: 2 },
    );
  }
  return build(plans);
}

/** Four weeks of diary, never a session. */
export function allRest(): Entry[] {
  return build(Array.from({ length: 30 }, () => ({ morningScore: 2 })));
}

/** Complete rest, then straight back into a real session. */
export function returnFromRest(): Entry[] {
  const plans: DayPlan[] = Array.from({ length: 27 }, () => ({ morningScore: 2 }));
  plans.push({ rpe: 7, durationMin: 60, morningScore: 2 });
  return build(plans);
}

// ---------------------------------------------------------------------------
// Realistic course types
// ---------------------------------------------------------------------------

/**
 * The grinder. Never a bad day, never a good week. Morning scores creep up by
 * about one point a fortnight — slowly enough that the rolling median follows
 * along and the 24-hour rule stays quiet. This is the case baselineDrift was
 * written for.
 */
export function theGrinder(days = 70): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const fortnight = Math.floor(i / 14);
    const morningScore = clamp(1 + fortnight, 0, 10);
    plans.push(
      i % 7 < 4
        ? { rpe: 5, durationMin: 35, morningScore, symptomScore: 3, symptomTiming: "after" }
        : { morningScore },
    );
  }
  return build(plans);
}

/**
 * Better, but barely: one point over ten weeks.
 *
 * Added because calibration showed `stagnation.minImprovement` deciding
 * nothing — every scenario in the library either improved clearly or not at
 * all, so no sweep of that threshold could ever cross a change. The dial
 * looked robust when it was merely untested, which is the third time that
 * pattern has appeared in this project.
 */
export function slowImprovement(days = 84): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const morningScore = i < days / 2 ? 4 : 3;
    plans.push(
      i % 7 < 4 ? { rpe: 5, durationMin: 35, morningScore } : { morningScore },
    );
  }
  return build(plans);
}

/**
 * Climbs, then holds. The case no rule in this engine could see.
 *
 * Morning scores rise from 2 to 8 over four weeks and then sit at 8 for two
 * months. Once the plateau is reached, EVERY difference-based rule reads zero:
 * the rolling median is 8, so the 24-hour delta is 0 and reports settled; the
 * drift between fortnights is 0 and reports stable; the training volume never
 * changed and reports steady. An audit reproduced the whole engine calling
 * this green.
 *
 * The stagnation rule is the only thing that can speak here, and it does so
 * without inventing a clinical threshold — it compares the person to where
 * they started, not to a number somebody made up.
 */
export function plateau(days = 84): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    // Flat at 8 from the first day, and that matters.
    //
    // This fixture used to climb 5 → 8 across the opening fortnight before
    // holding. It was named "plateau" and asserted "no-progress-since-start",
    // and it passed — but only because the rule had no word for getting worse.
    // The moment that word existed, the scenario reported deterioration, which
    // is what its data had always described. The test's name had been false for
    // as long as the test had existed.
    //
    // The rule measures the start as a median over the opening fortnight, so a
    // course that climbs inside that window is not a plateau to it. If a
    // plateau is what we mean, the level has to be flat where the rule looks.
    // Deterioration has its own scenarios: creepingWorsening and steppedWorsening.
    const morningScore = 8;
    plans.push(
      i % 7 < 4 ? { rpe: 5, durationMin: 35, morningScore } : { morningScore },
    );
  }
  return build(plans);
}

/**
 * Ten weeks at 1 out of 10, training steadily. As good as it is going to get.
 *
 * Written to reach a branch that no scenario in this library reached: the one
 * that stops the long view from nagging somebody who has essentially recovered.
 * Nothing contradicted it for as long as nothing executed it, and it was
 * answering with the wrong verdict the whole time.
 *
 * The distinction it defends is not academic. Twelve weeks at 1 out of 10 and
 * twelve weeks at 8 out of 10 are both "no change", and only one of them is
 * something to say to a person.
 */
export function settledNearZero(days = 70): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    plans.push(
      i % 7 < 4 ? { rpe: 5, durationMin: 40, morningScore: 1 } : { morningScore: 1 },
    );
  }
  return build(plans);
}

/**
 * The trap that belongs to tendons: it warms up.
 *
 * ---------------------------------------------------------------------------
 * Step 3 of the procedure in PROTOKOLLE.md asks each profile for the mistake
 * that is typical of its injury. For a tendon that is the warm-up phenomenon,
 * and it is dangerous precisely because it is not a warning sign — it is the
 * textbook presentation. Nearly everybody with this condition has it.
 *
 * The tendon hurts at the start of a session and eases as it warms. So the
 * number that gets written into the diary after training is SMALL, and it gets
 * smaller as the person gets used to the pattern. Every session confirms that
 * things are fine.
 *
 * The mornings say the opposite, and the mornings are right.
 *
 * The diary signature is therefore an inversion: symptom scores low and
 * falling, morning scores high and rising. No other scenario in this library
 * has the two moving in opposite directions, which is the whole reason this
 * one exists.
 * ---------------------------------------------------------------------------
 */
export function warmUpTrap(days = 70): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    // The truth: two out of ten to six, across ten weeks. Slowly enough that
    // no single morning is alarming.
    const morningScore = 2 + Math.floor(i / 14);

    if (i % 7 < 4) {
      plans.push({
        activity: "run",
        rpe: 6,
        durationMin: 40,
        morningScore,
        // The story the sessions tell: it warms up, and it warms up better
        // every month. Nothing here is a lie — it is what the person felt.
        symptomScore: Math.max(1, 3 - Math.floor(i / 28)),
        symptomTiming: "during",
      });
    } else {
      plans.push({ morningScore });
    }
  }
  return build(plans);
}

/**
 * A setback that is then recovered from — the only one in this library.
 *
 * Every other worsening scenario here holds or keeps climbing, which meant a
 * whole class of behaviour went untested: whether a verdict LETS GO. A rule
 * that latches onto a bad fortnight and keeps reporting it after the person
 * has recovered would be a defect nobody would notice from the inside, because
 * the warning would look like it was still working.
 *
 * Twelve weeks: down from 6 to 2, one hard session that costs four weeks, then
 * back down to 1.
 */
export function relapseAndRecovery(days = 84): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    let morningScore: number;
    if (i < 28) {
      morningScore = clamp(6 - Math.floor(i / 7), 2, 6);
    } else if (i < 56) {
      // The setback and its long tail: one session too far on day 28.
      morningScore = clamp(6 - Math.floor((i - 28) / 9), 3, 6);
    } else {
      morningScore = clamp(3 - Math.floor((i - 56) / 12), 1, 3);
    }

    const hardDay = i === 28;
    if (hardDay) {
      plans.push({ activity: "court_sport", rpe: 9, durationMin: 90, morningScore, symptomScore: 6, symptomTiming: "during" });
    } else if (i % 7 < 4) {
      plans.push({ activity: "run", rpe: 5, durationMin: 30, morningScore, symptomScore: 2, symptomTiming: "after" });
    } else {
      plans.push({ morningScore });
    }
  }
  return build(plans);
}

/**
 * The barely perceptible climb: half a point per fortnight.
 *
 * Each single step stays under drift.amberRise, so the magnitude branch never
 * fires. Only the "three rising windows in a row" branch can catch this — and
 * before this fixture existed, that branch was never executed by any test.
 * Coverage found it; the shape is real.
 */
export function creepingWorsening(days = 70): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const fortnight = Math.floor(i / 14);
    // Whole steps on even fortnights, half steps on odd ones, so consecutive
    // medians rise by 0.5 rather than a full point.
    const base = 2 + Math.floor(fortnight / 2);
    const morningScore = fortnight % 2 === 0 ? base : i % 2 === 0 ? base : base + 1;
    plans.push(
      i % 7 < 4 ? { rpe: 5, durationMin: 35, morningScore } : { morningScore },
    );
  }
  return build(plans);
}

/**
 * One step down, then a new plateau.
 *
 * Added after calibration showed drift.amberRise deciding nothing: every
 * worsening scenario in the library also climbed for several fortnights in a
 * row, so the "three rising windows" fallback fired first and the magnitude
 * threshold never got a say. This is the case it exists for — a single clear
 * step that then holds.
 */
export function steppedWorsening(days = 56): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const afterStep = i >= days - 14;
    const morningScore = afterStep ? (i % 2 === 0 ? 3 : 4) : 2;
    plans.push(
      i % 7 < 4 ? { rpe: 5, durationMin: 35, morningScore } : { morningScore },
    );
  }
  return build(plans);
}

/** Deteriorating faster — two points a fortnight. */
export function deteriorating(days = 56): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const fortnight = Math.floor(i / 14);
    const morningScore = clamp(1 + fortnight * 2, 0, 10);
    plans.push(
      i % 7 < 4 ? { rpe: 5, durationMin: 35, morningScore } : { morningScore },
    );
  }
  return build(plans);
}

/**
 * The pain moves closer to the load: evening at first, then after, then during.
 * The reported intensity barely changes — only the timing does.
 */
export function worseningPattern(days = 56): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const timing: SymptomTiming = i < 21 ? "evening" : i < 35 ? "after" : "during";
    plans.push(
      i % 7 < 4
        ? { rpe: 5, durationMin: 35, morningScore: 2, symptomScore: 4, symptomTiming: timing }
        : { morningScore: 2 },
    );
  }
  return build(plans);
}

/** The reverse: pain retreats from during, to after, to merely the evening. */
export function easingPattern(days = 56): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const timing: SymptomTiming = i < 21 ? "during" : i < 35 ? "after" : "evening";
    plans.push(
      i % 7 < 4
        ? { rpe: 5, durationMin: 35, morningScore: 2, symptomScore: 4, symptomTiming: timing }
        : { morningScore: 2 },
    );
  }
  return build(plans);
}

/**
 * A small shift in the pain pattern — half a step, not a whole one.
 *
 * Added after the first calibration run showed pattern.worseningShift
 * deciding nothing: every pattern scenario moved by more than a full step, so
 * no sweep of the threshold could ever cross the change.
 */
export function subtlePatternShift(days = 42): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    if (i % 7 >= 4) {
      plans.push({ morningScore: 2 });
      continue;
    }
    // First half: entirely evening. Second half: evening and after in equal
    // measure, which lifts the weighted position by exactly half a step.
    const timing: SymptomTiming = i < 21 ? "evening" : i % 2 === 0 ? "evening" : "after";
    plans.push({ rpe: 5, durationMin: 35, morningScore: 2, symptomScore: 4, symptomTiming: timing });
  }
  return build(plans);
}

/** Returns too early, again and again. */
export function theImpatient(days = 56): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const inCycle = i % 14;
    if (inCycle < 3) {
      plans.push({ rpe: 8, durationMin: 60, morningScore: 3, symptomScore: 6, symptomTiming: "during" });
    } else if (inCycle < 8) {
      plans.push({ morningScore: 6 });
    } else {
      plans.push({ morningScore: 3 });
    }
  }
  return build(plans);
}

/** Nothing all week, then everything on Saturday. */
export function weekendWarrior(days = 56): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const saturday = i % 7 === 5;
    plans.push(
      saturday
        ? { activity: "court_sport", rpe: 8, durationMin: 120, morningScore: 3 }
        : { morningScore: 2 },
    );
  }
  return build(plans);
}

/** After surgery: weeks of nothing, then a very cautious ramp. */
export function postOp(days = 70): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    if (i < 21) {
      plans.push({ morningScore: 5 });
    } else {
      const week = Math.floor((i - 21) / 7);
      plans.push(
        i % 7 < 3
          ? {
              activity: "strength_lower",
              rpe: 3,
              durationMin: 15 + week * 5,
              morningScore: clamp(5 - week, 0, 10),
            }
          : { morningScore: clamp(5 - week, 0, 10) },
      );
    }
  }
  return build(plans);
}

/** Logged for a month, vanished for three weeks, came back. */
export function theDropout(): Entry[] {
  const before = steadyRecovery(28, 7);
  const after = build(
    Array.from({ length: 14 }, (_, i) =>
      i % 7 < 4
        ? { rpe: 5, durationMin: 35, morningScore: 3 }
        : { morningScore: 3 },
    ),
    addDays(START, 49),
  );
  return [...before, ...after];
}

/**
 * A diary with two holes punched in the middle of it.
 *
 * Added because the blocking-reason reachability test found that
 * `next-day-missing` and `second-day-missing` could never reach a user: the
 * only gaps in the library were at the trailing edge, where a missing tomorrow
 * is simply today being today. A hole in the MIDDLE is a real blind spot, and
 * nothing in the engine could say so.
 *
 * Day 20 carries load and day 21 shows a middling reaction, but day 22 is gone
 * — so the verdict hangs on a day that was never recorded. Day 23 carries load
 * and day 24 is gone outright.
 */
export function interruptedDiary(): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < 35; i++) {
    if (i === 20 || i === 23) {
      plans.push({ rpe: 6, durationMin: 45, morningScore: 2 });
    } else if (i === 21) {
      plans.push({ morningScore: 5 }); // middling reaction — needs day 22 to resolve
    } else if (i % 7 < 4) {
      plans.push({ rpe: 4, durationMin: 25, morningScore: 2 });
    } else {
      plans.push({ morningScore: 2 });
    }
  }
  const all = build(plans);
  const holes = new Set([addDays(START, 22), addDays(START, 24)]);
  return all.filter((e) => !holes.has(e.date));
}

/**
 * Cross-training: four weeks running, four on the bike, then back to running.
 *
 * Same effort, same minutes, every single session. Only the activity changes.
 *
 * This is the standard advice while a tendon calms down, and it is the case
 * that shows what the tissue factor does and does not know. For an Achilles,
 * cycling carries a fifth of the load — so the return to running genuinely IS
 * a fivefold jump in tendon load, and calling it a sharp increase is CORRECT.
 * The engine is not wrong here; it was merely unable to add the other half of
 * the truth, which is that the person's overall training never changed at all.
 *
 * `LoadSpikeDetail` now carries both figures for exactly this reason.
 */
export function crossTraining(): Entry[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < 63; i++) {
    const onBike = i >= 28 && i < 56;
    plans.push(
      i % 7 < 4
        ? { activity: onBike ? "cycle" : "run", rpe: 5, durationMin: 40, morningScore: 2 }
        : { morningScore: 2 },
    );
  }
  return build(plans);
}

/** Half the days missing. The rules must decline to judge, not improvise. */
export function sparse(seed = 3): Entry[] {
  const rnd = seeded(seed);
  return steadyRecovery(56, seed).filter(() => rnd() > 0.5);
}

/** Barely started. Everything should report insufficient data. */
export function tooShort(): Entry[] {
  return build([
    { morningScore: 4 },
    { rpe: 4, durationMin: 20, morningScore: 4 },
    { morningScore: 5 },
    { morningScore: 3 },
    { rpe: 4, durationMin: 20, morningScore: 3 },
  ]);
}

// ---------------------------------------------------------------------------
// Self-test series
// ---------------------------------------------------------------------------

const testDates = [0, 14, 28].map((d) => addDays(START, d));

function calfSeries(pairs: [number, number][]): SelfTest[] {
  return pairs.map(([involved, uninvolved], i) => ({
    type: "calf_raise" as const,
    date: testDates[i]!,
    involved,
    uninvolved,
  }));
}

/** Symmetry holding steady around 95 percent. */
export const symmetricTests = (): SelfTest[] =>
  calfSeries([
    [19, 20],
    [20, 21],
    [22, 23],
  ]);

/**
 * The cascade: the index looks acceptable at first glance and falls at every
 * single measurement. The pattern no human notices across six weeks.
 */
export const wideningAsymmetry = (): SelfTest[] =>
  calfSeries([
    [23, 25],
    [22, 25],
    [21, 25],
  ]);

/**
 * Falling, but every value still in the green band: 98 → 94 → 92 percent.
 *
 * This is what "the scissors are opening" actually looks like before anything
 * is wrong yet — and it is the only situation where the TREND deserves to be
 * the headline. Once the value itself drops below the bar, the deficit is the
 * news and the trend is context.
 *
 * The library previously used 92 → 88 → 84 for this, which ends below the bar
 * and therefore no longer demonstrates it.
 */
export const wideningWhileStillGreen = (): SelfTest[] =>
  calfSeries([
    [49, 50],
    [47, 50],
    [46, 50],
  ]);

/**
 * The healthy side is quietly losing ground too.
 *
 * Hop distance on both legs falls by about a sixth over four weeks while the
 * ratio between them barely moves. Every symmetry verdict looks fine; the
 * person is measurably weaker on both sides. This is the case that made the
 * rule contradict its own premise — the reference it trusts is exactly what
 * the cascade destroys.
 */
export const erodingReference = (): SelfTest[] =>
  [
    [132, 150],
    [122, 138],
    [111, 126],
  ].map(([involved, uninvolved], i) => ({
    type: "single_hop" as const,
    date: testDates[i]!,
    involved: involved!,
    uninvolved: uninvolved!,
  }));

/**
 * The same four side-to-side situations, measured as hops rather than heel raises.
 *
 * ---------------------------------------------------------------------------
 * Added because a test caught the library out.
 *
 * Every paired measurement here was a calf raise, which was invisible while
 * every profile watched all three test types. The moment one profile stopped
 * watching heel raises — a patellar tendon learns nothing from one — four
 * side-to-side verdicts became unreachable for it. The rule would simply have
 * gone quiet for that injury, and nothing would have looked wrong.
 *
 * That is the seventh instance of this project's recurring defect, and the
 * first found by the per-profile reachability check rather than by an audit.
 * ---------------------------------------------------------------------------
 */
function hopSeries(pairs: [number, number][]): SelfTest[] {
  return pairs.map(([involved, uninvolved], i) => ({
    type: "single_hop" as const,
    date: testDates[i]!,
    involved,
    uninvolved,
  }));
}

/** Around 96 percent and holding. */
export const symmetricHops = (): SelfTest[] =>
  hopSeries([
    [96, 100],
    [97, 101],
    [98, 102],
  ]);

/** A stable mild deficit: around 85 percent. */
export const mildDeficitHops = (): SelfTest[] =>
  hopSeries([
    [85, 100],
    [84, 100],
    [85, 100],
  ]);

/** Well below the bar and staying there: around 70 percent. */
export const markedDeficitHops = (): SelfTest[] =>
  hopSeries([
    [70, 100],
    [68, 100],
    [70, 100],
  ]);

/** Falling while every value is still in the green band: 98 → 94 → 92. */
export const wideningHops = (): SelfTest[] =>
  hopSeries([
    [98, 100],
    [94, 100],
    [92, 100],
  ]);

/**
 * The healthy side losing ground too — as heel raises this time.
 *
 * The library was lopsided in both directions and one profile found each half.
 * Every paired measurement was a calf raise until a knee profile stopped
 * watching them, and the ONE hop series that existed was the eroding
 * reference — so the moment a profile watched only heel raises, that verdict
 * went dark for it instead.
 *
 * A scenario library that only fits the profiles written so far is a library
 * that will keep failing this check, once per profile, for as long as profiles
 * keep being written.
 */
export const erodingReferenceCalf = (): SelfTest[] =>
  calfSeries([
    [22, 25],
    [20, 23],
    [18, 21],
  ]);

/**
 * Side-to-side range of motion, in degrees.
 *
 * ---------------------------------------------------------------------------
 * `rom` has been one of three declared test types since the first version of
 * this engine and NOT ONE measurement of it existed anywhere — not in a
 * fixture, not in a test, nowhere.
 *
 * It stayed invisible for as long as every profile also watched heel raises and
 * hops, because the verdicts were reachable through those. The first profile
 * that watches range of motion ALONE — a shoulder, where neither of the others
 * means anything — turned five verdicts dark at once.
 *
 * Three test types, and the library only ever exercised two of them.
 * ---------------------------------------------------------------------------
 */
function romSeries(pairs: [number, number][]): SelfTest[] {
  return pairs.map(([involved, uninvolved], i) => ({
    type: "rom" as const,
    date: testDates[i]!,
    involved,
    uninvolved,
  }));
}

/** Around 96 percent of the other side and holding. */
export const symmetricRom = (): SelfTest[] =>
  romSeries([
    [168, 175],
    [169, 175],
    [170, 176],
  ]);

/** A stable mild restriction: around 85 percent. */
export const mildRestrictionRom = (): SelfTest[] =>
  romSeries([
    [149, 175],
    [148, 175],
    [149, 175],
  ]);

/** Well short and staying there: around 70 percent. */
export const markedRestrictionRom = (): SelfTest[] =>
  romSeries([
    [122, 175],
    [120, 175],
    [123, 175],
  ]);

/** Falling while every value is still in the green band: 98 → 94 → 92. */
export const wideningRom = (): SelfTest[] =>
  romSeries([
    [172, 175],
    [164, 175],
    [161, 175],
  ]);

/** Both shoulders stiffening — the ratio holds while the person loses range. */
export const erodingReferenceRom = (): SelfTest[] =>
  romSeries([
    [158, 175],
    [147, 162],
    [135, 150],
  ]);

/** Improving nicely — must not be mistaken for a trend warning. */
export const improvingAsymmetry = (): SelfTest[] =>
  calfSeries([
    [15, 25],
    [19, 25],
    [23, 25],
  ]);

/** A stable mild deficit: around 85 percent, not falling. */
export const mildDeficitTests = (): SelfTest[] =>
  calfSeries([
    [17, 20],
    [16, 20],
    [17, 20],
  ]);

/** A stable marked deficit: around 70 percent, not falling. */
export const markedDeficitTests = (): SelfTest[] =>
  calfSeries([
    [14, 20],
    [13, 20],
    [14, 20],
  ]);

// ---------------------------------------------------------------------------
// The registry every consumer iterates over
// ---------------------------------------------------------------------------

export interface Scenario {
  key: string;
  title: string;
  entries: Entry[];
  tests: SelfTest[];
  context: EpisodeContext;
}

export const SCENARIOS: Scenario[] = [
  { key: "steady", title: "Sauberer Verlauf: langsame Steigerung, Beschwerden gehen zurück", entries: steadyRecovery(56), tests: symmetricTests(), context: ACHILLES_CTX },
  { key: "medicated", title: "Ein zur Ruhe gekommener Verlauf, aber mit Schmerzmittel in den letzten Tagen", entries: onMedication(70), tests: symmetricTests(), context: ACHILLES_CTX },
  { key: "overload", title: "Eine Woche mit dreifachem Umfang", entries: overloadWeek(), tests: [], context: ACHILLES_CTX },
  { key: "gentleRise", title: "Maßvolle Steigerung um gut vierzig Prozent", entries: gentleIncrease(), tests: [], context: ACHILLES_CTX },
  { key: "poorSession", title: "Eine Einheit, die das Gewebe nicht verträgt", entries: poorResponse(), tests: symmetricTests(), context: ACHILLES_CTX },
  { key: "lingering", title: "Mittlere Reaktion, die nach 48 Stunden noch da ist", entries: lingeringReaction(), tests: [], context: ACHILLES_CTX },
  { key: "mild", title: "Mittlere Reaktion, die sich wieder legt", entries: mildReaction(), tests: [], context: ACHILLES_CTX },
  { key: "detrained", title: "Training abrupt eingestellt", entries: detrained(), tests: [], context: ACHILLES_CTX },
  { key: "tapered", title: "Umfang um ein Drittel zurückgefahren", entries: taperedOff(), tests: [], context: ACHILLES_CTX },
  { key: "allRest", title: "Tagebuch geführt, nie trainiert", entries: allRest(), tests: [], context: ACHILLES_CTX },
  { key: "returnFromRest", title: "Nach völliger Ruhe direkt zurück ins Training", entries: returnFromRest(), tests: [], context: ACHILLES_CTX },
  { key: "grinder", title: "Der Dauerläufer: nie ein schlechter Tag, nie eine gute Woche", entries: theGrinder(), tests: [], context: ACHILLES_CTX },
  { key: "deteriorating", title: "Deutliche Verschlechterung über Wochen", entries: deteriorating(), tests: [], context: ACHILLES_CTX },
  { key: "stepped", title: "Einmalige Verschlechterung, die dann bleibt", entries: steppedWorsening(), tests: [], context: ACHILLES_CTX },
  { key: "warmUp", title: "Es läuft sich ein — gute Einheiten, schlechter werdende Morgen", entries: warmUpTrap(), tests: [], context: ACHILLES_CTX },
  { key: "relapse", title: "Rückschlag mit Erholung — meldet der Motor Entwarnung, wenn es vorbei ist?", entries: relapseAndRecovery(), tests: [], context: ACHILLES_CTX },
  { key: "settled", title: "Zehn Wochen bei 1 von 10 — nichts mehr zu verbessern", entries: settledNearZero(), tests: [], context: ACHILLES_CTX },
  { key: "creeping", title: "Kaum merklicher Anstieg: ein halber Punkt je vierzehn Tage", entries: creepingWorsening(), tests: [], context: ACHILLES_CTX },
  { key: "slowImprovement", title: "Langsame Besserung: ein Punkt in zehn Wochen", entries: slowImprovement(), tests: [], context: ACHILLES_CTX },
  { key: "plateau", title: "Festgefahren: seit zehn Wochen unverändert bei 8 von 10", entries: plateau(), tests: [], context: ACHILLES_CTX },
  { key: "worseningPattern", title: "Schmerz wandert vom Abend hin zur Belastung", entries: worseningPattern(), tests: [], context: ACHILLES_CTX },
  { key: "easingPattern", title: "Schmerz zieht sich von der Belastung zurück", entries: easingPattern(), tests: [], context: ACHILLES_CTX },
  { key: "subtleShift", title: "Schmerzmuster verschiebt sich nur um einen halben Schritt", entries: subtlePatternShift(), tests: [], context: ACHILLES_CTX },
  { key: "impatient", title: "Der Ungeduldige: kehrt immer wieder zu früh zurück", entries: theImpatient(), tests: [], context: ACHILLES_CTX },
  { key: "realAchilles", title: "Sechzig Tage Achillessehne — realistischer Verlauf, nicht aus einer Formel", entries: ACHILLES_60_DAYS, tests: [], context: ACHILLES_CTX },
  { key: "crossTraining", title: "Vier Wochen Rad statt Laufen, dann zurück — gleiches Training, andere Sehne", entries: crossTraining(), tests: [], context: ACHILLES_CTX },
  { key: "weekendWarrior", title: "Der Wochenendkrieger: unter der Woche nichts, samstags alles", entries: weekendWarrior(), tests: [], context: KNEE_CTX },
  { key: "postOp", title: "Nach Operation: lange Pause, dann sehr vorsichtiger Aufbau", entries: postOp(), tests: [], context: KNEE_CTX },
  { key: "cascade", title: "Die Kaskade: Werte sehen brauchbar aus, Schere öffnet sich", entries: steadyRecovery(56), tests: wideningAsymmetry(), context: ACHILLES_CTX },
  { key: "openingScissors", title: "Noch im grünen Bereich, aber fallend: 98 auf 92 Prozent", entries: steadyRecovery(56), tests: wideningWhileStillGreen(), context: ACHILLES_CTX },
  { key: "erodingRef", title: "Auch die gesunde Seite verliert — der Quotient täuscht", entries: steadyRecovery(56), tests: erodingReference(), context: ACHILLES_CTX },
  { key: "staleTests", title: "Selbsttests seit zwei Monaten nicht wiederholt", entries: steadyRecovery(84), tests: symmetricTests(), context: ACHILLES_CTX },
  { key: "romSymmetric", title: "Beweglichkeit ausgeglichen — Schulter", entries: steadyRecovery(56), tests: symmetricRom(), context: SHOULDER_CTX },
  { key: "romMild", title: "Beweglichkeit, leichte Einschränkung — Schulter", entries: steadyRecovery(56), tests: mildRestrictionRom(), context: SHOULDER_CTX },
  { key: "romMarked", title: "Beweglichkeit, deutliche Einschränkung — Schulter", entries: steadyRecovery(56), tests: markedRestrictionRom(), context: SHOULDER_CTX },
  { key: "romWidening", title: "Beweglichkeit, die Schere öffnet sich — Schulter", entries: steadyRecovery(56), tests: wideningRom(), context: SHOULDER_CTX },
  { key: "romEroding", title: "Beide Schultern werden steifer — der Quotient täuscht", entries: steadyRecovery(56), tests: erodingReferenceRom(), context: SHOULDER_CTX },
  { key: "romStale", title: "Beweglichkeit seit zwei Monaten nicht gemessen — Schulter", entries: steadyRecovery(84), tests: symmetricRom(), context: SHOULDER_CTX },
  { key: "erodingRefCalf", title: "Auch die gesunde Seite verliert — als Fersenheber gemessen", entries: steadyRecovery(56), tests: erodingReferenceCalf(), context: FOOT_CTX },
  { key: "hopStale", title: "Sprungtests seit zwei Monaten nicht wiederholt — Patellasehne", entries: steadyRecovery(84), tests: symmetricHops(), context: PATELLA_CTX },
  { key: "hopSymmetric", title: "Sprungtest ausgeglichen — Patellasehne", entries: steadyRecovery(56), tests: symmetricHops(), context: PATELLA_CTX },
  { key: "hopMild", title: "Sprungtest, leichtes Defizit — Patellasehne", entries: steadyRecovery(56), tests: mildDeficitHops(), context: PATELLA_CTX },
  { key: "hopMarked", title: "Sprungtest, deutliches Defizit — Patellasehne", entries: steadyRecovery(56), tests: markedDeficitHops(), context: PATELLA_CTX },
  { key: "hopWidening", title: "Sprungtest, die Schere öffnet sich — Patellasehne", entries: steadyRecovery(56), tests: wideningHops(), context: PATELLA_CTX },
  { key: "improving", title: "Echte Besserung im Seitenvergleich", entries: steadyRecovery(56), tests: improvingAsymmetry(), context: ACHILLES_CTX },
  { key: "mildDeficit", title: "Stabiles leichtes Defizit im Seitenvergleich", entries: steadyRecovery(56), tests: mildDeficitTests(), context: ACHILLES_CTX },
  { key: "markedDeficit", title: "Stabiles deutliches Defizit im Seitenvergleich", entries: steadyRecovery(56), tests: markedDeficitTests(), context: ACHILLES_CTX },
  { key: "dropout", title: "Der Aussteiger: drei Wochen ohne Einträge, dann zurück", entries: theDropout(), tests: [], context: ACHILLES_CTX },
  { key: "interrupted", title: "Zwei Lücken mitten im Tagebuch", entries: interruptedDiary(), tests: [], context: ACHILLES_CTX },
  { key: "sparse", title: "Lückenhaftes Tagebuch", entries: sparse(), tests: [], context: ACHILLES_CTX },
  { key: "tooShort", title: "Gerade erst angefangen", entries: tooShort(), tests: [], context: ACHILLES_CTX },
];
