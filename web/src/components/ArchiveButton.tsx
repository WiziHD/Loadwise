"use client";

import { useState, useTransition } from "react";
import type { Locale } from "loadwise-engine";
import { setEpisodeArchivedAction } from "@/app/actions/episodes";
import type { Strings } from "@/i18n/dictionary";
import { quietButton } from "@/lib/ui";

/**
 * Ins Archiv und zurück.
 *
 * Ein eigenes Bauteil statt eines Formulars auf der Seite, weil ein
 * Fehlschlag hier ankommen muss. Ein `form action={...}` ohne Rückmeldung sähe
 * nach dem Klick genauso aus wie ein Erfolg — dieselbe Sorte Stille, die den
 * Tageseintrag sechs Datenverluste gekostet hat.
 */
export function ArchiveButton({
  locale,
  episodeId,
  archived,
  strings,
  errorStrings,
}: {
  locale: Locale;
  episodeId: string;
  archived: boolean;
  strings: Strings["edit"];
  errorStrings: Strings["errors"];
}) {
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div style={{ display: "grid", gap: "0.4rem" }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setFailed(false);
          start(async () => {
            try {
              const result = await setEpisodeArchivedAction(locale, episodeId, !archived);
              if (!result.ok) setFailed(true);
            } catch {
              setFailed(true);
            }
          });
        }}
        style={{ ...quietButton, cursor: pending ? "wait" : "pointer" }}
      >
        {archived ? strings.unarchive : strings.archive}
      </button>

      {failed && (
        <span role="alert" style={{ color: "var(--amber)", fontSize: "0.88rem" }}>
          {errorStrings.notSaved}
        </span>
      )}
    </div>
  );
}
