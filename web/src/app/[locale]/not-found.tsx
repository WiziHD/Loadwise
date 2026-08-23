/**
 * What the app says when a page is not there.
 *
 * Reached by `notFound()` in the episode page, and that is the case worth
 * getting right: an episode belonging to somebody else is not an error, it is
 * absence. Row Level Security turns "not yours" into "no rows", and this page
 * is what the person sees. It must therefore say nothing about whether that id
 * exists — the wording is the same for a typo and for somebody else's diary,
 * because any difference between the two would confirm which it was.
 *
 * The locale comes from a header rather than from params: a not-found boundary
 * is rendered outside the segment that failed and never receives them. Without
 * the header this would be the only page in the product stuck in one language.
 */

import Link from "next/link";
import { headers } from "next/headers";
import { LOCALE_HEADER, localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";

export default async function NotFound() {
  const locale = localeFrom((await headers()).get(LOCALE_HEADER) ?? undefined);
  const s = t(locale);

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.75rem" }}>{s.errors.notFound}</h1>
      <p style={{ margin: 0 }}>
        <Link href={`/${locale}`}>{s.diary.back}</Link>
      </p>
    </main>
  );
}
