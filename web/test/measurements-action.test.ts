import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Die Server-Aktion hinter den eigenen Massen.
 *
 * ---------------------------------------------------------------------------
 * DER FALL, DEN DIESE DATEI VOR ALLEM ABDECKT: EINE EINHEIT VON AUSSEN.
 *
 * Das Formular sperrt das Einheitenfeld, sobald das Mass eine Einheit hat. Das
 * ist eine Hilfe für den Menschen davor, keine Sicherung: Eine Server-Aktion
 * sieht aus wie ein Funktionsaufruf und ist ein öffentlicher Endpunkt. Sie
 * kann mit `unit: "sec"` aufgerufen werden, während »Stehen« seit Wochen in
 * Minuten geführt wird.
 *
 * Der Schaden wäre eine Zahl im Verlauf, die niemand mehr als falsch erkennen
 * kann: »30« neben »30«, einmal Sekunden, einmal Minuten.
 * ---------------------------------------------------------------------------
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db/episodes", () => ({ getEpisode: vi.fn() }));
vi.mock("@/lib/db/verdicts", () => ({ evaluateAndStore: vi.fn() }));

// Nur die beiden Zugriffe ersetzen, NICHT die Fehlerklasse: Die Aktion prüft
// mit `instanceof`, und eine nachgebaute Klasse bestünde diese Prüfung nicht —
// der Test wäre dann grün, weil beide Seiten dieselbe Attrappe benutzen.
vi.mock("@/lib/db/measurements", async (original) => {
  const echt = await original<typeof import("@/lib/db/measurements")>();
  return { ...echt, listMeasureKeys: vi.fn(), saveMeasurement: vi.fn() };
});

import { getEpisode } from "@/lib/db/episodes";
import { evaluateAndStore } from "@/lib/db/verdicts";
import { listMeasureKeys, saveMeasurement, UnitConflictError } from "@/lib/db/measurements";
import { saveMeasurementAction } from "@/app/actions/measurements";

const episodeLesen = vi.mocked(getEpisode);
const masseLesen = vi.mocked(listMeasureKeys);
const schreiben = vi.mocked(saveMeasurement);
const neuRechnen = vi.mocked(evaluateAndStore);

const EPISODE = {
  id: "ep1",
  body_region: "achilles",
  profile_key: "achilles_midportion",
} as unknown as Awaited<ReturnType<typeof getEpisode>>;

const MASSE = [
  { id: "k1", episode_id: "ep1", key: "Stehen", unit: "min" as const },
] as unknown as Awaited<ReturnType<typeof listMeasureKeys>>;

const MESSUNG = {
  key: "Kniebeugen",
  unit: "reps",
  date: "2026-08-28",
  value: 15,
  note: null,
};

beforeEach(() => {
  episodeLesen.mockReset();
  masseLesen.mockReset();
  schreiben.mockReset();
  neuRechnen.mockReset();
  episodeLesen.mockResolvedValue(EPISODE);
  masseLesen.mockResolvedValue(MASSE);
  schreiben.mockResolvedValue(undefined);
  neuRechnen.mockResolvedValue("lauf-1");
});

describe("die eingefrorene Einheit kommt aus der Datenbank", () => {
  it("lehnt »Stehen« in Sekunden ab", () => {
    return expect(
      saveMeasurementAction("de", "ep1", { ...MESSUNG, key: "Stehen", unit: "sec" }),
    ).resolves.toEqual({ ok: false, reason: "unit-conflict" });
  });

  it("nimmt »Stehen« in Minuten an", async () => {
    // Gegenprobe: Ohne sie liesse sich nicht unterscheiden, ob die Prüfung die
    // Einheit liest oder jedes bekannte Mass ablehnt.
    await expect(
      saveMeasurementAction("de", "ep1", { ...MESSUNG, key: "Stehen", unit: "min" }),
    ).resolves.toEqual({ ok: true });
    expect(schreiben).toHaveBeenCalledTimes(1);
  });

  it("lehnt auch »stehen« in Sekunden ab", async () => {
    // Ohne Rücksicht auf Schreibweise. Sonst liesse sich die Sperre mit einem
    // kleinen s umgehen, und es stünden zwei Reihen da, wo eine gemeint war.
    await expect(
      saveMeasurementAction("de", "ep1", { ...MESSUNG, key: "stehen", unit: "sec" }),
    ).resolves.toEqual({ ok: false, reason: "unit-conflict" });
    expect(schreiben).not.toHaveBeenCalled();
  });

  it("lässt ein neues Mass in jeder Einheit zu", async () => {
    await expect(
      saveMeasurementAction("de", "ep1", { ...MESSUNG, key: "Halten", unit: "sec" }),
    ).resolves.toEqual({ ok: true });
  });

  it("prüft, bevor es schreibt", async () => {
    await saveMeasurementAction("de", "ep1", { ...MESSUNG, key: "", unit: "reps" });
    expect(schreiben).not.toHaveBeenCalled();
    expect(neuRechnen).not.toHaveBeenCalled();
  });
});

