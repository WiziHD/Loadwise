/**
 * Does the suite actually test anything?
 *
 * ---------------------------------------------------------------------------
 * 203 passing tests and complete branch coverage on every rule are statements
 * about EXECUTION. They say each line ran. They say nothing about whether the
 * assertions would have noticed if a line had been wrong.
 *
 * This harness answers the harder question directly: break one threshold on
 * purpose, then ask whether the oracle catches it.
 *
 *   KILLED    the mutation broke an expectation — the suite constrains this dial
 *   SURVIVED  every expectation still passed — the suite does NOT constrain it
 *
 * A survivor is not necessarily a bug. It usually means the scenario library
 * has no case that depends on that number, which is the same finding the
 * calibration run reports as "TOT" and the same reason a dead branch could hide
 * in this engine four separate times. Either the dial does not matter, or the
 * library is missing the case that would prove it does.
 *
 * Run with: npm run mutate
 * ---------------------------------------------------------------------------
 */

import { assertConfig } from "./config.js";
import { DIALS } from "./dials.js";
import { violations } from "./expectations.js";
import { DEFAULT_CONFIG, type Config } from "./types.js";

interface MutationResult {
  key: string;
  tried: number;
  killed: number;
  survivors: number[];
}

function mutate(dialIndex: number): MutationResult {
  const dial = DIALS[dialIndex]!;
  const current = dial.get(DEFAULT_CONFIG);
  const survivors: number[] = [];
  let tried = 0;
  let killed = 0;

  for (const value of dial.values) {
    if (value === current) continue;

    const config: Config = structuredClone(DEFAULT_CONFIG);
    dial.set(config, value);

    // A configuration the guard rejects is not a mutation — it is a value the
    // engine already refuses to run on, which is the guard doing its job.
    try {
      assertConfig(config);
    } catch {
      continue;
    }

    tried++;
    if (violations(config).length > 0) killed++;
    else survivors.push(value);
  }

  return { key: dial.key, tried, killed, survivors };
}

export function runMutation(): string {
  const out: string[] = [];
  const line = (c = "-"): string => c.repeat(84);

  out.push(line("="));
  out.push("MUTATIONSTEST — merkt die Suite, wenn eine Schwelle kaputt ist?");
  out.push(line("="));
  out.push("Jede Schwelle wird absichtlich verstellt. Dann wird gefragt, ob das Orakel");
  out.push("es bemerkt. Was überlebt, wird von den Tests nicht wirklich abgesichert.");
  out.push(line());
  out.push(
    "Schwelle".padEnd(30) +
      "Mutationen".padStart(11) +
      "Erkannt".padStart(9) +
      "Überlebt".padStart(10) +
      "  Bewertung",
  );
  out.push(line());

  const results = DIALS.map((_, i) => mutate(i));

  for (const r of results) {
    const rate = r.tried === 0 ? 0 : r.killed / r.tried;
    const verdict =
      r.tried === 0
        ? "—        keine gültige Mutation im Bereich"
        : rate === 1
          ? "FEST     jede Verstellung wird erkannt"
          : rate >= 0.5
            ? "TEILWEISE manche Verstellungen bleiben unbemerkt"
            : "LOSE     die meisten Verstellungen bleiben unbemerkt";

    out.push(
      r.key.padEnd(30) +
        String(r.tried).padStart(11) +
        String(r.killed).padStart(9) +
        String(r.survivors.length).padStart(10) +
        "  " +
        verdict,
    );
  }

  out.push(line("="));

  const loose = results.filter((r) => r.tried > 0 && r.killed / r.tried < 0.5);
  const total = results.reduce((a, r) => a + r.tried, 0);
  const caught = results.reduce((a, r) => a + r.killed, 0);

  out.push("");
  out.push(`Insgesamt ${caught} von ${total} Mutationen erkannt (${Math.round((caught / total) * 100)} %).`);

  if (loose.length > 0) {
    out.push("");
    out.push("Schwach abgesichert — hier fehlt der Szenario-Bibliothek der Fall,");
    out.push("der von diesem Wert tatsächlich abhängt:");
    for (const r of loose) {
      out.push(`  · ${r.key} — überlebt bei ${r.survivors.slice(0, 6).join(", ")}`);
    }
  } else {
    out.push("Jede Schwelle ist von mindestens der Hälfte ihrer Mutationen abgesichert.");
  }

  out.push("");
  out.push(line());
  out.push("WARUM DIESE ZAHL NICHT EINFACH STEIGEN DARF");
  out.push(line());
  out.push("Fast alle Überlebenden sind Grenzwerte: Kein Szenario liegt nahe an einer");
  out.push("Schwelle. Die Woche mit dreifachem Umfang hat ein Verhältnis von 7 und ist");
  out.push("damit bei jeder Schwelle zwischen 1.35 und 2.2 rot — bewiesen ist also, dass");
  out.push("der Motor eindeutige Fälle richtig einordnet, nicht dass er die Linie an der");
  out.push("richtigen Stelle zieht.");
  out.push("");
  out.push("Diese Zahl ließe sich trivial anheben: ein Szenario mit Verhältnis 1.55 und");
  out.push("die Erwartung »muss rot sein«. Damit wäre die Schwelle in den Test einbetoniert,");
  out.push("der Test bewiese nur noch, dass der Code zu sich selbst passt, und die Schwelle");
  out.push("ließe sich nie wieder ändern, ohne den Test mitzuändern. Genau die Zirkularität,");
  out.push("die der Prüflauf als größte Schwäche benannt hat — nur besser getarnt.");
  out.push("");
  out.push("Ehrlich bleibt: Der Prozentsatz misst, wie viel vom Schwellenraum durch WISSEN");
  out.push("festgelegt ist statt durch eine Setzung. Er steigt legitim erst mit den");
  out.push("verletzungsspezifischen Profilen und echten Verläufen — siehe PROTOKOLLE.md.");
  out.push("");
  out.push(line("="));
  return out.join("\n");
}

console.log(runMutation());
