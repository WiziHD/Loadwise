import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Tests für die Weboberfläche.
 *
 * ---------------------------------------------------------------------------
 * ES GAB HIER KEINEN EINZIGEN TEST.
 *
 * Der Motor hat 316, die App hatte null — und zwei der drei Fehler, die diese
 * Woche gefunden wurden, waren LAUFZEITfehler, die `tsc` und `next build` grün
 * durchgelassen haben: eine Client-Funktion, die der Server rief, und eine
 * Middleware, die jeden Anmeldelink zerstörte. Typen fangen diese Klasse nicht.
 *
 * Umgebung `node`, kein jsdom. Was hier geprüft wird, sind Entscheidungen —
 * welcher Wert zulässig ist, welche Sprache ein Pfad bekommt, welches Profil
 * eine Episode trägt —, und die brauchen kein Dokument. Bauteile zu prüfen ist
 * eine eigene Entscheidung mit eigenen Abhängigkeiten; sie steht noch aus.
 *
 * Als .mts, weil web/package.json kein "type": "module" trägt — das zu setzen
 * wäre eine Aussage über die ganze App, nur damit eine Konfigurationsdatei
 * ESM sein darf.
 *
 * Nichts hier redet mit der Datenbank. `check:rls` und `check:migrations` tun
 * das, laufen deshalb von Hand und nicht in CI.
 * ---------------------------------------------------------------------------
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    // Dasselbe `@/*` wie in tsconfig.json. Von Hand statt über ein Plugin: eine
    // Abhängigkeit weniger für eine Zeile.
    alias: { "@": resolve(import.meta.dirname, "src") },
  },
});
