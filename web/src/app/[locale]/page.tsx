/**
 * The list of episodes, and the way to start one.
 *
 * Replaces the scaffold page, whose job — proving the engine imports from the
 * workspace rather than from a copy — is now done by every page here.
 *
 * Signed out, it says what the app is and offers the door. It does NOT list
 * profiles to a stranger: the set of injuries somebody is looking at is the
 * most sensitive thing this product holds.
 */

import Link from "next/link";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { currentUser } from "@/lib/supabase/server";
import { countArchived, listEpisodes, profileOf } from "@/lib/db/episodes";
import { navLink, primaryButton } from "@/lib/ui";


export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const locale = localeFrom((await params).locale);
  const s = t(locale);
  const user = await currentUser();

  return (
    <main>
      <header style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.25rem" }}>{s.appName}</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>{s.tagline}</p>
      </header>

      {user === null ? (
        <Link href={`/${locale}/signin`} style={primaryButton}>
          {s.actions.signIn}
        </Link>
      ) : (
        <EpisodeList locale={locale} s={s} />
      )}
    </main>
  );
}

async function EpisodeList({ locale, s }: { locale: string; s: ReturnType<typeof t> }) {
  // Ohne Archiv. Beides in einem Aufruf zu holen und danach zu filtern hiesse,
  // eine wachsende Liste zu ziehen, um sie wegzuwerfen.
  const [episodes, archiviert] = await Promise.all([listEpisodes(false), countArchived()]);

  if (episodes.length === 0) {
    return (
      <section>
        <p style={{ margin: "0 0 0.4rem" }}>{s.episode.none}</p>
        <p style={{ color: "var(--muted)", margin: "0 0 1.5rem" }}>{s.episode.noneHint}</p>
        <Link href={`/${locale}/episodes/new`} style={primaryButton}>
          {s.episode.newEpisode}
        </Link>
        <ArchiveLink locale={locale} s={s} count={archiviert} />
      </section>
    );
  }

  return (
    <section>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.75rem", display: "grid", gap: "0.75rem" }}>
        {episodes.map((episode) => {
          const { profile, substituted } = profileOf(episode);
          return (
            <li key={episode.id}>
              <Link
                href={`/${locale}/episodes/${episode.id}`}
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
                <strong>{episode.label ?? profile.label[localeFrom(locale)]}</strong>
                <span style={{ display: "block", color: "var(--muted)", fontSize: "0.88rem", marginTop: "0.15rem" }}>
                  {profile.label[localeFrom(locale)]}
                  {episode.started_on !== null && ` · ${episode.started_on}`}
                </span>
                {substituted && (
                  <span
                    role="alert"
                    style={{ display: "block", color: "var(--amber)", fontSize: "0.85rem", marginTop: "0.4rem" }}
                  >
                    {s.episode.profileMissing}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <Link href={`/${locale}/episodes/new`} style={primaryButton}>
        {s.episode.newEpisode}
      </Link>
      <ArchiveLink locale={locale} s={s} count={archiviert} />
    </section>
  );
}

/**
 * Der Weg ins Archiv, und nur wenn dort etwas liegt.
 *
 * Ein Archiv, das man nicht ansehen kann, ist ein Löschknopf mit anderem Namen.
 * Ein leeres Archiv zu verlinken wäre dagegen eine Tür in einen leeren Raum —
 * die Zahl steht deshalb daneben, statt dass der Link immer da ist.
 */
function ArchiveLink({
  locale,
  s,
  count,
}: {
  locale: string;
  s: ReturnType<typeof t>;
  count: number;
}) {
  if (count === 0) return null;
  return (
    <p style={{ margin: "1.25rem 0 0", fontSize: "0.9rem" }}>
      <Link href={`/${locale}/episodes/archive`} style={{ ...navLink, color: "var(--muted)" }}>
        {s.edit.archiveLink} ({count})
      </Link>
    </p>
  );
}
