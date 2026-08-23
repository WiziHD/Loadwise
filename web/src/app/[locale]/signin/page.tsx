import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
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

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>{s.auth.heading}</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>{s.auth.intro}</p>

      {error === "link-expired" && (
        <p role="alert" style={{ color: "var(--amber)" }}>
          {s.auth.linkExpired}
        </p>
      )}

      <SignInForm locale={locale} strings={s.auth} />
    </main>
  );
}
