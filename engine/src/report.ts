/**
 * Human-readable rendering of the engine's verdicts.
 *
 * Kept separate from the printing so the exact same text can be compared
 * against a stored golden file. Any change in behaviour then shows up as a
 * text diff instead of slipping through unnoticed — which matters most when
 * we start turning threshold dials.
 *
 * The sentence comes first and the numbers second, and the sentence comes from
 * wording.ts rather than from here. An audit found this file rendering
 * severity and figures but never `flag.reason`, so `rising-fast` and
 * `detraining` — a week that climbed and a week that collapsed — came out as
 * the same line with a different number in it. The reason IS the verdict; the
 * numbers are only its evidence.
 */

import { currentFlags, evaluateEpisode } from "./evaluate.js";
import { SCENARIOS, type Scenario } from "./fixtures.js";
import { DISCLAIMER, blockedText, verdictText } from "./wording.js";
import { DEFAULT_CONFIG, type Config, type Flag, type Overall, type Pending, type Severity } from "./types.js";

const MARK: Record<Severity, string> = { green: "OK  ", amber: "ACHT", red: "STOP" };

const RULE_NAME: Record<Flag["kind"], string> = {
  response_24h: "24-Stunden-Reaktion",
  load_spike: "Belastungsverlauf",
  asymmetry: "Seitenvergleich",
  baseline_drift: "Ausgangswert",
  pain_pattern: "Schmerzmuster",
  stagnation: "Langzeitverlauf",
  load_spread: "Lastverteilung",
};

const line = (char = "-"): string => char.repeat(76);

/** Which verdict band a load ratio falls into — the thing the two figures can disagree about. */
function bandOf(ratio: number, cfg: Config): string {
  if (ratio > cfg.spike.redAbove) return "sharp";
  if (ratio > cfg.spike.amberAbove) return "rising";
  if (ratio < cfg.spike.amberBelow) return "falling";
  return "steady";
}

