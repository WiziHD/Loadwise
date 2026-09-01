/**
 * Die Schreibschicht der eigenen Masse — und die eine Zeile, die wirft.
 *
 * ---------------------------------------------------------------------------
 * DIESE DATEI EXISTIERT, WEIL EINE MUTATION ÜBERLEBT HAT.
 *
 * `npm run check:ui-mutation` fing beim ersten Lauf über Karte 3.2 vierundsechzig
 * von fünfundsechzig. Die eine, die durchkam, war ausgerechnet die Zeile, die ich
 * im Bau selbst als Fehler erkannt und korrigiert hatte:
 *
 *     throw new UnitConflictError(treffer.key, treffer.unit, input.unit);
 *
 * Ein erster Entwurf nahm hier still die eingefrorene Einheit. Das klang nach
 * Nachsicht und wäre genau der Fehler gewesen, den Karte 3.2 verhindern soll —
 * wer 30 Sekunden eintippt und 30 Minuten gespeichert bekommt, hat eine Zahl im
 * Verlauf, die niemand mehr als falsch erkennen kann.
 *
 * Gesichert war die Korrektur trotzdem von nichts: `test/measurements-action.test.ts`
 * ERSETZT `saveMeasurement`, prüft also die Aktion und nie die Schreibschicht.
 * Ein Umbau, der das Werfen wieder herausnimmt, hätte 337 grüne Tests gehabt.
 * ---------------------------------------------------------------------------
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MeasureKeyRow } from "@/lib/db/types";

// ---------------------------------------------------------------------------
// Ein Supabase-Client, der mitschreibt, was von ihm verlangt wurde.
// ---------------------------------------------------------------------------

/** Was `measure_keys` beim Lesen zurückgeben soll. */
let vorhandeneMasse: MeasureKeyRow[] = [];

type Schreibvorgang = { tabelle: string; art: "insert" | "upsert"; zeile: unknown };
const geschrieben: Schreibvorgang[] = [];

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () => ({
    from(tabelle: string) {
      const kette = {
        select: () => kette,
        eq: () => kette,
        in: () => kette,
        order: () => kette,
        single: () =>
          Promise.resolve({
            // Die Kennung, die ein frisch angelegtes Mass zurückgibt.
            data: { id: "neu-1" },
            error: null,
          }),
        insert(zeile: unknown) {
          geschrieben.push({ tabelle, art: "insert", zeile });
          return kette;
        },
        upsert(zeile: unknown) {
          geschrieben.push({ tabelle, art: "upsert", zeile });
          return Promise.resolve({ data: null, error: null });
        },
        then: (
          erfuellt: (wert: { data: unknown[]; error: null }) => unknown,
          abgelehnt?: (grund: unknown) => unknown,
        ) =>
          Promise.resolve({
            data: tabelle === "measure_keys" ? vorhandeneMasse : [],
            error: null,
          }).then(erfuellt, abgelehnt),
      };
      return kette;
    },
  }),
}));

const { saveMeasurement, UnitConflictError } = await import("@/lib/db/measurements");

const STEHEN: MeasureKeyRow = { id: "k1", episode_id: "ep1", key: "Stehen", unit: "min" };

const messung = (patch: Partial<Parameters<typeof saveMeasurement>[1]> = {}) => ({
  key: "Stehen",
  unit: "min" as const,
  date: "2026-08-28",
  value: 8,
  note: null,
  ...patch,
});

beforeEach(() => {
  vorhandeneMasse = [];
  geschrieben.length = 0;
});

