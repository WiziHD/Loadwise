import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LOCALES, isLocale } from "@/i18n/config";
import { AppHeader } from "@/components/AppHeader";

/**
 * Both languages are prerendered. Neither is an afterthought — English leads,
 * German is second, and both exist from the first line rather than being
 * retrofitted once the app already has a shape.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
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
