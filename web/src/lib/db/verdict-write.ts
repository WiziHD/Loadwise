import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Evaluation } from "loadwise-engine";
import { toEvaluationRow, toFlagRow } from "@/lib/db/types";

/**
 * Die EINZIGE Stelle in der App, die den Service-Role-Schlüssel anfasst.
 *
 * ---------------------------------------------------------------------------
 * DIE FRAGE, DIE VOR DIESER DATEI STAND: GEHT ES AUCH OHNE?
 *
 * Karte 2.2 nennt eine Alternative — eine Postgres-Funktion mit
 * `security definer`, so wie der Trigger, der Profilwechsel festhält. Dann
 * bliebe der Schlüssel ganz draussen.
 *
 * **Sie funktioniert hier nicht, und der Grund ist der Unterschied zwischen
 * einem Trigger und einer Funktion.**
 *
 * Der Trigger in 0006 ist sicher, weil er auf einem UPDATE feuert, das dem
 * Konto ohnehin erlaubt ist, und `old.profile_key → new.profile_key` aufzeichnet
 * — Werte, die das Konto der Aufzeichnung nicht übergibt. Es kann ihn nicht
 * belügen.
 *
 * Eine Funktion `record_evaluation(episode_id, status, severity, flags)` ist
 * das Gegenteil: **Das Konto liefert das Urteil.** Jeder Angemeldete könnte sie
 * mit `severity = 'green'` aufrufen. Die eine Zusicherung, für die `flags` und
 * `evaluations` nur lesbar sind — dass ein manipulierter Client sich kein
 * »alles in Ordnung« schreiben kann —, wäre vollständig weg. Und sie sähe
 * sicher aus, weil »security definer« im Quelltext steht.
 *
 * Sicher wäre die Funktion nur, wenn sie das Urteil SELBST berechnete, also
 * wenn die sieben Regeln in PL/pgSQL lägen. Das sind zwei Kopien der Regeln —
 * genau das, was E2 als »der Tag, an dem sich ein Urteil ändert, ohne dass es
 * jemand entschieden hat« beschreibt.
 *
 * `revoke execute from authenticated` wäre der Ausweg — dann könnte nur
 * `service_role` die Funktion rufen, und dafür braucht es den Schlüssel. Im
 * Kreis.
 *
 * ---------------------------------------------------------------------------
 * ALSO KOMMT ER ZURÜCK. UNTER VIER BEDINGUNGEN.
 *
 * 1. **`import "server-only"`.** Der Fehlversuch, das hier aus einem
 *    Client-Bauteil zu importieren, ist ein Build-Fehler statt eines
 *    Kommentars, den jemand überliest.
 *
 * 2. **Nur diese eine Aufgabe.** Kein allgemeiner »Admin-Client«, kein Export
 *    des Clients. Diese Datei kann genau eine Sache: einen Auswertungslauf
 *    schreiben. `npm run check:service-role --workspace=web` hält das fest.
 *
 * 3. **Er liest nie Nutzerdaten.** Das Lesen läuft weiter über den anon key,
 *    damit jede Abfrage durch die Zugriffsregeln geht. Serverseitig zu sein ist
 *    kein Grund, die Prüfung zu überspringen — ein Fehler in einer Abfrage läse
 *    sonst ein fremdes Tagebuch und sähe dabei aus, als funktioniere er.
 *
 * 4. **Der Aufrufer übergibt nie ein Urteil von aussen.** Die Server-Aktion
 *    nimmt eine Episodenkennung entgegen, prüft die Zugehörigkeit über den anon
 *    key, liest die Daten selbst und lässt den Motor laufen. Was hier
 *    hereinkommt, hat der Server berechnet.
 *
 * ---------------------------------------------------------------------------
 * DIE REIHENFOLGE IST DIE SICHERUNG. ZUERST DIE FLAGS, DANN DIE AUSWERTUNG.
 *
 * supabase-js kennt keine Transaktion über zwei Anweisungen. Bricht es
 * dazwischen ab, gibt es zwei mögliche Halbheiten — und nur eine davon ist
 * harmlos:
 *
 *   Auswertung ohne Flags  →  liest sich als »keine Auffälligkeiten«.
 *                             EINE STILLE ENTWARNUNG.
 *   Flags ohne Auswertung  →  findet kein Leser, weil jeder über die
 *                             `evaluation_id` einer EXISTIERENDEN Auswertung
 *                             geht.
 *
 * Deshalb ist die Auswertungszeile der Punkt, an dem ein Lauf gilt. Siehe den
 * Kopf von `0007_evaluation_run.sql`; dort steht auch, warum
 * `flags.evaluation_id` absichtlich kein Fremdschlüssel ist — einer würde genau
 * diese Reihenfolge verbieten.
 * ---------------------------------------------------------------------------
 */

/**
 * Der Zugang, bei jedem Aufruf neu und nirgends abgelegt.
 *
 * Kein Modul-Singleton: Ein Client, der zwischen zwei Anfragen liegen bleibt,
 * ist ein Objekt mit einem RLS-umgehenden Schlüssel, das auf niemanden mehr
 * zeigt. Ihn zu bauen kostet nichts.
 */
function zugang() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const schluessel = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url === undefined || url.trim() === "") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL fehlt.");
  }
  if (schluessel === undefined || schluessel.trim() === "") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY fehlt. Ohne ihn lassen sich keine Urteile speichern — " +
        "die Zugriffsregeln erlauben Konten nur das Lesen von flags und evaluations.",
    );
  }

  return createClient(url, schluessel, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Schreibt einen Auswertungslauf: erst seine Flags, dann die Auswertung selbst.
 *
 * Gibt die Kennung des Laufs zurück. Wirft, wenn etwas nicht durchging — der
 * Aufrufer entscheidet, was das für den Tageseintrag bedeutet, der ihn
 * ausgelöst hat. (Antwort: nichts. Ein gespeicherter Eintrag bleibt
 * gespeichert; nur das Urteil ist dann älter als er.)
 */
export async function saveEvaluationRun(
  episodeId: string,
  evaluation: Evaluation,
): Promise<string> {
  const db = zugang();
  const laufId = crypto.randomUUID();

  // --- 1. Die Flags. Eine Anweisung, also eine Transaktion: ganz oder gar nicht.
  if (evaluation.flags.length > 0) {
    const { error } = await db
      .from("flags")
      .insert(evaluation.flags.map((flag) => toFlagRow(flag, laufId, episodeId)));
    if (error !== null) throw new Error(`flags: ${error.message}`);
  }

  // --- 2. Die Auswertung. Ab hier gilt der Lauf.
  const { error } = await db
    .from("evaluations")
    .insert(toEvaluationRow(evaluation, laufId, episodeId));
  if (error !== null) throw new Error(`evaluations: ${error.message}`);

  return laufId;
}
