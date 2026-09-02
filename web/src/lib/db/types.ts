/**
 * The shape of the database, and the seam where its rows become engine types.
 *
 * ---------------------------------------------------------------------------
 * Written by hand rather than generated, and that is a decision worth stating.
 *
 * A generated file would be a second description of the same truth, drifting
 * whenever somebody edits a migration without regenerating. These types are
 * derived from the ENGINE's types wherever a column corresponds to one — so a
 * new activity kind or test type is a compile error here, in the same breath as
 * everywhere else, rather than a silently wider `string`.
 * ---------------------------------------------------------------------------
 */

import { ALL_BLOCKING_REASONS, ALL_REASON_CODES, RULE_VERSION } from "loadwise-engine";
import type {
  ActivityKind,
  BodyRegion,
  Entry,
  EpisodeContext,
  BlockingReason,
  Config,
  Coverage,
  DateStr,
  Evaluation,
  Flag,
  FlagKind,
  Overall,
  Pending,
  Problem,
  Severity,
  SelfTest,
  Side,
  SymptomTiming,
  TestType,
  Unit,
  EverydayLoad,
} from "loadwise-engine";
import type { Measurement, Milestone, ProgressReport, Threshold } from "loadwise-engine";

export interface EpisodeRow {
  id: string;
  user_id: string;
  created_at: string;
  body_region: BodyRegion;
  profile_key: string | null;
  side: Side;
  started_on: string | null;
  ended_on: string | null;
  label: string | null;
  /**
   * Archiviert heisst: aus der Liste verschwunden, nicht gelöscht.
   *
   * Endgültiges Löschen gehört zu Datenexport und Kontolöschung — löschen darf
   * nur, wer vorher exportieren konnte. Ein Löschknopf ohne Ausgang wäre in
   * einem Tagebuch, das jemand über Monate führt, eine Falle.
   */
  archived_at: string | null;
}

/**
 * Ein Profilwechsel, so wie die Datenbank ihn festhält.
 *
 * Geschrieben von einem Trigger, nie von der App: Ein Wechsel und sein Eintrag
 * müssen dieselbe Transaktion sein, sonst gibt es Wechsel ohne Erklärung oder
 * Erklärungen ohne Wechsel. Die App liest hier nur.
 */
export interface ProfileChangeRow {
  id: string;
  episode_id: string;
  changed_at: string;
  /** Null: eine Episode aus der Zeit vor benannten Profilen. */
  from_key: string | null;
  to_key: string;
}

export interface EntryRow {
  id: string;
  episode_id: string;
  entry_date: string;
  morning_score: number;
  /** Siehe EverydayLoad im Motor: erfasst, von keiner Regel gelesen. */
  everyday_load: EverydayLoad | null;
  /** Minuten. Siehe Entry.morningStiffnessMin — VISA-A, Frage 1. */
  morning_stiffness_min: number | null;
  /** Dreiwertig: ja, nein, keine Angabe. Eine fehlende Angabe ist kein Nein. */
  pain_medication: boolean | null;
  symptom_score: number | null;
  symptom_timing: SymptomTiming | null;
  note: string | null;
}

/**
 * Eine Einheit, so wie die Datenbank sie hält.
 *
 * Eigene Tabelle statt Spalten auf `entries`: Ein Tag hat null bis mehrere
 * Einheiten, und drei feste Spalten waren genau die Grenze, an der jemand, der
 * morgens läuft und abends Kraft macht, die Hälfte seines Tages verlor.
 *
 * Alle drei Angaben sind Pflicht — hier wie im Typ `Session` des Motors. Die
 * halbe Einheit ist damit nicht mehr darstellbar.
 */
export interface SessionRow {
  id: string;
  entry_id: string;
  position: number;
  activity_kind: ActivityKind;
  duration_min: number;
  rpe: number;
}

export interface SelfTestRow {
  id: string;
  episode_id: string;
  test_type: TestType;
  test_date: string;
  involved: number;
  uninvolved: number;
  note: string | null;
}

