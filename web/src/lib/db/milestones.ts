import type { Milestone, Threshold } from "loadwise-engine";
import { supabaseServer } from "@/lib/supabase/server";
import { toMilestone, type MilestoneRow } from "./types";

export type MilestoneInput = {
  label: string;
  locale: "de" | "en";
  createdOn: string;
  all: Threshold[];
  onDistinctDays: number;
  withinDays: number | null;
};

/**
 * Die Ziele einer Episode, in der Reihenfolge, in der sie entstanden sind.
 *
 * Nach `created_at` und nicht nach `created_on`: Zwei Ziele, am selben Tag
 * angelegt, hätten sonst keine bestimmte Reihenfolge — und »drei von fünf«
 * zählt zwar richtig, aber die Liste sähe bei jedem Aufruf anders aus.
 */
export async function listMilestones(episodeId: string): Promise<Milestone[]> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("milestones")
    .select("*")
    .eq("episode_id", episodeId)
    .order("created_at", { ascending: true });

  if (error !== null) throw new Error(error.message);
  return ((data ?? []) as MilestoneRow[]).map(toMilestone);
}

/**
 * Ein eigenes Ziel anlegen.
 *
 * ---------------------------------------------------------------------------
 * `origin` WIRD NICHT ÜBERGEBEN, UND DAS IST DIE SICHERUNG.
 *
 * Die Spalte hat einen Standardwert `'user'` und einen Aufzählungstyp mit
 * genau diesem einen Wert. Ihn hier zu setzen wäre die Stelle, an der später
 * jemand `origin: input.origin` schreibt — und damit die Konstruktion
 * aufmacht, die ein publiziertes Kriterium strukturell fernhält.
 *
 * Dieselbe Bauform wie `Protocol.enabled: false` im Motor: Nicht »wir tun es
 * nicht«, sondern »es ist nicht konstruierbar«.
 *
 * ---------------------------------------------------------------------------
 * DER ZIELTEXT GEHT UNVERÄNDERT HINEIN.
 *
 * Kein Filter, keine Normalisierung ausser dem Beschneiden von Leerzeichen an
 * den Rändern. Es sind die Worte eines Menschen über sein eigenes Ziel, und
 * die App hat daran nichts zu korrigieren.
 * ---------------------------------------------------------------------------
 */
export async function saveMilestone(episodeId: string, input: MilestoneInput): Promise<string> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("milestones")
    .insert({
      episode_id: episodeId,
      label_text: input.label.trim(),
      label_locale: input.locale,
      created_on: input.createdOn,
      thresholds: input.all,
      on_distinct_days: input.onDistinctDays,
      within_days: input.withinDays,
    })
    .select("id")
    .single();

  if (error !== null) throw new Error(`milestones: ${error.message}`);
  return (data as { id: string }).id;
}

/**
 * Ein Ziel selbst abhaken — oder das Häkchen zurücknehmen.
 *
 * ---------------------------------------------------------------------------
 * NUR FÜR ZIELE OHNE PRÜFBARE BEDINGUNG.
 *
 * `manual_tick_only_when_untracked` in 0001 setzt das durch: Ein Ziel mit
 * Bedingung wird vom Tagebuch beantwortet, und ein Häkchen daneben wäre eine
 * zweite, widersprechende Antwort auf dieselbe Frage. Welche gölte, müsste
 * dann jede lesende Stelle entscheiden.
 *
 * Die Bedingung ist eine CHECK-Bedingung und keine Prüfung in dieser Funktion,
 * und das ist Absicht: Sie greift auch für Wege, die hier vorbeigehen.
 *
 * Zurücknehmen ist ausdrücklich vorgesehen. Wer sich verklickt, muss das
 * rückgängig machen können — ein Häkchen, das bleibt, wäre eine Behauptung
 * über einen Menschen, die er selbst nicht mehr los wird.
 * ---------------------------------------------------------------------------
 */
export async function markMilestone(
  milestoneId: string,
  reachedOn: string | null,
): Promise<void> {
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("milestones")
    .update({ marked_reached_on: reachedOn })
    .eq("id", milestoneId);

  if (error !== null) throw new Error(`milestones: ${error.message}`);
}

/**
 * Ein Ziel löschen.
 *
 * Hier wird wirklich gelöscht, anders als bei einer Episode (E5). Der
 * Unterschied ist, was verloren geht: Eine archivierte Episode trägt Monate
 * erfasster Tage, ein zurückgezogenes Ziel trägt einen Satz, den derselbe
 * Mensch geschrieben hat. Ein Ziel, das jemand nicht mehr will, weiter
 * anzuzeigen — und sei es unter »Archiv« — hiesse, ihn an etwas zu erinnern,
 * das er ausdrücklich zurückgenommen hat.
 */
export async function deleteMilestone(milestoneId: string): Promise<void> {
  const supabase = await supabaseServer();

  const { error } = await supabase.from("milestones").delete().eq("id", milestoneId);
  if (error !== null) throw new Error(`milestones: ${error.message}`);
}
