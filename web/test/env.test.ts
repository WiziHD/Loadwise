/**
 * Die Umgebungsprüfung — laut scheitern statt still danebengreifen.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIESE DREI ZEILEN EINEN TEST BEKOMMEN.
 *
 * Der Kopf von `lib/env.ts` sagt, worum es geht: »Health data behind an
 * undefined URL fails silently in exactly the wrong direction.« Ein Client,
 * der mit `undefined` gebaut wird, rendert eine Seite, speichert nichts und
 * meldet nichts.
 *
 * Der Leerstring ist dabei der Fall, den eine Prüfung auf `undefined` allein
 * durchlässt — und genau der entsteht in einer Oberfläche, in der jemand eine
 * Variable anlegt und das Feld leer lässt.
 * ---------------------------------------------------------------------------
 */

import { afterEach, describe, expect, it } from "vitest";
import { PUBLIC_ENV } from "@/lib/env";

const NAME = "NEXT_PUBLIC_SUPABASE_URL";
const vorher = process.env[NAME];

afterEach(() => {
  if (vorher === undefined) delete process.env[NAME];
  else process.env[NAME] = vorher;
});

describe("fehlende Umgebungswerte", () => {
  it("wirft und nennt den Namen der Variable", () => {
    delete process.env[NAME];
    expect(() => PUBLIC_ENV.supabaseUrl()).toThrow(NAME);
  });

  it("wirft auch beim Leerstring — nicht nur bei undefined", () => {
    // Der Fall aus der Bedienoberfläche: Variable angelegt, Feld leer.
    process.env[NAME] = "   ";
    expect(() => PUBLIC_ENV.supabaseUrl()).toThrow(NAME);
  });

  it("nennt beide Orte, an denen der Wert stehen kann", () => {
    // Ein erster Entwurf riet nur zu `.env.local`. In einer Bauumgebung gibt
    // es die nicht, und wer dem Rat folgt, sucht an einer Stelle, die es
    // nicht gibt. Der Hinweis aufs Neubauen ist die eigentliche Falle:
    // NEXT_PUBLIC_-Werte werden beim Bauen eingesetzt, nicht beim Starten.
    delete process.env[NAME];
    let text = "";
    try {
      PUBLIC_ENV.supabaseUrl();
    } catch (e) {
      text = e instanceof Error ? e.message : String(e);
    }
    expect(text).toMatch(/\.env\.local/);
    expect(text).toMatch(/REDEPLOY/);
  });

  it("gibt den Wert zurück, wenn er dasteht — die Gegenprobe", () => {
    // Ohne sie wäre eine Funktion, die IMMER wirft, von einer richtigen nicht
    // zu unterscheiden.
    process.env[NAME] = "https://beispiel.supabase.co";
    expect(PUBLIC_ENV.supabaseUrl()).toBe("https://beispiel.supabase.co");
  });
});
