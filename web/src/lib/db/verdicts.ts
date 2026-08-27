import { evaluateEpisode, type Evaluation, type EpisodeContext } from "loadwise-engine";
import { supabaseServer } from "@/lib/supabase/server";
import { listEntries } from "@/lib/db/entries";
import { getEpisode } from "@/lib/db/episodes";
import { saveEvaluationRun } from "@/lib/db/verdict-write";
import { toEpisodeContext, toSelfTest, type SelfTestRow } from "@/lib/db/types";

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
    supabase.from("self_tests").select("*").eq("episode_id", episodeId),
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
