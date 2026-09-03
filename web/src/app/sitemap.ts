/**
 * Die Sitemap — nur, was ohne Anmeldung etwas zeigt.
 *
 * ---------------------------------------------------------------------------
 * SIE WIRD AUS DER ERLAUBNISLISTE GEBAUT, NICHT AUS DEM DATEIBAUM.
 *
 * Next kennt jede Route. Sie hier aufzuzählen wäre der kürzere Weg und der
 * falsche: Die nächste Unterseite unter `/episodes` stünde am Tag ihrer
 * Entstehung in der Sitemap, ohne dass jemand eine Entscheidung getroffen
 * hätte. `PUBLIC_PATHS` ist die Entscheidung, und `check:seo` prüft, dass
 * hier nichts anderes ankommt.
 *
 * ---------------------------------------------------------------------------
 * ZWEI SPRACHEN, EIN EINTRAG JE SEITE, MIT VERWEIS AUF DIE ANDERE.
 *
 * `alternates.languages` erzeugt die `hreflang`-Angaben. Ohne sie hält eine
 * Suchmaschine `/de/privacy` und `/en/privacy` für zwei konkurrierende Seiten
 * statt für dieselbe Seite in zwei Sprachen — und zeigt womöglich die falsche.
 *
 * `x-default` zeigt auf Englisch. Das ist die Entscheidung aus dem Konzept:
 * Englisch führt, Deutsch ist zweite Sprache.
 * ---------------------------------------------------------------------------
 */

import type { MetadataRoute } from "next";
import { PUBLIC_PATHS, indexingAllowed, siteUrl } from "@/lib/seo";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const basis = siteUrl();
  // Ohne Adresse gibt es keine absoluten Verweise, und eine Sitemap mit
  // relativen ist keine. Leer ist ehrlicher als geraten.
  if (basis === null || !indexingAllowed()) return [];

  return PUBLIC_PATHS.map((pfad) => ({
    url: `${basis}/${DEFAULT_LOCALE}${pfad}`,
    alternates: {
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [l, `${basis}/${l}${pfad}`])),
        "x-default": `${basis}/${DEFAULT_LOCALE}${pfad}`,
      },
    },
  }));
}