export interface MeasureKeyRow {
  id: string;
  episode_id: string;
  key: string;
  unit: Unit;
}

export interface MeasurementRow {
  id: string;
  measure_key_id: string;
  measured_on: string;
  value: number;
  note: string | null;
}

// ---------------------------------------------------------------------------
// Rows → engine
//
// The engine takes plain data and knows nothing about where it came from. These
// four functions are the only place that changes, which is why they are short
// and why nothing else in the app is allowed to construct an `Entry` by hand.
// ---------------------------------------------------------------------------

/**
 * Eine Tageszeile plus ihre Einheiten.
 *
 * Die Einheiten kommen getrennt herein, weil sie aus einer eigenen Tabelle
 * stammen. Sortiert nach `position`: Ein Bericht soll den Tag in der
 * Reihenfolge zeigen, in der er stattgefunden hat, nicht in der, in der die
 * Datenbank die Zeilen zurückgab.
 */
export function toEntry(row: EntryRow, sessions: SessionRow[] = []): Entry {
  return {
    date: row.entry_date,
    morningScore: row.morning_score,
    sessions: [...sessions]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        activityKind: s.activity_kind,
        durationMin: s.duration_min,
        rpe: s.rpe,
      })),
    everydayLoad: row.everyday_load,
    morningStiffnessMin: row.morning_stiffness_min,
    painMedication: row.pain_medication,
    symptomScore: row.symptom_score,
    symptomTiming: row.symptom_timing,
    note: row.note,
  };
}

export function toSelfTest(row: SelfTestRow): SelfTest {
  return {
    type: row.test_type,
    date: row.test_date,
    involved: row.involved,
    uninvolved: row.uninvolved,
  };
}

export interface MilestoneRow {
  id: string;
  episode_id: string;
  origin: "user";
  label_text: string;
  label_locale: string;
  created_on: string;
  thresholds: unknown;
  on_distinct_days: number;
  within_days: number | null;
  marked_reached_on: string | null;
}

/**
 * Eine Meilensteinzeile als das, was der Motor über sie wissen muss.
 *
 * ---------------------------------------------------------------------------
 * `thresholds` KOMMT ALS `unknown` HEREIN, UND DAS IST KEINE NACHLÄSSIGKEIT.
 *
 * Es ist eine jsonb-Spalte. Was dort steht, hat die Server-Aktion beim
 * Schreiben geprüft — aber diese Funktion liest, und Lesen und Schreiben
 * können Monate auseinanderliegen. Eine Zeile aus einer älteren Fassung des
 * Formulars, ein Import, ein Eingriff von Hand: Alles davon landet hier.
 *
 * Der Motor verlässt sich auf die Form (`Threshold[]`), und eine kaputte
 * Bedingung würde `evaluateProgress` nicht zum Absturz bringen, sondern zu
 * einer stillen Fehlmessung — `seriesOf` fände nichts und meldete
 * »nicht im Tagebuch«, wo »nicht lesbar« richtig wäre.
 *
 * Deshalb wird hier gefiltert statt zugesichert: Was nicht die Form eines
 * `Threshold` hat, fliegt raus. Ein Meilenstein mit weniger Bedingungen ist
 * ehrlicher als einer mit einer, die niemand deuten kann — und ein Ziel, dem
 * ALLE Bedingungen abhandenkommen, wird zu einem zum Selbstabhaken, was genau
 * der richtige Zustand für eine Bedingung ist, die keine Regel lesen kann.
 * ---------------------------------------------------------------------------
 */
