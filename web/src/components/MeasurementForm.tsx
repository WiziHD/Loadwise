"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Locale, Measurement, Unit } from "loadwise-engine";
import { saveMeasurementAction } from "@/app/actions/measurements";
import { measureKeyId } from "@/lib/measurement-validation";
import type { Strings } from "@/i18n/dictionary";
import { field, fieldLabel, hint, primaryButton, section, sectionHeading } from "@/lib/ui";

/**
 * Eigene Masse — und die App schlägt keines vor.
 *
 * ---------------------------------------------------------------------------
 * WAS HIER FEHLT, IST DER WICHTIGSTE TEIL DIESES BAUTEILS.
 *
 * Es gibt keine Auswahlliste mit »Kniebeugen«, »Einbeinstand«, »Treppen«.
 * `MeasureKey` ist im Motor absichtlich ein offener String, und der Kommentar
 * dort nennt den Grund: *Eine Liste dessen, was zu messen sich lohnt, ist ein
 * klinisches Kriterium.* Sie hier hinzuschreiben wäre der bequemste Weg über
 * die Grenze, um die sich das ganze Projekt sonst bemüht — und er sähe aus wie
 * Benutzerfreundlichkeit.
 *
 * Angeboten werden ausschliesslich die Masse, die der Nutzer SELBST benannt
 * hat. Das ist kein Vorschlag, sondern sein eigenes Vokabular, und es
 * verhindert genau den Fehler, für den es sonst keine Abhilfe gäbe: dass
 * derselbe Verlauf beim vierten Mal unter »Kniebeugen tief« weiterläuft.
 *
 * ---------------------------------------------------------------------------
 * DIE EINHEIT IST GESPERRT, SOBALD DAS MASS SIE HAT.
 *
 * Nicht versteckt — angezeigt. Wer »Stehen« in Minuten führt und heute
 * Sekunden tippen will, soll SEHEN, warum das Feld nicht mehr geht, statt es
 * für einen Fehler zu halten.
 *
 * Die Sperre ist trotzdem nur eine Hilfe. Die Server-Aktion schlägt das Mass
 * selbst nach, und `saveMeasurement` wirft, wenn die Einheit nicht passt,
 * statt still auf die eingefrorene auszuweichen: Wer 30 Sekunden eintippt und
 * 30 Minuten gespeichert bekommt, hat eine Zahl im Verlauf, die niemand mehr
 * als falsch erkennen kann.
 * ---------------------------------------------------------------------------
 */

type Draft = { key: string; unit: Unit; value: string; note: string };

