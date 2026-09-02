"use client";

import { useEffect, useState, useTransition } from "react";
import {
  TEST_PROCEDURE,
  TEST_UNIT,
  type Locale,
  type SelfTest,
  type TestType,
  type Unit,
} from "loadwise-engine";
import { saveSelfTestAction } from "@/app/actions/self-tests";
import type { Strings } from "@/i18n/dictionary";
import { field, fieldLabel, hint, primaryButton, section, sectionHeading } from "@/lib/ui";

/**
 * Der Seitenvergleich, endlich mit einem Weg hinein.
 *
 * ---------------------------------------------------------------------------
 * DAS FORMULAR BIETET NUR AN, WAS DAS PROFIL FÜHRT.
 *
 * `tests` kommt aus dem Profil der Episode. Bei einer Schulter steht dort nur
 * Beweglichkeit — ein Wadenheber ergäbe dort eine Zahl, ein Verhältnis und ein
 * Urteil, und nichts davon bedeutete etwas. Dass es trotzdem echt aussähe, ist
 * der ganze Grund für diese Einschränkung.
 *
 * Die Server-Aktion prüft dasselbe noch einmal gegen das Profil, das SIE lädt.
 * Was ein Formular anbietet, ist eine Bequemlichkeit; eine Server-Aktion ist
 * ein öffentlicher Endpunkt.
 *
 * ---------------------------------------------------------------------------
 * DIE ANLEITUNG STEHT ÜBER DEM FORMULAR, NICHT DAHINTER.
 *
 * Sie kommt aus `engine/src/procedure.ts` und wird nie abgeschrieben —
 * `check:boundary` verbietet die Kopie. Der Grund ist der Fersenheber-Takt: 60
 * gegen 30 Schläge pro Minute ist eine dokumentierte Entscheidung zwischen zwei
 * publizierten Werten, und eine App, die »60« in einer eigenen Zeichenkette
 * führt, hat den Tag vor sich, an dem dort 30 steht und im Motor 60. Beide
 * Zahlen sähen plausibel aus, und ein Verlauf hörte still auf, einer zu sein.
 *
 * Aufgeklappt, nicht versteckt: Wer die Anleitung erst suchen muss, misst beim
 * ersten Mal ohne sie — und genau die erste Messung ist der Bezugspunkt für
 * alle folgenden.
 *
 * ---------------------------------------------------------------------------
 * WAS SCHON DASTEHT, STEHT IM FORMULAR — VOR DEM SPEICHERN.
 *
 * Dieselbe Lehre wie beim Tageseintrag: Das Formular war dort einmal immer
 * leer, und ein nachgetragener Wert löschte, was daneben stand, gemeldet als
 * »Gespeichert.«. Hier ersetzt ein Upsert über (Episode, Testart, Tag). Also
 * wird die vorhandene Messung geladen, sobald Art und Datum darauf zeigen, und
 * `replacing` sagt es, bevor jemand drückt.
 * ---------------------------------------------------------------------------
 */

type Draft = { involved: string; uninvolved: string; note: string };

const LEER: Draft = { involved: "", uninvolved: "", note: "" };

/** Das Gerätedatum. Der Server weiss nicht, welcher Tag dort ist, wo jemand steht. */
function deviceToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Leer heisst null, nicht null heisst 0.
 *
 * `Number("")` ist 0, und 0 ist auf der verletzten Seite ein gültiger,
 * aussagekräftiger Messwert — Tag eins einer Reha. Ein leeres Feld als 0 zu
 * lesen hiesse, eine nicht gemachte Messung als die schlechtestmögliche zu
 * speichern. Ein Komma wird zum Punkt: Auf einer Schweizer Tastatur tippt
 * niemand »12.5«.
 */
