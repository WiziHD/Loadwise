"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "loadwise-engine";
import { LOCALES, swapLocaleIn } from "@/i18n/config";
import { navLink } from "@/lib/ui";

const LABEL: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
};

/**
 * Swaps the locale segment and keeps the rest of the address.
 *
 * Real links rather than a client-side state toggle: the language belongs in
 * the URL, so a page can be bookmarked, shared and reloaded in the language it
 * was read in.
 *
 * The swap itself is `swapLocaleIn` in i18n/config.ts — a pure function, so the
 * query string it used to drop is a test case rather than a memory.
 */
export function LanguageSwitch({ current }: { current: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav
      aria-label={current === "de" ? "Sprache" : "Language"}
      // Nur noch die Sprachen. Die Kopfzeile darum herum — und der Ausgang
      // aus der App — sitzen in AppHeader.
      style={{ display: "flex", gap: "0.75rem", fontSize: "var(--text-sm)" }}
    >
      {LOCALES.map((locale) => (
        <Link
          key={locale}
          href={swapLocaleIn(pathname, searchParams.toString(), locale)}
          hrefLang={locale}
          aria-current={locale === current ? "true" : undefined}
          style={{
            ...navLink,
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
