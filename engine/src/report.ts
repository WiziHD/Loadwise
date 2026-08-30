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

import { currentFlags, evaluateEpisode, unnamedBlocking } from "./evaluate.js";
import { SCENARIOS, type Scenario } from "./fixtures.js";
import { DISCLAIMER, blockedText, evidenceText, verdictText } from "./wording.js";
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
/**
 * Die Zahlen hinter einem Urteil stehen jetzt in `wording.ts`.
 *
 * ---------------------------------------------------------------------------
 * HIER STANDEN SIE, UND NUR AUF DEUTSCH.
 *
 * Die App konnte sie deshalb nicht zeigen: Sie zu kopieren verbietet
 * `check:boundary`, und das zu Recht — in diesen Zeilen steckt Begründung, keine
 * Formatierung. Der Lastspitzen-Zweig entscheidet anhand von Urteilsuneinigkeit,
 * ob er seinen Nachsatz überhaupt sagt.
 *
 * Zweisprachig und exportiert liegen sie jetzt bei den übrigen Sätzen des
 * Motors, unter denselben drei Sperrlisten. Dieser Bericht ruft dieselbe
 * Funktion — sonst gäbe es sie zweimal, und die eine Fassung würde repariert
 * und die andere nicht.
 * ---------------------------------------------------------------------------
 */
export function describeFlag(flag: Flag, cfg: Config = DEFAULT_CONFIG): string {
  return (
    `[${MARK[flag.severity]}] ${flag.forDate}  ${RULE_NAME[flag.kind]} — ` +
    `${verdictText(flag.reason)} (${evidenceText(flag, cfg)})`
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
  {
    // Die Auswahl steht in evaluate.ts, nicht hier. Als die App ihren eigenen
    // Bericht bekam, brauchte sie dieselbe — und sie ein zweites Mal
    // hinzuschreiben hiesse, diesen Fund an einer zweiten Stelle wieder möglich
    // zu machen.
    const weitere = unnamedBlocking(result.overall, result.pending);
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
