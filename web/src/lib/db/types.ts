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

import type {
  ActivityKind,
  BodyRegion,
  Entry,
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
