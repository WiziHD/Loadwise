/**
 * Was eine Suchmaschine sehen darf — und was nicht.
 *
 * ---------------------------------------------------------------------------
 * DIE LISTE IST EINE ERLAUBNIS, KEIN AUSSCHLUSS. DIESELBE RICHTUNG WIE BEIM
 * PRERENDER-WÄCHTER.
 *
 * Eine Sperrliste vergisst die Seite, die morgen dazukommt. Eine Erlaubnisliste
 * vergisst sie auch — aber dann bleibt die neue Seite AUSSEN vor, und das ist
 * die Richtung, in der ein Fehler nichts kostet. Bei einer App, die
 * Verletzungen und Schmerzverläufe führt, ist das keine Feinheit.
 *
 * Konkret ausgeschlossen und niemals verhandelbar: alles unter `/episodes` und
 * `/account`. Die Liste der Verletzungen, die jemand führt, ist das
 * Empfindlichste, was dieses Produkt hält — dieselbe Begründung, die im
 * Prerender-Wächter steht.
 *
 * ---------------------------------------------------------------------------
 * INDEXIERT WIRD NUR DIE PRODUKTIVE AUSLIEFERUNG.
 *
 * Vercel gibt jeder Vorschau eine eigene Adresse. Dieselbe App unter zwanzig
 * Adressen ist für eine Suchmaschine nicht »dieselbe App«, sondern zwanzig
 * Kopien — und die Vorschau einer noch nicht entschiedenen Fassung steht dann
 * neben der echten Seite.
 *
 * Geprüft wird auf `VERCEL_ENV === "production"` UND eine gesetzte Adresse.
 * Fehlt eines von beidem, verbietet `robots.txt` alles. Eine Umgebung, die
 * ihre eigene Adresse nicht kennt, kann keine kanonische Adresse angeben —
 * und ohne die ist Indexieren raten.
 * ---------------------------------------------------------------------------
 */

/**
 * Pfade unterhalb der Sprache, die ohne Anmeldung etwas zeigen.
 *
 * `""` ist die Startseite: Sie zeigt ohne Anmeldung Name, Zeile und den Weg
 * zur Anmeldung — und mit Anmeldung die eigenen Verläufe. Dass dieselbe
 * Adresse beides tut, ist für eine Suchmaschine unproblematisch: Sie ist nie
 * angemeldet und sieht deshalb immer die erste Fassung.
 */
export const PUBLIC_PATHS = ["", "/signin", "/privacy"] as const;

/**
 * Was unter keinen Umständen in einen Index gehört.
 *
 * Als Präfix, nicht als vollständige Adresse: `/episodes/<id>/report` ist
 * genauso privat wie `/episodes`, und eine Liste einzelner Adressen wäre am
 * Tag der nächsten Unterseite still unvollständig.
 */
export const PRIVATE_PREFIXES = ["/episodes", "/account"] as const;

/** Ein oder mehrere Schrägstriche am Ende der Adresse. */
const SCHRAEGSTRICHE_AM_ENDE = /\/+$/;

/** Die Sprache am Anfang eines Pfades — `/de` in `/de/episodes`. */
const SPRACHE_AM_ANFANG = /^\/(de|en)(?=\/|$)/;

/** Die Adresse dieser Auslieferung, oder `null`, wenn sie keine kennt. */
export function siteUrl(env: Record<string, string | undefined> = process.env): string | null {
  const roh = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!roh) return null;
  // Ohne abschliessenden Schrägstrich, damit `${siteUrl}/de` nicht `//de` wird.
  return roh.replace(SCHRAEGSTRICHE_AM_ENDE, "");
}

/**
 * Darf diese Auslieferung überhaupt indexiert werden?
 *
 * Nimmt die Umgebung als Parameter, damit ein Test beide Antworten bekommen
 * kann, ohne die Umgebung des Laufs zu verbiegen — dieselbe Disziplin wie bei
 * `paywallEnabled`.
 */
export function indexingAllowed(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL_ENV === "production" && siteUrl(env) !== null;
}

/**
 * Ist dieser Pfad privat?
 *
 * Nimmt den vollen Pfad MIT Sprache (`/de/episodes/abc`) und schneidet sie ab,
 * bevor er vergleicht. Eine Prüfung ohne diesen Schritt hielte `/de/episodes`
 * für öffentlich, weil es nicht mit `/episodes` beginnt — genau der Fehler,
 * den man beim Lesen überliest.
 */
export function isPrivatePath(pathname: string): boolean {
  const ohneSprache = pathname.replace(SPRACHE_AM_ANFANG, "");
  const pfad = ohneSprache === "" ? "/" : ohneSprache;
  return PRIVATE_PREFIXES.some((p) => pfad === p || pfad.startsWith(`${p}/`));
}
