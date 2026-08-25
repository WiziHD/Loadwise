/**
 * Was in jeder Antwort steht, bevor die Seite anfängt.
 *
 * ---------------------------------------------------------------------------
 * BISHER STAND HIER NICHTS.
 *
 * Gemessen an der laufenden App: keine einzige Sicherheitskopfzeile, dafür ein
 * `X-Powered-By: Next.js`. Das ist für sich genommen kein Loch — aber es ist
 * die Schicht, die greift, wenn eine andere versagt, und dieses Produkt hält
 * Gesundheitsdaten.
 *
 * ---------------------------------------------------------------------------
 * DIE WICHTIGSTE ZEILE IST `connect-src`.
 *
 * Nicht, weil eine Skriptlücke wahrscheinlich wäre — React setzt keinen
 * Fremdtext als HTML ein, und die App rendert nirgends unbereinigtes Markup.
 * Sondern weil `connect-src` bestimmt, WOHIN Daten überhaupt gehen können.
 * Schafft es je ein fremdes Skript in diese Seite, entscheidet diese eine
 * Zeile, ob es ein Tagebuch abfliessen lassen kann oder nicht.
 *
 * Deshalb ist die Liste genau zwei Einträge lang: die eigene Herkunft und das
 * Supabase-Projekt. Jeder weitere Eintrag ist eine Entscheidung darüber, wem
 * die Gesundheitsdaten dieser Person zugänglich werden.
 *
 * ---------------------------------------------------------------------------
 * WARUM SKRIPTE EINEN NONCE BEKOMMEN UND STILE NICHT.
 *
 * Next fügt zum Hochfahren der Seite Skripte inline ein. Sie zu erlauben
 * bräuchte entweder `'unsafe-inline'` — was `script-src` praktisch abschaltet —
 * oder einen Wert, der sich je Anfrage ändert. Der Nonce ist dieser Wert; Next
 * liest ihn aus der Kopfzeile der Anfrage und schreibt ihn an seine eigenen
 * Skripte.
 *
 * Bei Stilen geht das nicht, und das ist kein Versäumnis: Diese App setzt ihre
 * Stile als `style={{…}}`-ATTRIBUT, und ein Attribut kann keinen Nonce tragen.
 * `'unsafe-inline'` steht dort also bewusst. Ein Stilattribut führt keinen Code
 * aus; der Schaden, den es anrichten kann, ist optisch.
 * ---------------------------------------------------------------------------
 */

/**
 * Kopfzeilen ohne Bezug zur einzelnen Anfrage.
 *
 * Stehen in `next.config.ts` und gelten damit auch für `/_next/*` — der Proxy
 * lässt statische Dateien absichtlich aus.
 */
export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  // Ein Verweis auf eine fremde Seite darf nicht mitschicken, WELCHE Episode
  // gerade offen war. Der Pfad enthält eine Kennung; die Herkunft genügt.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Ein als Bild deklarierter Text darf nicht als HTML ausgeführt werden.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Doppelt zu `frame-ancestors` unten, für Browser, die das noch nicht
  // auswerten. Clickjacking auf einem Formular, das Gesundheitsdaten
  // entgegennimmt, wäre besonders unangenehm.
  { key: "X-Frame-Options", value: "DENY" },

  // Nichts davon braucht diese App. Ausgeschaltet, damit ein eingeschleustes
  // Skript es auch nicht braucht.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

/**
 * Die Richtlinie für ein Dokument, mit dem Nonce dieser einen Anfrage.
 *
 * `supabaseUrl` kommt aus der Umgebung. Fehlt sie — die App läuft auch ohne
 * Datenbank —, bleibt `connect-src` bei der eigenen Herkunft: strenger, nicht
 * lockerer. Eine fehlende Einstellung darf eine Sperre nie öffnen.
 */
export function contentSecurityPolicy(
  nonce: string,
  supabaseUrl: string | undefined,
  entwicklung: boolean,
): string {
  const supabase = supabaseUrl === undefined || supabaseUrl === "" ? [] : [supabaseUrl];

  const richtlinien: string[] = [
    `default-src 'self'`,

    // `strict-dynamic`: Was ein erlaubtes Skript nachlädt, gilt als erlaubt —
    // sonst müsste jede Bündeldatei einzeln aufgezählt werden.
    //
    // `unsafe-eval` NUR in der Entwicklung: Der Neuladen-Mechanismus von Next
    // braucht es. In einer Auslieferung stünde es für nichts als ein offenes
    // Tor.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${entwicklung ? " 'unsafe-eval'" : ""}`,

    // Siehe oben: Stilattribute können keinen Nonce tragen.
    `style-src 'self' 'unsafe-inline'`,

    `img-src 'self' data: blob:`,
    `font-src 'self'`,

    // Die Zeile, um die es geht.
    [`connect-src 'self'`, ...supabase].join(" "),

    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,

    // Ein Formular dieser App schickt nirgendwo anders hin. Server-Aktionen
    // sind Anfragen an die eigene Herkunft.
    `form-action 'self'`,
  ];

  return richtlinien.join("; ");
}
