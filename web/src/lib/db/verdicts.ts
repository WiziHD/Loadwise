import { evaluateEpisode, type Evaluation, type EpisodeContext } from "loadwise-engine";
import { supabaseServer } from "@/lib/supabase/server";
import { listEntries } from "@/lib/db/entries";
import { getEpisode } from "@/lib/db/episodes";
import { saveEvaluationRun } from "@/lib/db/verdict-write";
import {
  toEpisodeContext,
  toSelfTest,
  toStoredRun,
  type EvaluationRow,
  type FlagRow,
  type SelfTestRow,
  type StoredRun,
} from "@/lib/db/types";

/**
 * Einen Auswertungslauf ausführen und ablegen.
 *
 * ---------------------------------------------------------------------------
 * WER WAS LIEST, UND WARUM DAS DIE GANZE SICHERHEIT DIESER DATEI IST.
 *
 * Gelesen wird über `supabaseServer()`, also über den anon key, also durch die
 * Zugriffsregeln. Gehört die Episode jemand anderem, kommt hier **nichts**
 * zurück — und dann läuft der Motor gar nicht erst.
 *
 * Geschrieben wird über `saveEvaluationRun`, und das ist die einzige Stelle mit
 * dem Service-Role-Schlüssel. Was dort hineingeht, hat dieser Server aus Daten
 * berechnet, die er selbst gelesen hat. **Von aussen kommt nur eine
 * Episodenkennung.** Ein Aufrufer kann sagen »werte X aus«, nie »trag grün
 * ein«.
 *
 * Diese Trennung ist der Grund, warum der Schlüssel überhaupt wiederkommen
 * durfte. Siehe den Kopf von `verdict-write.ts` — dort steht auch, warum eine
 * Postgres-Funktion mit `security definer` hier NICHT hilft.
 * ---------------------------------------------------------------------------
 */
export async function evaluateAndStore(episodeId: string): Promise<string | null> {
  const episode = await getEpisode(episodeId);
  // Kein Unterschied zwischen »gibt es nicht« und »gehört jemand anderem« —
  // dieselbe Ununterscheidbarkeit wie beim Lesen einer Episode, siehe
  // SICHERHEIT.md Punkt 3. Wer Kennungen durchprobiert, lernt hier nichts.
  if (episode === null) return null;

  const evaluation = await evaluate(episodeId, toEpisodeContext(episode));
  return await saveEvaluationRun(episodeId, evaluation);
}

/**
 * Alles einsammeln, was in ein Urteil eingeht, und den Motor laufen lassen.
 *
 * Liest ausschliesslich über den anon key. Nicht exportiert: Solange nur
 * `evaluateAndStore` das braucht, wäre ein zweiter Ausgang eine Tür, durch die
 * jemand den Motor laufen lässt, ohne das Ergebnis abzulegen.
 */
async function evaluate(episodeId: string, context: EpisodeContext): Promise<Evaluation> {
  const supabase = await supabaseServer();

  const [entries, { data: testRows, error }] = await Promise.all([
    listEntries(episodeId),
    // Sortiert, und das ist keine Kosmetik: `rules/asymmetry.ts` sortiert
    // stabil nach Datum und nimmt die letzte Messung. Bei gleichem Datum
    // entscheidet damit die Reihenfolge, in der die Abfrage geliefert hat —
    // ohne `order` also nichts. 0009 macht Doubletten unmöglich; das hier
    // deckt den Weg ab, auf dem sie trotzdem entstehen (Import, ein anderer
    // Client, eine Datenbank ohne 0009).
    supabase
      .from("self_tests")
      .select("*")
      .eq("episode_id", episodeId)
      .order("test_date", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  if (error !== null) throw new Error(`self_tests: ${error.message}`);

  return evaluateEpisode({
    entries,
    // Heute schreibt nichts in `self_tests` — es gibt keine Oberfläche dafür.
    // Trotzdem gelesen: Am Tag, an dem es sie gibt, wertet der Motor sie
    // aus, statt sie stillschweigend zu übergehen. Genau diese Sorte
    // »geschrieben und nie gelesen« hat dieses Projekt schon mehrfach
    // getroffen, und eine Abfrage kostet weniger als der Fund.
    tests: ((testRows ?? []) as SelfTestRow[]).map(toSelfTest),
    context,
  });
}

/**
 * Der jüngste Auswertungslauf einer Episode, samt seiner Flags.
 *
 * ---------------------------------------------------------------------------
 * DIE FLAGS KOMMEN ÜBER `evaluation_id`, NICHT ÜBER DIE EPISODE.
 *
 * Das ist der Grund, aus dem es die Spalte gibt. Über `episode_id` zu lesen
 * lieferte die Flags ALLER Läufe durcheinander — bei täglicher Erfassung nach
 * drei Monaten hundertfach dieselbe Auffälligkeit.
 *
 * Und es ist zugleich die Sicherung aus E12: Ein Lauf, dessen Flags geschrieben
 * wurden und dessen Auswertung nicht, hat keine Zeile in `evaluations` — diese
 * Abfrage findet ihn also gar nicht erst, und seine Flags bleiben unsichtbar
 * statt sich unter die eines anderen Laufs zu mischen.
 *
 * Gelesen wird über den anon key. Gehört die Episode jemand anderem, kommt
 * nichts zurück.
 * ---------------------------------------------------------------------------
 */
export type LatestRun =
  /** Es gab noch keinen Lauf. */
  | { kind: "none" }
  /**
   * Es gab einen, und diese Fassung kann ihn nicht lesen.
   *
   * Nicht dasselbe wie »keiner« — und das war zuerst dieselbe Antwort. Ein
   * gespeicherter Lauf, den die App nicht mehr versteht, als »noch keine
   * Auswertung« zu zeigen wäre eine Falschaussage über die eigenen Daten,
   * ausgerechnet gegenüber jemandem, der seit Wochen einträgt.
   */
  | { kind: "unreadable"; id: string }
  | { kind: "run"; run: StoredRun };

export async function latestRun(episodeId: string): Promise<LatestRun> {
  const supabase = await supabaseServer();

  const { data: row, error } = await supabase
    .from("evaluations")
    .select("*")
    .eq("episode_id", episodeId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error !== null) throw new Error(`evaluations: ${error.message}`);
  if (row === null) return { kind: "none" };

  const lauf = row as EvaluationRow;

  const { data: flagRows, error: flagError } = await supabase
    .from("flags")
    .select("*")
    .eq("evaluation_id", lauf.id)
    .order("for_date", { ascending: true });
  if (flagError !== null) throw new Error(`flags: ${flagError.message}`);

  const run = toStoredRun(lauf, (flagRows ?? []) as FlagRow[]);
  return run === null ? { kind: "unreadable", id: lauf.id } : { kind: "run", run };
}
