"use client";

import { useState } from "react";
import type { PickerProfile } from "@/lib/profile-view";
import type { Strings } from "@/i18n/dictionary";
import { field } from "@/lib/ui";

/**
 * Choosing the profile, and being told at once what it cannot do.
 *
 * The limitations are shown BEFORE the episode is created rather than hidden in
 * a settings page afterwards. Every researched profile opens the same way: it
 * presumes a diagnosis somebody else made, and it can tell that diagnosis apart
 * from nothing. Somebody choosing "plantar fascia" deserves to know at that
 * moment that up to a fifth of plantar heel pain is a nerve rather than a
 * fascia, and that no diary can separate the two.
 */
export function ProfilePicker({
  profiles,
  strings,
}: {
  profiles: PickerProfile[];
  strings: Strings["episode"];
}) {
  const [chosen, setChosen] = useState<string>(profiles[0]?.key ?? "");
  const current = profiles.find((p) => p.key === chosen);

  return (
    <fieldset style={{ border: 0, padding: 0, margin: "0 0 1.5rem" }}>
      <legend style={{ fontWeight: "var(--weight-semibold)", padding: 0, marginBottom: "0.35rem" }}>
        {strings.chooseProfile}
      </legend>
      <p style={{ color: "var(--muted)", margin: "0 0 0.9rem", fontSize: "var(--text-sm)" }}>
        {strings.profileHint}
      </p>

      <select
        name="profileKey"
        value={chosen}
        onChange={(e) => setChosen(e.target.value)}
        style={{ ...field, maxWidth: "26rem" }}
      >
        {profiles.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label} — {p.bodyRegion}
            {p.researched ? "" : ` (${strings.mechanismOnly})`}
          </option>
        ))}
      </select>

      {current !== undefined && (
        <details open style={{ marginTop: "0.9rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)" }}>
            {strings.whatItCannotTell}
          </summary>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "var(--text-sm)",
              lineHeight: 1.55,
              margin: "0.5rem 0 0",
              paddingLeft: "0.9rem",
              borderLeft: "2px solid var(--line)",
            }}
          >
            {current.limitations}
          </p>
        </details>
      )}
    </fieldset>
  );
}