/** The numbers behind a verdict. Evidence for the sentence, never a substitute. */
function evidence(flag: Flag, cfg: Config = DEFAULT_CONFIG): string {
  switch (flag.kind) {
    case "response_24h": {
      const d = flag.detail;
      const follow = d.followUpMorning === null ? "" : `, 48 h: ${d.followUpMorning}`;
      return `Last ${Math.round(d.load)}, Ausgangswert ${d.baseline}, am Morgen danach ${d.nextMorning}${follow}`;
    }
    case "load_spike": {
      const d = flag.detail;
      const ratio = d.ratio === null ? "nicht berechenbar" : d.ratio.toFixed(2);
      const base = `Woche ${Math.round(d.acute)} gegen Norm ${Math.round(d.chronic)}, Verhältnis ${ratio}`;

      // When the tissue-weighted picture and the raw one disagree, saying only
      // the weighted number reads as false to the person who lived the week.
      // Somebody who swapped running for cycling trained exactly as much; what
      // changed is which tissue carried it.
      //
      // The trigger is DISAGREEMENT ABOUT THE VERDICT, not an arbitrary gap.
      // The first realistic sixty-day course this engine read had a weighted
      // ratio of 1.41 against a raw one of 1.24 — amber versus green, the exact
      // case the split exists to explain — and an earlier fixed gap of 0.3
      // stayed silent through it.
      if (d.ratio !== null && d.rawRatio !== null && bandOf(d.ratio, cfg) !== bandOf(d.rawRatio, cfg)) {
        const total =
          d.rawRatio >= 0.85 && d.rawRatio <= 1.15
            ? "dein Gesamttraining ist dabei praktisch gleich geblieben"
            : `dein Gesamttraining hat sich dabei um Faktor ${d.rawRatio.toFixed(2)} verändert`;
        return `${base} — ${total}; der Unterschied liegt in der Wahl der Aktivität`;
      }
      return base;
    }
    case "asymmetry": {
      const d = flag.detail;
      const hist = d.history.map((v) => `${v.toFixed(0)}%`).join(" → ");
      if (d.referenceDeclining) {
        const ref = d.uninvolvedHistory.map((v) => v.toFixed(0)).join(" → ");
        return `${d.type}: ${hist}, Vergleichsseite ${ref}`;
      }
      return `${d.type}: ${hist}`;
    }
    case "baseline_drift": {
      const d = flag.detail;
      const sign = d.change > 0 ? "+" : "";
      return `vorletzte 14 Tage ${d.previous}, letzte 14 Tage ${d.recent} (${sign}${d.change})`;
    }
    case "pain_pattern": {
      const d = flag.detail;
      const sign = d.change > 0 ? "+" : "";
      return `Lage ${d.previous.toFixed(2)} → ${d.recent.toFixed(2)} (${sign}${d.change.toFixed(2)}) auf der Skala Abend 1 / danach 2 / während 3`;
    }
    case "stagnation": {
      const d = flag.detail;
      // Both figures are medians over a window, and the line has to say so.
      //
      // It used to read "zu Beginn 3, jetzt 1". On the first outside course
      // this engine read, the person started at 6 out of 10 and was told their
      // start was a 3 — because the first fortnight already contained the fast
      // early improvement almost everybody gets, and the median swallowed it.
      //
      // The RULE is right to work that way: excluding that first drop is what
      // lets it ask the real question, whether things moved after it. Somebody
      // who fell 6 → 3 and then sat at 3 for ten weeks has stagnated, and this
      // window is what makes that visible. Only the label was lying.
      const w = cfg.stagnation.windowDays;
      return `erste ${w} Tage ${d.startBaseline}, letzte ${w} Tage ${d.currentBaseline}, nach ${d.weeks} Wochen`;
    }
    case "load_spread": {
      const d = flag.detail;
      if (d.trainingDays === 0) return "keine Belastung erfasst";
      if (d.trainingDays === 1) return "die gesamte Wochenlast lag auf einem einzigen Tag";
      // The dispersion index is never shown as a number. "Effective training
      // days" is a quantity a person can picture; 1.31 on a scale is not.
      return (
        `effektiv ${d.effectiveDays.toFixed(1).replace(".", ",")} Trainingstage ` +
        `bei ${d.trainingDays} Einheiten, schwerster Tag ${Math.round(d.heaviestShare * 100)} % der Wochenlast`
      );
    }
  }
}

export function describeFlag(flag: Flag, cfg: Config = DEFAULT_CONFIG): string {
  return (
    `[${MARK[flag.severity]}] ${flag.forDate}  ${RULE_NAME[flag.kind]} — ` +
    `${verdictText(flag.reason)} (${evidence(flag, cfg)})`
  );
}

export function describePending(p: Pending): string {
  const scope =
    p.affectedDays === undefined
      ? ""
      : ` — betrifft ${p.affectedDays} von ${p.expectedDays} erwarteten Tagen`;
  return `${RULE_NAME[p.kind]}: ${blockedText(p.reason)}${scope}`;
}

/**
 * The summary line. Three states, never two.
 *
 * "nicht genug beurteilt" must read as its own answer, not as a shade of green.
 * An audit found this line printing "green" for episodes where the engine had
 * judged almost nothing.
 */
export function describeOverall(overall: Overall): string {
  switch (overall.status) {
    case "judged":
      return overall.severity;
    case "insufficient":
      return "nicht genug beurteilt";
    case "no-data":
      return "noch keine Aussage möglich";
  }
}

