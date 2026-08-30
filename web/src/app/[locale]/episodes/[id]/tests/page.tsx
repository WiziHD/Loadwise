/**
 * Der Seitenvergleich — die Seite, die es bis Woche 3 nicht gab.
 *
 * ---------------------------------------------------------------------------
 * EINE EIGENE SEITE, NICHT EIN ABSCHNITT UNTER DEM TAGEBUCH.
 *
 * Ein Tagebuchtag wird täglich erfasst, eine Messung alle paar Wochen. Beides
 * in ein Formular zu legen hiesse, jeden Tag an einer Anleitung vorbeizuscrollen,
 * die dann beim vierten Mal niemand mehr liest — und die erste Messung ist der
 * Bezugspunkt für alle folgenden.
 *
 * ---------------------------------------------------------------------------
 * DIE ERLAUBTEN TESTARTEN KOMMEN AUS DEM PROFIL.
 *
 * `profile.tests`, nicht eine Konstante. Das ist der Satz, um den es in
 * `PROTOKOLLE.md` §2 geht: Ein Wadenheber sagt bei einer Achillessehne alles
 * und bei einem Tennisarm nichts, und bis es Profile gab, behandelte der Motor
 * beide gleich. Ist die Liste leer, sagt das Formular das — statt ein Feld
 * anzubieten, dessen Zahl niemand deuten könnte.
 * ---------------------------------------------------------------------------
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { navLink } from "@/lib/ui";
import { currentUser } from "@/lib/supabase/server";
import { getEpisode } from "@/lib/db/episodes";
import { listSelfTests } from "@/lib/db/self-tests";
import { profileOf } from "@/lib/profile-view";
import { utcToday } from "@/lib/entry-validation";
import { SelfTestForm } from "@/components/SelfTestForm";

export default async function SelfTestPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale = localeFrom(rawLocale);
  const s = t(locale);

  if ((await currentUser()) === null) redirect(`/${locale}/signin`);

  const episode = await getEpisode(id);
  if (episode === null) notFound();

  const { profile, substituted } = profileOf(episode);
  const tests = await listSelfTests(id);

  return (
    <main>
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)" }}>
        <Link href={`/${locale}/episodes/${id}`} style={{ ...navLink, color: "var(--muted)" }}>
          ← {s.diary.back}
        </Link>
      </p>

      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.35rem" }}>{s.selfTest.heading}</h1>
      <p style={{ margin: "0 0 2rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
        {profile.label[locale]}
        {substituted && ` · ${s.episode.profileMissing}`}
      </p>

      <SelfTestForm
        locale={locale}
        episodeId={id}
        serverToday={utcToday()}
        tests={profile.tests}
        existing={tests}
        strings={s.selfTest}
        errorStrings={s.errors}
        saveLabel={s.actions.save}
      />
    </main>
  );
}
