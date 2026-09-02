"use client";

import { useState, useTransition } from "react";
import { TEST_UNIT, unitOf, type Locale, type Measure, type TestType, type Unit } from "loadwise-engine";
import { saveMilestoneAction } from "@/app/actions/milestones";
import type { Strings } from "@/i18n/dictionary";
import { field, fieldLabel, hint, primaryButton, quietButton, section, sectionHeading } from "@/lib/ui";

/**
 * Ein eigenes Ziel anlegen.
 *
 * ---------------------------------------------------------------------------
 * DAS ZIELFELD IST EIN LEERES TEXTFELD, UND ES BLEIBT EINES.
 *
 * Keine Vorschläge, keine Autovervollständigung, kein Katalog. Der Kommentar an
 * `Milestone.label` im Motor sagt, warum das mehr ist als Zurückhaltung: Eine
 * Liste dessen, was zu erreichen sich lohnt, ist ein klinisches Kriterium.
 *
 * Und der Text läuft durch **keinen** Filter. Die drei Ban-Listen des Motors
 * regeln, was der MOTOR sagt; auf dieses Feld angewandt verböten sie einem
 * Menschen, im eigenen Tagebuch über das eigene Ziel zu sprechen — »Ich will in
 * sechs Wochen wieder laufen« wäre dann nicht speicherbar.
 *
 * ---------------------------------------------------------------------------
 * DIE BEDINGUNG IST FREIWILLIG, UND DAS IST KEINE BEQUEMLICHKEIT.
 *
 * »Wieder ohne Angst die Treppe runter« kann kein Tagebuch prüfen. Ein
 * Formular, das eine Bedingung erzwingt, liesse genau die Ziele draussen, die
 * Menschen tatsächlich haben — und drängte sie dazu, eine Zahl zu erfinden, die
 * ihr Ziel nicht trifft.
 *
 * Ohne Bedingung hakt der Nutzer selbst ab. Der Motor nennt diesen Zustand
 * `untracked` und sagt dazu: »Das kann ein Tagebuch nicht sehen — das weisst
 * nur du selbst.«
 *
 * ---------------------------------------------------------------------------
 * DIE EINHEIT WIRD NICHT ANGEBOTEN, WO SIE FESTSTEHT.
 *
 * `unitOf` kennt sie für vier der fünf Messquellen. Sie dort zur Wahl zu
 * stellen hiesse, eine Frage zu stellen, auf die es nur eine richtige Antwort
 * gibt — und die falsche wäre ein Ziel in Minuten auf einer Null-bis-Zehn-Skala.
 * ---------------------------------------------------------------------------
 */

/** Eine Bedingung, wie das Formular sie hält: alles als Text. */
type BedingungEntwurf = {
  /** Ein Schlüssel, der die Messquelle eindeutig macht. Siehe `measureAus`. */
  quelle: string;
  direction: "at_least" | "at_most";
  value: string;
  /** Nur benutzt, wo `unitOf` nichts sagt — also bei eigenen Massen. */
  unit: Unit;
};

const LEERE_BEDINGUNG: BedingungEntwurf = {
  quelle: "morning_score",
  direction: "at_most",
  value: "",
  unit: "reps",
};

/** Leer heisst null. `Number("")` ist 0, und 0 ist ein gültiger Zielwert. */
function zahlOderNull(text: string): number | null {
  const sauber = text.trim().replace(",", ".");
  if (sauber === "") return null;
  const n = Number(sauber);
  return Number.isFinite(n) ? n : Number.NaN;
}

/**
 * Aus dem Auswahlschlüssel wird die Messquelle des Motors.
 *
 * Ein flacher String statt eines verschachtelten Objekts im Formularzustand:
 * Ein `<select>` trägt einen Wert, kein Objekt, und die Umwandlung an genau
 * einer Stelle zu haben ist besser als ein Zustand, der beides halb hält.
 */
function measureAus(quelle: string): Measure | null {
  if (quelle === "morning_score") return { source: "morning_score" };
  if (quelle === "symptom_score") return { source: "symptom_score" };
  if (quelle === "session_minutes") return { source: "session_minutes" };

  if (quelle.startsWith("test:")) {
    const [, type, side] = quelle.split(":");
    if (type === undefined || (side !== "involved" && side !== "uninvolved")) return null;
    if (!(type in TEST_UNIT)) return null;
    return { source: "self_test", type: type as TestType, side };
  }

  if (quelle.startsWith("key:")) {
    const key = quelle.slice(4);
    return key === "" ? null : { source: "measurement", key };
  }

  return null;
}

