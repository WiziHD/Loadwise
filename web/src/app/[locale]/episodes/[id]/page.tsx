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
import { buildIndex, episodeAnchor, episodeDay, type Entry, type EpisodeContext } from "loadwise-engine";
import { localeFrom } from "@/i18n/config";
import { hint, navLink, verdictLine } from "@/lib/ui";
import { t } from "@/i18n/dictionary";
import { currentUser } from "@/lib/supabase/server";
import { getEpisode, profileOf } from "@/lib/db/episodes";
import { listEntries } from "@/lib/db/entries";
import { DayCount } from "@/components/DayCount";
import { EntryForm } from "@/components/EntryForm";
import { MainVerdict } from "@/components/MainVerdict";
import { latestRun } from "@/lib/db/verdicts";
import { coursePoints } from "@/lib/course-points";
import { runIsBehind } from "@/lib/run-freshness";

/**
 * The host's date — a starting guess, and nothing more.
 *
 * ---------------------------------------------------------------------------
 * THIS FUNCTION USED TO CLAIM TO KNOW WHAT DAY IT IS FOR THE PERSON. IT CANNOT.
 *
 * It ran `new Date()` and `getTimezoneOffset()` inside a server component, so
 * both belong to the HOST. On a host in UTC, somebody in Zurich recording at
 * 00:30 was handed the previous day — and 00:30 is when a training day gets
 * written down.
 *
 * The engine's own date arithmetic is timezone-safe by construction (dates.ts
 * treats YYYY-MM-DD as calendar parts and never touches local time). The
 * mistake was at the boundary: deciding WHICH day today is. Only the device
 * where the person is standing can answer that, so EntryForm corrects this
 * value on mount.
 *
 * Worse than being wrong, it was invisible: in development the server and the
 * browser are the same machine, so the two always agreed. It would have gone
 * wrong for the first time in production.
 * ---------------------------------------------------------------------------
 */
function hostToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
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

  const { profile, substituted } = profileOf(episode);
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

  const today = hostToday();
  const anchor = episodeAnchor(index);

  // Gelesen, nicht gerechnet — siehe E12. Der Hauptbildschirm zeigt den letzten
  // GESPEICHERTEN Lauf; hier neu auszuwerten würde ein verbessertes Profil
  // rückwirkend über alte Urteile schreiben lassen.
  const run = await latestRun(id);

  // Der jüngste Tag, den das Tagebuch kennt. Gegen ihn entscheidet sich, ob ein
  // gespeicherter Lauf noch aktuell ist — siehe `runIsBehind`.
  const neuesterEintrag = index.entries[index.entries.length - 1]?.date ?? null;
  const serverDay = episodeDay(index, today)?.day ?? null;

  return (
    <main>
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)" }}>
        <Link href={`/${locale}`} style={{ ...navLink, color: "var(--muted)" }}>
          ← {s.diary.back}
        </Link>
      </p>

      {substituted && (
        <p
          role="alert"
          style={{
            margin: "0 0 1.25rem",
            padding: "0.7rem 0.85rem",
            border: "1px solid var(--amber)",
            borderRadius: "var(--radius-md)",
            color: "var(--amber)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.55,
            maxWidth: "40rem",
          }}
        >
          {s.episode.profileMissing}
        </p>
      )}

      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.35rem" }}>
          {episode.label ?? profile.label[locale]}
        </h1>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: "var(--text-sm)" }}>
          {profile.label[locale]}
          {episode.side !== "n/a" && ` · ${sideLabel(episode.side, s)}`}
          {anchor !== null && (
            <DayCount
              anchor={anchor}
              serverDay={serverDay}
              dayLabel={s.diary.day}
              anchorDeclared={s.diary.anchorDeclared}
              anchorFirstEntry={s.diary.anchorFirstEntry}
            />
          )}
        </p>
        <p style={{ margin: "0.6rem 0 0", fontSize: "var(--text-sm)", display: "flex", gap: "1.25rem" }}>
          {/* Der vollständige BERICHT bleibt eine Ebene tiefer. Fünf Abschnitte
              sind der richtige Bericht und der falsche Empfang — niemand
              fotografiert einen Befundbericht ab. Siehe E7. */}
          <Link href={`/${locale}/episodes/${id}/report`} style={navLink}>
            {s.report.link}
          </Link>
          {/* Der Seitenvergleich. Eigene Ebene, weil er in einem anderen Takt
              stattfindet als ein Tagebuchtag — alle paar Wochen, nicht täglich
              — und weil die Anleitung dazugehört. Karte 3.1. */}
          <Link href={`/${locale}/episodes/${id}/tests`} style={navLink}>
            {s.selfTest.link}
          </Link>
          {/* Eigene Masse. Neben dem Seitenvergleich und nicht darin: Ein Test
              hat zwei Seiten und eine Anleitung, ein eigenes Mass hat einen
              Namen, den der Nutzer erfunden hat. Karte 3.2. */}
          <Link href={`/${locale}/episodes/${id}/measures`} style={navLink}>
            {s.measure.link}
          </Link>
          {/* Eigene Ziele. Stufe 1: vom Nutzer geschrieben, ohne Katalog.
              Karte 3.4. */}
          <Link href={`/${locale}/episodes/${id}/goals`} style={navLink}>
            {s.goal.link}
          </Link>
          <Link href={`/${locale}/episodes/${id}/edit`} style={{ ...navLink, color: "var(--muted)" }}>
            {s.edit.link}
          </Link>
        </p>
      </header>

      {/* ------------------------------------------------------------------
          DER SATZ STEHT ÜBER DEM FORMULAR, UND DIESE REIHENFOLGE HAT SICH
          GEÄNDERT.

          Hier stand vorher, das Formular müsse zuerst kommen: »Wonach jemand
          diese Seite öffnet, ist einen Tag zu erfassen — das darf nie unter die
          Falz rutschen.« Das Argument bleibt richtig, und es ist der Grund,
          warum dieser Block KURZ ist: ein Satz, eine Zeile Beleg, eine flache
          Kurve. Das Datumsfeld steht danach immer noch im ersten Bildschirm
          eines Telefons.

          Was dagegen sprach, das Urteil nach unten zu schieben, ist E7s
          eigentlicher Befund: Das Beste dieses Produkts war als Fussnote
          gestaltet. Unter einem Formular mit zwölf Feldern wäre es das wieder —
          nur an einer neuen Stelle.

          Und die Schleife stimmt so herum: Wer morgens die App öffnet, sieht
          zuerst, was gestern daraus geworden ist, und trägt dann heute ein.
          ------------------------------------------------------------------ */}
      {run.kind === "run" ? (
        <MainVerdict
          run={run.run}
          points={coursePoints(index, run.run.lastDate)}
          behind={runIsBehind(run.run, neuesterEintrag)}
          strings={s.main}
          locale={locale}
        />
      ) : (
        neuesterEintrag !== null && (
          /* ----------------------------------------------------------------
             HIER STAND NICHTS, UND DAS WAR DER FEHLER.

             `{run.kind === "run" && …}` liess die Stelle leer, sobald der
             gespeicherte Lauf fehlte oder aus einer Fassung stammte, die diese
             App nicht mehr lesen kann. Der Bericht sagt in genau demselben Fall
             einen Satz; der Hauptbildschirm schwieg.

             Wer seit Wochen jeden Tag einträgt und plötzlich keinen Befund mehr
             sieht, hat keinen Anhaltspunkt, ob die App nichts zu sagen hat oder
             etwas kaputt ist.

             Die Bedingung `neuesterEintrag !== null`: Ohne einen einzigen
             Eintrag gibt es zu Recht keine Auswertung, und der Abschnitt
             darunter sagt das bereits. Zwei Sätze über dieselbe Leere wären
             einer zu viel.
             ---------------------------------------------------------------- */
          <section style={{ margin: "0 0 var(--space-6)" }}>
            <p style={{ ...verdictLine, color: "var(--unjudged)" }}>{s.main.noRun}</p>
            <p style={hint}>{s.main.noRunHint}</p>
          </section>
        )
      )}

      <section
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)",
          padding: "1.25rem",
          background: "var(--card)",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ fontSize: "var(--text-lg)", margin: "0 0 1.25rem" }}>{s.entry.heading}</h2>
        <EntryForm
          locale={locale}
          episodeId={id}
          serverToday={today}
          entries={entries}
          strings={s.entry}
          errorStrings={s.errors}
          activityLabels={s.activities}
          saveLabel={s.actions.save}
        />
        <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)", margin: "1rem 0 0" }}>
          {s.diary.editHint}
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", margin: "0 0 0.75rem" }}>
          {s.diary.history}
          {entries.length > 0 &&
            ` — ${entries.length} ${
              entries.length === 1 ? s.entry.daysRecordedOne : s.entry.daysRecordedMany
            }`}
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
                  fontSize: "var(--text-sm)",
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
  // Kein Eintrag heisst Ruhetag, und das zu sagen ist der Punkt: Eine leere
  // Zelle liest sich wie eine Lücke im Tagebuch, und der Motor unterscheidet
  // genau das.
  if (entry.sessions.length === 0) return s.diary.restDay;

  // Jede Einheit einzeln. Ein Tag mit zwei Einheiten zeigt beide — sie
  // zusammenzufassen würde denselben Tag wie einen einzelnen langen aussehen
  // lassen, und der Unterschied ist genau der, um den es hier ging.
  return entry.sessions
    .map((session) => `${s.activities[session.activityKind]} ${session.durationMin}′ · ${s.entry.rpe} ${session.rpe}`)
    .join(" + ");
}
