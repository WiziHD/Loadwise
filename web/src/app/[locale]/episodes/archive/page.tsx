/**
 * Was weggeräumt ist, aber nicht weg.
 *
 * Archivieren ist der Ersatz für Löschen, solange es keinen Export gibt —
 * niemand soll Monate der eigenen Aufzeichnung auslöschen können, bevor er eine
 * Kopie davon mitnehmen kann. Damit das keine Einbahnstrasse zweiter Art wird,
 * braucht das Archiv eine eigene Seite: Ein Ort, an dem Dinge verschwinden und
 * den man nicht ansehen kann, ist ein Löschknopf mit anderem Namen.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { currentUser } from "@/lib/supabase/server";
import { listEpisodes, profileOf } from "@/lib/db/episodes";

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeFrom((await params).locale);
  const s = t(locale);

  if ((await currentUser()) === null) redirect(`/${locale}/signin`);

  const episodes = await listEpisodes(true);

  return (
    <main>
      <p style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>
        <Link href={`/${locale}`} style={{ color: "var(--muted)" }}>
          ← {s.diary.back}
        </Link>
      </p>

      <h1 style={{ fontSize: "1.5rem", margin: "0 0 1.5rem" }}>{s.edit.archiveHeading}</h1>

      {episodes.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>{s.edit.archiveEmpty}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
          {episodes.map((episode) => {
            const { profile } = profileOf(episode);
            return (
              <li key={episode.id}>
                <Link
                  href={`/${locale}/episodes/${episode.id}/edit`}
                  style={{
                    display: "block",
                    border: "1px solid var(--line)",
                    borderRadius: "0.5rem",
                    padding: "0.9rem 1rem",
                    background: "var(--card)",
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <strong>{episode.label ?? profile.label[locale]}</strong>
                  <span
                    style={{
                      display: "block",
                      color: "var(--muted)",
                      fontSize: "0.88rem",
                      marginTop: "0.15rem",
                    }}
                  >
                    {profile.label[locale]}
                    {episode.started_on !== null && ` · ${episode.started_on}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
