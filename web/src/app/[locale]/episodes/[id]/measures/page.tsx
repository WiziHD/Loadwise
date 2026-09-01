/**
 * Eigene Masse — Zahlen ohne Vergleichsseite.
 *
 * ---------------------------------------------------------------------------
 * EIGENE SEITE, NEBEN DEM SEITENVERGLEICH UND NICHT DARIN.
 *
 * Ein Selbsttest hat zwei Seiten und eine Anleitung; ein eigenes Mass hat
 * einen Namen, den der Nutzer erfunden hat, und keine. Beides in ein Formular
 * zu legen hiesse, die Felder gegenseitig unsinnig zu machen — »verletzte
 * Seite« bei »acht Minuten Stehen«, »Einheit« beim Fersenheber, wo sie
 * feststeht.
 *
 * Was diese Seite NICHT tut: vorschlagen, was zu messen sich lohnt. Siehe den
 * Kopf von `MeasurementForm`.
 * ---------------------------------------------------------------------------
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { navLink } from "@/lib/ui";
import { currentUser } from "@/lib/supabase/server";
import { getEpisode } from "@/lib/db/episodes";
import { listMeasureKeys, listMeasurements } from "@/lib/db/measurements";
import { profileOf } from "@/lib/profile-view";
import { utcToday } from "@/lib/entry-validation";
import { MeasurementForm } from "@/components/MeasurementForm";

export default async function MeasurePage({
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
  const [keys, messungen] = await Promise.all([listMeasureKeys(id), listMeasurements(id)]);

  return (
    <main>
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)" }}>
        <Link href={`/${locale}/episodes/${id}`} style={{ ...navLink, color: "var(--muted)" }}>
          ← {s.diary.back}
        </Link>
      </p>

      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.35rem" }}>{s.measure.heading}</h1>
      <p style={{ margin: "0 0 2rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
        {profile.label[locale]}
        {substituted && ` · ${s.episode.profileMissing}`}
      </p>

      <MeasurementForm
        locale={locale}
        episodeId={id}
        serverToday={utcToday()}
        known={keys.map((k) => ({ key: k.key, unit: k.unit }))}
        existing={messungen}
        strings={s.measure}
        errorStrings={s.errors}
        saveLabel={s.actions.save}
      />
    </main>
  );
}
