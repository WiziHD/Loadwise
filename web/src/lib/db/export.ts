import { supabaseServer } from "@/lib/supabase/server";
import type { ExportEpisode } from "@/lib/export/build";
import { listEntries } from "@/lib/db/entries";
import { listSelfTests } from "@/lib/db/self-tests";
import { listMeasurements } from "@/lib/db/measurements";
import { listMilestones } from "@/lib/db/milestones";
import type { EpisodeRow } from "./types";

/**
 * Alles einsammeln, was einem Konto gehört.
 *
 * ---------------------------------------------------------------------------
 * ARCHIVIERTE EPISODEN GEHÖREN DAZU. AUSDRÜCKLICH.
 *
 * `listEpisodes` nimmt einen Schalter und liefert entweder die offenen oder
 * die archivierten. Ein Export, der nur die offenen nähme, liesse genau die
 * Verläufe weg, die jemand abgeschlossen hat — also die vollständigen. Das
 * wäre ein Export, der beim Löschen des Kontos still die Vergangenheit
 * mitnimmt.
 *
 * Deshalb wird hier ohne Filter gelesen, und zwar nicht über `listEpisodes`:
 * Ein dritter Aufruf mit einem dritten Zustand wäre eine Erweiterung dieser
 * Funktion für einen Fall, den sonst niemand hat.
 *
 * ---------------------------------------------------------------------------
 * ÜBER DEN ANON KEY, WIE ALLES LESENDE.
 *
 * Die Zugriffsregeln entscheiden, was zurückkommt. Serverseitig zu sein ist
 * kein Grund, sie zu überspringen — ein Fehler in einer Abfrage exportierte
 * sonst ein fremdes Tagebuch und sähe dabei aus, als funktioniere er.
 *
 * Es gibt hier deshalb auch keinen `user_id`-Vergleich: Wäre er die Sicherung,
 * hinge sie an einer Zeile, die jemand beim Umbauen entfernen kann. Die
 * Zugriffsregel hängt an der Tabelle.
 * ---------------------------------------------------------------------------
 */
export async function collectExport(): Promise<ExportEpisode[]> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .order("created_at", { ascending: true });

  if (error !== null) throw new Error(`episodes: ${error.message}`);
  const episodes = (data ?? []) as EpisodeRow[];

  // Nacheinander und nicht alle auf einmal: Bei zwanzig Episoden wären das
  // achtzig gleichzeitige Abfragen, und die erste Person mit einem langen
  // Verlauf träfe auf ein Verbindungslimit statt auf ihren Export.
  const out: ExportEpisode[] = [];
  for (const e of episodes) {
    const [entries, tests, measurements, milestones] = await Promise.all([
      listEntries(e.id),
      listSelfTests(e.id),
      listMeasurements(e.id),
      listMilestones(e.id),
    ]);

    out.push({
      id: e.id,
      label: e.label,
      bodyRegion: e.body_region,
      profileKey: e.profile_key,
      side: e.side,
      startedOn: e.started_on,
      endedOn: e.ended_on,
      archivedAt: e.archived_at,
      createdAt: e.created_at,
      entries,
      tests,
      measurements,
      milestones,
    });
  }

  return out;
}
