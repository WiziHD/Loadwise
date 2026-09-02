/**
 * Was anstelle des Ausdrucks steht, wenn die Bezahlschranke an ist.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS EIN EIGENES BAUTEIL IST UND KEINE ZEHN ZEILEN IN DER SEITE.
 *
 * Die Seite ist eine `async`-Serverkomponente mit drei Abfragen davor. Was
 * darin steht, ist im Test nicht erreichbar, ohne die halbe Datenbank zu
 * stellen — und ein Zustand, den kein Test rendert, ist ein Zustand, von dem
 * niemand weiss, wie er aussieht, bis ihn ein Nutzer sieht.
 *
 * Hier ist er ein reines Bauteil: gerendert, geprüft, mutiert.
 *
 * ---------------------------------------------------------------------------
 * DER TEXT NENNT, WAS OFFEN BLEIBT — UND VERLINKT ES.
 *
 * Eine Sperrseite, die nur »nicht enthalten« sagt, lässt offen, ob die eigenen
 * Daten mit weg sind. Sie sind es nicht: Der Weg zum vollständigen Export steht
 * als Link auf derselben Seite, nicht in einer Hilfe.
 * ---------------------------------------------------------------------------
 */

import Link from "next/link";
import type { Locale } from "loadwise-engine";
import { navLink } from "@/lib/ui";

export function PrintLocked({
  locale,
  episodeId,
  strings,
}: {
  locale: Locale;
  episodeId: string;
  strings: {
    heading: string;
    locked: string;
    lockedHint: string;
    back: string;
    dataLink: string;
  };
}) {
  return (
    <>
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)" }}>
        <Link
          href={`/${locale}/episodes/${episodeId}`}
          style={{ ...navLink, color: "var(--muted)" }}
        >
          ← {strings.back}
        </Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>{strings.heading}</h1>
      <p style={{ margin: "0 0 0.5rem" }}>{strings.locked}</p>
      <p style={{ margin: "0 0 1.5rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
        {strings.lockedHint}
      </p>
      <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>
        <Link href={`/${locale}/account`} style={navLink}>
          {strings.dataLink}
        </Link>
      </p>
    </>
  );
}
