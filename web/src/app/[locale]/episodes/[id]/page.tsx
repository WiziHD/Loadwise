/**
 * One episode: today's entry at the top, the record underneath.
 *
 * The form comes FIRST, before any history and before any verdict. Whatever
 * else this page grows into, the thing a person opens it to do is record a
 * day, and that must never be below the fold.
 *
 * No evaluation is rendered here yet. That is deliberate rather than pending:
 * the rules refuse to speak until they have enough days, and a page that shows
 * an empty verdict box from day one teaches people to ignore the box.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildIndex, episodeDay, type Entry, type EpisodeContext } from "loadwise-engine";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { currentUser } from "@/lib/supabase/server";
import { getEpisode, profileOf } from "@/lib/db/episodes";
import { listEntries } from "@/lib/db/entries";
import { EntryForm } from "@/components/EntryForm";

/** Today in the browser's calendar sense, not in UTC. */
function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default async function EpisodePage({
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

  const profile = profileOf(episode);
  const entries = await listEntries(id);

  // The same context the engine will be handed when it evaluates. Built here
  // so the day count on this page can never disagree with the one in a verdict.
  const context: EpisodeContext = {
    bodyRegion: episode.body_region,
    profileKey: episode.profile_key ?? undefined,
    side: episode.side,
    startedOn: episode.started_on ?? undefined,
  };
  const index = buildIndex(entries, context);

  const today = todayIso();
  const dayToday = episodeDay(index, today);

  return (
    <main>
      <p style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>
        <Link href={`/${locale}`} style={{ color: "var(--muted)" }}>
          ← {s.diary.back}
        </Link>
      </p>

      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.35rem" }}>
          {episode.label ?? profile.label[locale]}
        </h1>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
          {profile.label[locale]}
          {episode.side !== "n/a" && ` · ${sideLabel(episode.side, s)}`}
          {dayToday !== null && (
            <>
              {" · "}
              {s.diary.day} {dayToday.day}{" "}
              <span style={{ fontSize: "0.85em" }}>
                (
                {dayToday.anchor === "declared"
                  ? s.diary.anchorDeclared
                  : s.diary.anchorFirstEntry}
                )
              </span>
            </>
          )}
        </p>
      </header>

      <section
        style={{
          border: "1px solid var(--line)",
          borderRadius: "0.5rem",
          padding: "1.25rem",
          background: "var(--card)",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ fontSize: "1.05rem", margin: "0 0 1.25rem" }}>{s.entry.heading}</h2>
        <EntryForm
          locale={locale}
          episodeId={id}
          today={today}
          strings={s.entry}
          activityLabels={s.activities}
          saveLabel={s.actions.save}
        />
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "1rem 0 0" }}>
          {s.diary.editHint}
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", margin: "0 0 0.75rem" }}>
          {s.diary.history}
          {entries.length > 0 && ` — ${entries.length} ${s.entry.entriesSoFar}`}
        </h2>

        {entries.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            {s.diary.noEntries} {s.diary.noEntriesHint}
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.4rem" }}>
            {[...entries].reverse().map((entry) => (
              <li
                key={entry.date}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  borderTop: "1px solid var(--line)",
                  paddingTop: "0.4rem",
                  fontSize: "0.92rem",
                }}
              >
                <span style={{ whiteSpace: "nowrap", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                  {entry.date}
                </span>
                <span style={{ textAlign: "right" }}>
                  {s.entry.morning} {entry.morningScore}
                  {" · "}
                  {activitySummary(entry, s)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function sideLabel(side: string, s: ReturnType<typeof t>): string {
  if (side === "left") return s.episode.sideLeft;
  if (side === "right") return s.episode.sideRight;
  if (side === "both") return s.episode.sideBoth;
  return s.episode.sideNone;
}

/**
 * What was done that day, in one line.
 *
 * A day with no activity says so rather than showing nothing — "no activity"
 * is a recorded fact, while a blank cell reads as a gap in the diary. The
 * engine draws exactly the same distinction, and the page must not blur it.
 */
function activitySummary(entry: Entry, s: ReturnType<typeof t>): string {
  if (entry.activityKind == null || entry.rpe == null || entry.durationMin == null) {
    return s.diary.restDay;
  }
  return `${s.activities[entry.activityKind]} ${entry.durationMin}′ · ${s.entry.rpe} ${entry.rpe}`;
}
