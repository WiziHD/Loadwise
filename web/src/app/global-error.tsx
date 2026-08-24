"use client";

import { usePathname } from "next/navigation";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import "./globals.css";

/**
 * Die letzte Grenze: wenn das Wurzellayout selbst fehlschlägt.
 *
 * Ersetzt das gesamte Dokument, muss also `html` und `body` selbst mitbringen —
 * es gibt an dieser Stelle kein Layout mehr, in das etwas hineingerendert
 * werden könnte.
 *
 * Bewusst ohne `ErrorScreen`: Dieses Bauteil darf sich auf nichts stützen, was
 * gerade kaputtgegangen sein könnte. Eine Fehlerseite, die selbst einen Import
 * braucht, der fehlschlägt, ist eine weisse Seite.
 *
 * `lang` steht hier richtig, im Wurzellayout dagegen fest auf "en" — das ist
 * Karte H8 und wird dort entschieden, nicht nebenbei hier.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = localeFrom(usePathname().split("/")[1]);
  const s = t(locale);

  return (
    <html lang={locale}>
      <body>
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
      </body>
    </html>
  );
}