export function MilestoneForm({
  locale,
  episodeId,
  today,
  tests,
  measureKeys,
  strings,
  errorStrings,
}: {
  locale: Locale;
  episodeId: string;
  today: string;
  /** Aus dem Profil der Episode. */
  tests: readonly TestType[];
  /** Die eigenen Masse dieser Episode — vom Nutzer benannt, nicht von der App. */
  measureKeys: { key: string; unit: Unit }[];
  strings: Strings["goal"];
  errorStrings: Strings["errors"];
}) {
  const [label, setLabel] = useState("");
  const [bedingungen, setBedingungen] = useState<BedingungEntwurf[]>([]);
  const [tage, setTage] = useState("1");
  const [fenster, setFenster] = useState("");
  const [state, setState] = useState<
    | "idle"
    | "saved"
    | "label-missing"
    | "label-too-long"
    | "unknown-measure"
    | "measure-not-in-profile"
    | "unit-mismatch"
    | "unknown-measure-key"
    | "value-missing"
    | "days-out-of-range"
    | "window-too-short"
    | "too-many-thresholds"
    | "invalid"
    | "no-episode"
    | "failed"
    | "offline"
  >("idle");
  const [pending, start] = useTransition();

  const testName: Record<TestType, string> = {
    calf_raise: strings.calfRaise,
    single_hop: strings.singleHop,
    rom: strings.rom,
  };

  /**
   * Was zur Auswahl steht: Tagebuchfelder, die Tests DIESES Profils, und die
   * eigenen Masse.
   *
   * Alle drei sind die eigenen Daten des Nutzers — kein Vorschlag, was daran
   * erstrebenswert wäre. Die Zahl daneben schreibt er selbst.
   */
  const quellen: { wert: string; text: string }[] = [
    { wert: "morning_score", text: strings.measureMorning },
    { wert: "symptom_score", text: strings.measureSymptom },
    { wert: "session_minutes", text: strings.measureSessionMinutes },
    ...tests.flatMap((t) => [
      { wert: `test:${t}:involved`, text: `${testName[t]} — ${strings.sideInvolved}` },
      { wert: `test:${t}:uninvolved`, text: `${testName[t]} — ${strings.sideUninvolved}` },
    ]),
    ...measureKeys.map((k) => ({ wert: `key:${k.key}`, text: k.key })),
  ];

  const MELDUNGEN: Record<
    Exclude<typeof state, "idle">,
    { text: string; tone: string; role: "alert" | "status" }
  > = {
    "label-missing": { text: strings.labelMissing, tone: "var(--amber)", role: "alert" },
    "label-too-long": { text: strings.labelTooLong, tone: "var(--amber)", role: "alert" },
    "unknown-measure": { text: strings.unknownMeasure, tone: "var(--amber)", role: "alert" },
    "measure-not-in-profile": { text: strings.measureNotInProfile, tone: "var(--amber)", role: "alert" },
    "unit-mismatch": { text: strings.unitMismatch, tone: "var(--amber)", role: "alert" },
    "unknown-measure-key": { text: strings.unknownMeasureKey, tone: "var(--amber)", role: "alert" },
    "value-missing": { text: strings.valueMissing, tone: "var(--amber)", role: "alert" },
    "days-out-of-range": { text: strings.daysOutOfRange, tone: "var(--amber)", role: "alert" },
    "window-too-short": { text: strings.windowTooShort, tone: "var(--amber)", role: "alert" },
    "too-many-thresholds": { text: strings.tooManyThresholds, tone: "var(--amber)", role: "alert" },
    invalid: { text: strings.invalid, tone: "var(--amber)", role: "alert" },
    "no-episode": { text: strings.noEpisode, tone: "var(--red)", role: "alert" },
    offline: { text: errorStrings.offline, tone: "var(--amber)", role: "alert" },
    failed: { text: errorStrings.notSaved, tone: "var(--red)", role: "alert" },
    saved: { text: strings.saved, tone: "var(--green)", role: "status" },
  };
  const meldung = state === "idle" ? null : MELDUNGEN[state];

  const setzeBedingung = (i: number, patch: Partial<BedingungEntwurf>) => {
    setBedingungen((b) => b.map((eintrag, j) => (j === i ? { ...eintrag, ...patch } : eintrag)));
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
            let result: Awaited<ReturnType<typeof saveMilestoneAction>>;
            try {
              result = await saveMilestoneAction(locale, episodeId, {
                label,
                locale,
                createdOn: today,
                all: bedingungen.map((b) => {
                  const measure = measureAus(b.quelle);
                  const zwingend = measure === null ? null : unitOf(measure);
                  return {
                    measure,
                    direction: b.direction,
                    value: zahlOderNull(b.value),
                    // Wo die Einheit feststeht, wird sie genommen und nicht
                    // gefragt. Die Server-Aktion prüft dasselbe noch einmal.
                    unit: zwingend ?? b.unit,
                  };
                }),
                onDistinctDays: zahlOderNull(tage),
                withinDays: fenster.trim() === "" ? null : zahlOderNull(fenster),
              });
            } catch {
              setState("failed");
              return;
            }

            if (result.ok) {
              setState("saved");
              // Nach dem Anlegen leeren: Das Ziel steht jetzt in der Liste
              // darunter, und ein stehengebliebenes Formular lädt dazu ein,
              // dasselbe Ziel zweimal anzulegen.
              setLabel("");
              setBedingungen([]);
              setTage("1");
              setFenster("");
            } else {
              setState(result.reason);
            }
          });
        }}
        style={{ display: "grid", gap: "var(--space-4)" }}
      >
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <label htmlFor="goalLabel" style={fieldLabel}>
            {strings.label}
          </label>
          {/* Ein leeres Textfeld. Kein `list`, keine Vorschläge — siehe Kopf. */}
          <textarea
            id="goalLabel"
            rows={2}
            value={label}
            maxLength={200}
            onChange={(e) => {
              setLabel(e.target.value);
              if (state !== "idle") setState("idle");
            }}
            aria-describedby="goalLabel-hint"
            style={{ ...field, fontFamily: "inherit" }}
          />
          <span id="goalLabel-hint" style={hint}>
            {strings.labelHint}
          </span>
        </div>

        <fieldset style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "var(--space-3)" }}>
          <legend style={{ ...fieldLabel, padding: "0 0.4rem" }}>{strings.conditionHeading}</legend>
          <p style={{ ...hint, margin: "0 0 var(--space-3)" }}>{strings.conditionHint}</p>

          {bedingungen.map((b, i) => {
            const measure = measureAus(b.quelle);
            const zwingend = measure === null ? null : unitOf(measure);

            return (
              <div
                key={i}
                data-condition={i}
                style={{ display: "grid", gap: "0.4rem", marginBottom: "var(--space-3)" }}
              >
                <label style={{ display: "grid", gap: "0.2rem" }}>
                  <span style={hint}>{strings.measure}</span>
                  <select
                    value={b.quelle}
                    onChange={(e) => setzeBedingung(i, { quelle: e.target.value })}
                    style={{ ...field, maxWidth: "24rem" }}
                  >
                    {quellen.map((q) => (
                      <option key={q.wert} value={q.wert}>
                        {q.text}
                      </option>
                    ))}
                  </select>
                </label>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "end" }}>
                  <label style={{ display: "grid", gap: "0.2rem" }}>
                    <span style={hint}>{strings.direction}</span>
                    <select
                      value={b.direction}
                      onChange={(e) =>
                        setzeBedingung(i, { direction: e.target.value as "at_least" | "at_most" })
                      }
                      style={{ ...field, maxWidth: "10rem" }}
                    >
                      <option value="at_least">{strings.atLeast}</option>
                      <option value="at_most">{strings.atMost}</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: "0.2rem" }}>
                    <span style={hint}>{strings.value}</span>
                    <input
                      inputMode="decimal"
                      value={b.value}
                      onChange={(e) => setzeBedingung(i, { value: e.target.value })}
                      style={{ ...field, maxWidth: "7rem" }}
                    />
                  </label>

                  {/* Die Einheit nur dort zur Wahl, wo sie nicht feststeht. */}
                  {zwingend === null ? (
                    <label style={{ display: "grid", gap: "0.2rem" }}>
                      <span style={hint}>{strings.unit}</span>
                      <select
                        value={b.unit}
                        onChange={(e) => setzeBedingung(i, { unit: e.target.value as Unit })}
                        style={{ ...field, maxWidth: "9rem" }}
                      >
                        {(["reps", "cm", "deg", "min", "sec", "score_0_10"] as Unit[]).map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span data-fixed-unit={zwingend} style={{ ...hint, paddingBottom: "0.7rem" }}>
                      {zwingend}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setBedingungen((liste) => liste.filter((_, j) => j !== i))}
                    style={quietButton}
                  >
                    {strings.removeCondition}
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setBedingungen((liste) => [...liste, LEERE_BEDINGUNG])}
            style={quietButton}
          >
            {strings.addCondition}
          </button>
        </fieldset>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <label style={{ display: "grid", gap: "0.2rem" }}>
            <span style={fieldLabel}>{strings.onDistinctDays}</span>
            <input
              inputMode="numeric"
              value={tage}
              onChange={(e) => {
                setTage(e.target.value);
                if (state !== "idle") setState("idle");
              }}
              aria-describedby="goalDays-hint"
              style={{ ...field, maxWidth: "6rem" }}
            />
            <span id="goalDays-hint" style={hint}>
              {strings.onDistinctDaysHint}
            </span>
          </label>

          <label style={{ display: "grid", gap: "0.2rem" }}>
            <span style={fieldLabel}>{strings.withinDays}</span>
            <input
              inputMode="numeric"
              value={fenster}
              placeholder={strings.withinDaysNone}
              onChange={(e) => {
                setFenster(e.target.value);
                if (state !== "idle") setState("idle");
              }}
              aria-describedby="goalWindow-hint"
              style={{ ...field, maxWidth: "8rem" }}
            />
            <span id="goalWindow-hint" style={hint}>
              {strings.withinDaysHint}
            </span>
          </label>
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
          {pending ? "…" : strings.create}
        </button>
      </form>
    </section>
  );
}
