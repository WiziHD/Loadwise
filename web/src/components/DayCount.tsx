"use client";

import { useEffect, useState } from "react";
import { diffDays, type EpisodeAnchor } from "loadwise-engine";

/**
 * Which day of the episode today is — counted on the device's clock.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A CLIENT COMPONENT AT ALL.
 *
 * The page around it is server-rendered, and the server does not know what day
 * it is where the person is standing. It used to answer anyway, and got two
 * things wrong at once:
 *
 *   - the number, for anybody whose local date differs from the host's;
 *   - and, when the host's date fell BEFORE the declared start, the whole
 *     header silently disappeared rather than showing a wrong number, because
 *     `episodeDay` returns null for day zero. A missing line is not reported as
 *     a bug. It is just absent, and stays absent.
 *
 * So the count is made where the clock is. The server still renders its own
 * guess first, so the markup matches on hydration and nothing flickers into
 * existence; the device corrects it immediately afterwards.
 *
 * The anchor itself — which day the count runs from, and whether that is the
 * day the person declared or their first entry — still comes from the engine.
 * Only "what is today" moves.
 * ---------------------------------------------------------------------------
 */
export function DayCount({
  anchor,
  serverDay,
  dayLabel,
  anchorDeclared,
  anchorFirstEntry,
}: {
  anchor: EpisodeAnchor;
  /** The host's answer. Stands for one render, then the device corrects it. */
  serverDay: number | null;
  dayLabel: string;
  anchorDeclared: string;
  anchorFirstEntry: string;
}) {
  const [day, setDay] = useState<number | null>(serverDay);

  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const counted = diffDays(anchor.date, today as typeof anchor.date) + 1;
    setDay(counted >= 1 ? counted : null);
  }, [anchor.date]);

  if (day === null) return null;

  return (
    <>
      {" · "}
      {dayLabel} {day}{" "}
      <span style={{ fontSize: "0.85em" }}>
        ({anchor.kind === "declared" ? anchorDeclared : anchorFirstEntry})
      </span>
    </>
  );
}
