/**
 * Wie weit ist es bis zur Bezahlschranke?
 *
 * ---------------------------------------------------------------------------
 * DIESE PRÜFUNG SAGT NICHT »BESTANDEN«. SIE SAGT EINE ZAHL.
 *
 * `KONZEPT.md`: *»Die Bezahlschranke geht an, sobald 50 Personen mindestens
 * 30 Tage lang Einträge gemacht haben.«* Der Auslöser steht als Konstante in
 * `src/lib/paywall.ts`, und dieses Skript zählt gegen genau diese Konstante —
 * nicht gegen eine hier hingeschriebene Fünfzig.
 *
 * Ohne so eine Zählung ist der Auslöser eine Zahl in einem Dokument, und
 * »irgendwann« entscheidet dann jemand nach Gefühl. Das ist laut demselben
 * Abschnitt die häufigste Art, wie ein Produkt nie Geld verdient.
 *
 * ---------------------------------------------------------------------------
 * GEZÄHLT WERDEN TAGE MIT EINTRAG, NICHT TAGE SEIT DER ANMELDUNG.
 *
 * Der Unterschied ist der ganze Punkt der Zahl: Wer sich vor einem Jahr
 * angemeldet und dreimal etwas eingetragen hat, beweist nichts über
 * durchgehaltene Nutzung. Gezählt wird deshalb je Person die Zahl der
 * VERSCHIEDENEN Eintragsdaten, über alle Episoden hinweg.
 *
 * Ebenfalls bewusst NICHT gezählt: dass die Tage aufeinanderfolgen. Eine
 * Verletzung, bei der jemand zwei Wochen aussetzt und dann weitermacht, ist
 * kein Abbruch — sie ist der Normalfall.
 *
 * ---------------------------------------------------------------------------
 * ES LIEST, ES SCHREIBT NICHT. UND ES NENNT KEINE E-MAIL-ADRESSEN.
 *
 * Die Ausgabe ist eine Zahl und ein Balken. Wer zu den Personen gehört, steht
 * nicht darin — es gäbe keinen Grund dafür, und Gesundheitsdaten nach Art. 9
 * DSGVO gehören nicht in eine Konsolenausgabe, die jemand in ein Ticket
 * kopiert.
 *
 * ---------------------------------------------------------------------------
 * Von Hand, nie in CI. Wie `check:rls`, `check:verdicts` und
 * `check:delete-account` — es redet mit dem echten Projekt.
 *
 *   npm run check:paywall-trigger --workspace=web
 * ---------------------------------------------------------------------------
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PAYWALL_TRIGGER, paywallEnabled } from "../src/lib/paywall.js";

function fail(message: string): never {
  console.error(`\nAuslöser-Zählung FEHLGESCHLAGEN\n\n${message}\n`);
  process.exit(1);
}

function readEnv(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) fail(`Kein ${path}. Dieses Skript redet mit dem echten Projekt.`);
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((z) => z.trim() !== "" && !z.trim().startsWith("#"))
      .map((z) => {
        const i = z.indexOf("=");
        return [z.slice(0, i).trim(), z.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

async function main(): Promise<void> {
  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) fail("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY werden gebraucht.");

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\nAuslöser: ${PAYWALL_TRIGGER.people} Personen mit ${PAYWALL_TRIGGER.days} Eintragstagen`);
  console.log(`Projekt:  ${url}\n`);

  // Episode → Person, damit die Tage einer Person über alle Episoden zusammen
  // zählen. Wer nacheinander zwei Verletzungen führt, hat durchgehalten.
  const besitzer = new Map<string, string>();
  for (let von = 0; ; von += 1000) {
    const { data, error } = await admin
      .from("episodes")
      .select("id, user_id")
      .range(von, von + 999);
    if (error) fail(`episodes: ${error.message}`);
    for (const z of data ?? []) besitzer.set(z.id as string, z.user_id as string);
    if ((data ?? []).length < 1000) break;
  }

  const tage = new Map<string, Set<string>>();
  for (let von = 0; ; von += 1000) {
    const { data, error } = await admin
      .from("entries")
      .select("episode_id, entry_date")
      .range(von, von + 999);
    if (error) fail(`entries: ${error.message}`);
    for (const z of data ?? []) {
      const person = besitzer.get(z.episode_id as string);
      // Ein Eintrag ohne Episode kann es wegen des Fremdschlüssels nicht
      // geben. Falls doch, wird er nicht stillschweigend jemandem zugerechnet.
      if (person === undefined) continue;
      let menge = tage.get(person);
      if (menge === undefined) tage.set(person, (menge = new Set()));
      menge.add(z.entry_date as string);
    }
    if ((data ?? []).length < 1000) break;
  }

  const erreicht = [...tage.values()].filter((m) => m.size >= PAYWALL_TRIGGER.days).length;
  const breite = 40;
  const voll = Math.min(breite, Math.round((erreicht / PAYWALL_TRIGGER.people) * breite));

  console.log(`  Personen mit mindestens einem Eintrag: ${tage.size}`);
  console.log(`  davon mit ${PAYWALL_TRIGGER.days}+ Eintragstagen:            ${erreicht}`);
  console.log(`\n  [${"#".repeat(voll)}${".".repeat(breite - voll)}] ${erreicht}/${PAYWALL_TRIGGER.people}\n`);

  if (erreicht >= PAYWALL_TRIGGER.people) {
    console.log(
      `Der Auslöser ist erreicht.\n\n` +
        `Damit ist eine ENTSCHEIDUNG fällig, kein Schalter. Was noch fehlt:\n` +
        `  · ein Preis\n` +
        `  · ein Zahlungsanbieter (bewusst noch nicht angebunden, siehe E24)\n` +
        `  · die Bestätigung, dass "print-report" das richtige Merkmal ist\n`,
    );
  } else {
    console.log(`Noch ${PAYWALL_TRIGGER.people - erreicht} Personen. Die Schranke bleibt aus.\n`);
  }

  // Der Zustand des Schalters gehört danebengestellt: Eine Zählung, die sagt
  // »noch nicht«, während die Schranke längst an ist, wäre die irreführendste
  // Ausgabe von allen.
  console.log(`Schalter LOADWISE_PAYWALL: ${paywallEnabled(env) ? "AN" : "aus"}\n`);
}

void main();