export function toMilestone(row: MilestoneRow): Milestone {
  const roh = Array.isArray(row.thresholds) ? row.thresholds : [];

  const all = roh.filter((t): t is Threshold => {
    if (t === null || typeof t !== "object") return false;
    const k = t as { measure?: unknown; direction?: unknown; value?: unknown; unit?: unknown };
    if (k.measure === null || typeof k.measure !== "object") return false;
    if (typeof (k.measure as { source?: unknown }).source !== "string") return false;
    if (k.direction !== "at_least" && k.direction !== "at_most") return false;
    if (typeof k.value !== "number" || !Number.isFinite(k.value)) return false;
    if (typeof k.unit !== "string") return false;
    return true;
  });

  return {
    id: row.id,
    // Literal, nicht durchgereicht. Die Spalte trägt einen Aufzählungstyp mit
    // genau einem Wert; ihn hier zu übernehmen hiesse, dem Typ zu glauben,
    // was die Datenbank ohnehin erzwingt — und den Tag vorzubereiten, an dem
    // ein zweiter Wert dazukommt und still durchrutscht.
    origin: "user",
    label: {
      text: row.label_text,
      locale: row.label_locale === "en" ? "en" : "de",
    },
    createdOn: row.created_on as Milestone["createdOn"],
    all,
    onDistinctDays: row.on_distinct_days,
    ...(row.within_days === null ? {} : { withinDays: row.within_days }),
    markedReachedOn: (row.marked_reached_on as Milestone["markedReachedOn"]) ?? null,
  };
}

export function toMeasurement(row: MeasurementRow, key: MeasureKeyRow): Measurement {
  return {
    key: key.key,
    date: row.measured_on,
    value: row.value,
    unit: key.unit,
    note: row.note,
  };
}

/**
 * Eine Episodenzeile als das, was der Motor über sie wissen muss.
 *
 * ---------------------------------------------------------------------------
 * DAS PROFIL WIRD HIER NICHT AUFGELÖST, UND DAS IST ABSICHT.
 *
 * Weitergereicht wird der SCHLÜSSEL, nicht das Profil. `evaluateEpisode` löst
 * ihn selbst auf — benanntes Profil zuerst, sonst das Standardprofil der
 * Region —, und `profileOf` in `profile-view.ts` tut für die Anzeige dasselbe.
 *
 * Hier ein drittes Mal aufzulösen hiesse, eine dritte Stelle zu haben, an der
 * dieselbe Frage beantwortet wird. Der Tag, an dem eine davon abweicht, ist der
 * Tag, an dem die Überschrift ein anderes Profil nennt als das, unter dem
 * geurteilt wurde — und beides sähe richtig aus.
 * ---------------------------------------------------------------------------
 */
export function toEpisodeContext(row: EpisodeRow): EpisodeContext {
  return {
    bodyRegion: row.body_region,
    side: row.side,
    // undefined statt null: Der Motor unterscheidet »nicht angegeben« von
    // »ausdrücklich leer«, und `profileKey: null` wäre ein Schlüssel, der zu
    // nichts passt statt gar keiner.
    profileKey: row.profile_key ?? undefined,
    startedOn: row.started_on ?? undefined,
    endedOn: row.ended_on,
  };
}

// ---------------------------------------------------------------------------
// Engine → rows
//
// Die Gegenrichtung, und sie ist neuer: Bis Karte 2.2 floss nur die Datenbank
// in den Motor, nie zurück.
//
// ---------------------------------------------------------------------------
// WARUM DIESE ZWEI FUNKTIONEN HIER STEHEN UND NICHT IM SCHREIBMODUL.
//
// `verdict-write.ts` trägt `import "server-only"` — und das ist keine Zierde:
// Das Paket WIRFT beim Import ausserhalb einer Serverumgebung. Damit ist von
// dort nichts erreichbar für ein Prüfskript, das die Zeilen gegen die echte
// Datenbank schicken will.
//
// Und genau das braucht es. Ein Test mit einer Attrappe belegt, dass diese
// Felder heissen, wie diese Datei sie nennt. Ob eine Spalte wirklich so heisst,
// ob `severity` den Wert kennt, ob der CHECK `severity_only_when_judged` hält —
// darüber sagt eine Attrappe nichts. Fünfzehn von Hand geschriebene
// Feldzuordnungen gegen ein Schema, das jemand einmal gelesen hat.
//
// Also: die Zeilen hier, rein und importierbar. Die Reihenfolge — erst Flags,
// dann Auswertung — bleibt im Schreibmodul, denn sie ist der Teil, der einen
// Zugang braucht.
// ---------------------------------------------------------------------------

