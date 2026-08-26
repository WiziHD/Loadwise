import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const alias = { "@": resolve(import.meta.dirname, "src") };

/**
 * Tests für die Weboberfläche — zwei Umgebungen, und die Trennung ist Absicht.
 *
 * ---------------------------------------------------------------------------
 * ES GAB HIER KEINEN EINZIGEN TEST.
 *
 * Der Motor hat 371, die App hatte null — und zwei der drei Fehler, die in
 * jener Woche gefunden wurden, waren LAUFZEITfehler, die `tsc` und `next build`
 * grün durchgelassen haben: eine Client-Funktion, die der Server rief, und eine
 * Middleware, die jeden Anmeldelink zerstörte. Typen fangen diese Klasse nicht.
 *
 * ---------------------------------------------------------------------------
 * BAUTEILE ZU PRÜFEN WAR EINE OFFENE ENTSCHEIDUNG. SIE IST GETROFFEN.
 *
 * An dieser Stelle stand bis zur Abnahme der ersten Woche: »Bauteile zu prüfen
 * ist eine eigene Entscheidung mit eigenen Abhängigkeiten; sie steht noch aus.«
 *
 * Was sie umgestossen hat, ist eine Zählung: **Sechs der acht Funde der
 * Härtungswoche lagen nicht in der Logik, sondern auf der Strecke von der
 * Logik zum Bildschirm.** `overall.blocking` wurde gesetzt und nie gezeigt.
 * `errors.notSaved` war übersetzt und unerreichbar. Ein Speichern ohne Wirkung
 * meldete »Gespeichert.« Kein einziger davon war ein Logikfehler; jeder einzelne
 * wäre von einem Bauteiltest gefallen.
 *
 * Ab Woche 2 rendert diese App **Urteile über einen Körper**. Ein Urteil, das
 * richtig berechnet und falsch angezeigt wird, ist ein falsches Urteil — der
 * Motor kann das nicht mehr allein absichern.
 *
 * ---------------------------------------------------------------------------
 * WARUM ZWEI PROJEKTE UND NICHT EINFACH JSDOM FÜR ALLES.
 *
 * Jsdom überall wäre eine Zeile weniger und würde eine Prüfung wegnehmen: Ein
 * Servermodul, das versehentlich nach `window` oder `document` greift, liefe
 * unter jsdom durch und bräche erst im Betrieb. Genau diese Klasse — Code auf
 * der falschen Seite der Grenze — hat diese App schon einmal getroffen.
 *
 * Die reinen Tests laufen deshalb weiter ohne Dokument. Was dort geprüft wird,
 * sind Entscheidungen — welcher Wert zulässig ist, welche Sprache ein Pfad
 * bekommt, welches Profil eine Episode trägt —, und die brauchen keines.
 *
 * **Die Dateiendung IST die Umgebung.** `.test.ts` läuft unter node, `.test.tsx`
 * unter jsdom. Keine Anmerkung pro Datei, die jemand vergessen kann, und keine
 * Liste, die jemand nachziehen muss.
 *
 * ---------------------------------------------------------------------------
 * Als .mts, weil web/package.json kein "type": "module" trägt — das zu setzen
 * wäre eine Aussage über die ganze App, nur damit eine Konfigurationsdatei
 * ESM sein darf.
 *
 * Nichts hier redet mit der Datenbank. `check:rls`, `check:signin` und
 * `check:migrations` tun das, laufen deshalb von Hand und nicht in CI.
 * ---------------------------------------------------------------------------
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "rein",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "bauteile",
          environment: "jsdom",
          pool: "threads",
          include: ["test/**/*.test.tsx"],
          // Räumt das Dokument zwischen zwei Tests ab. Ohne das steht das
          // Formular des vorigen Tests noch da, `getByRole` findet zwei
          // Knöpfe, und der Fehlschlag zeigt auf die falsche Zeile.
          setupFiles: ["test/aufraeumen.ts"],
        },
      },
    ],
  },
  resolve: {
    // Dasselbe `@/*` wie in tsconfig.json. Von Hand statt über ein Plugin: eine
    // Abhängigkeit weniger für eine Zeile.
    alias,
  },
});
