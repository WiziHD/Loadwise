/**
 * Wie ein Auswertungslauf abgelegt wird — und vor allem: in welcher Reihenfolge.
 *
 * ---------------------------------------------------------------------------
 * DIE REIHENFOLGE IST DIE EINZIGE SICHERUNG, DIE ES HIER GIBT.
 *
 * supabase-js kennt keine Transaktion über zwei Anweisungen. Ein Lauf schreibt
 * aber zwei Dinge — die Flags und die Auswertung —, und ein Abbruch dazwischen
 * hinterlässt eine von zwei Halbheiten:
 *
 *   Auswertung ohne Flags  →  liest sich als »keine Auffälligkeiten«.
 *                             EINE STILLE ENTWARNUNG.
 *   Flags ohne Auswertung  →  findet kein Leser.
 *
 * Deshalb: erst die Flags, dann die Auswertung. Die Auswertungszeile ist der
 * Punkt, an dem ein Lauf gilt.
 *
 * Das ist eine Zusicherung, die man **nicht sehen kann**. Sie steht in keinem
 * Typ, keine Datenbankregel erzwingt sie, und wer die Zeilen umstellt, bekommt
 * einen grünen Build und eine App, die sich genauso verhält — bis zu dem einen
 * Netzwerkfehler, der Monate später zwischen den beiden Anweisungen liegt.
 *
 * Ohne diese Datei wäre die Sicherung ein Kommentar.
 * ---------------------------------------------------------------------------
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateEpisode, type Entry } from "loadwise-engine";

// ---------------------------------------------------------------------------
// Ein Supabase-Client, der nur mitschreibt, was von ihm verlangt wurde.
// ---------------------------------------------------------------------------

/**
 * `server-only` WIRFT beim Import — und das ist keine Umgehung, sondern der
 * Beweis, dass die Sperre echt ist.
 *
 * Das Paket hat genau eine Aufgabe: ausserhalb einer Serverumgebung sofort
 * abzubrechen, damit ein Import aus einem Client-Bauteil ein Fehler wird statt
 * eines Kommentars. Ein Testlauf ist keine Serverumgebung, also greift sie hier
 * auch — was beim ersten Lauf dieser Datei prompt passiert ist.
 *
 * Stillgestellt wird sie deshalb NUR hier, per `vi.mock`, und nicht über einen
 * Alias in `vitest.config.mts`. Ein Alias würde die Sperre für die ganze Suite
 * abschalten, und dann liefe jede künftige Datei mit versehentlichem
 * Server-Import fröhlich durch.
 */
vi.mock("server-only", () => ({}));

type Aufruf = { tabelle: string; zeilen: unknown[] };
const aufrufe: Aufruf[] = [];
/** Tabellenname → Fehler, den ihr insert melden soll. */
const fehlerFuer = new Map<string, string>();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from(tabelle: string) {
      return {
        insert(zeilen: unknown) {
          const liste = Array.isArray(zeilen) ? zeilen : [zeilen];
          aufrufe.push({ tabelle, zeilen: liste });
          const fehler = fehlerFuer.get(tabelle);
          return Promise.resolve({
            error: fehler === undefined ? null : { message: fehler },
          });
        },
      };
    },
  }),
}));

const { saveEvaluationRun } = await import("@/lib/db/verdict-write");

// ---------------------------------------------------------------------------
// Echte Motorausgabe, nicht von Hand gebaut.
//
// Eine erfundene `Evaluation` würde vor allem belegen, dass diese Datei zu
// sich selbst passt. Was hier gespeichert wird, soll das sein, was der Motor
// tatsächlich liefert — samt der Felder, die erst 0007 eine Spalte bekommen
// haben.
// ---------------------------------------------------------------------------

/** Ein Tagebuch, das den Motor zum Sprechen bringt: der Morgenwert springt. */
function tagebuchMitBefund(): Entry[] {
  const tage: Entry[] = [];
  for (let i = 0; i < 20; i += 1) {
    const tag = String(i + 1).padStart(2, "0");
    tage.push({
      date: `2026-08-${tag}`,
      morningScore: i < 18 ? 2 : 7,
      sessions:
        i === 17 ? [{ activityKind: "run", durationMin: 90, rpe: 9 }] : [],
    });
  }
  return tage;
}

const mitBefund = () =>
  evaluateEpisode({
    entries: tagebuchMitBefund(),
    context: { bodyRegion: "achilles", profileKey: "achilles_midportion" },
  });

const ohneEintraege = () => evaluateEpisode({ entries: [] });

beforeEach(() => {
  aufrufe.length = 0;
  fehlerFuer.clear();
  // Erfundene Werte, denn der Client dahinter ist eine Attrappe. Gebraucht
  // werden sie trotzdem: `zugang()` prüft beide, bevor es ihn baut.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://probe.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "probe-schluessel");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("saveEvaluationRun — ohne Zugang", () => {
  it("sagt, welcher Wert fehlt, statt es zu versuchen", async () => {
    // Ohne diese Prüfung wäre ein fehlender Schlüssel in der Auslieferung ein
    // Lauf, der irgendwo tiefer scheitert — und die Aktion darüber fängt jeden
    // Fehler ab, damit ein gespeicherter Eintrag gespeichert bleibt. Der
    // Fehlschlag wäre also vollkommen still.
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    await expect(saveEvaluationRun("e1", ohneEintraege())).rejects.toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
    expect(aufrufe).toHaveLength(0);
  });
});

