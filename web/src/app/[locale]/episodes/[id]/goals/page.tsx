/**
 * Eigene Ziele — Stufe 1.
 *
 * ---------------------------------------------------------------------------
 * WAS AUF DIESER SEITE FEHLT, IST IHR MERKMAL.
 *
 * Kein Katalog publizierter Kriterien, keine Vorschläge, keine Phasen. Der
 * Fahrplan nennt Stufe 3 — den Katalog — ausdrücklich als *gebaut und
 * ausgeschaltet*, und Stufe 1 ist das, was ohne anwaltliche Prüfung der
 * Zweckbestimmung live gehen darf: Ziele, die der Nutzer selbst schreibt.
 *
 * »Wie weit bin ich« entsteht daraus trotzdem — als »drei von fünf«, gezählt
 * gegen den selbst erklärten Massstab. Siehe den Kopf von `MilestoneList`.
 * ---------------------------------------------------------------------------
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { navLink } from "@/lib/ui";
import { currentUser } from "@/lib/supabase/server";
import { getEpisode } from "@/lib/db/episodes";
import { listMeasureKeys } from "@/lib/db/measurements";
import { listMilestones } from "@/lib/db/milestones";
import { latestRun } from "@/lib/db/verdicts";
import { listEntries } from "@/lib/db/entries";
import { runIsBehind } from "@/lib/run-freshness";
import { profileOf } from "@/lib/profile-view";
import { utcToday } from "@/lib/entry-validation";
import { MilestoneForm } from "@/components/MilestoneForm";
import { MilestoneList } from "@/components/MilestoneList";
import { ProgressRecords } from "@/components/ProgressRecords";
import { RunBehindNotice } from "@/components/RunBehindNotice";

export default async function GoalsPage({
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
  const [ziele, masse, run, entries] = await Promise.all([
    listMilestones(id),
    listMeasureKeys(id),
    latestRun(id),
    listEntries(id),
  ]);

  // Der Stand kommt aus dem gespeicherten Lauf, die Ziele aus der Tabelle.
  // Dieselbe Aufteilung wie überall (E12): Ein Urteil ist nur reproduzierbar,
  // wenn seine Versionen mitgeschrieben sind.
  const progress = run.kind === "run" ? run.run.progress : null;
  const neuesterEintrag = entries[entries.length - 1]?.date ?? null;
  const hinktHinterher = run.kind === "run" ? runIsBehind(run.run, neuesterEintrag) : false;

  return (
    <main>
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)" }}>
        <Link href={`/${locale}/episodes/${id}`} style={{ ...navLink, color: "var(--muted)" }}>
          ← {s.diary.back}
        </Link>
      </p>

      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.35rem" }}>{s.goal.heading}</h1>
      <p style={{ margin: "0 0 2rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
        {profile.label[locale]}
        {substituted && ` · ${s.episode.profileMissing}`}
      </p>

      <RunBehindNotice active={hinktHinterher} strings={s.main} />

      {/* Die Liste über dem Formular: Wer herkommt, schaut häufiger nach, wie
          es steht, als dass er ein neues Ziel setzt. */}
      <MilestoneList
        locale={locale}
        episodeId={id}
        today={utcToday()}
        milestones={ziele}
        progress={progress}
        strings={s.goal}
        errorStrings={s.errors}
      />

      {/* Die Zahlenreihen zwischen Liste und Formular: Sie gehören zu dem, was
          dasteht, nicht zu dem, was man neu anlegt. */}
      <ProgressRecords
        progress={progress}
        strings={s.progress}
        goalStrings={s.goal}
        unitStrings={s.measure}
        locale={locale}
      />

      <MilestoneForm
        locale={locale}
        episodeId={id}
        today={utcToday()}
        tests={profile.tests}
        measureKeys={masse.map((k) => ({ key: k.key, unit: k.unit }))}
        strings={s.goal}
        errorStrings={s.errors}
      />
    </main>
  );
}
