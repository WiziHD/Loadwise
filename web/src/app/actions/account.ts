"use server";

import { redirect } from "next/navigation";
import type { Locale } from "loadwise-engine";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { deleteOwnAccount } from "@/lib/db/account";

export type DeleteAccountResult = { ok: false; reason: "not-confirmed" | "failed" };

/**
 * Das Konto und alle Daten löschen.
 *
 * ---------------------------------------------------------------------------
 * DIE BESTÄTIGUNG WIRD HIER GEPRÜFT, NICHT NUR IM FORMULAR.
 *
 * Das Formular verlangt ein getipptes Wort. Das ist eine Hürde für den
 * Menschen davor — und eine Server-Aktion ist ein öffentlicher Endpunkt: Ein
 * Aufruf von aussen hat kein Formular vor sich.
 *
 * Der Vergleich läuft gegen den Text, den die Oberfläche in der Sprache der
 * Seite anzeigt. Ihn hier fest zu verdrahten hiesse, dass eine deutsche
 * Oberfläche ein englisches Wort verlangt.
 *
 * ---------------------------------------------------------------------------
 * DANACH ABMELDEN, UND ZWAR BEVOR IRGENDETWAS GERENDERT WIRD.
 *
 * Nach dem Löschen zeigt das Token auf ein Konto, das es nicht mehr gibt.
 * Jede weitere Abfrage liefe ins Leere und ergäbe eine Seite mit leeren
 * Listen — die aussähe wie »deine Daten sind weg«, aber auch wie »etwas ist
 * kaputt«. Die Sitzung zu beenden ist die einzige ehrliche Fortsetzung.
 *
 * `redirect` wirft; alles danach läuft nicht mehr. Deshalb steht das Abmelden
 * davor.
 * ---------------------------------------------------------------------------
 */
export async function deleteAccountAction(
  locale: Locale,
  bestaetigung: string,
  erwartet: string,
): Promise<DeleteAccountResult | never> {
  if (bestaetigung.trim().toLowerCase() !== erwartet.trim().toLowerCase()) {
    return { ok: false, reason: "not-confirmed" };
  }

  // Ohne Anmeldung gibt es nichts zu löschen. Die Funktion in 0012 wirft in
  // diesem Fall ohnehin — aber ein Fehlschlag aus der Datenbank läse sich hier
  // als »konnte nicht gelöscht werden«, und das ist eine andere Auskunft als
  // »du bist nicht angemeldet«.
  if ((await currentUser()) === null) return { ok: false, reason: "failed" };

  try {
    await deleteOwnAccount();
  } catch {
    return { ok: false, reason: "failed" };
  }

  try {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  } catch {
    // Das Konto ist weg; die Sitzung zeigt ins Leere. Das ist kein Grund, den
    // Weg unten nicht zu gehen — im Gegenteil: Ohne die Weiterleitung bliebe
    // jemand auf einer Seite stehen, die seine Daten zeigen soll.
  }

  redirect(`/${locale}`);
}
