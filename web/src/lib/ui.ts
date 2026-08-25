/**
 * Die drei Formen, die jedes Bedienelement dieser App hat — an einer Stelle.
 *
 * ---------------------------------------------------------------------------
 * WARUM ZENTRAL, UND WARUM DAS EINE BARRIEREFREIHEITSFRAGE IST.
 *
 * Diese Objekte standen dreimal im Code, leicht verschieden. Die Fassung im
 * Tageseintrag trug `minHeight: 2.75rem` mit einem langen Kommentar darüber,
 * warum 44 px die kleinste Fläche sind, die ein Daumen zuverlässig trifft. Die
 * Fassung im Formular »Neue Episode« trug sie nicht — dieselbe Art Feld, 36 px
 * hoch, weil beim Kopieren eine Zeile fehlte.
 *
 * Genau so verschwinden solche Entscheidungen: nicht durch Widerspruch,
 * sondern durch eine zweite Abschrift. Jetzt gibt es eine.
 *
 * ---------------------------------------------------------------------------
 * `--edge` UND NICHT `--line`.
 *
 * Der Umriss von etwas, das man antippen oder in das man tippen kann, muss
 * nach WCAG 1.4.11 mindestens 3:1 gegen seinen Grund haben — sonst ist nicht
 * erkennbar, wo das Feld anfängt. `--line` lag bei 1,28:1: eine Haarlinie, die
 * auf einem Telefon in der Sonne schlicht nicht da ist.
 *
 * `--line` bleibt für Trennendes und Rahmen ohne Bedienfunktion; dort verlangt
 * WCAG nichts, und eine Karte mit 3:1-Rand sieht aus wie ein Formular.
 * `scripts/check-contrast.ts` prüft beide und sagt, welche Regel für welches
 * gilt.
 * ---------------------------------------------------------------------------
 */

import type { CSSProperties } from "react";

/**
 * Ein Eingabefeld, eine Auswahl, ein Datumsfeld.
 *
 * `minHeight` 44 px: die Zahl steht so in den Richtlinien beider Plattformen.
 * Gemessen waren es einmal 36 bis 39 px — am Rechner unauffällig, am Telefon
 * jeden Abend ein Ärgernis. Und das Tagebuch wird am Telefon geführt: Ein
 * Formular, das dort mühsam ist, wird nicht neunzig Tage lang ausgefüllt, und
 * dann hat der ganze Motor nichts zu rechnen.
 *
 * `fontSize` 16 px, nicht kleiner: iOS zoomt beim Antippen in jedes Feld mit
 * kleinerer Schrift hinein, und der Zoom bleibt danach stehen.
 */
export const field: CSSProperties = {
  minHeight: "2.75rem",
  padding: "0.5rem 0.55rem",
  fontSize: "1rem",
  border: "1px solid var(--edge)",
  borderRadius: "0.375rem",
  background: "var(--card)",
  color: "var(--fg)",
  width: "100%",
};

/** Ein zurückhaltender Knopf — findbar, ohne die Seite zu beherrschen. */
export const quietButton: CSSProperties = {
  minHeight: "2.75rem",
  padding: "0.3rem 0.9rem",
  fontSize: "0.85rem",
  borderRadius: "0.375rem",
  border: "1px solid var(--edge)",
  background: "transparent",
  color: "var(--muted)",
  cursor: "pointer",
  justifySelf: "start",
};

/** Der eine Knopf, um den es auf einer Seite geht. */
export const primaryButton: CSSProperties = {
  display: "inline-block",
  minHeight: "2.75rem",
  padding: "0.6rem 1rem",
  fontSize: "1rem",
  borderRadius: "0.375rem",
  border: "1px solid var(--fg)",
  background: "var(--fg)",
  color: "var(--bg)",
  textDecoration: "none",
  cursor: "pointer",
};

/**
 * Ein Link, der für sich allein steht — »← Alle Episoden«, der Sprachwechsel.
 *
 * ---------------------------------------------------------------------------
 * 24 PIXEL, UND WARUM DAS NICHT WILLKÜRLICH IST.
 *
 * WCAG 2.5.8 verlangt für Bedienziele mindestens 24 × 24 px. Ausgenommen sind
 * Links MITTEN in einem Satz — dort wäre die Forderung sinnlos, weil die
 * Zeilenhöhe den Text bestimmt. Ein Link, der allein in seiner Zeile steht,
 * ist keiner davon.
 *
 * Gemessen waren es 20 px: mit der Maus kein Problem, mit dem Daumen einer
 * Hand, die gerade die einzige gesunde ist, ein tägliches Ärgernis.
 *
 * `inline-block`, weil senkrechte Polsterung an einem `inline`-Element die
 * Trefferfläche nicht mitwachsen lässt — sie überlappt bloss die Nachbarzeile.
 * ---------------------------------------------------------------------------
 */
export const navLink: CSSProperties = {
  display: "inline-block",
  minHeight: "1.5rem",
  paddingBlock: "0.2rem",
};
