import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { LOCALE_HEADER, localeFrom } from "@/i18n/config";
import "./globals.css";

/**
 * Die Schrift — und warum sie NICHT von Google geladen wird.
 *
 * ---------------------------------------------------------------------------
 * `next/font` lädt die Dateien beim BAUEN herunter und liefert sie von der
 * eigenen Herkunft aus. Zur Laufzeit geht keine Anfrage an Google.
 *
 * Das ist keine Bequemlichkeit, sondern dieselbe Überlegung, aus der es keine
 * Google-Anmeldung gibt: Bei Gesundheitsdaten ist schon die ZUGEHÖRIGKEIT die
 * Auskunft. Eine Schrift von `fonts.gstatic.com` verriete bei jedem Seitenaufruf,
 * dass es diese Person bei einer Reha-App gibt — und zwar samt IP und Zeitpunkt.
 *
 * Erzwungen wird das ohnehin schon: Die Inhaltsrichtlinie trägt `font-src 'self'`
 * (siehe `lib/security-headers.ts`). Eine Schrift von aussen würde vom Browser
 * blockiert. Der Kommentar hier steht trotzdem, damit niemand die Richtlinie
 * »repariert«, weil eine Schrift nicht lädt.
 *
 * ---------------------------------------------------------------------------
 * WAS DAS KOSTET, EHRLICH: Der BAU braucht einmal Netz. Fällt Google beim
 * Bauen aus, bricht der Build — nicht der Betrieb. Wer das nicht will, wechselt
 * auf `next/font/local` mit mitgelieferten Dateien; das kostet ein paar hundert
 * Kilobyte im Repository und macht den Bau vollständig offline-fähig.
 *
 * `display: "swap"`: Der Text steht sofort in der Systemschrift da und wird
 * ersetzt, sobald die Schrift geladen ist. Die Alternative — unsichtbarer Text,
 * bis die Schrift da ist — ist bei einer App, die jemand morgens im Halbdunkeln
 * öffnet, die schlechtere.
 * ---------------------------------------------------------------------------
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Loadwise",
  description: "Load management for the time between physiotherapy appointments.",
};

/**
 * ---------------------------------------------------------------------------
 * `lang` STAND HIER FEST AUF "en", AUCH AUF JEDER DEUTSCHEN SEITE.
 *
 * Wer sieht das? Niemand — und darum geht es. Eine Vorlesesoftware wählt ihre
 * Aussprache nach diesem Attribut. Auf `lang="en"` liest sie »Morgensteifigkeit
 * (Minuten)« mit englischen Lauten vor, und heraus kommt kein Deutsch mit
 * Akzent, sondern Silbensalat. Für jemanden, der die App SO benutzt, ist das
 * kein Schönheitsfehler, sondern die ganze Seite.
 *
 * Der Sprachschlüssel steht in `params` der `[locale]`-Ebene, nicht hier — und
 * `<html>` muss im Wurzellayout stehen, sonst nimmt Next es nicht an. Der
 * Proxy setzt die Sprache deshalb ohnehin schon als Kopfzeile, für die
 * Nicht-gefunden-Grenze; sie hier zu lesen kostet nichts Neues.
 *
 * Fällt die Kopfzeile aus, greift `localeFrom` auf die Standardsprache zurück:
 * eine feste Sprache ist besser als gar keine — ohne `lang` rät die
 * Vorlesesoftware, und sie rät nach der Systemsprache des Geräts.
 * ---------------------------------------------------------------------------
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = localeFrom((await headers()).get(LOCALE_HEADER) ?? undefined);

  return (
    <html lang={locale} className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
