/**
 * Eine Episode geradeziehen — und die Spur, die ein Profilwechsel hinterlässt.
 *
 * Angelegt war einmal angelegt. Wer beim Anlegen »Patellofemorales
 * Schmerzsyndrom« statt »Patellasehne« erwischte — die beiden stehen im Wähler
 * direkt untereinander und teilen sich ein Knie —, sass für immer auf der
 * falschen Auswertung. Der Wähler warnt an genau dieser Stelle selbst davor,
 * dass die Unterscheidung schwer ist.
 *
 * Unter dem Formular stehen die bisherigen Profilwechsel. Sie kommen aus einer
 * Tabelle, die ein Trigger füllt, nicht die App: Ein veränderter Bericht ohne
 * sichtbare Ursache sähe aus, als hätte sich der Verlauf geändert statt der
 * Massstab.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ALL_PROFILES, profileByKey } from "loadwise-engine";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { currentUser } from "@/lib/supabase/server";
import { getEpisode, profileChangesOf, profileOf } from "@/lib/db/episodes";
import { toPickerProfile } from "@/lib/profile-view";
import { EpisodeForm } from "@/components/EpisodeForm";
import { ArchiveButton } from "@/components/ArchiveButton";

export default async function EditEpisodePage({
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

  const { profile } = profileOf(episode);
  const changes = await profileChangesOf(id);

  const profiles = [...ALL_PROFILES]
    .map((p) => toPickerProfile(p, locale))
    .sort(
      (a, b) =>
        Number(b.researched) - Number(a.researched) || a.label.localeCompare(b.label, locale),
    );

  return (
    <main>
      <p style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>
        <Link href={`/${locale}/episodes/${id}`} style={{ color: "var(--muted)" }}>
          ← {s.diary.back}
        </Link>
      </p>

      <h1 style={{ fontSize: "1.5rem", margin: "0 0 1.5rem" }}>{s.edit.heading}</h1>

      {episode.archived_at !== null && (
        <p
          role="status"
          style={{
            margin: "0 0 1.5rem",
            padding: "0.7rem 0.85rem",
            border: "1px solid var(--line)",
            borderRadius: "0.5rem",
            color: "var(--muted)",
            fontSize: "0.88rem",
          }}
        >
          {s.edit.archivedNote}
        </p>
      )}

      <EpisodeForm
        locale={locale}
        episodeId={id}
        profiles={profiles}
        current={{
          // Der Schlüssel des AUFGELÖSTEN Profils, nicht der gespeicherte. Zeigt
          // der gespeicherte auf nichts mehr, stünde im Wähler sonst ein leerer
          // Eintrag — und wer dann speichert, ohne etwas zu wählen, schriebe
          // ihn unverändert zurück.
          profileKey: profile.key,
          side: episode.side,
          startedOn: episode.started_on ?? "",
          label: episode.label ?? "",
        }}
        strings={s.edit}
        episodeStrings={s.episode}
        errorStrings={s.errors}
      />

      {changes.length > 0 && (
        <section style={{ marginTop: "2.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", margin: "0 0 0.75rem" }}>{s.edit.changeHistory}</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.4rem" }}>
            {changes.map((change) => (
              <li key={change.id} style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                {change.changed_at.slice(0, 10)} ·{" "}
                {profileByKey(change.from_key ?? "")?.label[locale] ?? change.from_key ?? "—"}{" "}
                {s.edit.changedTo}{" "}
                {profileByKey(change.to_key)?.label[locale] ?? change.to_key}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        style={{
          marginTop: "2.5rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid var(--line)",
          display: "grid",
          gap: "0.6rem",
          maxWidth: "34rem",
        }}
      >
        <ArchiveButton
          locale={locale}
          episodeId={id}
          archived={episode.archived_at !== null}
          strings={s.edit}
          errorStrings={s.errors}
        />
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.55 }}>
          {s.edit.archiveHint}
        </p>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.55 }}>
          {s.edit.noDelete}
        </p>
      </section>
    </main>
  );
}
