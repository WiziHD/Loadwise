/**
 * `evaluateAndStore` — die Naht zwischen Zugriffsschutz, Motor und Ablage.
 *
 * ---------------------------------------------------------------------------
 * DER WICHTIGE ZWEIG IST DER, IN DEM NICHTS PASSIERT.
 *
 * Gelesen wird über den anon key, also durch die Zugriffsregeln. Gehört die
 * Episode jemand anderem — oder gibt es sie nicht —, kommt `null` zurück, und
 * dann darf der Motor gar nicht erst laufen und erst recht nichts geschrieben
 * werden.
 *
 * Geschrieben wird nämlich mit dem Service-Role-Schlüssel, und der umgeht JEDE
 * Zugriffsregel. Fiele diese eine Prüfung weg, wäre die Reihenfolge:
 * »irgendjemand nennt eine fremde Episodenkennung« → »der Server schreibt eine
 * Auswertung dort hinein«. Nichts weiter unten würde das aufhalten.
 *
 * Der Zweig ist eine einzelne Zeile (`if (episode === null) return null;`) und
 * hat kein Gegenstück im Typsystem. Wer sie entfernt, bekommt einen grünen
 * Build.
 * ---------------------------------------------------------------------------
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Entry } from "loadwise-engine";
import type { EpisodeRow } from "@/lib/db/types";

vi.mock("server-only", () => ({}));

const getEpisode = vi.fn();
const listEntries = vi.fn();
const saveEvaluationRun = vi.fn();
/** Womit die self_tests-Abfrage eingeschränkt wurde — Tabelle und Spaltenwert. */
const abfragen: { tabelle: string; eq: [string, unknown][]; order: string[] }[] = [];

vi.mock("@/lib/db/episodes", () => ({ getEpisode: (id: string) => getEpisode(id) }));
vi.mock("@/lib/db/entries", () => ({ listEntries: (id: string) => listEntries(id) }));
vi.mock("@/lib/db/verdict-write", () => ({
  saveEvaluationRun: (episodeId: string, auswertung: unknown) =>
    saveEvaluationRun(episodeId, auswertung),
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () => ({
    from(tabelle: string) {
      const eintrag = {
        tabelle,
        eq: [] as [string, unknown][],
        order: [] as string[],
      };
      abfragen.push(eintrag);

      /**
       * `eq` liefert die Kette weiter, statt sofort aufzulösen — und das war
       * eine Änderung mit einem Grund.
       *
       * Vorher endete die Kette bei `eq`, weil keine Abfrage danach noch etwas
       * anhängte. `verdicts.ts` sortiert die Selbsttests inzwischen, und zwar
       * nicht aus Ordnungsliebe: `rules/asymmetry.ts` sortiert stabil nach
       * Datum und nimmt die letzte Messung — bei zwei Messungen am selben Tag
       * entscheidet also die Reihenfolge der Abfrage, ohne `order` mithin
       * nichts.
       *
       * Die Kette ist deshalb »thenable«: Sie kann weiterverkettet und ebenso
       * gut direkt erwartet werden. Die Attrappe schreibt dabei mit, wonach
       * sortiert wurde, damit die Prüfung unten die Sortierung nicht nur
       * überlebt, sondern festhält.
       */
      const kette = {
        select: () => kette,
        eq: (spalte: string, wert: unknown) => {
          eintrag.eq.push([spalte, wert]);
          return kette;
        },
        order: (spalte: string) => {
          eintrag.order.push(spalte);
          return kette;
        },
        then: (
          erfuellt: (wert: { data: unknown[]; error: null }) => unknown,
          abgelehnt?: (grund: unknown) => unknown,
        ) => Promise.resolve({ data: [], error: null }).then(erfuellt, abgelehnt),
      };
      return kette;
    },
  }),
}));

const { evaluateAndStore } = await import("@/lib/db/verdicts");

/**
 * Ein Knie mit Kreuzbandplastik — und die Wahl ist der halbe Test.
 *
 * ---------------------------------------------------------------------------
 * DIESE FIXTUR STAND ZUERST AUF »achilles« / »achilles_midportion«, UND DAMIT
 * KONNTE DIE PROFILPRÜFUNG UNTEN NICHT FEHLSCHLAGEN.
 *
 * `achilles_midportion` IST das Standardprofil der Region `achilles`. Ginge der
 * Schlüssel unterwegs verloren, löste der Motor über die Region auf und käme
 * beim selben Profil heraus. Die Prüfung wäre grün gewesen, ohne etwas zu
 * prüfen.
 *
 * Aufgefallen ist das erst, als die Mutation »Profilschlüssel geht verloren«
 * als einzige von dreien überlebte.
 *
 * `knee` trägt zwei Profile — `patellofemoral_pain` (der Standard) und
 * `acl_reconstruction`. Genau dafür wurde die Registry seinerzeit auf
 * Schlüssel statt Regionen umgebaut, und genau hier fällt ein verlorener
 * Schlüssel auf.
 * ---------------------------------------------------------------------------
 */
const EPISODE: EpisodeRow = {
  id: "ep1",
  user_id: "u1",
  created_at: "2026-08-01T10:00:00Z",
  body_region: "knee",
  profile_key: "acl_reconstruction",
  side: "right",
  started_on: "2026-06-15",
  ended_on: null,
  label: null,
  archived_at: null,
};