/**
 * Eine Flag als Zeile, mit der Kennung des Laufs, zu dem sie gehört.
 *
 * `laufId` kommt von aussen und nicht aus der Flag: Alle Flags eines Laufs
 * tragen dieselbe, und die Auswertung, die sie zusammenhält, gibt es zu diesem
 * Zeitpunkt noch nicht — sie wird ABSICHTLICH danach geschrieben. Siehe E12.
 */
export function toFlagRow(flag: Flag, laufId: string, episodeId: string) {
  return {
    evaluation_id: laufId,
    episode_id: episodeId,
    kind: flag.kind,
    for_date: flag.forDate,
    severity: flag.severity,
    reason: flag.reason,
    detail: flag.detail,
    rule_version: flag.ruleVersion,
    profile_version: flag.profileVersion,
  };
}

/** Der Lauf als Ganzes: Gesamtbild, Abdeckung, Blockaden — und sein Massstab. */
export function toEvaluationRow(evaluation: Evaluation, laufId: string, episodeId: string) {
  return {
    id: laufId,
    episode_id: episodeId,
    overall_status: evaluation.overall.status,
    // Eine Schwere gibt es nur bei `judged`. Der Typ `Overall` erzwingt, dass
    // man sie nicht lesen kann, ohne den Status geprüft zu haben; die Datenbank
    // hält dieselbe Bedingung noch einmal als CHECK.
    overall_severity: evaluation.overall.status === "judged" ? evaluation.overall.severity : null,
    // Die dritte Variante der Union, und sie ging in 0007 verloren.
    //
    // `insufficient` trägt die Gründe, warum es keine Entwarnung gab. Ohne sie
    // ist der Zustand gespeichert und seine Begründung nicht — derselbe Fehler
    // wie in der Härtungswoche, wo `overall.blocking` gesetzt und nie gezeigt
    // wurde, nur eine Ebene tiefer. Siehe 0008.
    blocking: evaluation.overall.status === "insufficient" ? evaluation.overall.blocking : [],
    coverage: evaluation.coverage,
    pending: evaluation.pending,
    problems: evaluation.problems,
    // Der vierte Ausgang des Motors. Er ging bis 0011 beim Schreiben verloren
    // -- berechnet bei jedem Lauf, abgelegt bei keinem. Derselbe Mechanismus
    // wie bei `overall.blocking` in 0008.
    progress: evaluation.progress,
    profile_key: evaluation.profile.key,
    profile_version: evaluation.profile.version,
    // Aus dem Motor, nicht von einer Flag abgelesen: Ein Lauf ganz ohne Befund
    // ist der Normalfall und hätte sonst keine Regelversion. Und abgeschrieben
    // wäre sie eine zweite Wahrheit, die beim nächsten Regelwechsel
    // auseinanderliefe, ohne dass irgendwo etwas rot wird.
    rule_version: RULE_VERSION,
    config: evaluation.config,
    last_date: evaluation.lastDate,
  };
}

// ---------------------------------------------------------------------------
// Rows → engine, die Urteilsseite
//
// ---------------------------------------------------------------------------
// HIER STEHT DIE EINZIGE UNGEPRÜFTE ZUSICHERUNG DIESER DATEI, UND SIE MUSS
// GEPRÜFT WERDEN.
//
// `Flag` bindet `kind` an `detail`: Zu `load_spike` gehört ein
// `LoadSpikeDetail` und nichts anderes. Aus der Datenbank kommt `detail` als
// jsonb, also als `unknown` — der Typprüfer kann die Bindung von dort aus nicht
// halten.
//
// Das ist nicht theoretisch. Jede Flag trägt `rule_version` und
// `profile_version`, WEIL sich Regeln ändern. Eine Flag aus einer früheren
// Fassung kann eine `kind` tragen, die es nicht mehr gibt, oder einen `reason`,
// den das Wörterbuch nicht kennt. Ungeprüft übernommen ergäbe das eine Zeile
// mit `undefined` als Regelname und einem leeren Urteilssatz — also eine
// Auffälligkeit, die niemand lesen kann, aber jeder sieht.
//
// Also: prüfen und im Zweifel NICHT übernehmen. Wie viele dabei wegfallen,
// muss die Seite sagen — stillschweigend weniger Befunde zu zeigen wäre in
// diesem Produkt die falsche Richtung.
// ---------------------------------------------------------------------------

