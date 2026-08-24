"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ALL_ACTIVITY_KINDS,
  type ActivityKind,
  type Entry,
  type Locale,
  type SymptomTiming,
} from "loadwise-engine";
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
  symptomIncomplete: string;
  futureDate: string;
  invalid: string;
  symptom: string;
  timing: string;
  timingDuring: string;
  timingAfter: string;
  timingEvening: string;
  note: string;
  noteHint: string;
  saved: string;
  replacing: string;
};

/** Exactly the fields of a diary day, as strings — because that is what a form holds. */
type Draft = {
  date: string;
  morningScore: string;
  activityKind: string;
  durationMin: string;
  rpe: string;
  symptomScore: string;
  symptomTiming: string;
  note: string;
};

const BLANK = {
  morningScore: "",
  activityKind: "",
  durationMin: "",
  rpe: "",
  symptomScore: "",
  symptomTiming: "",
  note: "",
} as const;

const asText = (n: number | null | undefined): string =>
  n === null || n === undefined ? "" : String(n);

const asNumber = (text: string): number | null => (text.trim() === "" ? null : Number(text));

function draftFor(entry: Entry | undefined, date: string): Draft {
  if (entry === undefined) return { date, ...BLANK };
  return {
    date,
    morningScore: asText(entry.morningScore),
    activityKind: entry.activityKind ?? "",
    durationMin: asText(entry.durationMin),
    rpe: asText(entry.rpe),
    symptomScore: asText(entry.symptomScore),
    symptomTiming: entry.symptomTiming ?? "",
    note: entry.note ?? "",
  };
}

/**
 * Which calendar day it is where the PERSON is.
 *
 * Only the browser knows. The server used to answer this, and on a host running
 * in UTC it answered "yesterday" for anybody east of Greenwich recording after
 * their local midnight — which is exactly when somebody records a training day.
 *
 * The failure could not be reproduced in development, because there the server
 * and the browser are the same machine. It would have appeared for the first
 * time in production, silently, on the days that matter most to the 24-hour
 * rule.
 */
function deviceToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const field: React.CSSProperties = {
  // 44 px ist die kleinste Fläche, die ein Daumen zuverlässig trifft — die
  // Zahl steht so in den Richtlinien beider Plattformen. Gemessen waren es
  // 36 bis 39 px: am Rechner unauffällig, am Telefon jeden Abend ein Ärgernis.
  //
  // Und das Tagebuch wird am Telefon geführt. Ein Formular, das dort mühsam
  // ist, wird nicht neunzig Tage lang ausgefüllt — und dann hat der ganze
  // Motor nichts zu rechnen.
  minHeight: "2.75rem",
  padding: "0.5rem 0.55rem",
  // 16 px, nicht kleiner: iOS zoomt beim Antippen in jedes Feld mit kleinerer
  // Schrift hinein, und der Zoom bleibt danach stehen.
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
 * ---------------------------------------------------------------------------
 * CONTROLLED, AND THAT IS THE ENTIRE POINT.
 *
 * The first version used uncontrolled inputs with `defaultValue` and lost data
 * three separate ways. All three were reproduced against the real database:
 *
 *   1. React 19 resets an uncontrolled form after a form action finishes —
 *      including one that FAILED. Date, morning score, effort and the free-text
 *      note were all blank after a rejected submit, while the message said
 *      "either fill in both or leave both empty". Advice about fields it had
 *      already emptied.
 *
 *   2. The `failed` state was set and never rendered. A save that did not
 *      happen looked exactly like one that did.
 *
 *   3. Worst: the form was always blank and `saveEntry` upserts the WHOLE row,
 *      so recording a morning score for a day that already held a session set
 *      that session to null — and reported "Saved." A recorded
 *      "Cycling 75′ · Effort 4" became "no activity". For the engine the day's
 *      load silently becomes zero, and the 24-hour rule loses the very training
 *      day it exists to judge.
 *
 * Holding the values in state fixes all three. The form shows what is already
 * recorded for the chosen day, so "recording a day again replaces it" is
 * something a person can see rather than discover.
 * ---------------------------------------------------------------------------
 */
export function EntryForm({
  locale,
  episodeId,
  serverToday,
  entries,
  strings,
  errorStrings,
  activityLabels,
  saveLabel,
}: {
  locale: Locale;
  episodeId: string;
  /** The host's date — a starting guess, corrected on mount. See deviceToday. */
  serverToday: string;
  entries: Entry[];
  strings: Strings;
  errorStrings: { notSaved: string; offline: string };
  activityLabels: Record<ActivityKind, string>;
  saveLabel: string;
}) {
  const byDate = new Map(entries.map((e) => [String(e.date), e]));

  const [draft, setDraft] = useState<Draft>(() => draftFor(byDate.get(serverToday), serverToday));
  const [state, setState] = useState<
    | "idle"
    | "saved"
    | "load-incomplete"
    | "symptom-incomplete"
    | "future-date"
    | "invalid"
    | "failed"
    | "offline"
  >("idle");
  // What the device thinks today is. Starts as the host's guess so the first
  // render matches the server's markup, then corrects itself on mount.
  const [today, setToday] = useState(serverToday);
  const [pending, start] = useTransition();

  // The server's guess stands for exactly one render, so the markup matches and
  // there is no hydration mismatch; then the device corrects it. Reading the
  // clock during render would produce that mismatch. Not reading it at all was
  // the bug this replaces.
  useEffect(() => {
    const actual = deviceToday();
    if (actual !== serverToday) {
      setToday(actual);
      setDraft(draftFor(entries.find((e) => String(e.date) === actual), actual));
    }
    // Once, on mount. Re-running when `entries` changes would throw away
    // whatever somebody is in the middle of typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key: keyof Draft, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (state !== "idle") setState("idle");
  };

  /** Switching the day means editing a different day, so the fields follow it. */
  const setDate = (date: string) => {
    setDraft(draftFor(byDate.get(date), date));
    setState("idle");
  };

  const replacing = byDate.has(draft.date);

  /**
   * One sentence per outcome, and a compile error for a forgotten one.
   *
   * This was a six-deep nested ternary. A record keyed by the state union means
   * a new refusal reason cannot be added without giving it words — the same
   * exhaustiveness the engine uses for its verdicts, for the same reason: the
   * silent case is the one that ships.
   */
  const MESSAGES: Record<Exclude<typeof state, "idle">, { text: string; tone: string; role: "alert" | "status" }> = {
    "load-incomplete": { text: strings.loadIncomplete, tone: "var(--amber)", role: "alert" },
    "symptom-incomplete": { text: strings.symptomIncomplete, tone: "var(--amber)", role: "alert" },
    "future-date": { text: strings.futureDate, tone: "var(--amber)", role: "alert" },
    invalid: { text: strings.invalid, tone: "var(--amber)", role: "alert" },
    offline: { text: errorStrings.offline, tone: "var(--amber)", role: "alert" },
    failed: { text: errorStrings.notSaved, tone: "var(--red)", role: "alert" },
    saved: { text: strings.saved, tone: "var(--green)", role: "status" },
  };

  const message = state === "idle" ? null : MESSAGES[state];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        // Offline is not a failure to retry — there is nothing to retry against.
        // Saying "try again" to somebody with no connection is a lie with a
        // button on it.
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setState("offline");
          return;
        }

        start(async () => {
          // The call itself can reject — the request may never reach the server
          // at all. saveEntryAction only ever RETURNS "failed" for errors that
          // happened once it was running; a dead connection, a redeploy
          // mid-submit or a 500 rejects the promise instead. Without this catch
          // the rejection is unhandled, the button un-sticks, and nothing
          // appears — which is precisely the silent loss this rewrite exists to
          // remove, arriving by a different door.
          let result: Awaited<ReturnType<typeof saveEntryAction>>;
          try {
            result = await saveEntryAction(locale, episodeId, {
              date: draft.date,
              morningScore: asNumber(draft.morningScore),
              activityKind: (draft.activityKind === "" ? null : draft.activityKind) as ActivityKind | null,
              durationMin: asNumber(draft.durationMin),
              rpe: asNumber(draft.rpe),
              symptomScore: asNumber(draft.symptomScore),
              symptomTiming: (draft.symptomTiming === "" ? null : draft.symptomTiming) as SymptomTiming | null,
              note: draft.note.trim() === "" ? null : draft.note.trim(),
            });
          } catch {
            setState("failed");
            return;
          }
          setState(result.ok ? "saved" : result.reason);
        });
      }}
      style={{ display: "grid", gap: "1rem" }}
    >
      <div style={{ display: "grid", gap: "0.35rem", maxWidth: "12rem" }}>
        <label htmlFor="date" style={{ fontWeight: 600 }}>{strings.date}</label>
        <input
          id="date"
          name="date"
          type="date"
          value={draft.date}
          onChange={(e) => setDate(e.target.value)}
          // The browser is the only side that knows what day it is here, so it
          // is the only side that can bound the field exactly. The server keeps
          // a looser backstop for anything that does not come from a browser.
          max={today}
          required
          style={field}
        />
      </div>

      {replacing && (
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.88rem" }}>{strings.replacing}</p>
      )}

      <div style={{ display: "grid", gap: "0.35rem", maxWidth: "12rem" }}>
        <label htmlFor="morningScore" style={{ fontWeight: 600 }}>{strings.morning}</label>
        <input
          id="morningScore"
          type="number"
          inputMode="numeric"
          min={0}
          max={10}
          step={1}
          required
          value={draft.morningScore}
          onChange={(e) => set("morningScore", e.target.value)}
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
            <select
              value={draft.activityKind}
              onChange={(e) => set("activityKind", e.target.value)}
              style={field}
            >
              <option value="">—</option>
              {ALL_ACTIVITY_KINDS.map((a) => (
                <option key={a} value={a}>{activityLabels[a]}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.85rem" }}>{strings.duration}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={draft.durationMin}
              onChange={(e) => set("durationMin", e.target.value)}
              style={field}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.85rem" }}>{strings.rpe}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              step={1}
              value={draft.rpe}
              onChange={(e) => set("rpe", e.target.value)}
              style={field}
            />
          </label>
        </div>

        <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0.7rem 0 0" }}>
          {strings.loadHint}
        </p>
      </fieldset>

      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))", maxWidth: "26rem" }}>
        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{strings.symptom}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            step={1}
            value={draft.symptomScore}
            onChange={(e) => set("symptomScore", e.target.value)}
            style={field}
          />
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{strings.timing}</span>
          <select
            value={draft.symptomTiming}
            onChange={(e) => set("symptomTiming", e.target.value)}
            style={field}
          >
            <option value="">—</option>
            <option value="during">{strings.timingDuring}</option>
            <option value="after">{strings.timingAfter}</option>
            <option value="evening">{strings.timingEvening}</option>
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gap: "0.35rem" }}>
        <label htmlFor="note" style={{ fontWeight: 600 }}>{strings.note}</label>
        <textarea
          id="note"
          rows={2}
          value={draft.note}
          onChange={(e) => set("note", e.target.value)}
          style={{ ...field, fontFamily: "inherit" }}
        />
        <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{strings.noteHint}</span>
      </div>

      {message !== null && (
        <p role={message.role} style={{ margin: 0, color: message.tone }}>{message.text}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          minHeight: "2.75rem",
          padding: "0.6rem 1.25rem",
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
