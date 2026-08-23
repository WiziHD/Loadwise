import { profileByKey, profileFor, type BodyRegion, type Profile, type Side } from "loadwise-engine";
import { supabaseServer } from "@/lib/supabase/server";
import type { EpisodeRow } from "./types";

export type NewEpisode = {
  bodyRegion: BodyRegion;
  profileKey: string;
  side: Side;
  startedOn: string | null;
  label: string | null;
};

/**
 * The profile an episode is judged under.
 *
 * Same order as `evaluateEpisode`: a named profile first, the region's default
 * second. Kept in one function so a page can show the person which profile
 * their episode actually uses — including when the key in the database no
 * longer matches any profile, which is what happens when one is renamed.
 */
export function profileOf(episode: Pick<EpisodeRow, "body_region" | "profile_key">): Profile {
  const named = episode.profile_key === null ? undefined : profileByKey(episode.profile_key);
  return named ?? profileFor(episode.body_region);
}

export async function listEpisodes(): Promise<EpisodeRow[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error !== null) throw new Error(error.message);
  return (data ?? []) as EpisodeRow[];
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
