import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALES, isLocale, localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { siteUrl } from "@/lib/seo";
import { AppHeader } from "@/components/AppHeader";

/**
 * Both languages are prerendered. Neither is an afterthought — English leads,
 * German is second, and both exist from the first line rather than being
 * retrofitted once the app already has a shape.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * ---------------------------------------------------------------------------
 * DIE METADATEN HÄNGEN AN DER SPRACHE, NICHT AM WURZELLAYOUT.
 *
 * Im Wurzellayout standen ein englischer Titel und eine englische Zeile — auch
 * auf jeder deutschen Seite. Dieselbe Sorte Fehler wie `lang="en"` eine Ebene
 * höher: Niemand sieht es beim Benutzen, und genau deshalb bleibt es stehen.
 *
 * `alternates` erzeugt die kanonische Adresse und die `hreflang`-Verweise.
 * Ohne sie hält eine Suchmaschine `/de/privacy` und `/en/privacy` für zwei
 * konkurrierende Seiten statt für dieselbe in zwei Sprachen.
 *
 * Ohne gesetzte Adresse bleibt `metadataBase` weg. Next erzeugt dann relative
 * Verweise statt geratener absoluter — eine kanonische Adresse, die auf
 * `localhost` zeigt, wäre schlimmer als gar keine.
 * ---------------------------------------------------------------------------
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = localeFrom((await params).locale);
  const s = t(locale);
  const basis = siteUrl();

  return {
    title: s.appName,
    description: s.tagline,
    ...(basis === null ? {} : { metadataBase: new URL(basis) }),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
        "x-default": `/${DEFAULT_LOCALE}`,
      },
    },
    openGraph: {
      title: s.appName,
      description: s.tagline,
      locale,
      type: "website",
      ...(basis === null ? {} : { url: `${basis}/${locale}` }),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // A locale arrives from a URL segment, where the type system has run out.
  // An unknown one is a wrong address rather than something to guess at.
  if (!isLocale(locale)) notFound();

  return (
    <div data-locale={locale}>
      <AppHeader locale={locale} />
      {children}
    </div>
  );
}
