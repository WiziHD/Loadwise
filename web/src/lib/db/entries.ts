import type { ActivityKind, Entry, SymptomTiming } from "loadwise-engine";
import { supabaseServer } from "@/lib/supabase/server";
import { toEntry, type EntryRow } from "./types";

export type EntryInput = {
  date: string;
  morningScore: number;
  activityKind: ActivityKind | null;
  durationMin: number | null;
  rpe: number | null;
  symptomScore: number | null;
  symptomTiming: SymptomTiming | null;
  note: string | null;
};

export async function listEntries(episodeId: string): Promise<Entry[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("episode_id", episodeId)
    .order("entry_date", { ascending: true });

  if (error !== null) throw new Error(error.message);
  return ((data ?? []) as EntryRow[]).map(toEntry);
}

export async function getEntry(episodeId: string, date: string): Promise<Entry | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("episode_id", episodeId)
    .eq("entry_date", date)
    .maybeSingle();

  if (error !== null) throw new Error(error.message);
  return data === null ? null : toEntry(data as EntryRow);
}

/**
 * Writes the entry for one day, replacing whatever was there.
 *
 * `upsert` on (episode_id, entry_date) rather than insert-or-update in two
 * steps. The unique constraint is the same rule the engine enforces — one
 * calendar day is one row — and letting the database decide avoids the race
 * where two tabs both find nothing and both insert.
 *
 * Editing yesterday is expected and allowed. People forget, and a diary that
 * only accepts today is a diary with holes in it.
 */
export async function saveEntry(episodeId: string, input: EntryInput): Promise<void> {
  const supabase = await supabaseServer();

  const { error } = await supabase.from("entries").upsert(
    {
      episode_id: episodeId,
      entry_date: input.date,
      morning_score: input.morningScore,
      activity_kind: input.activityKind,
      duration_min: input.durationMin,
      rpe: input.rpe,
      symptom_score: input.symptomScore,
      symptom_timing: input.symptomTiming,
      note: input.note,
    },
    { onConflict: "episode_id,entry_date" },
  );

  if (error !== null) throw new Error(error.message);
}
