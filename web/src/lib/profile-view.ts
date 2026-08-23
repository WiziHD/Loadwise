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

import type { Locale, Profile } from "loadwise-engine";

export type PickerProfile = {
  key: string;
  label: string;
  bodyRegion: string;
  limitations: string;
  researched: boolean;
  tests: string[];
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
    tests: [...profile.tests],
  };
}
