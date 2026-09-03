import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_HEADER, localeRouteFor } from "@/i18n/config";
import { contentSecurityPolicy } from "@/lib/security-headers";
import { isPrivatePath } from "@/lib/seo";

/**
 * Drei Aufgaben bei jeder Anfrage: die Sitzung am Leben halten, dafür sorgen
 * dass die Adresse eine Sprache trägt — und die Inhaltsrichtlinie setzen.
 *
 * The session part has to happen here rather than in a page. Supabase refresh
 * tokens rotate, and a server component cannot write cookies — so without this
 * the session would quietly expire mid-use and somebody would be signed out
 * while typing a diary entry.
 *
 * Called `proxy` and not `middleware`: Next 16 renamed the convention and
 * deprecated the old name. Same file, same position in the request, same job.
 */
export async function proxy(request: NextRequest) {
  // Die Entscheidung selbst liegt in i18n/config.ts, als reine Funktion — der
  // Fehler, der hier jeden Anmeldelink in einen 404 geschickt hat, ist dort
  // jetzt ein Testfall und keine Erinnerung mehr.
  const { locale: wanted, redirectTo } = localeRouteFor(
    request.nextUrl.pathname,
    request.headers.get("accept-language"),
  );

  // Carried as a header so the not-found boundary can speak the right
  // language. A `not-found.tsx` never receives route params — Next renders it
  // outside the segment that failed — so without this the 404 page is the only
  // page in the product that cannot know which language it is in.
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, wanted);

  // ------------------------------------------------------------------------
  // DER NONCE MUSS SICH JE ANFRAGE ÄNDERN, SONST IST ER KEINER.
  //
  // `crypto.randomUUID` steht in der Edge-Laufzeit zur Verfügung. Er wird als
  // Kopfzeile an die ANFRAGE gehängt, weil Next ihn von dort liest und an
  // seine eigenen Inline-Skripte schreibt — und zusätzlich in der ANTWORT
  // mitgeschickt, weil der Browser die Richtlinie dort erwartet.
  // ------------------------------------------------------------------------
  const nonce = crypto.randomUUID();
  const csp = contentSecurityPolicy(
    nonce,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NODE_ENV !== "production",
  );
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);

  let response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);

  // ------------------------------------------------------------------------
  // KEIN INDEX AUF ALLES, WAS EINER PERSON GEHÖRT.
  //
  // Hier und nicht in den Metadaten der einzelnen Seiten: Ein Header deckt
  // JEDE Unterseite unter `/episodes` und `/account` ab, auch die, die es
  // morgen gibt. Ein `robots`-Eintrag je Layout wäre am Tag der nächsten
  // Unterseite still unvollständig — und niemand merkt es, weil eine fehlende
  // Anweisung wie eine erlaubte Seite aussieht.
  //
  // `robots.txt` verbietet dieselben Pfade und ist trotzdem nicht dasselbe:
  // Sie bittet darum, nicht zu CRAWLEN. Dieser Header verbietet zu INDEXIEREN,
  // und er gilt auch für eine Adresse, die jemand woanders verlinkt hat.
  // ------------------------------------------------------------------------
  if (isPrivatePath(request.nextUrl.pathname)) {
    response.headers.set("x-robots-tag", "noindex, nofollow");
  }

  response = await refreshSession(request, headers, response);
  response.headers.set("content-security-policy", csp);

  if (redirectTo === null) return response;

  const url = request.nextUrl.clone();
  url.pathname = redirectTo;

  // 307 rather than 308: somebody whose browser language changes should get
  // the other one next time, and a permanent redirect would outlive that.
  const redirect = NextResponse.redirect(url, 307);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  // Der Redirect übernimmt die Kopfzeilen der Antwort NICHT, nur die Cookies.
  // Ohne diese Zeile trüge `/episodes/abc` (ohne Sprache) kein `noindex`,
  // sondern erst das Ziel — und ein Crawler, der dem Sprung nicht folgt, sähe
  // eine Adresse mit Kennung darin ohne jede Anweisung.
  if (isPrivatePath(url.pathname)) redirect.headers.set("x-robots-tag", "noindex, nofollow");
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

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
