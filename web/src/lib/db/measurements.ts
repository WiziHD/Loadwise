import type { Measurement, Unit } from "loadwise-engine";
import { supabaseServer } from "@/lib/supabase/server";
import { measureKeyId } from "@/lib/measurement-validation";
import { toMeasurement, type MeasureKeyRow, type MeasurementRow } from "./types";

/**
 * Das Mass gibt es schon, in einer anderen Einheit.
 *
 * Eine eigene Fehlerklasse und nicht ein `Error` mit einer Zeichenkette darin:
 * Die Server-Aktion soll daraus »dieses Mass ist in Sekunden erfasst« machen
 * können und nicht »konnte nicht gespeichert werden«. Der zweite Satz schickte
 * jemanden dazu, es noch einmal zu versuchen — mit demselben Ergebnis.
 *
 * Erreichbar wird das nur im Rennen zwischen zwei Reitern: Die Prüfregeln
 * lehnen den Konflikt vorher ab. Dass es schwer erreichbar ist, macht den
 * Unterschied zwischen den beiden Sätzen aber nicht kleiner.
 */
export class UnitConflictError extends Error {
  constructor(
    readonly key: string,
    readonly frozen: Unit,
    readonly attempted: Unit,
  ) {
    super(`${key} ist in ${frozen} erfasst, kam aber in ${attempted}`);
    this.name = "UnitConflictError";
  }
}

export type MeasurementInput = {
  key: string;
  unit: Unit;
  date: string;
  value: number;
  note: string | null;
};

/**
 * Die Masse, die diese Episode schon kennt — mit ihrer eingefrorenen Einheit.
 *
 * Zwei Aufgaben in einer Abfrage: Das Formular bietet sie zur Wiederverwendung
 * an (die eigenen Worte des Nutzers, nicht ein Vorschlag der App), und die
 * Prüfregeln brauchen sie, um einen Einheitenkonflikt zu erkennen, bevor die
 * Datenbank ihn als Fremdschlüsselfehler meldet.
 */
export async function listMeasureKeys(episodeId: string): Promise<MeasureKeyRow[]> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("measure_keys")
    .select("*")
    .eq("episode_id", episodeId)
    .order("key", { ascending: true });

  if (error !== null) throw new Error(error.message);
  return (data ?? []) as MeasureKeyRow[];
}

/**
 * Alle eigenen Messungen einer Episode, nach Tag geordnet.
 *
 * Zwei Abfragen statt eines Joins, aus demselben Grund wie bei den
 * Tagebucheinträgen: Ein verschachteltes PostgREST-Objekt wäre eine dritte
 * Beschreibung derselben Struktur neben Zeilentyp und Motortyp.
 */
export async function listMeasurements(episodeId: string): Promise<Measurement[]> {
  const supabase = await supabaseServer();

  const keys = await listMeasureKeys(episodeId);
  if (keys.length === 0) return [];

  const { data, error } = await supabase
    .from("measurements")
    .select("*")
    .in("measure_key_id", keys.map((k) => k.id))
    // Sortiert, und nicht aus Ordnungsliebe: `progress.ts` baut daraus eine
    // Reihe. Eine unsortierte Abfrage liesse die Reihenfolge der Punkte offen,
    // und `seriesOf` sortiert zwar selbst nach Datum — aber stabil, also
    // entschiede bei gleichem Datum weiterhin die Abfrage. 0010 macht das
    // unmöglich; das hier deckt den Weg ab, auf dem es trotzdem entsteht.
    .order("measured_on", { ascending: true })
    .order("created_at", { ascending: true });

  if (error !== null) throw new Error(error.message);

  const byId = new Map(keys.map((k) => [k.id, k]));
  return ((data ?? []) as MeasurementRow[])
    .map((row) => {
      const key = byId.get(row.measure_key_id);
      return key === undefined ? null : toMeasurement(row, key);
    })
    // Eine Messung ohne ihr Mass ist unlesbar, nicht bloss unvollständig: Ohne
    // den Schlüssel gibt es weder Namen noch Einheit. Kann nur passieren, wenn
    // die zweite Abfrage etwas sieht, das die erste nicht sah — dann lieber
    // eine Messung weniger als eine ohne Einheit.
    .filter((m): m is Measurement => m !== null);
}

