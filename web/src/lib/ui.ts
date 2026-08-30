/**
 * Die Formen dieser App — an einer Stelle.
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
  padding: "var(--space-2) var(--space-2)",
  fontSize: "var(--text-base)",
  border: "1px solid var(--edge)",
  borderRadius: "var(--radius-sm)",
  background: "var(--card)",
  color: "var(--fg)",
  width: "100%",
};

/** Ein zurückhaltender Knopf — findbar, ohne die Seite zu beherrschen. */
export const quietButton: CSSProperties = {
  minHeight: "2.75rem",
  padding: "var(--space-1) var(--space-3)",
  fontSize: "var(--text-sm)",
  fontWeight: "var(--weight-medium)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--edge)",
  background: "transparent",
  color: "var(--muted)",
  cursor: "pointer",
  justifySelf: "start",
};

/** Der eine Knopf, um den es auf einer Seite geht. */
/**
 * Der eine Knopf, um den es auf einer Seite geht.
 *
 * `--weight-semibold` und die enge Laufweite sind die Haltung: Ein Knopf, der
 * »Speichern« sagt, soll aussehen, als meine er es. Das ist der Unterschied,
 * den die Entscheidung »sportlich-direkt« an dieser Stelle macht — nicht eine
 * Farbe, nicht eine Animation.
 */
export const primaryButton: CSSProperties = {
  display: "inline-block",
  minHeight: "2.75rem",
  padding: "var(--space-2) var(--space-4)",
  fontSize: "var(--text-base)",
  fontWeight: "var(--weight-semibold)",
  letterSpacing: "var(--tracking-tight)",
  borderRadius: "var(--radius-sm)",
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

// ---------------------------------------------------------------------------
// Die Formen, die mit dem Designsystem dazugekommen sind (Karte A1)
//
// ---------------------------------------------------------------------------
// WARUM ALS OBJEKTE UND NICHT ALS KLASSEN.
//
// Diese App setzt Stile als Attribute — das war so, bevor es ein System gab,
// und es umzustellen wäre ein eigener Umbau mit eigenem Risiko. Was fehlte,
// war nicht die Technik, sondern die EINE Stelle: `fontSize` stand 75-mal
// verstreut, davon 54-mal als einer von fünf verschiedenen Werten für
// »kleiner Text«.
//
// Die Werte zeigen jetzt auf die Skala in `globals.css`. Eine Änderung dort
// erreicht alles hier; eine Zahl, die hier direkt steht, ist ab sofort eine
// Entscheidung, die jemand begründen muss.
// ---------------------------------------------------------------------------

/** Die Überschrift einer Seite. Genau eine je Seite. */
export const pageHeading: CSSProperties = {
  fontSize: "var(--text-2xl)",
  margin: "0 0 var(--space-2)",
};

/**
 * Die Überschrift eines Abschnitts.
 *
 * Gedämpft und klein: Ein Abschnittstitel ordnet, er ruft nicht. Was rufen
 * darf, ist der Befund darunter.
 */
export const sectionHeading: CSSProperties = {
  fontSize: "var(--text-base)",
  fontWeight: "var(--weight-semibold)",
  color: "var(--muted)",
  margin: "0 0 var(--space-3)",
};

/**
 * Die Aussage, um die es auf dem Bildschirm geht — der eine Satz aus E7.
 *
 * Gross, schwer, eng. Wer die Seite öffnet, soll sie gelesen haben, bevor er
 * sich entschieden hat zu lesen.
 */
export const verdictLine: CSSProperties = {
  fontSize: "var(--text-xl)",
  fontWeight: "var(--weight-bold)",
  letterSpacing: "var(--tracking-tight)",
  lineHeight: "var(--leading-tight)",
  margin: "0 0 var(--space-2)",
};

/** Ein erklärender Satz unter etwas anderem. Nie allein. */
export const hint: CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--muted)",
  margin: 0,
};

/** Die kleinste Stufe: Datum, Regelname, Herkunft einer Zeile. */
export const meta: CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--muted)",
};

/** Die Beschriftung eines Feldes. */
export const fieldLabel: CSSProperties = {
  fontWeight: "var(--weight-semibold)",
  fontSize: "var(--text-base)",
};

/**
 * Ein abgesetzter Bereich mit eigenem Grund.
 *
 * `--line` und nicht `--edge`: Eine Karte ist nichts, worin man tippt, und ein
 * Rand mit 3:1 liesse sie wie ein Formular aussehen. Siehe den Kopf dieser
 * Datei.
 */
export const card: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  background: "var(--card)",
  padding: "var(--space-4)",
};

/** Ein Abschnitt mit Trennlinie darüber. */
export const section: CSSProperties = {
  margin: "0 0 var(--space-6)",
  paddingTop: "var(--space-5)",
  borderTop: "1px solid var(--line)",
};
