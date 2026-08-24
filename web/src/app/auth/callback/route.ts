import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { localeFrom } from "@/i18n/config";
import { supabaseServer } from "@/lib/supabase/server";
import type { SignInError } from "@/lib/signin-errors";

/**
 * Where the emailed link lands.
 *
 * Outside `[locale]` on purpose: the address is baked into an email that may be
 * opened days later, and it should not depend on which language the browser
 * was set to at the time. The locale rides along as a query parameter so the
 * person comes back to the language they signed up in.
 *
 * ---------------------------------------------------------------------------
 * TWO WAYS IN, AND THE SECOND ONE IS THE IMPORTANT ONE.
 *
 * `code` is the PKCE exchange. When somebody requests a link and opens it in
 * the same browser, this is what arrives, and it is the stronger of the two —
 * the code alone is useless without the verifier cookie sitting in that
 * browser.
 *
 * That cookie is also exactly why it is not enough. Request the link on a
 * laptop, open the mail on a phone, and there is no verifier: the exchange
 * fails and the person is told the link expired. It did not. Nothing about the
 * message would let them work out that the fix is to open the mail on the other
 * device, and for an app somebody is meant to keep up for ninety days, the
 * second device is not an edge case.
 *
 * `token_hash` is Supabase's device-independent path — `verifyOtp` needs no
 * prior cookie. It requires the email template to send
 * `?token_hash={{ .TokenHash }}&type=magiclink` instead of the default
 * `{{ .ConfirmationURL }}`; until that is changed in the project settings this
 * branch simply never fires, which is why both are handled rather than one
 * being swapped for the other.
 * ---------------------------------------------------------------------------
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const locale = localeFrom(url.searchParams.get("locale") ?? undefined);

  const home = new URL(`/${locale}`, url.origin);
  // Über SignInError getippt, damit ein Grund, den die Anmeldeseite nicht
  // abdeckt, hier gar nicht erst entstehen kann. Vorher schickte diese Datei
  // `missing-code`, und die Seite kannte es nicht.
  const zurueck = (grund: SignInError): URL =>
    new URL(`/${locale}/signin?error=${grund}`, url.origin);
  const expired = zurueck("link-expired");

  if (tokenHash !== null) {
    const type = (url.searchParams.get("type") ?? "magiclink") as EmailOtpType;
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return NextResponse.redirect(error === null ? home : expired);
  }

  if (code === null) {
    return NextResponse.redirect(zurueck("missing-code"));
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    // Expired, already used, or opened on a device that never held the
    // verifier. All three are ordinary, and all three read the same to the
    // person, which is the cost of this path and the reason for the other one.
    return NextResponse.redirect(expired);
  }

  return NextResponse.redirect(home);
}