describe("die eingefrorene Einheit — die Zeile, die eine Mutation überlebt hatte", () => {
  it("wirft, wenn dasselbe Mass in einer anderen Einheit kommt", async () => {
    vorhandeneMasse = [STEHEN];

    await expect(saveMeasurement("ep1", messung({ unit: "sec" }))).rejects.toBeInstanceOf(
      UnitConflictError,
    );
  });

  it("und schreibt dabei nichts", async () => {
    // Der eigentliche Schaden. Ein Wurf, nach dem trotzdem eine Zeile in der
    // Datenbank steht, wäre schlimmer als gar keine Prüfung: Der Aufrufer
    // meldet einen Fehler, und die Zahl liegt trotzdem im Verlauf.
    vorhandeneMasse = [STEHEN];

    await expect(saveMeasurement("ep1", messung({ unit: "sec" }))).rejects.toThrow();
    expect(geschrieben).toEqual([]);
  });

  it("nennt im Fehler beide Einheiten und das Mass", async () => {
    // Damit die Server-Aktion daraus einen Satz machen kann, der weiterhilft.
    vorhandeneMasse = [STEHEN];

    await expect(saveMeasurement("ep1", messung({ unit: "sec" }))).rejects.toMatchObject({
      key: "Stehen",
      frozen: "min",
      attempted: "sec",
    });
  });

  it("wirft NICHT, wenn die Einheit passt", async () => {
    // Die Gegenprobe. Ohne sie könnte die Prüfung jedes bekannte Mass ablehnen
    // und wäre trotzdem grün.
    vorhandeneMasse = [STEHEN];

    await expect(saveMeasurement("ep1", messung())).resolves.toBeUndefined();
    expect(geschrieben.filter((g) => g.tabelle === "measurements")).toHaveLength(1);
  });

  it("wirft auch bei anderer Schreibweise", async () => {
    // Sonst liesse sich die Sperre mit einem kleinen s umgehen — und es
    // entstünde ein zweites Mass, das auf dem Bildschirm wie das erste aussieht.
    vorhandeneMasse = [STEHEN];

    await expect(
      saveMeasurement("ep1", messung({ key: "stehen", unit: "sec" })),
    ).rejects.toBeInstanceOf(UnitConflictError);
  });
});

describe("ein bekanntes Mass wird wiederverwendet, kein zweites angelegt", () => {
  it("legt kein neues measure_keys an", async () => {
    // Sonst stünden zwei Zeilen mit demselben Namen da, und der eindeutige
    // Index aus 0010 wiese die zweite ab — mit einem Datenbankfehler statt
    // eines Satzes.
    vorhandeneMasse = [STEHEN];
    await saveMeasurement("ep1", messung());

    expect(geschrieben.filter((g) => g.tabelle === "measure_keys")).toHaveLength(0);
  });

  it("und schreibt die Messung an die vorhandene Kennung", async () => {
    vorhandeneMasse = [STEHEN];
    await saveMeasurement("ep1", messung());

    expect(geschrieben[0]).toMatchObject({
      tabelle: "measurements",
      art: "upsert",
      zeile: { measure_key_id: "k1", measured_on: "2026-08-28", value: 8 },
    });
  });

  it("findet es auch bei anderer Schreibweise", async () => {
    vorhandeneMasse = [STEHEN];
    await saveMeasurement("ep1", messung({ key: "  stehen  " }));

    expect(geschrieben.filter((g) => g.tabelle === "measure_keys")).toHaveLength(0);
    expect(geschrieben[0]).toMatchObject({ zeile: { measure_key_id: "k1" } });
  });
});

describe("ein neues Mass", () => {
  it("wird angelegt, mit beschnittenem Namen", async () => {
    await saveMeasurement("ep1", messung({ key: "  Kniebeugen  ", unit: "reps" }));

    const masse = geschrieben.filter((g) => g.tabelle === "measure_keys");
    expect(masse).toHaveLength(1);
    expect(masse[0]!.zeile).toMatchObject({
      episode_id: "ep1",
      key: "Kniebeugen",
      unit: "reps",
    });
  });

  it("und die Messung hängt an seiner frischen Kennung", async () => {
    await saveMeasurement("ep1", messung({ key: "Kniebeugen", unit: "reps", value: 15 }));

    expect(geschrieben[1]).toMatchObject({
      tabelle: "measurements",
      zeile: { measure_key_id: "neu-1", value: 15 },
    });
  });

  it("wird angelegt, BEVOR die Messung geschrieben wird", async () => {
    // Die Reihenfolge ist keine Kosmetik: Die Messung trägt den Fremdschlüssel.
    await saveMeasurement("ep1", messung({ key: "Kniebeugen", unit: "reps" }));

    expect(geschrieben.map((g) => g.tabelle)).toEqual(["measure_keys", "measurements"]);
  });
});
