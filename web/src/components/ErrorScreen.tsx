"use client";

import { useEffect } from "react";
import type { Locale } from "loadwise-engine";
import { t } from "@/i18n/dictionary";

/**
 * Was jemand sieht, wenn eine Seite abstürzt.
 *
 * ---------------------------------------------------------------------------
 * VORHER STAND DORT NICHTS VON UNS.
 *
 * Ohne eine Fehlergrenze zeigt Next seinen eigenen Notausgang:
 * »Application error: a server-side exception has occurred« samt einer
 * Digest-Nummer. Auf Englisch, in einer deutschen App, ohne einen Weg zurück,
 * und mit einer Zahl, die für die lesende Person keine Bedeutung hat.
 *
 * ZWEI DINGE STEHEN HIER ABSICHTLICH NICHT:
 *
 *   Der Grund. `error.message` kann von Supabase kommen und Tabellen- und
 *   Spaltennamen enthalten. Das gehört in die Serverprotokolle, nicht auf einen
 *   Bildschirm, den jemand im Wartezimmer aufhat.
 *
 *   Der Digest. Er identifiziert den Fehler in den Protokollen und sagt der
 *   Person nichts. Eine Zahl, die aussieht, als müsste man sie sich merken, ist
 *   schlimmer als keine.
 *
 * Was dafür dasteht: dass an den erfassten Daten nichts kaputt ist. Bei einem
 * Tagebuch, das jemand über Monate führt, ist das die erste Frage — und die
 * Antwort stimmt, weil ein Absturz beim Anzeigen nichts schreibt.
 * ---------------------------------------------------------------------------
 */
export function ErrorScreen({
  locale,
  error,
  reset,
}: {
  locale: Locale;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const s = t(locale);

  useEffect(() => {
    // Der Fehler soll IRGENDWO ankommen. Bisher verschwand er ins Nichts,
    // sobald niemand die Konsole offen hatte. Eine echte Meldestelle ist eine
    // eigene Entscheidung (Karte 4.x); bis dahin wenigstens hier.
    console.error("Loadwise:", error.digest ?? error.message);
  }, [error]);

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.75rem" }}>{s.errors.brokeHeading}</h1>
      <p style={{ margin: "0 0 1.25rem", color: "var(--muted)", maxWidth: "34rem" }}>
        {s.errors.brokeBody}
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: "0.6rem 1rem",
          fontSize: "1rem",
          borderRadius: "0.375rem",
          border: "1px solid var(--fg)",
          background: "var(--fg)",
          color: "var(--bg)",
          cursor: "pointer",
        }}
      >
        {s.errors.tryAgain}
      </button>
    </main>
  );
}
