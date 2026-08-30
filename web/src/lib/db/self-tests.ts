import type { SelfTest, TestType } from "loadwise-engine";
import { supabaseServer } from "@/lib/supabase/server";
import { toSelfTest, type SelfTestRow } from "./types";

export type SelfTestInput = {
  type: TestType;
  date: string;
  involved: number;
  uninvolved: number;
  note: string | null;
};

/**
 * Alle Messungen einer Episode, nach Tag geordnet.
 *
 * Für die Ansicht, nicht für das Urteil — das rechnet `verdicts.ts` mit einer
 * eigenen Abfrage, weil es dort um denselben Lauf wie die Tagebuchtage geht.
 * Zwei Abfragen für dieselben Zeilen sind hier billiger als eine geteilte
 * Funktion, die beiden Aufrufern halb passt.
 */
export async function listSelfTests(episodeId: string): Promise<SelfTest[]> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("self_tests")
    .select("*")
    .eq("episode_id", episodeId)
    .order("test_date", { ascending: true });

  if (error !== null) throw new Error(error.message);
  return ((data ?? []) as SelfTestRow[]).map(toSelfTest);
}

/**
 * Schreibt eine Messung und ersetzt, was an diesem Tag für diese Testart stand.
 *
 * ---------------------------------------------------------------------------
 * ERSETZEN, NICHT ANHÄNGEN — UND DIE OBERFLÄCHE MUSS DAS VORHER ZEIGEN.
 *
 * Dieselbe Regel wie beim Tagebuchtag, aus einem schärferen Grund: Ein Verlauf
 * mit zwei Punkten über demselben Tag ist kein Verlauf. Welcher der beiden
 * gilt, müsste sonst jede lesende Stelle einzeln entscheiden — Motor, Bericht,
 * Kurve, Export — und eine davon würde es irgendwann anders tun.
 *
 * `onConflict` greift auf den eindeutigen Index aus `0009`. Ohne ihn wäre
 * dieses Upsert ein gewöhnliches Insert, das stillschweigend eine zweite Zeile
 * anlegt — deshalb prüft `npm run check:migrations`, dass 0009 eingespielt ist,
 * und nicht nur, dass die Datei existiert.
 *
 * Was hier ausdrücklich NICHT passiert: eine zweite Messung als »Versuch 2«
 * behalten. Das klänge grosszügig und wäre die Einladung, den besseren von
 * zwei Versuchen zu speichern — eine Auswahl, die den Verlauf nach oben
 * verzerrt, ohne dass jemand gelogen hätte.
 * ---------------------------------------------------------------------------
 */
export async function saveSelfTest(episodeId: string, input: SelfTestInput): Promise<void> {
  const supabase = await supabaseServer();

  const { error } = await supabase.from("self_tests").upsert(
    {
      episode_id: episodeId,
      test_type: input.type,
      test_date: input.date,
      involved: input.involved,
      uninvolved: input.uninvolved,
      note: input.note,
    },
    { onConflict: "episode_id,test_type,test_date" },
  );

  if (error !== null) throw new Error(error.message);
}
