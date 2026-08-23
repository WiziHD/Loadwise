"use client";

import { useState, useTransition } from "react";
import { ALL_ACTIVITY_KINDS, type ActivityKind, type Locale } from "loadwise-engine";
import { saveEntryAction } from "@/app/actions/episodes";

type Strings = {
  date: string;
  morning: string;
  morningHint: string;
  activity: string;
  duration: string;
  rpe: string;
  loadHint: string;
  loadIncomplete: string;
  symptom: string;
  timing: string;
  timingDuring: string;
  timingAfter: string;
  timingEvening: string;
  note: string;
  noteHint: string;
  saved: string;
};

const field: React.CSSProperties = {
  padding: "0.5rem 0.55rem",
  fontSize: "1rem",
  border: "1px solid var(--line)",
  borderRadius: "0.375rem",
  background: "var(--card)",
  color: "var(--fg)",
  width: "100%",
};

/**
 * The form that gets used more than everything else in the app combined.
 *
 * Only the morning score is required. A rest day is three taps: the date is
 * already today, the score is a number, save. Anybody who is meant to keep this
 * up for ninety days cannot be made to fill in a form every evening.
 *
 * `activityLabels` comes in from the server rather than being written here,
 * because activity names are app vocabulary and belong in the dictionary. The
 * list itself comes from the engine, so a new activity cannot go unoffered.
 */
export function EntryForm({
  locale,
  episodeId,
  today,
  strings,
  activityLabels,
  saveLabel,
}: {
  locale: Locale;
  episodeId: string;
  today: string;
  strings: Strings;
  activityLabels: Record<ActivityKind, string>;
  saveLabel: string;
}) {
  const [state, setState] = useState<"idle" | "saved" | "load-incomplete" | "failed">("idle");
  const [pending, start] = useTransition();

  return (
    <form
      action={(formData) => {
        start(async () => {
          const result = await saveEntryAction(locale, episodeId, formData);
          setState(result.ok ? "saved" : result.reason);
        });
      }}
      onChange={() => setState("idle")}
      style={{ display: "grid", gap: "1rem" }}
    >
      <div style={{ display: "grid", gap: "0.35rem", maxWidth: "12rem" }}>
        <label htmlFor="date" style={{ fontWeight: 600 }}>{strings.date}</label>
        <input id="date" name="date" type="date" defaultValue={today} required style={field} />
      </div>

      <div style={{ display: "grid", gap: "0.35rem", maxWidth: "12rem" }}>
        <label htmlFor="morningScore" style={{ fontWeight: 600 }}>{strings.morning}</label>
        <input
          id="morningScore"
          name="morningScore"
          type="number"
          min={0}
          max={10}
          step={1}
          required
          style={field}
        />
        <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{strings.morningHint}</span>
      </div>

      <fieldset style={{ border: "1px solid var(--line)", borderRadius: "0.5rem", padding: "0.9rem" }}>
        <legend style={{ padding: "0 0.4rem", fontWeight: 600, fontSize: "0.9rem" }}>
          {strings.activity}
        </legend>

        <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))" }}>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.85rem" }}>{strings.activity}</span>
            <select name="activityKind" defaultValue="" style={field}>
              <option value="">—</option>
              {ALL_ACTIVITY_KINDS.map((a) => (
                <option key={a} value={a}>{activityLabels[a]}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.85rem" }}>{strings.duration}</span>
            <input name="durationMin" type="number" min={1} step={1} style={field} />
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.85rem" }}>{strings.rpe}</span>
            <input name="rpe" type="number" min={1} max={10} step={1} style={field} />
          </label>
        </div>

        <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0.7rem 0 0" }}>
          {strings.loadHint}
        </p>
      </fieldset>

      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))", maxWidth: "26rem" }}>
        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{strings.symptom}</span>
          <input name="symptomScore" type="number" min={0} max={10} step={1} style={field} />
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{strings.timing}</span>
          <select name="symptomTiming" defaultValue="" style={field}>
            <option value="">—</option>
            <option value="during">{strings.timingDuring}</option>
            <option value="after">{strings.timingAfter}</option>
            <option value="evening">{strings.timingEvening}</option>
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gap: "0.35rem" }}>
        <label htmlFor="note" style={{ fontWeight: 600 }}>{strings.note}</label>
        <textarea id="note" name="note" rows={2} style={{ ...field, fontFamily: "inherit" }} />
        <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{strings.noteHint}</span>
      </div>

      {state === "load-incomplete" && (
        <p role="alert" style={{ margin: 0, color: "var(--amber)" }}>{strings.loadIncomplete}</p>
      )}
      {state === "saved" && (
        <p role="status" style={{ margin: 0, color: "var(--green)" }}>{strings.saved}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          padding: "0.6rem 1rem",
          fontSize: "1rem",
          borderRadius: "0.375rem",
          border: "1px solid var(--fg)",
          background: "var(--fg)",
          color: "var(--bg)",
          cursor: pending ? "wait" : "pointer",
          justifySelf: "start",
        }}
      >
        {pending ? "…" : saveLabel}
      </button>
    </form>
  );
}
