import { NextResponse, type NextRequest } from "next/server";
import { localeFrom } from "@/i18n/config";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Where the emailed link lands.
 *
 * Outside `[locale]` on purpose: the address is baked into an email that may be
 * opened days later, and it should not depend on which language the browser
 * was set to at the time. The locale rides along as a query parameter so the
 * person comes back to the language they signed up in.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const locale = localeFrom(url.searchParams.get("locale") ?? undefined);

  if (code === null) {
    return NextResponse.redirect(new URL(`/${locale}/signin?error=missing-code`, url.origin));
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    // Expired or already used. Both are ordinary — a link sitting in an inbox
    // for a week, or a mail client that fetched it before the person clicked.
    return NextResponse.redirect(new URL(`/${locale}/signin?error=link-expired`, url.origin));
  }

  return NextResponse.redirect(new URL(`/${locale}`, url.origin));
}
