/**
 * Der Physio-Bericht als Druckansicht.
 *
 * ---------------------------------------------------------------------------
 * EINE EIGENE SEITE, NICHT EIN DRUCKSTIL AUF DEM BERICHT.
 *
 * Der Bericht (Karte 2.3) ist für die betroffene Person geschrieben: fünf
 * Abschnitte, Warnzeichen, Erklärungen. Ein Ausdruck für eine behandelnde
 * Person ist ein anderes Dokument — kürzer, mit Zeitraum, und mit den vier
 * Versionsangaben, die ihn Monate später noch einordbar machen.
 *
 * Dieselbe Seite mit `@media print` in zwei Dokumente zu verwandeln hiesse,
 * beide Fassungen in einer Datei zu halten und bei jeder Änderung an die
 * andere zu denken.
 *
 * ---------------------------------------------------------------------------
 * GELESEN, NICHT GERECHNET — WIE ÜBERALL SEIT E12.
 *
 * Der Lauf kommt aus der Datenbank. Hier neu zu rechnen hiesse, dass zwei
 * Ausdrucke desselben Tages verschieden ausfallen können, sobald sich ein
 * Profil ändert — und der Ausdruck ist genau das Dokument, das jemand
 * mitnimmt und aufhebt.
 * ---------------------------------------------------------------------------
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildIndex } from "loadwise-engine";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { navLink } from "@/lib/ui";
import { currentUser } from "@/lib/supabase/server";
import { getEpisode } from "@/lib/db/episodes";
import { listEntries } from "@/lib/db/entries";
import { listSelfTests } from "@/lib/db/self-tests";
import { latestRun } from "@/lib/db/verdicts";
import { coursePoints } from "@/lib/course-points";
import { profileOf } from "@/lib/profile-view";
import { PrintReport } from "@/components/PrintReport";

export default async function PrintPage({
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
  const [entries, tests, run] = await Promise.all([
    listEntries(id),
    listSelfTests(id),
    latestRun(id),
  ]);

  const index = buildIndex(entries);
  const gespeicherterLauf = run.kind === "run" ? run.run : null;
  const points = coursePoints(index, gespeicherterLauf?.lastDate ?? null);

  return (
    <main>
      <p data-screen-only="" style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)" }}>
        <Link href={`/${locale}/episodes/${id}`} style={{ ...navLink, color: "var(--muted)" }}>
          ← {s.diary.back}
        </Link>
      </p>

      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.35rem" }}>{s.print.heading}</h1>
      <p style={{ margin: "0 0 0.35rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
        {episode.label ?? profile.label[locale]}
        {substituted && ` · ${s.episode.profileMissing}`}
      </p>
      <p data-screen-only="" style={{ margin: "0 0 2rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
        {s.print.intro}
      </p>

      <PrintReport
        run={gespeicherterLauf}
        entries={entries}
        points={points}
        tests={tests}
        profileLabel={profile.label[locale]}
        strings={s.print}
        mainStrings={s.main}
        reportStrings={s.report}
        comparisonStrings={s.comparison}
        locale={locale}
      />
    </main>
  );
}
