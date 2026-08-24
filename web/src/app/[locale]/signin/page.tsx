import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { signInErrorFrom, signInErrorText } from "@/lib/signin-errors";
import { SignInForm } from "@/components/SignInForm";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const locale = localeFrom((await params).locale);
  const { error } = await searchParams;
  const s = t(locale);

  const grund = signInErrorFrom(error);

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>{s.auth.heading}</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>{s.auth.intro}</p>

      {grund !== null && (
        <p role="alert" style={{ color: "var(--amber)", maxWidth: "34rem", lineHeight: 1.55 }}>
          {signInErrorText(grund, s.auth)}
        </p>
      )}

      <SignInForm locale={locale} strings={s.auth} />
    </main>
  );
}
