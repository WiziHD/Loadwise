"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "loadwise-engine";
import { LOCALES } from "@/i18n/config";

const LABEL: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
};

/**
 * Swaps the locale segment and keeps the rest of the path.
 *
 * Real links rather than a client-side state toggle: the language belongs in
 * the URL, so a page can be bookmarked, shared and reloaded in the language it
 * was read in.
 */
export function LanguageSwitch({ current }: { current: Locale }) {
  const pathname = usePathname();

  const swap = (to: Locale): string => {
    const segments = pathname.split("/");
    // ["", "<locale>", ...rest]
    segments[1] = to;
    return segments.join("/") || `/${to}`;
  };

  return (
    <nav
      aria-label={current === "de" ? "Sprache" : "Language"}
      style={{
        display: "flex",
        gap: "0.75rem",
        justifyContent: "flex-end",
        padding: "0.75rem 1.25rem 0",
        maxWidth: "46rem",
        margin: "0 auto",
        fontSize: "0.85rem",
      }}
    >
      {LOCALES.map((locale) => (
        <Link
          key={locale}
          href={swap(locale)}
          hrefLang={locale}
          aria-current={locale === current ? "true" : undefined}
          style={{
            color: locale === current ? "var(--fg)" : "var(--muted)",
            textDecoration: locale === current ? "none" : "underline",
            fontWeight: locale === current ? 600 : 400,
          }}
        >
          {LABEL[locale]}
        </Link>
      ))}
    </nav>
  );
}
