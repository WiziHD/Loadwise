/**
 * Deine Daten: mitnehmen oder löschen.
 *
 * ---------------------------------------------------------------------------
 * BEIDES AUF EINER SEITE, UND DER EXPORT STEHT OBEN.
 *
 * E5 hat das Löschen einer Episode zurückgestellt, bis es einen Export gibt:
 * *löschen darf nur, wer vorher exportieren konnte.* Diese Reihenfolge steht
 * hier als Anordnung auf der Seite — wer zum Löschknopf will, scrollt an der
 * Sicherung vorbei.
 *
 * Sie zwei Seiten zu geben wäre die Alternative gewesen. Verworfen: Dann
 * fände jemand die Löschung, ohne die Sicherung je gesehen zu haben.
 * ---------------------------------------------------------------------------
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { navLink, hint, section, sectionHeading } from "@/lib/ui";
import { currentUser } from "@/lib/supabase/server";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = localeFrom(rawLocale);
  const s = t(locale);

  if ((await currentUser()) === null) redirect(`/${locale}/signin`);

  return (
    <main>
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)" }}>
        <Link href={`/${locale}`} style={{ ...navLink, color: "var(--muted)" }}>
          ← {s.diary.back}
        </Link>
      </p>

      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 2rem" }}>{s.account.heading}</h1>

      <section style={section}>
        <h2 style={sectionHeading}>{s.account.exportHeading}</h2>
        <p style={{ margin: "0 0 var(--space-3)", maxWidth: "42rem" }}>{s.account.exportIntro}</p>

        {/* Ein gewöhnlicher Link, kein Knopf mit JavaScript dahinter: Der
            Route Handler setzt `Content-Disposition`, und damit ist der
            Download das, was der Browser ohnehin kann. */}
        <p style={{ margin: "0 0 0.3rem" }}>
          <a href={`/${locale}/account/export`} style={navLink}>
            {s.account.exportBackup}
          </a>
        </p>
        <p style={{ ...hint, margin: "0 0 var(--space-3)", maxWidth: "42rem" }}>
          {s.account.exportBackupHint}
        </p>
        <p style={{ ...hint, margin: 0, maxWidth: "42rem" }}>{s.account.exportPerEpisodeHint}</p>
      </section>

      <section style={section}>
        <h2 style={sectionHeading}>{s.account.deleteHeading}</h2>
        <DeleteAccountForm locale={locale} strings={s.account} />
      </section>

      <p style={{ marginTop: "var(--space-5)", fontSize: "var(--text-sm)" }}>
        <Link href={`/${locale}/privacy`} style={navLink}>
          {s.account.privacyLink}
        </Link>
      </p>
    </main>
  );
}
