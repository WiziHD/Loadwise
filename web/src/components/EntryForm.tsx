"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ALL_ACTIVITY_KINDS,
  type Entry,
  type Locale,
  type SymptomTiming,
} from "loadwise-engine";
import { saveEntryAction } from "@/app/actions/episodes";
import type { Strings } from "@/i18n/dictionary";
import { field, quietButton } from "@/lib/ui";

/** Exactly the fields of a diary day, as strings — because that is what a form holds. */
/** Eine Einheit im Formular — als Text, denn das ist, was ein Feld hält. */
type SessionDraft = { activityKind: string; durationMin: string; rpe: string };

type Draft = {
  date: string;
  morningScore: string;
  morningStiffnessMin: string;
  painMedication: boolean;
  sessions: SessionDraft[];
  everydayLoad: string;
  symptomScore: string;
  symptomTiming: string;
  note: string;
};

const LEERE_EINHEIT: SessionDraft = { activityKind: "", durationMin: "", rpe: "" };

const BLANK = {
  morningScore: "",
  morningStiffnessMin: "",
  painMedication: false,
  sessions: [] as SessionDraft[],
  everydayLoad: "",
  symptomScore: "",
  symptomTiming: "",
  note: "",
};

const asText = (n: number | null | undefined): string =>
  n === null || n === undefined ? "" : String(n);

const asNumber = (text: string): number | null => (text.trim() === "" ? null : Number(text));

