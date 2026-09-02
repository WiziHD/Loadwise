"use client";

import { useState, useTransition } from "react";
import {
  milestoneText,
  progressBlockText,
  type Locale,
  type Milestone,
  type MilestoneStatus,
  type ProgressReport,
} from "loadwise-engine";
import { deleteMilestoneAction, markMilestoneAction } from "@/app/actions/milestones";
import type { Strings } from "@/i18n/dictionary";
import { hint, quietButton, section, sectionHeading } from "@/lib/ui";

/**
 * Die eigenen Ziele, mit ihrem Stand.
 *
 * ---------------------------------------------------------------------------
 * »DREI VON FÜNF« — UND WORAUF SICH DAS BEZIEHT.
 *
 * Das ist der Satz, um den es in dieser Karte geht: Fortschritt gegen den
 * **selbst erklärten Massstab**. Nicht gegen eine klinische Phase, nicht gegen
 * einen Normwert, nicht gegen andere Menschen. Der Massstab gehört dem Nutzer,
 * weil er ihn geschrieben hat.
 *
 * Die Zählung sagt deshalb »im Tagebuch belegt« und nicht »geschafft«. Der
 * Unterschied trägt die regulatorische Position und ist keine Geschmacksfrage:
 * »belegt« ist eine Aussage über das Buch, »geschafft« eine über die Person.
 * Der Motor benennt seine Zustände nach derselben Regel — `recorded` gegen
 * `achieved`, `not-in-record` gegen `not-reached`.
 *
 * ---------------------------------------------------------------------------
 * KEIN BALKEN, AUS DEMSELBEN GRUND WIE BEIM SEITENVERGLEICH (E16).
 *
 * »Drei von fünf« ist eine Zählung eigener Sätze, kein Fortschritt auf einer
 * Skala mit Ende. Fünf ist die Zahl der Ziele, die jemand aufgeschrieben hat —
 * schreibt er ein sechstes, wird aus drei von fünf drei von sechs, und niemand
 * ist dadurch zurückgefallen. Ein Balken behauptete das Gegenteil.
 *
 * ---------------------------------------------------------------------------
 * SELBST ABHAKEN GIBT ES NUR OHNE PRÜFBARE BEDINGUNG.
 *
 * Ein Ziel mit Bedingung beantwortet das Tagebuch. Ein Häkchen daneben wäre
 * eine zweite, widersprechende Antwort auf dieselbe Frage — und welche gölte,
 * müsste dann jede lesende Stelle für sich entscheiden. Die Datenbank setzt
 * das mit `manual_tick_only_when_untracked` durch; hier fehlt der Knopf
 * schlicht.
 * ---------------------------------------------------------------------------
 */

/** Wie viele Ziele das Tagebuch belegt — oder der Nutzer selbst eingetragen hat. */
export function belegteZiele(status: MilestoneStatus[]): number {
  return status.filter((s) => s.state === "recorded" || s.state === "marked-by-user").length;
}

function fuellen(vorlage: string, werte: Record<string, string | number>): string {
  return vorlage.replace(/\{(\w+)\}/g, (ganz, key: string) =>
    key in werte ? String(werte[key]) : ganz,
  );
}

