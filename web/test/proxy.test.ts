/**
 * Der Proxy — die eine Kopfzeile, die persönliche Seiten aus dem Index hält.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIE VERDRAHTUNG EINEN EIGENEN TEST BRAUCHT.
 *
 * Ob ein Pfad privat ist, entscheidet `isPrivatePath`, und das ist in
 * `seo.test.ts` geprüft. Hier geht es um etwas anderes: dass die Antwort die
 * Kopfzeile auch WIRKLICH trägt. Eine richtige Entscheidung, die nirgends
 * ankommt, ist so gut wie keine.
 *
 * Der zweite Fall ist der, der beim Schreiben aufgefallen ist: Eine
 * Sprach-Weiterleitung baut eine NEUE Antwort und übernimmt nur die Cookies.
 * Ohne eigene Zeile trüge `/episodes/abc` kein `noindex` — nur das Ziel, dem
 * ein Crawler nicht folgen muss.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const KOPF = "x-robots-tag";
const ERWARTET = "noindex, nofollow";

describe("noindex auf allem, was einer Person gehört", () => {
  it("trägt die Kopfzeile auf einem Verlauf", async () => {
    const r = await proxy(new NextRequest("https://x.test/de/episodes/abc-123"));
    expect(r.headers.get(KOPF)).toBe(ERWARTET);
  });

  it("trägt sie auf jeder Unterseite eines Verlaufs", async () => {
    for (const p of ["report", "print", "tests", "measures", "goals", "edit"]) {
      const r = await proxy(new NextRequest(`https://x.test/en/episodes/abc-123/${p}`));
      expect(r.headers.get(KOPF), p).toBe(ERWARTET);
    }
  });

  it("trägt sie auf dem Konto", async () => {
    const r = await proxy(new NextRequest("https://x.test/de/account"));
    expect(r.headers.get(KOPF)).toBe(ERWARTET);
  });

  it("trägt sie auch auf der Sprach-Weiterleitung", async () => {
    // Der Redirect baut eine neue Antwort und übernimmt nur die Cookies.
    const r = await proxy(new NextRequest("https://x.test/episodes/abc-123"));
    expect(r.status).toBe(307);
    expect(r.headers.get(KOPF)).toBe(ERWARTET);
  });
});

describe("die Gegenprobe — öffentliche Seiten bleiben offen", () => {
  it("setzt nichts auf Startseite, Anmeldung und Datenschutz", async () => {
    // Ohne diese Prüfung wäre ein Proxy, der die Kopfzeile IMMER setzt, von
    // einem richtigen nicht zu unterscheiden — und die Seite unauffindbar.
    for (const p of ["/de", "/en", "/de/signin", "/en/privacy"]) {
      const r = await proxy(new NextRequest(`https://x.test${p}`));
      expect(r.headers.get(KOPF), p).toBeNull();
    }
  });
});
