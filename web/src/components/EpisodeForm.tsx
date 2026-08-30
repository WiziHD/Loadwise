"use client";

import { useState, useTransition } from "react";
import type { Locale } from "loadwise-engine";
import { updateEpisodeAction } from "@/app/actions/episodes";
import type { PickerProfile } from "@/lib/profile-view";
import type { Strings } from "@/i18n/dictionary";
import { field, primaryButton } from "@/lib/ui";

/**
 * Eine falsch angelegte Episode geradeziehen.
 *
 * ---------------------------------------------------------------------------
 * DIE WARNUNG STEHT VOR DEM KNOPF, NICHT DANACH.
 *
 * Ein Profilwechsel verändert VERGANGENE Urteile: andere Schwellen, andere
 * Selbsttests, anderer Gewebefaktor. Eine Warnung von letzter Woche kann grün
 * werden, ohne dass sich ein Tagebuchtag geändert hat.
 *
 * Sie erscheint deshalb in dem Moment, in dem im Wähler etwas anderes steht als
 * beim Öffnen — nicht als Dauertext, den man nach dem zweiten Besuch übersieht,
 * und nicht als Meldung hinterher. Wem hinterher gesagt wird, dass seine
 * Auswertung jetzt eine andere ist, liest das als Streich der App.
 *
 * Kontrolliert, aus demselben Grund wie beim Tageseintrag: React 19 setzt ein
 * unkontrolliertes Formular nach einer Formularaktion zurück — auch nach einer
 * FEHLGESCHLAGENEN. Die Korrektur wäre dann weg und der Hinweis daneben würde
 * erklären, was mit den Feldern nicht stimmt, die er gerade geleert hat.
 * ---------------------------------------------------------------------------
 */
export function EpisodeForm({
  locale,
  episodeId,
  profiles,
  current,
  strings,
  episodeStrings,
  errorStrings,
}: {
  locale: Locale;
  episodeId: string;
  profiles: PickerProfile[];
  current: { profileKey: string; side: string; startedOn: string; label: string };
  strings: Strings["edit"];
  episodeStrings: Strings["episode"];
  errorStrings: Strings["errors"];
}) {
  const [draft, setDraft] = useState(current);
  const [state, setState] = useState<
    "idle" | "saved" | "unknown-profile" | "future-start" | "invalid" | "failed"
  >("idle");
  const [pending, start] = useTransition();

  const set = (key: keyof typeof draft, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (state !== "idle") setState("idle");
  };

  // Nur wenn im Wähler etwas anderes steht als beim Öffnen.
  const profilWechselt = draft.profileKey !== current.profileKey;

  const MELDUNG: Record<Exclude<typeof state, "idle">, { text: string; tone: string; role: string }> = {
    saved: { text: strings.saved, tone: "var(--green)", role: "status" },
    "unknown-profile": { text: strings.unknownProfile, tone: "var(--amber)", role: "alert" },
    "future-start": { text: strings.futureStart, tone: "var(--amber)", role: "alert" },
    invalid: { text: strings.invalid, tone: "var(--amber)", role: "alert" },
    failed: { text: errorStrings.notSaved, tone: "var(--amber)", role: "alert" },
  };

  return (
    <form
      action={() => {
        start(async () => {
          try {
            const result = await updateEpisodeAction(locale, episodeId, {
              profileKey: draft.profileKey,
              side: draft.side,
              startedOn: draft.startedOn.trim() === "" ? null : draft.startedOn,
              label: draft.label.trim() === "" ? null : draft.label.trim(),
            });
            setState(result.ok ? "saved" : result.reason);
          } catch {
            // Eine abgebrochene Verbindung wirft, statt ein Ergebnis zu
            // liefern. Ohne dieses catch bliebe das Formular stumm stehen.
            setState("failed");
          }
        });
      }}
      style={{ display: "grid", gap: "1.25rem", maxWidth: "30rem" }}
    >
      <label style={{ display: "grid", gap: "0.35rem" }}>
        <span style={{ fontWeight: "var(--weight-semibold)" }}>{strings.profile}</span>
        <select
          name="profileKey"
          value={draft.profileKey}
          onChange={(e) => set("profileKey", e.target.value)}
          style={field}
        >
          {profiles.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label} — {p.bodyRegion}
              {p.researched ? "" : ` (${episodeStrings.mechanismOnly})`}
            </option>
          ))}
        </select>
      </label>

      {profilWechselt && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "0.75rem 0.85rem",
            border: "1px solid var(--amber)",
            borderRadius: "var(--radius-md)",
            color: "var(--amber)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.55,
          }}
        >
          {strings.profileChangeWarning}
        </p>
      )}

      <label style={{ display: "grid", gap: "0.35rem" }}>
        <span style={{ fontWeight: "var(--weight-semibold)" }}>{episodeStrings.side}</span>
        <select
          name="side"
          value={draft.side}
          onChange={(e) => set("side", e.target.value)}
          style={field}
        >
          <option value="left">{episodeStrings.sideLeft}</option>
          <option value="right">{episodeStrings.sideRight}</option>
          <option value="both">{episodeStrings.sideBoth}</option>
          <option value="n/a">{episodeStrings.sideNone}</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: "0.35rem" }}>
        <span style={{ fontWeight: "var(--weight-semibold)" }}>{episodeStrings.startedOn}</span>
        <input
          type="date"
          name="startedOn"
          value={draft.startedOn}
          onChange={(e) => set("startedOn", e.target.value)}
          style={field}
        />
        <span style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
          {episodeStrings.startedOnHint}
        </span>
      </label>

      <label style={{ display: "grid", gap: "0.35rem" }}>
        <span style={{ fontWeight: "var(--weight-semibold)" }}>{episodeStrings.label}</span>
        <input
          type="text"
          name="label"
          maxLength={120}
          value={draft.label}
          onChange={(e) => set("label", e.target.value)}
          style={field}
        />
      </label>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={pending}
          style={{ ...primaryButton, cursor: pending ? "wait" : "pointer" }}
        >
          {strings.save}
        </button>

        {state !== "idle" && (
          <span role={MELDUNG[state].role} style={{ color: MELDUNG[state].tone }}>
            {MELDUNG[state].text}
          </span>
        )}
      </div>
    </form>
  );
}

