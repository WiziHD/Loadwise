"use client";

import { useEffect } from "react";
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
 * `lang` kommt hier aus dem Pfad und nicht aus der Kopfzeile: Diese Seite
 * erscheint, wenn das Wurzellayout selbst fehlgeschlagen ist — sie darf sich
 * auf nichts stützen, was gerade kaputtgegangen sein könnte.
 *
 * ---------------------------------------------------------------------------
 * DER FEHLER KAM HIER AN UND WURDE WEGGEWORFEN.
 *
 * `ErrorScreen` protokolliert ihn, diese Datei nahm ihn entgegen und las ihn
 * nie. Ausgerechnet hier: Diese Seite erscheint nur, wenn das Wurzellayout
 * selbst fehlgeschlagen ist — der schwerste Fall, den die App hat, und der
 * einzige, der keine Spur hinterliess.
 *
 * Gefunden hat das nicht ein Blick, sondern `noUnusedLocals`. Der Compiler
 * konnte es die ganze Zeit sagen; ihn zu fragen war der fehlende Schritt.
 * ---------------------------------------------------------------------------
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

  useEffect(() => {
    // Dieselbe Zeile wie in ErrorScreen, aus demselben Grund: Der Digest
    // identifiziert den Fehler in den Serverprotokollen. Auf den Bildschirm
    // gehört er nicht — dort steht er weiterhin nicht.
    console.error("Loadwise:", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang={locale}>
      <body>
        <main>
          <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.75rem" }}>{s.errors.brokeHeading}</h1>
          <p style={{ margin: "0 0 1.25rem", color: "var(--muted)", maxWidth: "34rem" }}>
            {s.errors.brokeBody}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.6rem 1rem",
              fontSize: "var(--text-base)",
              borderRadius: "var(--radius-sm)",
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