function zahlOderNull(text: string): number | null {
  const sauber = text.trim().replace(",", ".");
  if (sauber === "") return null;
  const n = Number(sauber);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function SelfTestForm({
  locale,
  episodeId,
  serverToday,
  tests,
  existing,
  strings,
  errorStrings,
  saveLabel,
}: {
  locale: Locale;
  episodeId: string;
  serverToday: string;
  /** Aus dem Profil der Episode. Leer ist ein zulässiger Zustand — siehe Schulter. */
  tests: readonly TestType[];
  existing: SelfTest[];
  strings: Strings["selfTest"];
  errorStrings: Strings["errors"];
  saveLabel: string;
}) {
  const [type, setType] = useState<TestType>(tests[0] ?? "calf_raise");
  const [date, setDate] = useState(serverToday);
  const [draft, setDraft] = useState<Draft>(LEER);
  const [state, setState] = useState<
    | "idle"
    | "saved"
    | "half-pairing"
    | "reference-side-zero"
    | "out-of-range"
    | "test-not-in-profile"
    // Aus diesem Formular unerreichbar — die Auswahl kennt nur echte Testarten.
    // Trotzdem im Zustand, weil die Aktion es zurückgeben KANN und ein
    // Zustand, den der Typ nennt und die Ansicht nicht behandelt, ein stiller
    // Bildschirm ohne Meldung wäre. Zeigt denselben Satz wie `invalid`: Für
    // die lesende Person ist eine unbekannte Testart nichts anderes als ein
    // Formular, das nicht angekommen ist.
    | "unknown-test"
    | "future-date"
    | "invalid"
    | "no-episode"
    | "failed"
    | "offline"
  >("idle");
  const [pending, start] = useTransition();

  // Der Servertag gilt für genau einen Render, damit die Auszeichnung
  // übereinstimmt; danach korrigiert das Gerät. Die Uhr beim Rendern zu lesen
  // erzeugte den Unterschied, sie gar nicht zu lesen war der Fehler davor.
  useEffect(() => {
    const actual = deviceToday();
    if (actual !== serverToday) setDate(actual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Was für diese Art an diesem Tag gespeichert ist. Der Upsert ersetzt es.
  const vorhanden = existing.find((t) => t.type === type && String(t.date) === date);

  // Zieht das Gespeicherte ins Formular, sobald Art oder Tag darauf zeigen —
  // und räumt es wieder weg, wenn sie woandershin zeigen. Ohne den zweiten Fall
  // bliebe eine fremde Messung stehen und würde als neue gespeichert.
  useEffect(() => {
    setDraft(
      vorhanden === undefined
        ? LEER
        : {
            involved: String(vorhanden.involved),
            uninvolved: String(vorhanden.uninvolved),
            // Die Notiz gehört zurück ins Feld. Sie stand hier fest auf "",
            // und damit löschte jedes Speichern die Notiz des Tages — ohne
            // dass jemand sie je gesehen hätte. Siehe `toSelfTest`.
            note: vorhanden.note ?? "",
          },
    );
    setState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, date]);

  if (tests.length === 0) {
    return (
      <section style={section}>
        <h2 style={sectionHeading}>{strings.heading}</h2>
        <p style={{ ...hint, margin: 0 }}>{strings.noneForProfile}</p>
      </section>
    );
  }

  const unit: Unit = TEST_UNIT[type];
  const einheitentext: Partial<Record<Unit, string>> = {
    reps: strings.unitReps,
    cm: strings.unitCm,
    deg: strings.unitDeg,
  };
  const einheit = einheitentext[unit] ?? unit;
  const testName: Record<TestType, string> = {
    calf_raise: strings.calfRaise,
    single_hop: strings.singleHop,
    rom: strings.rom,
  };
  const anleitung = TEST_PROCEDURE[type];

  const MELDUNGEN: Record<Exclude<typeof state, "idle">, { text: string; tone: string; role: "alert" | "status" }> = {
    "half-pairing": { text: strings.halfPairing, tone: "var(--amber)", role: "alert" },
    "reference-side-zero": { text: strings.referenceSideZero, tone: "var(--amber)", role: "alert" },
    "out-of-range": { text: strings.outOfRange, tone: "var(--amber)", role: "alert" },
    "test-not-in-profile": { text: strings.notInProfile, tone: "var(--amber)", role: "alert" },
    "future-date": { text: strings.futureDate, tone: "var(--amber)", role: "alert" },
    invalid: { text: strings.invalid, tone: "var(--amber)", role: "alert" },
    "unknown-test": { text: strings.invalid, tone: "var(--amber)", role: "alert" },
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

  const zahlenfeld = (
    key: "involved" | "uninvolved",
    label: string,
    beschreibung: string,
  ) => (
    <div style={{ display: "grid", gap: "0.3rem" }}>
      <label htmlFor={key} style={fieldLabel}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          id={key}
          name={key}
          // `decimal` und nicht `numeric`: Zentimeter und Grad dürfen eine
          // Nachkommastelle haben, und eine Tastatur ohne Komma macht die
          // Eingabe unmöglich statt nur unbequem.
          inputMode={unit === "reps" ? "numeric" : "decimal"}
          value={draft[key]}
          onChange={(e) => set(key, e.target.value)}
          aria-describedby={`${key}-hint`}
          style={{ ...field, maxWidth: "8rem" }}
        />
        <span style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>{einheit}</span>
      </div>
      <span id={`${key}-hint`} style={hint}>
        {beschreibung}
      </span>
    </div>
  );

  return (
    <section style={section}>
      <h2 style={sectionHeading}>{strings.heading}</h2>
      <p style={{ margin: "0 0 var(--space-4)", maxWidth: "42rem" }}>{strings.intro}</p>

      <form
        onSubmit={(event) => {
          event.preventDefault();

          // Offline ist kein Fehlschlag zum Wiederholen — es gibt nichts, wogegen
          // wiederholt werden könnte.
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            setState("offline");
            return;
          }

          start(async () => {
            // Der Aufruf selbst kann ablehnen: Die Anfrage erreicht den Server
            // womöglich nie. `saveSelfTestAction` gibt »failed« nur für Fehler
            // zurück, die eintraten, als sie schon lief.
            let result: Awaited<ReturnType<typeof saveSelfTestAction>>;
            try {
              result = await saveSelfTestAction(locale, episodeId, {
                type,
                date,
                involved: zahlOderNull(draft.involved),
                uninvolved: zahlOderNull(draft.uninvolved),
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
          <label htmlFor="testType" style={fieldLabel}>
            {strings.type}
          </label>
          <select
            id="testType"
            value={type}
            onChange={(e) => setType(e.target.value as TestType)}
            style={{ ...field, maxWidth: "22rem" }}
          >
            {tests.map((t) => (
              <option key={t} value={t}>
                {testName[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Die Anleitung. Aus dem Motor, offen, über den Feldern. */}
        <div
          data-procedure={type}
          style={{
            padding: "var(--space-3)",
            // `--line` und nicht `--edge`: Der Kasten trennt Anleitung von
            // Formular, er umreisst kein Bedienelement. 1.4.11 verlangt 3:1
            // für Umrisse, die etwas bedienbar machen — hier wäre dieser
            // Kontrast bloss laut.
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            display: "grid",
            gap: "var(--space-2)",
          }}
        >
          <h3 style={{ ...fieldLabel, margin: 0 }}>{strings.howHeading}</h3>
          <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: "0.35rem" }}>
            {anleitung.steps[locale].map((schritt) => (
              <li key={schritt}>{schritt}</li>
            ))}
          </ol>
          <p style={{ margin: 0, fontWeight: "var(--weight-semibold)" }}>
            {strings.fixedHeading}: {anleitung.fixed[locale]}
          </p>
        </div>

        <div style={{ display: "grid", gap: "0.3rem" }}>
          <label htmlFor="testDate" style={fieldLabel}>
            {strings.date}
          </label>
          <input
            id="testDate"
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

        {zahlenfeld("involved", strings.involved, strings.involvedHint)}
        {zahlenfeld("uninvolved", strings.uninvolved, strings.uninvolvedHint)}

        <div style={{ display: "grid", gap: "0.3rem" }}>
          <label htmlFor="testNote" style={fieldLabel}>
            {strings.note}
          </label>
          <textarea
            id="testNote"
            rows={2}
            value={draft.note}
            onChange={(e) => set("note", e.target.value)}
            aria-describedby="testNote-hint"
            style={{ ...field, fontFamily: "inherit" }}
          />
          <span id="testNote-hint" style={hint}>
            {strings.noteHint}
          </span>
        </div>

        {meldung !== null && (
          <p role={meldung.role} data-message="" style={{ margin: 0, color: meldung.tone }}>
            {meldung.text}
          </p>
        )}

        <button type="submit" disabled={pending} style={{ ...primaryButton, cursor: pending ? "wait" : "pointer" }}>
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
          {existing.map((t) => (
            <li key={`${t.type}-${t.date}`}>
              {String(t.date)} · {testName[t.type]} · {t.involved} / {t.uninvolved}{" "}
              {einheitentext[TEST_UNIT[t.type]] ?? TEST_UNIT[t.type]}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
