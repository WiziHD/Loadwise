/**
 * Was eine Suchmaschine sehen darf — geprüft gegen den echten Dateibaum.
 *
 * ---------------------------------------------------------------------------
 * DIE WICHTIGSTE PRÜFUNG IST DIE DRITTE: KEINE ROUTE FÄLLT DURCHS RASTER.
 *
 * Zwei Listen stehen in `lib/seo.ts` — was öffentlich ist und was privat. Eine
 * neue Seite, die in keiner von beiden vorkommt, wäre weder in der Sitemap
 * noch mit `noindex` versehen. Sie sähe aus wie eine Entscheidung und wäre
 * eine Lücke.
 *
 * Deshalb liest dieser Test `src/app` und verlangt für JEDE Route eine
 * Zuordnung. Er ist damit der einzige Teil dieser Prüfung, der etwas über
 * morgen sagt.
 * ---------------------------------------------------------------------------
 */

import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRIVATE_PREFIXES,
  PUBLIC_PATHS,
  indexingAllowed,
  isPrivatePath,
  siteUrl,
} from "@/lib/seo";

/** Alle Routen unter `src/app/[locale]`, als Pfad OHNE die Sprache. */
function routen(): string[] {
  const wurzel = resolve(process.cwd(), "src/app/[locale]");
  const out: string[] = [];
  const gehe = (dir: string, pfad: string): void => {
    for (const name of readdirSync(dir)) {
      const voll = resolve(dir, name);
      if (statSync(voll).isDirectory()) gehe(voll, `${pfad}/${name}`);
      else if (name === "page.tsx") out.push(pfad);
    }
  };
  gehe(wurzel, "");
  return out;
}

describe("die Erlaubnisliste", () => {
  it("enthält keinen Pfad, der unter einem privaten Präfix liegt", () => {
    for (const pfad of PUBLIC_PATHS) {
      expect(isPrivatePath(`/de${pfad}`), pfad).toBe(false);
      expect(isPrivatePath(`/en${pfad}`), pfad).toBe(false);
    }
  });

  it("erkennt die privaten Pfade MIT vorangestellter Sprache", () => {
    // Die Falle: `/de/episodes` beginnt nicht mit `/episodes`. Eine Prüfung
    // ohne das Abschneiden der Sprache hielte jede private Seite für
    // öffentlich — und man liest es beim Durchsehen nicht.
    expect(isPrivatePath("/de/episodes")).toBe(true);
    expect(isPrivatePath("/en/episodes/abc-123/report")).toBe(true);
    expect(isPrivatePath("/de/account")).toBe(true);
    // Gegenprobe: Ohne sie wäre eine Funktion, die immer `true` sagt, von
    // einer richtigen nicht zu unterscheiden.
    expect(isPrivatePath("/de")).toBe(false);
    expect(isPrivatePath("/en/privacy")).toBe(false);
    expect(isPrivatePath("/de/signin")).toBe(false);
  });

  it("ordnet JEDE Route im Dateibaum zu — öffentlich oder privat", () => {
    const offen = PUBLIC_PATHS as readonly string[];
    const unzugeordnet = routen().filter(
      (r) => !offen.includes(r) && !isPrivatePath(`/de${r}`),
    );
    expect(
      unzugeordnet,
      `Diese Routen stehen weder in PUBLIC_PATHS noch unter einem Präfix in ` +
        `PRIVATE_PREFIXES. Sie kämen weder in die Sitemap noch bekämen sie ` +
        `noindex — eine Lücke, die wie eine Entscheidung aussieht.`,
    ).toEqual([]);
  });

  it("findet überhaupt Routen — sonst prüft der Test darüber nichts", () => {
    // Ein Dateibaum-Test, der nichts findet, ist grün und wertlos.
    expect(routen().length).toBeGreaterThan(5);
  });
});

describe("indexiert wird nur die produktive Auslieferung", () => {
  const MIT = { VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://beispiel.test" };

  it("erlaubt es in der Produktion mit gesetzter Adresse", () => {
    expect(indexingAllowed(MIT)).toBe(true);
  });

  it("verbietet es in einer Vorschau", () => {
    // Dieselbe App unter zwanzig Adressen ist für eine Suchmaschine nicht
    // dieselbe App, sondern zwanzig Kopien.
    expect(indexingAllowed({ ...MIT, VERCEL_ENV: "preview" })).toBe(false);
  });

  it("verbietet es ohne bekannte Adresse", () => {
    expect(indexingAllowed({ VERCEL_ENV: "production" })).toBe(false);
    expect(indexingAllowed({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "  " })).toBe(false);
  });

  it("verbietet es, wenn gar keine Umgebung gesetzt ist", () => {
    expect(indexingAllowed({})).toBe(false);
  });
});

describe("die Adresse", () => {
  it("verliert den abschliessenden Schrägstrich", () => {
    // Sonst wird aus `${basis}/de` ein `//de` — und das ist eine andere Seite.
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://beispiel.test/" })).toBe(
      "https://beispiel.test",
    );
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://beispiel.test///" })).toBe(
      "https://beispiel.test",
    );
  });

  it("ist null, wenn keine dasteht", () => {
    expect(siteUrl({})).toBeNull();
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "" })).toBeNull();
  });
});

describe("die Präfixe selbst", () => {
  it("nennt Verläufe und Konto — die beiden Orte mit persönlichem Inhalt", () => {
    // Namentlich festgehalten, weil eine Liste sich leise kürzen lässt.
    expect([...PRIVATE_PREFIXES]).toContain("/episodes");
    expect([...PRIVATE_PREFIXES]).toContain("/account");
  });
});