export function MilestoneList({
  locale,
  episodeId,
  today,
  milestones,
  progress,
  strings,
  errorStrings,
}: {
  locale: Locale;
  episodeId: string;
  today: string;
  /** Die Ziele, wie sie gespeichert sind — für Text und Bedingungen. */
  milestones: Milestone[];
  /** Der Stand aus dem gespeicherten Lauf. Das Urteil, nicht die Ziele. */
  progress: ProgressReport | null;
  strings: Strings["goal"];
  errorStrings: Strings["errors"];
}) {
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  if (milestones.length === 0) {
    return (
      <section style={section}>
        <h2 style={sectionHeading}>{strings.listHeading}</h2>
        <p style={{ ...hint, margin: 0 }}>{strings.listEmpty}</p>
      </section>
    );
  }

  const statusVon = new Map((progress?.milestones ?? []).map((s) => [s.id, s]));
  const belegt = belegteZiele(progress?.milestones ?? []);

  return (
    <section style={section}>
      <h2 style={sectionHeading}>{strings.listHeading}</h2>

      {/* Die Zählung. Eine Zahl, kein Balken — siehe Kopf. */}
      <p data-count="" style={{ margin: "0 0 var(--space-4)", fontWeight: "var(--weight-semibold)" }}>
        {fuellen(strings.reachedCount, { done: belegt, total: milestones.length })}
      </p>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-4)" }}>
        {milestones.map((m) => {
          const status = statusVon.get(m.id);
          const selbstAbhakbar = m.all.length === 0;
          const abgehakt = m.markedReachedOn !== null && m.markedReachedOn !== undefined;

          return (
            <li
              key={m.id}
              data-goal={m.id}
              data-state={status?.state ?? "unknown"}
              style={{
                paddingLeft: "var(--space-3)",
                borderLeft: `2px solid ${
                  status?.state === "recorded" || status?.state === "marked-by-user"
                    ? "var(--green)"
                    : "var(--line)"
                }`,
              }}
            >
              {/* Die eigenen Worte. Unverändert, ungefiltert, so wie geschrieben. */}
              <p style={{ margin: "0 0 0.2rem" }}>{m.label.text}</p>

              {status !== undefined && (
                <p style={{ ...hint, margin: "0 0 0.2rem" }}>{milestoneText(status.state, locale)}</p>
              )}

              {/* Wie viele Tage gefunden wurden, wenn mehr als einer verlangt ist.
                  Bei einem einzigen wäre »1 von 1 Tagen« nur Lärm. */}
              {status !== undefined && status.needed > 1 && (
                <p style={{ ...hint, margin: "0 0 0.2rem" }}>
                  {fuellen(strings.daysFound, {
                    found: status.qualifyingDays.length,
                    needed: status.needed,
                  })}
                </p>
              )}

              {/* Ein Grund, warum der Kanal nichts sagen kann — etwa ein Mass,
                  zu dem nie etwas erfasst wurde. Aus dem Motor, nicht von hier. */}
              {status?.blocked != null && (
                <p style={{ ...hint, margin: "0 0 0.2rem" }}>
                  {progressBlockText(status.blocked, locale)}
                </p>
              )}

              <p style={{ ...hint, margin: "0 0 0.4rem" }}>
                {strings.createdOn} <time dateTime={String(m.createdOn)}>{String(m.createdOn)}</time>
              </p>

              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {selbstAbhakbar && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        setFailed(false);
                        try {
                          const r = await markMilestoneAction(
                            locale,
                            episodeId,
                            m.id,
                            abgehakt ? null : today,
                          );
                          if (!r.ok) setFailed(true);
                        } catch {
                          setFailed(true);
                        }
                      })
                    }
                    style={quietButton}
                  >
                    {abgehakt ? strings.unmarkReached : strings.markReached}
                  </button>
                )}

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    // Ein Ziel wird wirklich gelöscht, nicht archiviert (siehe
                    // `deleteMilestone`). Deshalb hier die Rückfrage: Was
                    // unwiderruflich ist, bekommt einen zweiten Klick.
                    if (!window.confirm(strings.removeConfirm)) return;
                    start(async () => {
                      setFailed(false);
                      try {
                        const r = await deleteMilestoneAction(locale, episodeId, m.id);
                        if (!r.ok) setFailed(true);
                      } catch {
                        setFailed(true);
                      }
                    });
                  }}
                  style={{ ...quietButton, color: "var(--muted)" }}
                >
                  {strings.remove}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {failed && (
        <p role="alert" style={{ margin: "var(--space-3) 0 0", color: "var(--red)" }}>
          {errorStrings.notSaved}
        </p>
      )}
    </section>
  );
}