const FLAG_KINDS = new Set<string>([
  "response_24h",
  "load_spike",
  "asymmetry",
  "baseline_drift",
  "pain_pattern",
  "stagnation",
  "load_spread",
] satisfies FlagKind[]);

const REASON_CODES = new Set<string>(ALL_REASON_CODES);
const SEVERITIES = new Set<string>(["green", "amber", "red"] satisfies Severity[]);

export interface FlagRow {
  id: string;
  evaluation_id: string;
  episode_id: string;
  computed_at: string;
  kind: string;
  for_date: string;
  severity: string;
  reason: string;
  detail: unknown;
  rule_version: string;
  profile_version: string;
}

/**
 * Eine gespeicherte Flag als Motortyp — oder `null`, wenn sie es nicht mehr ist.
 *
 * Die Zusicherung am Ende ist eine echte: `detail` kommt als jsonb herein und
 * wird nicht Feld für Feld geprüft. Was geprüft wird, sind die drei Werte, an
 * denen sich eine veraltete Zeile erkennen lässt und von denen die Anzeige
 * abhängt.
 */
export function fromFlagRow(row: FlagRow): Flag | null {
  if (!FLAG_KINDS.has(row.kind)) return null;
  if (!REASON_CODES.has(row.reason)) return null;
  if (!SEVERITIES.has(row.severity)) return null;

  return {
    kind: row.kind,
    forDate: row.for_date,
    severity: row.severity,
    reason: row.reason,
    detail: row.detail,
    ruleVersion: row.rule_version,
    profileVersion: row.profile_version,
  } as Flag;
}

export interface EvaluationRow {
  id: string;
  episode_id: string;
  computed_at: string;
  overall_status: string;
  overall_severity: string | null;
  blocking: unknown;
  coverage: unknown;
  pending: unknown;
  problems: unknown;
  profile_key: string;
  profile_version: string;
  rule_version: string;
  config: unknown;
  last_date: string | null;
  progress: unknown;
}

/**
 * Ein gespeicherter Lauf, so wie eine Ansicht ihn braucht.
 *
 * Die Motortypen sind wieder zusammengesetzt — `Overall` vor allem, das als
 * drei Spalten abgelegt wird und als Union zurückkommt.
 */
export interface StoredRun {
  id: string;
  computedAt: string;
  overall: Overall;
  coverage: Coverage;
  pending: Pending[];
  problems: Problem[];
  progress: ProgressReport;
  config: Config;
  lastDate: DateStr | null;
  profileKey: string;
  profileVersion: string;
  ruleVersion: string;
  flags: Flag[];
  /**
   * Wie viele Flags aus einer Fassung stammen, die es nicht mehr gibt.
   *
   * Sie werden nicht gezeigt — ohne Regelnamen und Urteilssatz wären sie eine
   * Zeile, die niemand lesen kann. Aber sie verschwinden auch nicht still: Die
   * Zahl gehört auf den Bildschirm, sonst zeigt der Bericht weniger Befunde,
   * als der Lauf hatte, und niemand kann das sehen.
   */
  unreadableFlags: number;
}

const OVERALL_STATES = new Set<string>(["judged", "insufficient", "no-data"]);
const BLOCKING_REASONS = new Set<string>(ALL_BLOCKING_REASONS);