export function reportScenario(scenario: Scenario): string {
  const { entries, tests, context } = scenario;
  const result = evaluateEpisode({ entries, tests, context });
  const out: string[] = [];

  out.push("");
  out.push(line("="));
  out.push(scenario.title);
  out.push(line("="));
  out.push(
    `Einträge: ${entries.length}   Selbsttests: ${tests.length}   ` +
      `Profil: ${result.profile.label.de} (${result.profile.version})`,
  );

  if (result.problems.length > 0) {
    out.push(`EINGABEFEHLER: ${result.problems.length} — Urteile unten sind nicht belastbar`);
    for (const p of result.problems.slice(0, 3)) {
      out.push(`  ! ${p.date ?? "-"} ${p.field}: ${p.message}`);
    }
  }

  const counts: Record<Severity, number> = { green: 0, amber: 0, red: 0 };
  for (const f of result.flags) counts[f.severity]++;

  // Which findings still describe the present.
  //
  // Without this the report contradicted itself in the most damaging way
  // available to it: "Gesamtbild: green" printed directly above four STOP
  // lines. Both statements were true — the person had four bad days in week
  // five and had fully recovered by week eight — but a reader cannot be
  // expected to work that out, and a report that appears to argue with itself
  // costs more trust than the finding was worth.
  const current = new Set(currentFlags(result.flags, result.config, result.lastDate));
  const tally = `grün ${counts.green}, gelb ${counts.amber}, rot ${counts.red}`;
  const earlier = result.flags.filter((f) => f.severity !== "green" && !current.has(f));

  out.push(
    earlier.length === 0
      ? `Gesamtbild: ${describeOverall(result.overall)}   (${tally})`
      : `Gesamtbild: ${describeOverall(result.overall)}   (aktueller Stand — im ganzen Verlauf: ${tally})`,
  );
  out.push(
    `Beurteilt: ${result.coverage.judgedDays} von ${result.coverage.judgedDays + result.coverage.blockedDays} erwarteten Tagen, ` +
      `${result.coverage.rulesReporting} von ${result.coverage.rulesTotal} Regeln haben gesprochen`,
  );

  if (result.pending.length > 0) {
    out.push(line());
    out.push("Noch nicht beurteilbar:");
    for (const p of result.pending) out.push(`  · ${describePending(p)}`);
  }

  // ---------------------------------------------------------------------
  // Gründe, die keiner Regel gehören.
  //
  // `pending` sammelt, was eine EINZELNE Regel nicht beurteilen konnte, und
  // trägt deshalb den Namen der Regel. Es gibt aber Gründe, die keine Regel
  // haben: dass an den betrachteten Tagen ein Schmerzmittel genommen wurde,
  // gehört zu keiner der sieben und hält trotzdem die Entwarnung zurück.
  //
  // Bis hierher standen die ausschliesslich in `overall.blocking` — gesetzt und
  // nie gezeigt. Ein Grund, der den Bildschirm nicht erreicht, ist für die
  // lesende Person kein Grund, sondern ein Urteil ohne Begründung.
  // ---------------------------------------------------------------------
  if (result.overall.status === "insufficient") {
    const schonGenannt = new Set(result.pending.map((p) => p.reason));
    const weitere = result.overall.blocking.filter((r) => !schonGenannt.has(r));
    if (weitere.length > 0) {
      if (result.pending.length === 0) {
        out.push(line());
        out.push("Noch nicht beurteilbar:");
      }
      for (const reason of weitere) out.push(`  · ${blockedText(reason)}`);
    }
  }

  const notable = result.flags.filter((f) => f.severity !== "green" && current.has(f));
  if (notable.length > 0) {
    out.push(line());
    out.push("Auffälligkeiten:");
    for (const f of notable) out.push("  " + describeFlag(f, result.config));
  } else if (result.flags.length > 0) {
    out.push(line());
    out.push("Keine Auffälligkeiten. Beispiel eines unauffälligen Tages:");
    out.push("  " + describeFlag(result.flags[0]!, result.config));
  }

  // Kept, never dropped. A finding that happened, happened — it just stops
  // being an answer to "how are things going".
  if (earlier.length > 0) {
    out.push(line());
    out.push("Früher im Verlauf, inzwischen zurückliegend:");
    for (const f of earlier) out.push("  " + describeFlag(f, result.config));
  }

  return out.join("\n");
}

export function buildReport(): string {
  const parts = SCENARIOS.map(reportScenario);
  parts.push("");
  parts.push(line("="));
  parts.push(DISCLAIMER.de);
  parts.push(line("="));
  return parts.join("\n");
}