function draftFor(entry: Entry | undefined, date: string): Draft {
  if (entry === undefined) return { date, ...BLANK };
  return {
    date,
    morningScore: asText(entry.morningScore),
    morningStiffnessMin: asText(entry.morningStiffnessMin),
    painMedication: entry.painMedication === true,
    sessions: entry.sessions.map((s) => ({
      activityKind: s.activityKind,
      durationMin: String(s.durationMin),
      rpe: String(s.rpe),
    })),
    everydayLoad: entry.everydayLoad ?? "",
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
  strings: Strings["entry"];
  errorStrings: Strings["errors"];
  activityLabels: Strings["activities"];
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

  const setMedication = (value: boolean) => {
    setDraft((d) => ({ ...d, painMedication: value }));
    if (state !== "idle") setState("idle");
  };

  const setSession = (index: number, key: keyof SessionDraft, value: string) => {
    setDraft((d) => ({
      ...d,
      sessions: d.sessions.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    }));
    if (state !== "idle") setState("idle");
  };

  const addSession = () => {
    setDraft((d) => ({ ...d, sessions: [...d.sessions, { ...LEERE_EINHEIT }] }));
    if (state !== "idle") setState("idle");
  };

  /**
   * Eine Einheit entfernen.
   *
   * Ohne Rückfrage: Sie ist erst gespeichert, wenn jemand auf Speichern tippt,
   * und bis dahin steht sie nur im Formular. Eine Rückfrage für etwas, das noch
   * nirgends steht, gewöhnt Leute daran, Rückfragen wegzuklicken.
   */
  const removeSession = (index: number) => {
    setDraft((d) => ({ ...d, sessions: d.sessions.filter((_, i) => i !== index) }));
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
              morningStiffnessMin: asNumber(draft.morningStiffnessMin),
              // false heisst hier »nein«, nicht »keine Angabe«: Wer das Formular
              // vor sich hat, hat die Frage gesehen und nicht angekreuzt.
              painMedication: draft.painMedication,
              // Leere Zeilen fliegen raus: Wer auf »Einheit hinzufügen« tippt
              // und es sich anders überlegt, hat keine halbe Einheit gemeint.
              sessions: draft.sessions
                .filter((s) => s.activityKind !== "" || s.durationMin !== "" || s.rpe !== "")
                .map((s) => ({
                  activityKind: s.activityKind === "" ? null : s.activityKind,
                  durationMin: asNumber(s.durationMin),
                  rpe: asNumber(s.rpe),
                })),
              everydayLoad: draft.everydayLoad === "" ? null : draft.everydayLoad,
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
        <label htmlFor="date" style={{ fontWeight: "var(--weight-semibold)" }}>{strings.date}</label>
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
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--text-sm)" }}>{strings.replacing}</p>
      )}

      <div style={{ display: "grid", gap: "0.35rem", maxWidth: "12rem" }}>
        <label htmlFor="morningScore" style={{ fontWeight: "var(--weight-semibold)" }}>{strings.morning}</label>
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
          // Der Hinweis steht daneben und wurde nie vorgelesen: Eine
          // Vorlesesoftware liest die Beschriftung und den Bereich, nicht den
          // Absatz darunter. »0 heisst gar nichts« ist aber genau die Auskunft,
          // ohne die die Skala verkehrt herum verstanden wird.
          aria-describedby="morningScore-hint"
          style={field}
        />
        <span id="morningScore-hint" style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
          {strings.morningHint}
        </span>
      </div>

      <div style={{ display: "grid", gap: "0.35rem", maxWidth: "26rem" }}>
        <label htmlFor="stiffness" style={{ fontWeight: "var(--weight-semibold)" }}>{strings.stiffness}</label>
        <input
          id="stiffness"
          type="number"
          inputMode="numeric"
          min={0}
          max={1440}
          step={1}
          value={draft.morningStiffnessMin}
          onChange={(e) => set("morningStiffnessMin", e.target.value)}
          aria-describedby="stiffness-hint"
          style={{ ...field, maxWidth: "12rem" }}
        />
        <span id="stiffness-hint" style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
          {strings.stiffnessHint}
        </span>
      </div>

      <div style={{ display: "grid", gap: "0.35rem", maxWidth: "26rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontWeight: "var(--weight-semibold)", minHeight: "2.75rem" }}>
          <input
            type="checkbox"
            checked={draft.painMedication}
            onChange={(e) => setMedication(e.target.checked)}
            // Der wichtigste Hinweis im ganzen Formular: Er sagt vorher, dass
            // dieses Kreuz die Entwarnung verweigert. Wer ihn nicht hört,
            // erlebt die Folge ohne den Grund.
            aria-describedby="medication-hint"
            style={{ width: "1.25rem", height: "1.25rem" }}
          />
          {strings.medication}
        </label>
        <span id="medication-hint" style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
          {strings.medicationHint}
        </span>
      </div>

      <fieldset style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "0.9rem" }}>
        <legend style={{ padding: "0 0.4rem", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)" }}>
          {strings.activity}
        </legend>

        {draft.sessions.map((s, i) => (
          <div key={i} style={{ display: "grid", gap: "0.5rem", marginBottom: "0.9rem" }}>
            {draft.sessions.length > 1 && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                {strings.sessionNumber} {i + 1}
              </span>
            )}

            <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))" }}>
              <label style={{ display: "grid", gap: "0.3rem" }}>
                <span style={{ fontSize: "var(--text-sm)" }}>{strings.activity}</span>
                <select
                  value={s.activityKind}
                  onChange={(e) => setSession(i, "activityKind", e.target.value)}
                  style={field}
                >
                  <option value="">—</option>
                  {ALL_ACTIVITY_KINDS.map((a) => (
                    <option key={a} value={a}>{activityLabels[a]}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: "0.3rem" }}>
                <span style={{ fontSize: "var(--text-sm)" }}>{strings.duration}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={s.durationMin}
                  onChange={(e) => setSession(i, "durationMin", e.target.value)}
                  style={field}
                />
              </label>

              <label style={{ display: "grid", gap: "0.3rem" }}>
                <span style={{ fontSize: "var(--text-sm)" }}>{strings.rpe}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10}
                  step={1}
                  value={s.rpe}
                  onChange={(e) => setSession(i, "rpe", e.target.value)}
                  style={field}
                />
              </label>
            </div>

            <button type="button" onClick={() => removeSession(i)} style={quietButton}>
              {strings.removeSession}
            </button>
          </div>
        ))}

        <button type="button" onClick={addSession} style={quietButton}>
          {strings.addSession}
        </button>

        <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)", margin: "0.7rem 0 0" }}>
          {strings.loadHint}
        </p>
      </fieldset>

      <div style={{ display: "grid", gap: "0.35rem", maxWidth: "26rem" }}>
        <label htmlFor="everydayLoad" style={{ fontWeight: "var(--weight-semibold)" }}>{strings.everyday}</label>
        <select
          id="everydayLoad"
          aria-describedby="everyday-hint"
          value={draft.everydayLoad}
          onChange={(e) => set("everydayLoad", e.target.value)}
          style={field}
        >
          <option value="">—</option>
          <option value="sitting">{strings.everydaySitting}</option>
          <option value="normal">{strings.everydayNormal}</option>
          <option value="on-feet">{strings.everydayOnFeet}</option>
          <option value="very-active">{strings.everydayVeryActive}</option>
        </select>
        <span id="everyday-hint" style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
          {strings.everydayHint}
        </span>
      </div>

      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))", maxWidth: "26rem" }}>
        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)" }}>{strings.symptom}</span>
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
          <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)" }}>{strings.timing}</span>
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
        <label htmlFor="note" style={{ fontWeight: "var(--weight-semibold)" }}>{strings.note}</label>
        <textarea
          id="note"
          aria-describedby="note-hint"
          rows={2}
          value={draft.note}
          onChange={(e) => set("note", e.target.value)}
          style={{ ...field, fontFamily: "inherit" }}
        />
        <span id="note-hint" style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
          {strings.noteHint}
        </span>
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
          fontSize: "var(--text-base)",
          borderRadius: "var(--radius-sm)",
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
