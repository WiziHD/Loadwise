import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EvaluationInput } from "loadwise-engine";

/**
 * Kommen die eigenen Masse im Motor an — und was tun sie dort heute?
 *
 * ---------------------------------------------------------------------------
 * ZWEI FRAGEN, UND DIE ZWEITE IST UNBEQUEM.
 *
 * `verdicts.ts` hat die eigenen Masse bis Karte 3.2 gar nicht gelesen. Sie
 * standen in der Datenbank, `EvaluationInput` hatte ein Feld dafür, und der
 * Aufruf liess es weg. Dieselbe Lücke wie bei den Selbsttests, eine Tabelle
 * weiter — und beide Male war das Bauteil für sich in Ordnung.
 *
 * Die erste Frage ist damit beantwortet: Sie werden gelesen und weitergereicht.
 *
 * ---------------------------------------------------------------------------
 * DIE ZWEITE: HEUTE ERZEUGEN SIE NICHTS, UND DAS STEHT HIER, STATT SICH ZU
 * VERSTECKEN.
 *
 * `progress.ts` baut `records` nur für Masse, die ein MEILENSTEIN nennt —
 * `measuresInUse(input.milestones)`. Ohne Meilensteine ist die Liste leer,
 * und eine eigene Messung bewirkt im Ergebnis nichts.
 *
 * Das ist kein Fehler, sondern die Reihenfolge der Karten: 3.2 erfasst, 3.4
 * gibt dem Nutzer die Meilensteine, gegen die gemessen wird. Aber es ist genau
 * der Zustand, den dieses Projekt sonst als »geschrieben und nie gelesen«
 * verfolgt — und ein Kommentar allein hielte ihn nicht fest.
 *
 * Deshalb steht er hier als Prüfung. Wenn 3.4 kommt, wird diese Datei rot und
 * muss angefasst werden; das ist die Absicht. Ein stiller Zustand, den niemand
 * mehr erklärt, wäre die Alternative.
 * ---------------------------------------------------------------------------
 */

vi.mock("server-only", () => ({}));

const getEpisode = vi.fn();
const listEntries = vi.fn();
const listMeasurements = vi.fn();
const saveEvaluationRun = vi.fn();
const motorEingaben: EvaluationInput[] = [];

vi.mock("@/lib/db/episodes", () => ({ getEpisode: (id: string) => getEpisode(id) }));
vi.mock("@/lib/db/entries", () => ({ listEntries: (id: string) => listEntries(id) }));
vi.mock("@/lib/db/measurements", () => ({
  listMeasurements: (id: string) => listMeasurements(id),
}));
vi.mock("@/lib/db/verdict-write", () => ({
  saveEvaluationRun: (episodeId: string, auswertung: unknown) =>
    saveEvaluationRun(episodeId, auswertung),
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () => ({
    from() {
      const kette = {
        select: () => kette,
        eq: () => kette,
        in: () => kette,
        order: () => kette,
        then: (
          erfuellt: (wert: { data: unknown[]; error: null }) => unknown,
          abgelehnt?: (grund: unknown) => unknown,
        ) => Promise.resolve({ data: [], error: null }).then(erfuellt, abgelehnt),
      };
      return kette;
    },
  }),
}));

/**
 * Der Motor läuft echt, aber jede Eingabe wird mitgeschrieben.
 *
 * Ihn zu ersetzen wäre der bequeme Weg und der falsche: Diese Datei will
 * wissen, was der Motor BEKOMMT und was er daraus macht. Eine Attrappe
 * beantwortete nur die erste Hälfte.
 */
vi.mock("loadwise-engine", async (original) => {
  const echt = await original<typeof import("loadwise-engine")>();
  return {
    ...echt,
    evaluateEpisode: (input: EvaluationInput) => {
      motorEingaben.push(input);
      return echt.evaluateEpisode(input);
    },
  };
});

const { evaluateAndStore } = await import("@/lib/db/verdicts");

const EPISODE = {
  id: "ep1",
  user_id: "u1",
  body_region: "achilles",
  profile_key: "achilles_midportion",
  side: "left",
  started_on: null,
  ended_on: null,
  label: null,
  archived: false,
};

