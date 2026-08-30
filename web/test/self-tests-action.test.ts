import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Die Server-Aktion hinter dem Seitenvergleich.
 *
 * ---------------------------------------------------------------------------
 * DIESE DATEI EXISTIERT, WEIL ZWEI MUTATIONEN ÜBERLEBT HABEN.
 *
 * `npm run check:ui-mutation` hat beim ersten Lauf über Karte 3.1 genau zwei
 * von 53 Mutationen nicht gefangen, und beide lagen hier:
 *
 *   1. Die Prüfung lief gegen alle Testarten statt gegen das Profil.
 *   2. Nach einer Messung wurde nicht neu gerechnet.
 *
 * Beide sind der teure Fall: Sie ändern nichts an dem, was auf dem Bildschirm
 * erscheint, solange man nicht danach sucht. Die erste legt eine Messung ab,
 * die in kein Urteil eingeht; die zweite lässt den Bildschirm »noch nicht
 * genug beurteilt« sagen, während die Messung, die das widerlegt, längst in
 * der Datenbank steht.
 *
 * ---------------------------------------------------------------------------
 * WAS HIER ERSETZT WIRD, UND WAS NICHT.
 *
 * Ersetzt: die Datenbank, die Neuberechnung, `next/cache`. Nicht ersetzt: die
 * Prüfregeln. `validateSelfTest` ist eine reine Funktion und läuft hier echt
 * mit — sonst prüfte diese Datei, ob die Aktion zu ihren eigenen Attrappen
 * passt, und genau das ist der Weg, auf dem eine Suite grün wird, ohne etwas
 * zu wissen.
 * ---------------------------------------------------------------------------
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/db/episodes", () => ({ getEpisode: vi.fn() }));
vi.mock("@/lib/db/self-tests", () => ({ saveSelfTest: vi.fn() }));
vi.mock("@/lib/db/verdicts", () => ({ evaluateAndStore: vi.fn() }));

import { getEpisode } from "@/lib/db/episodes";
import { saveSelfTest } from "@/lib/db/self-tests";
import { evaluateAndStore } from "@/lib/db/verdicts";
import { saveSelfTestAction } from "@/app/actions/self-tests";

const episodeLesen = vi.mocked(getEpisode);
const messungSchreiben = vi.mocked(saveSelfTest);
const neuRechnen = vi.mocked(evaluateAndStore);

/**
 * Eine Schulter — und die Wahl ist der halbe Test.
 *
 * `rotator_cuff` führt **nur** `rom`. Ein Profil mit allen drei Testarten
 * (Achillessehne) könnte nicht zeigen, dass die Einschränkung überhaupt
 * greift: Jede Testart käme durch, und die Prüfung wäre grün, ohne etwas zu
 * unterscheiden.
 */
const SCHULTER = {
  id: "ep1",
  body_region: "shoulder",
  profile_key: "rotator_cuff",
} as unknown as Awaited<ReturnType<typeof getEpisode>>;

const ACHILLES = {
  id: "ep2",
  body_region: "achilles",
  profile_key: "achilles_midportion",
} as unknown as Awaited<ReturnType<typeof getEpisode>>;

const MESSUNG = {
  type: "calf_raise",
  date: "2026-08-28",
  involved: 12,
  uninvolved: 20,
  note: null,
};

const BEWEGLICHKEIT = { ...MESSUNG, type: "rom", involved: 28, uninvolved: 34 };

beforeEach(() => {
  episodeLesen.mockReset();
  messungSchreiben.mockReset();
  neuRechnen.mockReset();
  messungSchreiben.mockResolvedValue(undefined);
  neuRechnen.mockResolvedValue("lauf-1");
});

describe("die erlaubten Testarten kommen aus der Episode", () => {
  it("lehnt einen Fersenheber bei einer Schulter ab", async () => {
    // Der Fall aus der Karte. Ein Wadenheber ergäbe an der Schulter eine Zahl,
    // ein Verhältnis und ein Urteil — und nichts davon bedeutete etwas.
    episodeLesen.mockResolvedValue(SCHULTER);

    await expect(saveSelfTestAction("de", "ep1", MESSUNG)).resolves.toEqual({
      ok: false,
      reason: "test-not-in-profile",
    });
    expect(messungSchreiben).not.toHaveBeenCalled();
  });

  it("nimmt bei derselben Schulter die Beweglichkeit an", async () => {
    // Die Gegenprobe im selben Atemzug. Ohne sie liesse sich nicht
    // unterscheiden, ob die Prüfung das Profil liest oder alles ablehnt.
    episodeLesen.mockResolvedValue(SCHULTER);

    await expect(saveSelfTestAction("de", "ep1", BEWEGLICHKEIT)).resolves.toEqual({ ok: true });
    expect(messungSchreiben).toHaveBeenCalledTimes(1);
  });

  it("nimmt denselben Fersenheber bei einer Achillessehne an", async () => {
    // Und die zweite Gegenprobe: Dieselbe Messung, anderes Profil, anderes
    // Ergebnis. Damit ist bewiesen, dass die EPISODE entscheidet und nicht die
    // Testart für sich.
    episodeLesen.mockResolvedValue(ACHILLES);

    await expect(saveSelfTestAction("de", "ep2", MESSUNG)).resolves.toEqual({ ok: true });
    expect(messungSchreiben.mock.calls[0]?.[1]).toMatchObject({ type: "calf_raise" });
  });

  it("prüft, bevor es schreibt", async () => {
    // Reihenfolge, nicht Kosmetik: Eine abgelehnte Messung darf die Datenbank
    // nicht erreicht haben.
    episodeLesen.mockResolvedValue(SCHULTER);
    await saveSelfTestAction("de", "ep1", { ...MESSUNG, involved: null });

    expect(messungSchreiben).not.toHaveBeenCalled();
    expect(neuRechnen).not.toHaveBeenCalled();
  });
});