/** Das Gerätedatum. Der Server weiss nicht, welcher Tag dort ist, wo jemand steht. */
function deviceToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Leer heisst null. `Number("")` ist 0, und 0 ist ein gültiger Wert. */
function zahlOderNull(text: string): number | null {
  const sauber = text.trim().replace(",", ".");
  if (sauber === "") return null;
  const n = Number(sauber);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function MeasurementForm({
  locale,
  episodeId,
  serverToday,
  known,
  existing,
  strings,
  errorStrings,
  saveLabel,
}: {
  locale: Locale;
  episodeId: string;
  serverToday: string;
  /** Die Masse dieser Episode. Vom Nutzer benannt, nicht von der App. */
  known: { key: string; unit: Unit }[];
  existing: Measurement[];
  strings: Strings["measure"];
  errorStrings: Strings["errors"];
  saveLabel: string;
}) {
  const [draft, setDraft] = useState<Draft>({ key: "", unit: "reps", value: "", note: "" });
  const [date, setDate] = useState(serverToday);
  const [state, setState] = useState<
    | "idle"
    | "saved"
    | "key-missing"
    | "key-too-long"
    | "unknown-unit"
    | "unit-conflict"
    | "value-missing"
    | "out-of-range"
    | "future-date"
    | "invalid"
    | "no-episode"
    | "failed"
    | "offline"
  >("idle");
  const [pending, start] = useTransition();

  useEffect(() => {
    const actual = deviceToday();
    if (actual !== serverToday) setDate(actual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const EINHEITEN: { wert: Unit; text: string }[] = useMemo(
    () => [
      { wert: "reps", text: strings.unitReps },
      { wert: "cm", text: strings.unitCm },
      { wert: "deg", text: strings.unitDeg },
      { wert: "min", text: strings.unitMin },
      { wert: "sec", text: strings.unitSec },
      { wert: "score_0_10", text: strings.unitScore },
    ],
    [strings],
  );

  // Kennt diese Episode das getippte Mass schon? Unempfindlich gegen Gross-
  // und Kleinschreibung, sonst liesse sich die eingefrorene Einheit mit einem
  // grossen K umgehen — und dann stünden zwei Reihen da, wo eine gemeint war.
  const eingefroren = known.find((k) => measureKeyId(k.key) === measureKeyId(draft.key));

  // Was für dieses Mass an diesem Tag steht. Der Upsert ersetzt es.
  const vorhanden = existing.find(
    (m) => measureKeyId(m.key) === measureKeyId(draft.key) && String(m.date) === date,
  );

  // Zieht das Gespeicherte ins Formular und räumt es wieder weg. Ohne den
  // zweiten Fall bliebe ein fremder Wert stehen und würde als neuer gespeichert.
  useEffect(() => {
    setDraft((d) => ({
      ...d,
      value: vorhanden === undefined ? "" : String(vorhanden.value),
      // Auch die Notiz. Ohne diese Zeile löschte jedes erneute Speichern die
      // Notiz des Tages, und niemand hätte sie je wiedergesehen — siehe den
      // Kopf von `toSelfTest`.
      note: vorhanden?.note ?? "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vorhanden?.value, vorhanden?.note, date]);

  // Die eingefrorene Einheit gewinnt, sobald der Name auf ein bekanntes Mass
  // zeigt — und gibt das Feld wieder frei, wenn er woandershin zeigt.
  useEffect(() => {
    if (eingefroren !== undefined) setDraft((d) => ({ ...d, unit: eingefroren.unit }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eingefroren?.unit]);

  const einheitentext = (u: Unit) => EINHEITEN.find((e) => e.wert === u)?.text ?? u;

  const MELDUNGEN: Record<
    Exclude<typeof state, "idle">,
    { text: string; tone: string; role: "alert" | "status" }
  > = {
    "key-missing": { text: strings.keyMissing, tone: "var(--amber)", role: "alert" },
    "key-too-long": { text: strings.keyTooLong, tone: "var(--amber)", role: "alert" },
    "unknown-unit": { text: strings.unknownUnit, tone: "var(--amber)", role: "alert" },
    "unit-conflict": { text: strings.unitConflict, tone: "var(--amber)", role: "alert" },
    "value-missing": { text: strings.valueMissing, tone: "var(--amber)", role: "alert" },
    "out-of-range": { text: strings.outOfRange, tone: "var(--amber)", role: "alert" },
    "future-date": { text: strings.futureDate, tone: "var(--amber)", role: "alert" },
    invalid: { text: strings.invalid, tone: "var(--amber)", role: "alert" },
    "no-episode": { text: strings.noEpisode, tone: "var(--red)", role: "alert" },
    offline: { text: errorStrings.offline, tone: "var(--amber)", role: "alert" },
    failed: { text: errorStrings.notSaved, tone: "var(--red)", role: "alert" },
    saved: { text: strings.saved, tone: "var(--green)", role: "status" },
  };
  const meldung = state === "idle" ? null : MELDUNGEN[state];

  const set = (key: keyof Draft, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (state !== "idle") setState("idle");
  };

  return (
    <section style={section}>
      <h2 style={sectionHeading}>{strings.heading}</h2>
      <p style={{ margin: "0 0 var(--space-4)", maxWidth: "42rem" }}>{strings.intro}</p>

      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            setState("offline");
            return;
          }

          start(async () => {
            let result: Awaited<ReturnType<typeof saveMeasurementAction>>;
            try {
              result = await saveMeasurementAction(locale, episodeId, {
                key: draft.key,
                unit: draft.unit,
                date,
                value: zahlOderNull(draft.value),
                note: draft.note.trim() === "" ? null : draft.note.trim(),
              });
            } catch {
              setState("failed");
              return;
            }
            setState(result.ok ? "saved" : result.reason);
          });
        }}
        style={{ display: "grid", gap: "var(--space-4)" }}
      >
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <label htmlFor="measureKey" style={fieldLabel}>
            {strings.name}
          </label>
          <input
            id="measureKey"
            list="measureKeys"
            value={draft.key}
            onChange={(e) => set("key", e.target.value)}
            aria-describedby="measureKey-hint"
            maxLength={60}
            style={{ ...field, maxWidth: "22rem" }}
          />
          {/* Nur die eigenen Masse des Nutzers. Kein einziger Vorschlag der App
              — siehe Kopf. Eine `datalist` schränkt die Eingabe nicht ein; wer
              etwas Neues tippt, kann das weiterhin. */}
          <datalist id="measureKeys">
            {known.map((k) => (
              <option key={k.key} value={k.key} />
            ))}
          </datalist>
          <span id="measureKey-hint" style={hint}>
            {strings.nameHint}
          </span>
        </div>

        <div style={{ display: "grid", gap: "0.3rem" }}>
          <label htmlFor="measureUnit" style={fieldLabel}>
            {strings.unit}
          </label>
          {eingefroren === undefined ? (
            <>
              <select
                id="measureUnit"
                value={draft.unit}
                onChange={(e) => set("unit", e.target.value)}
                style={{ ...field, maxWidth: "16rem" }}
              >
                {EINHEITEN.map((e) => (
                  <option key={e.wert} value={e.wert}>
                    {e.text}
                  </option>
                ))}
              </select>
              <span style={hint}>{strings.unitHint}</span>
            </>
          ) : (
            // Angezeigt, nicht versteckt: Wer Sekunden tippen will, wo Minuten
            // stehen, soll SEHEN warum — sonst hält er das Formular für kaputt.
            <p id="measureUnit" data-frozen={eingefroren.unit} style={{ ...hint, margin: 0 }}>
              {strings.unitFrozen} {einheitentext(eingefroren.unit)}
            </p>
          )}
        </div>

        <div style={{ display: "grid", gap: "0.3rem" }}>
          <label htmlFor="measureDate" style={fieldLabel}>
            {strings.date}
          </label>
          <input
            id="measureDate"
            type="date"
            value={date}
            max={date > serverToday ? date : serverToday}
            onChange={(e) => {
              setDate(e.target.value);
              if (state !== "idle") setState("idle");
            }}
            style={{ ...field, maxWidth: "12rem" }}
          />
        </div>

        {vorhanden !== undefined && (
          <p role="status" data-replacing="" style={{ ...hint, margin: 0, color: "var(--unjudged)" }}>
            {strings.replacing}
          </p>
        )}

        <div style={{ display: "grid", gap: "0.3rem" }}>
          <label htmlFor="measureValue" style={fieldLabel}>
            {strings.value}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              id="measureValue"
              inputMode={draft.unit === "cm" || draft.unit === "deg" ? "decimal" : "numeric"}
              value={draft.value}
              onChange={(e) => set("value", e.target.value)}
              aria-describedby="measureValue-hint"
              style={{ ...field, maxWidth: "8rem" }}
            />
            <span style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
              {einheitentext(draft.unit)}
            </span>
          </div>
          <span id="measureValue-hint" style={hint}>
            {strings.valueHint}
          </span>
        </div>

        <div style={{ display: "grid", gap: "0.3rem" }}>
          <label htmlFor="measureNote" style={fieldLabel}>
            {strings.note}
          </label>
          <textarea
            id="measureNote"
            rows={2}
            value={draft.note}
            onChange={(e) => set("note", e.target.value)}
            aria-describedby="measureNote-hint"
            style={{ ...field, fontFamily: "inherit" }}
          />
          <span id="measureNote-hint" style={hint}>
            {strings.noteHint}
          </span>
        </div>

        {meldung !== null && (
          <p role={meldung.role} data-message="" style={{ margin: 0, color: meldung.tone }}>
            {meldung.text}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{ ...primaryButton, cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "…" : saveLabel}
        </button>
      </form>

      <h3 style={{ ...sectionHeading, fontSize: "var(--text-base)", marginTop: "var(--space-5)" }}>
        {strings.historyHeading}
      </h3>
      {existing.length === 0 ? (
        <p style={{ ...hint, margin: 0 }}>{strings.historyEmpty}</p>
      ) : (
        <ul data-history="" style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: "0.3rem" }}>
          {existing.map((m) => (
            <li key={`${m.key}-${m.date}`}>
              {String(m.date)} · {m.key} · {m.value} {einheitentext(m.unit)}
              {/* Die Notiz, wo es eine gibt. Ohne sie war das Feld ein Eingang
                  ohne Ausgang: geschrieben, gespeichert, nie wiedergesehen. */}
              {m.note != null && m.note !== "" && (
                <span data-note="" style={{ color: "var(--muted)" }}>
                  {" "}
                  · {m.note}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