describe("saveEvaluationRun — die Reihenfolge", () => {
  it("schreibt die Flags VOR der Auswertung", async () => {
    const auswertung = mitBefund();
    // Ohne Flags prüft dieser Test nichts. Steht hier als eigene Zusicherung,
    // damit ein Motorwechsel, der das Tagebuch stumm macht, sich nicht als
    // grüner Reihenfolgetest tarnt.
    expect(auswertung.flags.length).toBeGreaterThan(0);

    await saveEvaluationRun("e1", auswertung);

    expect(aufrufe.map((a) => a.tabelle)).toEqual(["flags", "evaluations"]);
  });

  it("und bricht die Auswertung ab, wenn die Flags nicht durchgingen", async () => {
    fehlerFuer.set("flags", "Verbindung weg");

    await expect(saveEvaluationRun("e1", mitBefund())).rejects.toThrow(/flags/);

    // DIE EIGENTLICHE ZUSICHERUNG. Eine Auswertung ohne ihre Flags läse sich
    // als »nichts gefunden« — bei einem Lauf, der sehr wohl etwas gefunden hat.
    expect(aufrufe.map((a) => a.tabelle)).toEqual(["flags"]);
  });

  it("ein Lauf ohne Befund schreibt gar keine Flags, aber seine Auswertung", async () => {
    await saveEvaluationRun("e1", ohneEintraege());
    expect(aufrufe.map((a) => a.tabelle)).toEqual(["evaluations"]);
  });

  it("meldet auch einen Fehlschlag der Auswertung weiter", async () => {
    fehlerFuer.set("evaluations", "Bedingung verletzt");
    await expect(saveEvaluationRun("e1", ohneEintraege())).rejects.toThrow(/evaluations/);
  });
});

describe("saveEvaluationRun — was in den Zeilen steht", () => {
  it("jede Flag trägt die Kennung ihres Laufs", async () => {
    const laufId = await saveEvaluationRun("e1", mitBefund());

    const flags = aufrufe.find((a) => a.tabelle === "flags")?.zeilen ?? [];
    const auswertung = (aufrufe.find((a) => a.tabelle === "evaluations")?.zeilen ?? [])[0] as {
      id: string;
    };

    expect(flags.length).toBeGreaterThan(0);
    expect(auswertung.id).toBe(laufId);
    // Ohne diese Verbindung hiesse »die aktuellen Flags« nur »die mit dem
    // grössten Zeitstempel« — eine Aussage, die bei zwei Läufen in derselben
    // Millisekunde kippt.
    for (const f of flags as { evaluation_id: string; episode_id: string }[]) {
      expect(f.evaluation_id).toBe(laufId);
      expect(f.episode_id).toBe("e1");
    }
  });

  it("eine Schwere gibt es nur, wenn genug beurteilt wurde", async () => {
    await saveEvaluationRun("e1", ohneEintraege());
    const zeile = (aufrufe[0]?.zeilen ?? [])[0] as {
      overall_status: string;
      overall_severity: string | null;
    };

    // `Overall` trägt eine Schwere ausschliesslich im Zustand `judged`. Die
    // Datenbank hält dieselbe Bedingung als CHECK; hier wird geprüft, dass die
    // App gar nicht erst versucht, dagegen zu verstossen.
    expect(zeile.overall_status).not.toBe("judged");
    expect(zeile.overall_severity).toBeNull();
  });

  it("und sie steht da, wenn er beurteilt hat", async () => {
    // Gegenprobe: Eine Umsetzung, die IMMER null schreibt, bestünde die
    // Prüfung darüber — und verlöre jede Schwere.
    const auswertung = mitBefund();
    expect(auswertung.overall.status).toBe("judged");

    await saveEvaluationRun("e1", auswertung);
    const zeile = (aufrufe.find((a) => a.tabelle === "evaluations")?.zeilen ?? [])[0] as {
      overall_severity: string | null;
    };
    expect(zeile.overall_severity).not.toBeNull();
  });

  it("Massstab und Stichtag werden mitgeschrieben", async () => {
    // Die zwei Felder, für die 0007 überhaupt entstand. Ohne sie rendert der
    // Bericht gegen DEFAULT_CONFIG und gegen den heutigen Tag statt gegen das,
    // wonach tatsächlich geurteilt wurde.
    const auswertung = mitBefund();
    await saveEvaluationRun("e1", auswertung);

    const zeile = (aufrufe.find((a) => a.tabelle === "evaluations")?.zeilen ?? [])[0] as {
      config: unknown;
      last_date: string | null;
      rule_version: string;
      profile_key: string;
      profile_version: string;
    };

    expect(zeile.config).toEqual(auswertung.config);
    expect(zeile.last_date).toBe(auswertung.lastDate);
    expect(zeile.last_date).toBe("2026-08-20");
    expect(zeile.profile_key).toBe(auswertung.profile.key);
    expect(zeile.profile_version).toBe(auswertung.profile.version);
    expect(zeile.rule_version).not.toBe("");
  });

  it("die Regelversion steht auch bei einem Lauf ganz ohne Befund da", async () => {
    // Sie wurde einmal von `flags[0]` abgelesen. Ein Lauf ohne Befund ist aber
    // der Normalfall, und dann hätte dort `undefined` gestanden.
    await saveEvaluationRun("e1", ohneEintraege());
    const zeile = (aufrufe[0]?.zeilen ?? [])[0] as { rule_version: string };
    expect(typeof zeile.rule_version).toBe("string");
    expect(zeile.rule_version.length).toBeGreaterThan(0);
  });
});
