import { supabaseServer } from "@/lib/supabase/server";

/**
 * Das eigene Konto löschen — samt allem, was daran hängt.
 *
 * ---------------------------------------------------------------------------
 * OHNE SERVICE-ROLE-SCHLÜSSEL, UND DAS IST DER GANZE PUNKT.
 *
 * `check:service-role` hält fest, dass GENAU EINE Datei den Schlüssel anfasst:
 * `verdict-write.ts`. Eine zweite wäre nicht bloss eine Zeile mehr in einer
 * Erlaubnisliste — sie wäre der Punkt, an dem aus »die eine Ausnahme« eine
 * Sammlung wird.
 *
 * `delete_own_account()` aus 0012 macht ihn überflüssig: eine
 * `security definer`-Funktion **ohne Argumente**, die ausschliesslich auf
 * `auth.uid()` handelt. Der Kopf von `verdict-write.ts` verwirft dieselbe
 * Bauform für das Schreiben eines Urteils, und der Unterschied ist genau der
 * Parameter, den es hier nicht gibt: Ein Konto kann diese Funktion nicht
 * belügen, weil es ihr nichts sagt.
 *
 * ---------------------------------------------------------------------------
 * EINE ZEILE, UND ALLES IST WEG.
 *
 * `episodes.user_id references auth.users (id) on delete cascade` seit 0001,
 * und jede weitere Tabelle hängt mit `on delete cascade` an `episodes`.
 * Verschwindet die Zeile in `auth.users`, verschwinden Einträge, Einheiten,
 * Selbsttests, eigene Masse, Messungen, Ziele, Flags und Auswertungen mit.
 *
 * Das ist unwiderruflich und soll es sein. Deshalb steht der Export daneben
 * und deshalb fragt die Oberfläche zweimal — siehe E5: Löschen darf nur, wer
 * vorher exportieren konnte.
 * ---------------------------------------------------------------------------
 */
export async function deleteOwnAccount(): Promise<void> {
  const supabase = await supabaseServer();

  const { error } = await supabase.rpc("delete_own_account");
  if (error !== null) throw new Error(`delete_own_account: ${error.message}`);
}
