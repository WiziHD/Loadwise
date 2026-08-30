"use server";

import { revalidatePath } from "next/cache";
import type { Locale, TestType } from "loadwise-engine";
import { utcToday } from "@/lib/entry-validation";
import {
  validateSelfTest,
  type SelfTestPayload,
  type SelfTestProblem,
} from "@/lib/selftest-validation";
import { getEpisode } from "@/lib/db/episodes";
import { saveSelfTest } from "@/lib/db/self-tests";
import { profileOf } from "@/lib/profile-view";
import { evaluateAndStore } from "@/lib/db/verdicts";

export type SaveSelfTestResult =
  | { ok: true }
  | { ok: false; reason: SelfTestProblem | "no-episode" | "failed" };

/**
 * Eine Selbsttest-Messung speichern.
 *
 * ---------------------------------------------------------------------------
 * DIE ERLAUBTEN TESTARTEN KOMMEN AUS DER EPISODE, NICHT AUS DEM FORMULAR.
 *
 * Dieselbe Regel wie bei der Körperregion in `updateEpisodeAction`, und aus
 * demselben Grund: Was das Formular anbietet, ist eine Bequemlichkeit für den
 * Menschen davor. Eine Server-Aktion sieht aus wie ein Funktionsaufruf, ist
 * aber ein öffentlicher Endpunkt — alles im Netz kann sie mit `calf_raise`
 * aufrufen, während die Episode eine Schulter ist.
 *
 * Der Schaden wäre nicht bloss eine unpassende Zeile. `rules/asymmetry.ts`
 * nimmt die jüngste Messung einer Art, die das Profil führt — eine Art, die es
 * nicht führt, würde stumm liegen bleiben und wäre damit eine erfasste Messung,
 * die nie in ein Urteil eingeht und die niemand als übergangen erkennt.
 *
 * Deshalb wird die Episode hier geladen, obwohl das eine zusätzliche Abfrage
 * ist. Sie läuft über den anon key und damit durch die Zugriffsregeln: Kommt
 * `null` zurück, ist die Episode entweder weg oder gehört jemand anderem, und
 * beides endet hier.
 *
 * ---------------------------------------------------------------------------
 * DANACH NEU RECHNEN — HIER WIEGT DAS SCHWERER ALS BEIM TAGEBUCHTAG.
 *
 * Eine Messung ist der einzige Weg, auf dem die Asymmetrie-Regel überhaupt
 * etwas zu sagen bekommt. Ohne diesen Lauf stünde die erste Messung des Lebens
 * in der Datenbank, und der Bildschirm zeigte weiter »noch nicht genug
 * beurteilt« — mit dem Wort, das die Messung gerade widerlegt hat.
 *
 * Der Fehlschlag wird trotzdem geschluckt, wie überall: Die Messung ist zu
 * diesem Zeitpunkt gespeichert. `RunBehindNotice` sagt auf der Ansicht, dass
 * das Urteil den neuesten Stand nicht kennt — das ist der Satz, den `2.7`
 * nachgetragen hat, nachdem er zuvor nur als Versprechen in einem Kommentar
 * stand.
 * ---------------------------------------------------------------------------
 */
export async function saveSelfTestAction(
  locale: Locale,
  episodeId: string,
  input: SelfTestPayload,
): Promise<SaveSelfTestResult> {
  const episode = await getEpisode(episodeId);
  if (episode === null) return { ok: false, reason: "no-episode" };

  const { profile } = profileOf(episode);

  const problem = validateSelfTest(input, profile.tests, utcToday());
  if (problem !== null) return { ok: false, reason: problem };

  try {
    await saveSelfTest(episodeId, {
      // Zulässig, weil `validateSelfTest` oben genau diese Formen geprüft hat
      // und sonst schon zurückgekehrt wäre.
      type: input.type as TestType,
      date: input.date,
      involved: input.involved as number,
      uninvolved: input.uninvolved as number,
      note: input.note,
    });
  } catch {
    return { ok: false, reason: "failed" };
  }

  // Ab hier steht die Messung. Nichts unten darf das noch in Frage stellen.
  try {
    await evaluateAndStore(episodeId);
  } catch {
    // Die Messung steht, das Urteil ist älter als sie. Siehe Kopf.
  }

  try {
    revalidatePath(`/${locale}/episodes/${episodeId}`);
    revalidatePath(`/${locale}`);
  } catch {
    // Die Seite ist bis zur nächsten Navigation veraltet. Kein Wort wert.
  }

  return { ok: true };
}