/**
 * Schreibt eine Messung und legt das Mass an, falls es neu ist.
 *
 * ---------------------------------------------------------------------------
 * DIE EINHEIT WIRD BEIM ERSTEN MAL EINGEFROREN — UND ZWAR HIER, NICHT IM
 * FORMULAR.
 *
 * Das Formular zeigt die eingefrorene Einheit an und sperrt das Feld. Das ist
 * eine Hilfe, keine Sicherung: Eine Server-Aktion ist ein öffentlicher
 * Endpunkt. Also wird das Mass hier nachgeschlagen, und was gespeichert wird,
 * ist die Einheit der EXISTIERENDEN Zeile — nie die, die hereinkam.
 *
 * Der Aufrufer hat vorher `validateMeasurement` laufen lassen und einen
 * Konflikt damit schon abgelehnt. Diese Zeile ist die zweite Verteidigung:
 * Zwischen der Prüfung und dem Schreiben liegt eine Abfrage, und in dieser
 * Lücke kann ein zweiter Reiter dasselbe Mass in einer anderen Einheit
 * angelegt haben.
 *
 * **Und sie WIRFT, statt auszuweichen.** Ein erster Entwurf nahm hier still
 * die eingefrorene Einheit — das klang nach Nachsicht und wäre der Fehler
 * gewesen, den diese Karte verhindern soll: Wer 30 Sekunden eintippt und 30
 * Minuten gespeichert bekommt, hat eine Zahl im Verlauf, die niemand mehr als
 * falsch erkennen kann. Lieber ein Satz auf dem Bildschirm als eine stumme
 * Umdeutung.
 *
 * ---------------------------------------------------------------------------
 * NACHGESCHLAGEN WIRD OHNE RÜCKSICHT AUF GROSS- UND KLEINSCHREIBUNG.
 *
 * »Kniebeugen« und »kniebeugen« wären sonst zwei Masse — zwei Reihen, jede für
 * sich plausibel, wo eine gemeint war, und auf dem Bildschirm nicht zu
 * unterscheiden. Gespeichert bleibt die ERSTE Schreibweise: Der Nutzer hat das
 * Mass benannt, und es soll dastehen, wie er es geschrieben hat.
 *
 * Der eindeutige Index aus 0010 rechnet mit `lower(btrim(key))` und hält
 * dasselbe eine Ebene tiefer — für Wege, die an dieser Funktion vorbeigehen.
 * ---------------------------------------------------------------------------
 */
export async function saveMeasurement(episodeId: string, input: MeasurementInput): Promise<void> {
  const supabase = await supabaseServer();

  const name = input.key.trim();
  const vorhandene = await listMeasureKeys(episodeId);
  const treffer = vorhandene.find((k) => measureKeyId(k.key) === measureKeyId(name));

  let keyId: string;

  if (treffer !== undefined) {
    if (treffer.unit !== input.unit) {
      throw new UnitConflictError(treffer.key, treffer.unit, input.unit);
    }
    keyId = treffer.id;
  } else {
    const { data, error } = await supabase
      .from("measure_keys")
      .insert({ episode_id: episodeId, key: name, unit: input.unit })
      .select("id")
      .single();
    if (error !== null) throw new Error(`measure_keys: ${error.message}`);
    keyId = (data as { id: string }).id;
  }

  const { error } = await supabase.from("measurements").upsert(
    {
      measure_key_id: keyId,
      measured_on: input.date,
      value: input.value,
      note: input.note,
    },
    { onConflict: "measure_key_id,measured_on" },
  );
  if (error !== null) throw new Error(`measurements: ${error.message}`);
}
