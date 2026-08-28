/**
 * Der vollständige Bericht — eine Ebene unter dem Hauptbildschirm.
 *
 * ---------------------------------------------------------------------------
 * GELESEN, NICHT GERECHNET.
 *
 * Diese Seite wertet nichts aus. Sie holt den letzten gespeicherten Lauf und
 * zeigt ihn. Das ist der Grund, aus dem Karte 2.2 überhaupt Urteile ablegt:
 * Ein Urteil ist nur reproduzierbar, wenn `ruleVersion` UND `profileVersion`
 * mitgeschrieben sind, und ein verbessertes Profil darf nicht rückwirkend
 * umschreiben, was jemandem letzten Monat gesagt wurde.
 *
 * Hier neu zu rechnen wäre bequemer und würde genau das kaputtmachen.
 *
 * ---------------------------------------------------------------------------
 * VOLLSTÄNDIGKEIT UND ERSTER EINDRUCK SIND VERSCHIEDENE AUFGABEN.
 *
 * Diese Struktur war einmal die Startseite. Fünf Abschnitte sind der richtige
 * Bericht und der falsche Empfang — niemand fotografiert einen Befundbericht
 * ab. Der Hauptbildschirm (Karte 2.1) trägt den einen Satz; wer mehr will,
 * kommt hierher. Siehe E7.
 * ---------------------------------------------------------------------------
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { navLink } from "@/lib/ui";
import { currentUser } from "@/lib/supabase/server";
import { getEpisode } from "@/lib/db/episodes";
import { latestRun } from "@/lib/db/verdicts";
import { profileOf } from "@/lib/profile-view";
import { ReportView } from "@/components/ReportView";

export default async function ReportPage({
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
  const run = await latestRun(id);

  return (
    <main>
      <p style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>
        <Link href={`/${locale}/episodes/${id}`} style={{ ...navLink, color: "var(--muted)" }}>
          ← {s.diary.back}
        </Link>
      </p>

      <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.35rem" }}>{s.report.heading}</h1>
      <p style={{ margin: "0 0 2rem", color: "var(--muted)", fontSize: "0.9rem" }}>
        {profile.label[locale]}
        {/* Ein eingesetztes Profil wird benannt. Ohne die Marke stünde hier der
            Name einer ANDEREN Verletzung, und die lesende Person hätte allen
            Grund anzunehmen, die App wisse etwas. Siehe `profileOf`. */}
        {substituted && ` · ${s.episode.profileMissing}`}
      </p>

      {run.kind === "run" ? (
        <ReportView
          run={run.run}
          redFlags={profile.redFlags}
          strings={s.report}
          locale={locale}
        />
      ) : (
        <>
          <p style={{ margin: "0 0 0.35rem", fontSize: "1.1rem" }}>
            {run.kind === "none" ? s.report.none : s.report.unreadableRun}
          </p>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            {run.kind === "none" ? s.report.noneHint : s.report.unreadableRunHint}
          </p>
        </>
      )}
    </main>
  );
}