describe("das Rennen zwischen zwei Reitern", () => {
  it("meldet einen Konflikt aus der Schreibschicht als Konflikt, nicht als Fehlschlag", async () => {
    /**
     * Zwischen der Prüfung und dem Schreiben liegt eine Abfrage. In dieser
     * Lücke kann jemand dasselbe Mass in einer anderen Einheit angelegt haben.
     *
     * »Konnte nicht gespeichert werden« wäre hier irreführend: Ein zweiter
     * Versuch ergäbe dasselbe. Der Satz, der weiterhilft, steht schon bereit.
     */
    schreiben.mockRejectedValue(new UnitConflictError("Stehen", "min", "sec"));

    await expect(saveMeasurementAction("de", "ep1", MESSUNG)).resolves.toEqual({
      ok: false,
      reason: "unit-conflict",
    });
  });

  it("und jeden anderen Fehler weiterhin als Fehlschlag", async () => {
    // Die Gegenprobe. Ohne sie könnte der Fang oben jeden Fehler zu einem
    // Einheitenkonflikt machen — und jemand suchte nach einer Einheit, während
    // das Netz weg ist.
    schreiben.mockRejectedValue(new Error("Netz"));

    await expect(saveMeasurementAction("de", "ep1", MESSUNG)).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
  });
});

describe("nach der Messung wird neu gerechnet", () => {
  it("für dieselbe Episode", async () => {
    // Eigene Masse speisen den Fortschrittskanal. Ohne diesen Lauf bliebe der
    // Stand der Meilensteine auf dem von gestern.
    await saveMeasurementAction("de", "ep1", MESSUNG);
    expect(neuRechnen).toHaveBeenCalledWith("ep1");
  });

  it("erst nach dem Schreiben, nicht davor", async () => {
    const reihenfolge: string[] = [];
    schreiben.mockImplementation(async () => {
      reihenfolge.push("schreiben");
    });
    neuRechnen.mockImplementation(async () => {
      reihenfolge.push("rechnen");
      return "lauf-1";
    });

    await saveMeasurementAction("de", "ep1", MESSUNG);
    expect(reihenfolge).toEqual(["schreiben", "rechnen"]);
  });

  it("und ein Fehlschlag dabei macht die Messung nicht ungeschehen", async () => {
    neuRechnen.mockRejectedValue(new Error("Motor"));
    await expect(saveMeasurementAction("de", "ep1", MESSUNG)).resolves.toEqual({ ok: true });
  });
});

describe("eine Episode, die es nicht gibt", () => {
  it("endet, bevor irgendetwas gelesen oder geschrieben wird", async () => {
    episodeLesen.mockResolvedValue(null);

    await expect(saveMeasurementAction("de", "ep9", MESSUNG)).resolves.toEqual({
      ok: false,
      reason: "no-episode",
    });
    expect(masseLesen).not.toHaveBeenCalled();
    expect(schreiben).not.toHaveBeenCalled();
  });
});

describe("der Name wird beschnitten, bevor er in die Datenbank geht", () => {
  it("speichert »Kniebeugen«, nicht »  Kniebeugen  «", async () => {
    // Sonst stünden zwei Masse da, die sich auf dem Bildschirm nicht
    // unterscheiden lassen — und der Index aus 0010 fiele darüber.
    await saveMeasurementAction("de", "ep1", { ...MESSUNG, key: "  Kniebeugen  " });
    expect(schreiben.mock.calls[0]?.[1]).toMatchObject({ key: "Kniebeugen" });
  });
});