/**
 * Eine Auswertungszeile plus ihre Flags als Motortypen — oder `null`.
 *
 * ---------------------------------------------------------------------------
 * WAS HIER GEPRÜFT WIRD UND WARUM GERADE DAS.
 *
 * `coverage`, `pending`, `problems` und `config` kommen als jsonb herein, also
 * als `unknown`. Feld für Feld zu prüfen wäre ein Schema-Prüfer und eine
 * zweite Beschreibung derselben Typen.
 *
 * Geprüft wird deshalb genau das, wovon die ANZEIGE abhängt und dessen Fehlen
 * still wäre:
 *
 *   `overall_status`         sonst fiele die Ansicht durch alle drei Fälle
 *   `config.baseline.windowDays`  `currentFlags` teilt danach in »aktuell« und
 *                            »zurückliegend«. Fehlt der Wert, ist der Vergleich
 *                            gegen `undefined` immer falsch — und der Bericht
 *                            schöbe stillschweigend fast jeden Befund in die
 *                            Vergangenheit.
 *
 * Das zweite ist der gefährliche Fall: Er sieht auf dem Bildschirm aus wie
 * »alles zurückliegend«, also wie eine gute Nachricht.
 * ---------------------------------------------------------------------------
 */
/**
 * Hat die jsonb-Spalte die Form, die `ProgressReport` verlangt?
 *
 * Geprüft wird die Form, nicht der Inhalt: vier Felder, drei davon Listen.
 * Was in den Listen steht, hat der Motor erzeugt — und eine Zeile, die dort
 * Unsinn trüge, käme aus einem Eingriff von Hand, gegen den keine Prüfung in
 * dieser Datei hilft.
 */
function istFortschritt(wert: unknown): wert is ProgressReport {
  if (wert === null || typeof wert !== "object" || Array.isArray(wert)) return false;
  const p = wert as Record<string, unknown>;
  return Array.isArray(p.milestones) && Array.isArray(p.records) && Array.isArray(p.pending);
}

export function toStoredRun(row: EvaluationRow, flagRows: FlagRow[]): StoredRun | null {
  if (!OVERALL_STATES.has(row.overall_status)) return null;

  const config = row.config as Config | undefined;
  if (typeof config?.baseline?.windowDays !== "number") return null;

  const overall: Overall =
    row.overall_status === "judged"
      ? { status: "judged", severity: (row.overall_severity ?? "red") as Severity }
      : row.overall_status === "no-data"
        ? { status: "no-data" }
        : {
            status: "insufficient",
            // Ein Grund, den das Wörterbuch nicht kennt, würde als leere Zeile
            // erscheinen. Weglassen ist hier richtig: Die übrigen Gründe
            // stimmen weiter, und die Liste behauptet nicht, vollständig zu
            // sein.
            blocking: (Array.isArray(row.blocking) ? row.blocking : []).filter(
              (r): r is BlockingReason => typeof r === "string" && BLOCKING_REASONS.has(r),
            ),
          };

  const flags: Flag[] = [];
  let unreadableFlags = 0;
  for (const fr of flagRows) {
    const flag = fromFlagRow(fr);
    if (flag === null) unreadableFlags += 1;
    else flags.push(flag);
  }

  return {
    id: row.id,
    computedAt: row.computed_at,
    overall,
    coverage: row.coverage as Coverage,
    pending: (row.pending ?? []) as Pending[],
    problems: (row.problems ?? []) as Problem[],
    /**
     * Der Fortschrittskanal — mit einer leeren Form als Rückfall.
     *
     * Anders als bei `config` oben führt eine fehlende oder kaputte Spalte
     * hier NICHT dazu, den ganzen Lauf für unlesbar zu erklären. Der
     * Unterschied ist, was davon abhängt: Ohne `config` rendert der Bericht
     * gegen andere Schwellen, als geurteilt wurde — eine Falschaussage. Ohne
     * `progress` fehlt die Zählung der eigenen Ziele, und der Rest des Laufs
     * bleibt vollständig richtig.
     *
     * Ein Lauf aus der Zeit vor 0011 hat die Spalte über den Standardwert und
     * ist damit ehrlich leer: Es gab damals keine Ziele.
     */
    progress: istFortschritt(row.progress)
      ? row.progress
      : { milestones: [], records: [], pending: [], episodeDay: null },
    config,
    lastDate: row.last_date,
    profileKey: row.profile_key,
    profileVersion: row.profile_version,
    ruleVersion: row.rule_version,
    flags,
    unreadableFlags,
  };
}