const MESSUNGEN = [
  { key: "Kniebeugen", date: "2026-08-01", value: 8, unit: "reps", note: null },
  { key: "Kniebeugen", date: "2026-08-15", value: 15, unit: "reps", note: null },
];

beforeEach(() => {
  motorEingaben.length = 0;
  getEpisode.mockReset();
  listEntries.mockReset();
  listMeasurements.mockReset();
  saveEvaluationRun.mockReset();

  getEpisode.mockResolvedValue(EPISODE);
  listEntries.mockResolvedValue([
    { date: "2026-08-01", morningScore: 3, sessions: [] },
    { date: "2026-08-02", morningScore: 3, sessions: [] },
  ]);
  listMeasurements.mockResolvedValue(MESSUNGEN);
  saveEvaluationRun.mockResolvedValue("lauf-1");
});

describe("die eigenen Masse erreichen den Motor", () => {
  it("werden für diese Episode gelesen", async () => {
    await evaluateAndStore("ep1");
    expect(listMeasurements).toHaveBeenCalledWith("ep1");
  });

  it("und gehen unverändert in den Aufruf", async () => {
    // Die Zeile, die vor 3.2 gefehlt hat. `EvaluationInput` hatte das Feld,
    // die Datenbank hatte die Zeilen, und der Aufruf liess es weg.
    await evaluateAndStore("ep1");
    expect(motorEingaben).toHaveLength(1);
    expect(motorEingaben[0]!.measurements).toEqual(MESSUNGEN);
  });

  it("auch wenn es keine gibt — dann als leere Liste, nicht als undefined", async () => {
    // Sonst hinge das Verhalten daran, ob `evaluateEpisode` intern auf `??`
    // ausweicht. Eine leere Liste ist eine Aussage, `undefined` ist keine.
    listMeasurements.mockResolvedValue([]);
    await evaluateAndStore("ep1");
    expect(motorEingaben[0]!.measurements).toEqual([]);
  });
});

describe("was sie heute bewirken — und was noch nicht", () => {
  it("erzeugen keinen Bestwert, solange kein Meilenstein sie nennt", async () => {
    /**
     * DIESE PRÜFUNG SOLL EINES TAGES ROT WERDEN.
     *
     * `progress.ts` baut `records` über `measuresInUse(input.milestones)`.
     * Ohne Meilensteine ist die Liste leer — zwei erfasste Kniebeugen-Werte
     * ergeben also keinen einzigen Eintrag.
     *
     * Karte 3.4 gibt dem Nutzer die Meilensteine. Dann muss diese Datei
     * angefasst werden, und genau das ist der Zweck: Der Zustand ist damit
     * benannt statt still.
     */
    await evaluateAndStore("ep1");
    const auswertung = saveEvaluationRun.mock.calls[0]?.[1] as {
      progress: { records: unknown[] };
    };
    expect(auswertung.progress.records).toEqual([]);
  });

  it("und ändern kein Urteil — ein Mass trägt keine Severity", async () => {
    /**
     * Der Grundsatz aus dem Plan, hier als Prüfung: Ein Meilenstein zählt nie
     * in die Abdeckung. Täte er es, schaltete ein erreichtes Ziel eine
     * Entwarnung frei, die es nicht belegt — und das verletzt den obersten
     * Satz des Motors.
     *
     * Geprüft, indem derselbe Lauf zweimal gerechnet wird: einmal mit den
     * Messungen, einmal ohne. Das Urteil muss identisch sein.
     */
    await evaluateAndStore("ep1");
    const mit = saveEvaluationRun.mock.calls[0]?.[1] as { overall: unknown; flags: unknown[] };

    saveEvaluationRun.mockClear();
    listMeasurements.mockResolvedValue([]);
    await evaluateAndStore("ep1");
    const ohne = saveEvaluationRun.mock.calls[0]?.[1] as { overall: unknown; flags: unknown[] };

    expect(mit.overall).toEqual(ohne.overall);
    expect(mit.flags).toHaveLength(ohne.flags.length);
  });
});
