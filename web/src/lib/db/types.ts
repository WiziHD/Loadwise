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

import { RULE_VERSION } from "loadwise-engine";
import type {
  ActivityKind,
  BodyRegion,
  Entry,
  EpisodeContext,
  Evaluation,
  Flag,
  SelfTest,
  Side,
  SymptomTiming,
  TestType,
  Unit,
  EverydayLoad,
} from "loadwise-engine";
import type { Measurement } from "loadwise-engine";

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
    coverage: evaluation.coverage,
    pending: evaluation.pending,
    problems: evaluation.problems,
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
