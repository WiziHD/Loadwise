import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, isLocale, LOCALE_HEADER } from "@/i18n/config";

/**
 * Path prefixes that must NOT be given a language.
 *
 * `/auth/callback` is deliberately outside `[locale]` — its address is baked
 * into an email that may be opened days later, so it cannot depend on which
 * language the browser was set to at the time. Without this exemption the
 * redirect below rewrote it to `/de/auth/callback`, which does not exist, and
 * EVERY sign-in link in the product 404'd. The route's own comment said it was
 * outside `[locale]` on purpose; the middleware quietly undid that, and
 * nothing failed loudly enough to say so.
 *
 * The session refresh above still runs for these paths. Only the language
 * redirect is skipped.
 */
const LOCALE_EXEMPT = new Set(["auth"]);

/**
 * Two jobs on every request: keep the session alive, and make sure the URL
 * carries a language.
 *
 * The session part has to happen in middleware rather than in a page. Supabase
 * refresh tokens rotate, and a server component cannot write cookies — so
 * without this the session would quietly expire mid-use and somebody would be
 * signed out while typing a diary entry.
 */
export async function middleware(request: NextRequest) {
  const first = request.nextUrl.pathname.split("/")[1] ?? "";
  const wanted = isLocale(first)
    ? first
    : preferredLocale(request.headers.get("accept-language"));

  // Carried as a header so the not-found boundary can speak the right
  // language. A `not-found.tsx` never receives route params — Next renders it
  // outside the segment that failed — so without this the 404 page is the only
  // page in the product that cannot know which language it is in.
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, wanted);

  let response = NextResponse.next({ request: { headers } });

  response = await refreshSession(request, headers, response);

  if (isLocale(first)) return response;
  if (LOCALE_EXEMPT.has(first)) return response;

  const url = request.nextUrl.clone();
  url.pathname = `/${wanted}${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;

  // 307 rather than 308: somebody whose browser language changes should get
  // the other one next time, and a permanent redirect would outlive that.
  const redirect = NextResponse.redirect(url, 307);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

/**
 * Refreshes the Supabase session if the project is configured.
 *
 * Deliberately a no-op when the environment is not set up yet. The app is being
 * built before the database exists, and a middleware that threw on a missing
 * key would make every page a 500 — including the ones that need no account at
 * all. A missing key IS reported loudly, but at the point where something
 * actually tries to read data (see lib/env.ts), not on every request for the
 * front page.
 */
async function refreshSession(
  request: NextRequest,
  headers: Headers,
  response: NextResponse,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  let result = response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        result = NextResponse.next({ request: { headers } });
        for (const { name, value, options } of toSet) result.cookies.set(name, value, options);
      },
    },
  });

  // `getUser` and not `getSession`: it verifies the token with the auth server
  // rather than trusting whatever the cookie claims.
  await supabase.auth.getUser();

  return result;
}

/** First supported language in the browser's own order of preference. */
function preferredLocale(header: string | null): string {
  if (header === null) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const quality = q === undefined ? 1 : Number.parseFloat(q.split("=")[1] ?? "1");
      return { base: tag.split("-")[0]?.toLowerCase() ?? "", quality };
    })
    .filter((entry) => Number.isFinite(entry.quality))
    .sort((a, b) => b.quality - a.quality);

  const match = ranked.find((entry) => (LOCALES as readonly string[]).includes(entry.base));
  return match?.base ?? DEFAULT_LOCALE;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
