/**
 * Turning a Profile into the plain shape a picker can render.
 *
 * Lives outside the component on purpose. It used to be exported from
 * ProfilePicker.tsx, which carries "use client" — so the server page that
 * called it crashed at request time with "attempted to call toPickerProfile()
 * from the server". Neither `tsc` nor `next build` caught it: the build
 * compiled and the route only failed when somebody opened it.
 *
 * A Profile carries functions and nested objects that would have to be
 * serialised across the boundary anyway. Flattening it here means the client
 * component receives strings and never imports the engine.
 */

import { profileByKey, profileFor } from "loadwise-engine";
import type { BodyRegion, Locale, Profile } from "loadwise-engine";

export type PickerProfile = {
  key: string;
  label: string;
  bodyRegion: string;
  limitations: string;
  researched: boolean;
};

/**
 * `researched` means at least one value in the profile rests on something
 * better than a reasoned guess. A profile of nothing but grade D is honest
 * about being mechanism only, and says so in the list rather than hiding it.
 */
export function toPickerProfile(profile: Profile, locale: Locale): PickerProfile {
  return {
    key: profile.key,
    label: profile.label[locale],
    bodyRegion: profile.bodyRegion,
    limitations: profile.limitations[locale],
    researched: Object.values(profile.evidence).some((e) => e.grade !== "D"),
  };
}

/**
 * The profile an episode is judged under, and whether it is the one that was
 * chosen.
 *
 * Same order as `evaluateEpisode`: a named profile first, the region's default
 * second.
 *
 * ---------------------------------------------------------------------------
 * `substituted` EXISTS BECAUSE THE FALLBACK WAS SILENT, AND SILENT IS WRONG.
 *
 * This function used to return the profile alone. When a stored `profile_key`
 * matched nothing — a profile renamed, retired, or split in two, all of which
 * happen while a diary is still being kept — it quietly handed back the
 * region's default and every page printed that name as if it had been chosen.
 *
 * Two knee profiles share a body region. Somebody tracking a patellar tendon
 * would have been shown "patellofemoral pain syndrome" in the heading, with no
 * mark of any kind, and would reasonably have concluded the app knew something.
 * The wrong thresholds are the smaller half of that: the larger half is being
 * told, by a health diary, that you have a condition you do not have.
 *
 * Returning a pair rather than the profile means a caller has to look at the
 * flag to get at the profile. `profileOf` used to be the easy call and the
 * wrong one; now there is only the one.
 * ---------------------------------------------------------------------------
 */
export type ResolvedProfile = {
  profile: Profile;
  /** True when the stored key matched nothing and the region's default stood in. */
  substituted: boolean;
};

export function profileOf(episode: {
  body_region: BodyRegion;
  profile_key: string | null;
}): ResolvedProfile {
  const named = episode.profile_key === null ? undefined : profileByKey(episode.profile_key);
  if (named !== undefined) return { profile: named, substituted: false };

  return {
    profile: profileFor(episode.body_region),
    // A key of null is an episode from before profiles were named, not a key
    // that broke. Marking those would put a warning on every old episode and
    // teach people to ignore it.
    substituted: episode.profile_key !== null,
  };
}

