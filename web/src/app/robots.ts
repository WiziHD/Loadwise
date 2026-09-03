/**
 * `robots.txt` — die Bitte an einen Crawler, und warum sie hier eng gefasst ist.
 *
 * ---------------------------------------------------------------------------
 * EINE BITTE, KEIN SCHUTZ. DER SCHUTZ STEHT WOANDERS.
 *
 * `robots.txt` verpflichtet niemanden. Was die privaten Seiten wirklich
 * schützt, sind der zeilenbasierte Zugriffsschutz und die Anmeldung — ein
 * Crawler ohne Konto bekommt dort nichts als eine Weiterleitung.
 *
 * Diese Datei verhindert etwas anderes: dass Adressen mit Kennungen darin
 * überhaupt in einem Index landen. `/de/episodes/<uuid>` in einem Suchergebnis
 * verrät die Kennung, auch wenn dahinter nichts zu sehen ist.
 * ---------------------------------------------------------------------------
 */

import type { MetadataRoute } from "next";
import { PRIVATE_PREFIXES, indexingAllowed, siteUrl } from "@/lib/seo";
import { LOCALES } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // Eine Vorschau-Auslieferung verbietet ALLES. Siehe `lib/seo.ts`: Dieselbe
  // App unter zwanzig Adressen ist für eine Suchmaschine nicht dieselbe App.
  if (!indexingAllowed()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const basis = siteUrl();
  const verboten = LOCALES.flatMap((l) => PRIVATE_PREFIXES.map((p) => `/${l}${p}/`));

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: verboten }],
    sitemap: `${basis}/sitemap.xml`,
    host: basis ?? undefined,
  };
}
