import type { Strings } from "@/i18n/dictionary";

/**
 * »Diese Auswertung kennt deinen neuesten Eintrag noch nicht.«
 *
 * ---------------------------------------------------------------------------
 * EIN EIGENES BAUTEIL, WEIL ES ZWEI ANSICHTEN GIBT UND EINEN SATZ.
 *
 * Hauptbildschirm und Bericht zeigen beide ein gespeichertes Urteil, und beide
 * müssen sagen, wenn es den letzten Tag nicht kennt. Zweimal geschrieben wäre
 * es zweimal gestaltet, zweimal formuliert und irgendwann nur noch an einer
 * Stelle richtig.
 *
 * ---------------------------------------------------------------------------
 * ÜBER DEM URTEIL, NICHT DARUNTER.
 *
 * Wer liest, soll wissen, WORAUF er blickt, bevor er es liest. Ein Nachsatz
 * unter einem Befund käme zu spät — das Urteil ist dann schon aufgenommen.
 *
 * `--unjudged` und nicht Bernstein: Das hier ist keine Warnung über den Körper,
 * sondern eine Auskunft über den Stand der Rechnung. Eine Urteilsfarbe würde
 * beides vermischen.
 * ---------------------------------------------------------------------------
 */
export function RunBehindNotice({
  active,
  strings,
}: {
  active: boolean;
  strings: Strings["main"];
}) {
  if (!active) return null;

  return (
    <p
      role="status"
      data-behind=""
      style={{
        margin: "0 0 var(--space-4)",
        paddingLeft: "var(--space-3)",
        borderLeft: "2px solid var(--unjudged)",
        color: "var(--unjudged)",
        fontSize: "var(--text-sm)",
      }}
    >
      {strings.behind} {strings.behindHint}
    </p>
  );
}
