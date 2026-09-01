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
import { latestRun } from "@/lib/db/verdicts";
import { runIsBehind } from "@/lib/run-freshness";
import { profileOf } from "@/lib/profile-view";
import { utcToday } from "@/lib/entry-validation";
import { SelfTestForm } from "@/components/SelfTestForm";
import { SideComparison } from "@/components/SideComparison";
import { RunBehindNotice } from "@/components/RunBehindNotice";

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
  const [tests, run] = await Promise.all([listSelfTests(id), latestRun(id)]);

  /**
   * Die Zahlen kommen live, das Urteil aus dem gespeicherten Lauf.
   *
   * Dieselbe Aufteilung wie auf dem Hauptbildschirm: Die Kurve zeichnet die
   * erfassten Tage, der Satz darüber stammt aus dem abgelegten Lauf. Der Grund
   * ist E12 — ein Urteil ist nur reproduzierbar, wenn `ruleVersion` und
   * `profileVersion` mitgeschrieben sind, und hier neu zu rechnen machte den
   * Bericht zu einer Ansicht, die sich bei jedem Aufruf ändern kann.
   *
   * Beides kann auseinanderfallen — die Messung ist gespeichert, die
   * Neuberechnung danach fehlgeschlagen. Genau dafür gibt es den Hinweis.
   */
  const asymmetrieFlags =
    run.kind === "run" ? run.run.flags.filter((f) => f.kind === "asymmetry") : [];
  const neuesteMessung = tests[tests.length - 1]?.date ?? null;
  const laufHinktHinterher = run.kind === "run" ? runIsBehind(run.run, neuesteMessung) : false;

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

      <RunBehindNotice active={laufHinktHinterher} strings={s.main} />

      {/* Die Ansicht steht ÜBER dem Formular: Wer herkommt, will meistens
          sehen, was dasteht, und misst seltener, als er nachschaut. */}
      <SideComparison tests={tests} flags={asymmetrieFlags} strings={s.comparison} locale={locale} />

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
