import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { LOCALE_HEADER, localeFrom } from "@/i18n/config";
import "./globals.css";

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
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