describe("eine Episode, die es nicht gibt", () => {
  it("endet, bevor irgendetwas geschrieben wird", async () => {
    // `getEpisode` läuft über den anon key und damit durch die Zugriffsregeln.
    // `null` heisst: weg oder fremd. Beides endet hier.
    episodeLesen.mockResolvedValue(null);

    await expect(saveSelfTestAction("de", "ep9", MESSUNG)).resolves.toEqual({
      ok: false,
      reason: "no-episode",
    });
    expect(messungSchreiben).not.toHaveBeenCalled();
  });
});

describe("nach der Messung wird neu gerechnet", () => {
  it("rechnet für dieselbe Episode neu", async () => {
    /**
     * Der zweite überlebende Mutant.
     *
     * Eine Messung ist der einzige Weg, auf dem die Asymmetrie-Regel überhaupt
     * etwas zu sagen bekommt. Ohne diesen Lauf stünde die erste Messung des
     * Lebens in der Datenbank, und der Bildschirm sagte weiter »noch nicht
     * genug beurteilt« — mit dem Wort, das die Messung gerade widerlegt hat.
     */
    episodeLesen.mockResolvedValue(ACHILLES);
    await saveSelfTestAction("de", "ep2", MESSUNG);

    expect(neuRechnen).toHaveBeenCalledTimes(1);
    expect(neuRechnen).toHaveBeenCalledWith("ep2");
  });

  it("rechnet erst nach dem Schreiben, nicht davor", async () => {
    // Andersherum liefe die Auswertung über einen Stand ohne die Messung und
    // schriebe ein Urteil, das sie nicht kennt — mit frischem `computed_at`,
    // also ohne dass `RunBehindNotice` etwas zu melden hätte.
    const reihenfolge: string[] = [];
    episodeLesen.mockResolvedValue(ACHILLES);
    messungSchreiben.mockImplementation(async () => {
      reihenfolge.push("schreiben");
    });
    neuRechnen.mockImplementation(async () => {
      reihenfolge.push("rechnen");
      return "lauf-1";
    });

    await saveSelfTestAction("de", "ep2", MESSUNG);
    expect(reihenfolge).toEqual(["schreiben", "rechnen"]);
  });
});

describe("was nach dem Schreiben schiefgeht, macht die Messung nicht ungeschehen", () => {
  it("meldet Erfolg, auch wenn die Neuberechnung fehlschlägt", async () => {
    /**
     * Dieselbe Regel wie beim Tageseintrag, und sie ist keine Nachlässigkeit.
     *
     * Die Messung steht zu diesem Zeitpunkt. »Konnte nicht gespeichert werden«
     * schickte jemanden dazu, sie ein zweites Mal einzutippen — auf eine
     * Zeile, die schon stimmt. Dass das Urteil hinterherhinkt, sagt
     * `RunBehindNotice` auf der Ansicht, die es zeigt.
     */
    episodeLesen.mockResolvedValue(ACHILLES);
    neuRechnen.mockRejectedValue(new Error("Motor"));

    await expect(saveSelfTestAction("de", "ep2", MESSUNG)).resolves.toEqual({ ok: true });
    expect(messungSchreiben).toHaveBeenCalledTimes(1);
  });

  it("meldet einen Fehlschlag beim Schreiben aber sehr wohl", async () => {
    // Die Gegenrichtung. Hier ist NICHTS gespeichert, und Schweigen wäre der
    // stille Datenverlust, den dieses Projekt an sechs Stellen schon hatte.
    episodeLesen.mockResolvedValue(ACHILLES);
    messungSchreiben.mockRejectedValue(new Error("Netz"));

    await expect(saveSelfTestAction("de", "ep2", MESSUNG)).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
    expect(neuRechnen).not.toHaveBeenCalled();
  });
});

describe("was über das Netz kommt, geht durch dieselben Regeln", () => {
  it("lehnt eine Testart ab, die es gar nicht gibt", async () => {
    // Eine Server-Aktion sieht aus wie ein Funktionsaufruf und ist ein
    // öffentlicher Endpunkt.
    episodeLesen.mockResolvedValue(ACHILLES);

    await expect(
      saveSelfTestAction("de", "ep2", { ...MESSUNG, type: "squat" }),
    ).resolves.toEqual({ ok: false, reason: "unknown-test" });
  });

  it("lehnt eine Null auf der Bezugsseite ab", async () => {
    episodeLesen.mockResolvedValue(ACHILLES);

    await expect(
      saveSelfTestAction("de", "ep2", { ...MESSUNG, uninvolved: 0 }),
    ).resolves.toEqual({ ok: false, reason: "reference-side-zero" });
  });

  it("nimmt eine Null auf der verletzten Seite an", async () => {
    // Tag eins einer Reha, durch die ganze Kette hindurch.
    episodeLesen.mockResolvedValue(ACHILLES);

    await expect(
      saveSelfTestAction("de", "ep2", { ...MESSUNG, involved: 0 }),
    ).resolves.toEqual({ ok: true });
    expect(messungSchreiben.mock.calls[0]?.[1]).toMatchObject({ involved: 0 });
  });
});
