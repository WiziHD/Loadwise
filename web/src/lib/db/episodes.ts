import type { BodyRegion, Side } from "loadwise-engine";
import { supabaseServer } from "@/lib/supabase/server";
import type { EpisodeRow, ProfileChangeRow } from "./types";

// Weiterhier von hier exportiert, damit die Seiten sich nicht umgewöhnen müssen.
export { profileOf } from "@/lib/profile-view";

export type NewEpisode = {
  bodyRegion: BodyRegion;
  profileKey: string;
  side: Side;
  startedOn: string | null;
  label: string | null;
};

/**
 * Was an einer Episode korrigierbar ist.
 *
 * `bodyRegion` steht bewusst NICHT dabei: Sie folgt aus dem Profil. Zwei
 * Profile teilen sich `knee`, und zwei Felder, die sich widersprechen können,
 * werden sich irgendwann widersprechen.
 */
export type EpisodePatchInput = {
  profileKey: string;
  bodyRegion: BodyRegion;
  side: Side;
  startedOn: string | null;
  label: string | null;
};

/**
 * Die Episoden einer Person.
 *
 * `archived` ist ein Pflichtparameter und hat keinen Standardwert. Ein
 * Standardwert hiesse, dass ein neuer Aufrufer sich nicht entscheiden muss —
 * und der wahrscheinlichste Fehler wäre dann, das Archiv versehentlich
 * mitzuzeigen, also genau das rückgängig zu machen, wofür es da ist.
 */
export async function listEpisodes(archived: boolean): Promise<EpisodeRow[]> {
  const supabase = await supabaseServer();
  const query = supabase.from("episodes").select("*");

  const { data, error } = await (archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null)
  ).order("created_at", { ascending: false });

  if (error !== null) throw new Error(error.message);
  return (data ?? []) as EpisodeRow[];
}

/** Wie viele Episoden im Archiv liegen — für den Weg dorthin. */
export async function countArchived(): Promise<number> {
  const supabase = await supabaseServer();
  const { count, error } = await supabase
    .from("episodes")
    .select("id", { count: "exact", head: true })
    .not("archived_at", "is", null);

  if (error !== null) throw new Error(error.message);
  return count ?? 0;
}

export async function getEpisode(id: string): Promise<EpisodeRow | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("episodes").select("*").eq("id", id).maybeSingle();

  // Row Level Security turns "somebody else's episode" into "no rows" rather
  // than into an error, which is the behaviour we want: the caller renders a
  // not-found page and learns nothing about whether the id exists.
  if (error !== null) throw new Error(error.message);
  return (data as EpisodeRow | null) ?? null;
}

export async function createEpisode(input: NewEpisode): Promise<{ id: string }> {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user === null) throw new Error("not-signed-in");

  const { data, error } = await supabase
    .from("episodes")
    .insert({
      user_id: auth.user.id,
      body_region: input.bodyRegion,
      profile_key: input.profileKey,
      side: input.side,
      started_on: input.startedOn,
      label: input.label,
    })
    .select("id")
    .single();

  if (error !== null) throw new Error(error.message);
  return data as { id: string };
}

/**
 * Eine Episode korrigieren.
 *
 * ---------------------------------------------------------------------------
 * WAS HIER NICHT PASSIERT: DEN PROFILWECHSEL PROTOKOLLIEREN.
 *
 * Das tut ein Trigger in der Datenbank, in derselben Transaktion wie dieses
 * UPDATE. Täte es diese Funktion, wären es zwei Schreibvorgänge über eine
 * Schnittstelle ohne Transaktion — und ein Fehlschlag dazwischen ergäbe
 * entweder einen Profilwechsel ohne Erklärung oder eine Erklärung für einen
 * Wechsel, der nie stattfand. Siehe 0006_episode_edit.sql.
 * ---------------------------------------------------------------------------
 */
export async function updateEpisode(id: string, patch: EpisodePatchInput): Promise<void> {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("episodes")
    .update({
      profile_key: patch.profileKey,
      body_region: patch.bodyRegion,
      side: patch.side,
      started_on: patch.startedOn,
      label: patch.label,
    })
    .eq("id", id);

  if (error !== null) throw new Error(error.message);
}

/**
 * Ins Archiv und zurück.
 *
 * Ein Zeitstempel statt eines Wahrheitswerts: Wann etwas weggeräumt wurde, ist
 * eine Auskunft; dass es weggeräumt ist, ist daraus ableitbar. Umgekehrt nicht.
 */
export async function setArchived(id: string, archived: boolean): Promise<void> {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("episodes")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);

  if (error !== null) throw new Error(error.message);
}

/**
 * Die Profilwechsel einer Episode, neueste zuerst.
 *
 * Damit ein verändertes Urteil eine sichtbare Ursache hat. Ohne diese Liste
 * wäre die einzige Spur eines Wechsels der veränderte Bericht selbst — und
 * dann sähe es so aus, als hätte sich der Verlauf geändert statt der Massstab.
 */
export async function profileChangesOf(episodeId: string): Promise<ProfileChangeRow[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("episode_profile_changes")
    .select("*")
    .eq("episode_id", episodeId)
    .order("changed_at", { ascending: false });

  if (error !== null) throw new Error(error.message);
  return (data ?? []) as ProfileChangeRow[];
}
