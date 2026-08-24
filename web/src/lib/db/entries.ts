import type { Entry, EverydayLoad, Session, SymptomTiming } from "loadwise-engine";
import { supabaseServer } from "@/lib/supabase/server";
import { toEntry, type EntryRow, type SessionRow } from "./types";

export type EntryInput = {
  date: string;
  morningScore: number;
  sessions: Session[];
  everydayLoad: EverydayLoad | null;
  symptomScore: number | null;
  symptomTiming: SymptomTiming | null;
  note: string | null;
};

/**
 * Alle Tage einer Episode, jeder mit seinen Einheiten.
 *
 * Zwei Abfragen statt eines Joins: PostgREST liefert einen Join als
 * verschachteltes Objekt, und das wäre eine dritte Beschreibung derselben
 * Struktur — neben dem Zeilentyp und dem Motortyp. Zwei flache Abfragen und
 * eine Zuordnung von Hand sind hier ehrlicher und leichter zu lesen.
 *
 * Bei neunzig Tagen sind das zwei Abfragen statt neunzig. Die Zuordnung selbst
 * läuft über eine Map und ist linear.
 */
export async function listEntries(episodeId: string): Promise<Entry[]> {
  const supabase = await supabaseServer();

  const { data: rows, error } = await supabase
    .from("entries")
    .select("*")
    .eq("episode_id", episodeId)
    .order("entry_date", { ascending: true });

  if (error !== null) throw new Error(error.message);
  const entries = (rows ?? []) as EntryRow[];
  if (entries.length === 0) return [];

  const { data: sessionRows, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .in("entry_id", entries.map((e) => e.id));

  if (sessionError !== null) throw new Error(sessionError.message);

  const byEntry = new Map<string, SessionRow[]>();
  for (const row of (sessionRows ?? []) as SessionRow[]) {
    const list = byEntry.get(row.entry_id);
    if (list === undefined) byEntry.set(row.entry_id, [row]);
    else list.push(row);
  }

  return entries.map((row) => toEntry(row, byEntry.get(row.id) ?? []));
}

/**
 * Schreibt den Eintrag eines Tages und ersetzt, was dort stand.
 *
 * ---------------------------------------------------------------------------
 * DIE EINHEITEN WERDEN ERSETZT, NICHT ERGÄNZT — UND DAS MUSS SICHTBAR SEIN.
 *
 * `upsert` auf (episode_id, entry_date) statt Suchen-und-dann-Schreiben in zwei
 * Schritten. Dieselbe Regel, die der Motor durchsetzt — ein Kalendertag ist eine
 * Zeile —, und die Datenbank entscheiden zu lassen vermeidet das Rennen, bei
 * dem zwei Reiter beide nichts finden und beide anlegen.
 *
 * Die Einheiten des Tages werden danach gelöscht und neu geschrieben. Das ist
 * die einzige Form, in der »diesen Tag ersetzen« widerspruchsfrei ist: Wer eine
 * Einheit entfernt hat, muss sie los sein, und eine Zuordnung nach Position
 * wäre bei zwei getauschten Einheiten stillschweigend falsch.
 *
 * Es ist deshalb Pflicht der Oberfläche, VORHER zu zeigen, was dasteht. Genau
 * daran ist die erste Fassung gescheitert: Das Formular war immer leer, und ein
 * nachgetragener Morgenwert löschte eine erfasste Trainingseinheit — gemeldet
 * als »Gespeichert.«.
 *
 * Einen Tag nachträglich zu bearbeiten ist ausdrücklich vorgesehen. Menschen
 * vergessen, und ein Tagebuch, das nur heute annimmt, ist ein Tagebuch mit
 * Löchern.
 * ---------------------------------------------------------------------------
 */
export async function saveEntry(episodeId: string, input: EntryInput): Promise<void> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("entries")
    .upsert(
      {
        episode_id: episodeId,
        entry_date: input.date,
        morning_score: input.morningScore,
        everyday_load: input.everydayLoad,
        symptom_score: input.symptomScore,
        symptom_timing: input.symptomTiming,
        note: input.note,
      },
      { onConflict: "episode_id,entry_date" },
    )
    .select("id")
    .single();

  if (error !== null) throw new Error(error.message);
  const entryId = (data as { id: string }).id;

  // Erst weg, dann neu. Der Löschvorgang trifft ausschliesslich die Einheiten
  // GENAU DIESES Tages, und der Aufrufer hat sie vorher angezeigt bekommen.
  const { error: clearError } = await supabase.from("sessions").delete().eq("entry_id", entryId);
  if (clearError !== null) throw new Error(clearError.message);

  if (input.sessions.length === 0) return;

  const { error: insertError } = await supabase.from("sessions").insert(
    input.sessions.map((s, position) => ({
      entry_id: entryId,
      position,
      activity_kind: s.activityKind,
      duration_min: s.durationMin,
      rpe: s.rpe,
    })),
  );
  if (insertError !== null) throw new Error(insertError.message);
}