const TAGEBUCH: Entry[] = [
  { date: "2026-08-01", morningScore: 2, sessions: [] },
  { date: "2026-08-02", morningScore: 3, sessions: [] },
];

beforeEach(() => {
  getEpisode.mockReset();
  listEntries.mockReset().mockResolvedValue(TAGEBUCH);
  saveEvaluationRun.mockReset().mockResolvedValue("lauf-1");
  abfragen.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("evaluateAndStore — wenn die Episode nicht sichtbar ist", () => {
  it("schreibt nichts", async () => {
    // `getEpisode` liest über den anon key. Null heisst hier zweierlei — gibt
    // es nicht, oder gehört jemand anderem —, und beides ist von aussen
    // ununterscheidbar (SICHERHEIT.md Punkt 3). Wer Kennungen durchprobiert,
    // lernt daraus nichts.
    getEpisode.mockResolvedValue(null);

    await expect(evaluateAndStore("fremd")).resolves.toBeNull();

    expect(saveEvaluationRun).not.toHaveBeenCalled();
    // Auch nicht gelesen: Ein Motorlauf über fremde Tage wäre schon der Fehler,
    // auch wenn niemand das Ergebnis je zu sehen bekommt.
    expect(listEntries).not.toHaveBeenCalled();
  });
});

describe("evaluateAndStore — wenn sie sichtbar ist", () => {
  it("legt einen Lauf zu genau dieser Episode ab", async () => {
    getEpisode.mockResolvedValue(EPISODE);

    await expect(evaluateAndStore("ep1")).resolves.toBe("lauf-1");

    expect(saveEvaluationRun).toHaveBeenCalledTimes(1);
    expect(saveEvaluationRun.mock.calls[0]?.[0]).toBe("ep1");
  });

  it("und urteilt unter dem Profil, das die Episode trägt", async () => {
    // Die Zuordnung Zeile → Kontext geht über `toEpisodeContext`, der den
    // SCHLÜSSEL durchreicht statt das Profil aufzulösen. Ginge dabei etwas
    // verloren, urteilte der Motor unter dem Standardprofil der Region — und
    // das Ergebnis sähe vollkommen plausibel aus.
    getEpisode.mockResolvedValue(EPISODE);
    await evaluateAndStore("ep1");

    const auswertung = saveEvaluationRun.mock.calls[0]?.[1] as {
      profile: { key: string };
      lastDate: string | null;
    };
    expect(auswertung.profile.key).toBe("acl_reconstruction");
    // Die Gegenprobe im selben Atemzug: Das Standardprofil dieser Region ist
    // ein ANDERES. Ohne diese Zeile wäre nicht sichtbar, dass die Prüfung
    // darüber überhaupt etwas unterscheidet.
    expect(auswertung.profile.key).not.toBe("patellofemoral_pain");
    expect(auswertung.lastDate).toBe("2026-08-02");
  });

  it("holt die Selbsttests dieser Episode, nicht irgendwelche", async () => {
    // Heute schreibt nichts in `self_tests`. Gelesen wird trotzdem, damit der
    // Motor sie am Tag der ersten Oberfläche auswertet statt sie stillschweigend
    // zu übergehen. Ohne die Einschränkung auf die Episode wäre das eine
    // Abfrage über fremde Zeilen — die der Zugriffsschutz zwar wegfiltert, aber
    // sich darauf zu verlassen ist genau die Haltung, die dieses Projekt sonst
    // ablehnt.
    getEpisode.mockResolvedValue(EPISODE);
    await evaluateAndStore("ep1");

    const tests = abfragen.find((a) => a.tabelle === "self_tests");
    expect(tests).toBeDefined();
    expect(tests?.eq).toEqual([["episode_id", "ep1"]]);
  });

  it("holt sie sortiert — sonst entscheidet bei gleichem Tag der Zufall", async () => {
    /**
     * Karte 3.1 hat das aufgedeckt, bevor die erste Messung existierte.
     *
     * `rules/asymmetry.ts` sortiert stabil nach Datum und nimmt die letzte
     * Messung. Zwei Zeilen mit demselben Datum entscheiden sich damit nach der
     * Reihenfolge, in der die Abfrage geliefert hat — ohne `order` also nach
     * nichts. Das Ergebnis wäre nicht falsch, sondern unbestimmt: dasselbe
     * Tagebuch, zweimal gerechnet, nicht zwingend dasselbe Urteil.
     *
     * `0009` macht solche Doubletten unmöglich. Diese Sortierung deckt den Weg
     * ab, auf dem sie trotzdem entstehen — Import, ein anderer Client, eine
     * Datenbank ohne 0009 —, und sie kostet nichts.
     */
    getEpisode.mockResolvedValue(EPISODE);
    await evaluateAndStore("ep1");

    const tests = abfragen.find((a) => a.tabelle === "self_tests");
    expect(tests?.order).toEqual(["test_date", "created_at"]);
  });

  it("und liest die Tage derselben Episode", async () => {
    getEpisode.mockResolvedValue(EPISODE);
    await evaluateAndStore("ep1");
    expect(listEntries).toHaveBeenCalledWith("ep1");
  });
});
