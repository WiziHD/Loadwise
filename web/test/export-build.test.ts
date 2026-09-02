import { describe, expect, it } from "vitest";
import {
  ALL_ACTIVITY_KINDS,
  buildIndex,
  parseDiary,
  parseTests,
  type Entry,
  type Measurement,
  type SelfTest,
} from "loadwise-engine";
import { backupJson, diaryCsv, testsCsv } from "@/lib/export/build";

/**
 * Der Export — und die eine Prüfung, die die Karte wirklich fordert.
 *
 * ---------------------------------------------------------------------------
 * »IM SELBEN FORMAT, DAS parseDiary UND parseTests LESEN, DAMIT DER EXPORT
 * AUCH EIN BACKUP IST.«
 *
 * Das ist nur wahr, wenn es jemand nachweist. Eine CSV-Datei, die *aussieht*
 * wie das Importformat, ist keine — der Beweis ist, sie durch den Importer zu
 * schicken und zu prüfen, dass dieselben Werte herauskommen.
 *
 * Diese Datei ist deshalb vor allem ein Rundlauf: hinein, heraus, vergleichen.
 * ---------------------------------------------------------------------------
 */

const eintrag = (patch: Partial<Entry> = {}): Entry =>
  ({
    date: "2026-08-20",
    morningScore: 3,
    sessions: [],
    symptomScore: null,
    symptomTiming: null,
    note: null,
    ...patch,
  }) as Entry;

describe("das Tagebuch geht durch parseDiary zurück", () => {
  it("nimmt einen Ruhetag unverändert wieder an", () => {
    const csv = diaryCsv([eintrag()]);
    const { entries, problems } = parseDiary(csv);

    expect(problems).toEqual([]);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.morningScore).toBe(3);
    expect(entries[0]!.sessions).toEqual([]);
  });

  it("und einen Tag mit einer Einheit", () => {
    const csv = diaryCsv([
      eintrag({ sessions: [{ activityKind: "run", durationMin: 45, rpe: 6 }] }),
    ]);
    const { entries, problems } = parseDiary(csv);

    expect(problems).toEqual([]);
    expect(entries[0]!.sessions).toEqual([{ activityKind: "run", durationMin: 45, rpe: 6 }]);
  });

  it("trägt Beschwerdewert, Zeitpunkt und Notiz mit", () => {
    const csv = diaryCsv([
      eintrag({ symptomScore: 4, symptomTiming: "after", note: "Auf Asphalt" }),
    ]);
    const { entries, problems } = parseDiary(csv);

    expect(problems).toEqual([]);
    expect(entries[0]!.symptomScore).toBe(4);
    expect(entries[0]!.symptomTiming).toBe("after");
    expect(entries[0]!.note).toBe("Auf Asphalt");
  });

  it("überlebt ein Komma und ein Anführungszeichen in der Notiz", () => {
    // Ohne Maskierung zerrisse ein Komma die Zeile, und die Spalten danach
    // stünden alle um eins verschoben — eine Notiz würde zum Zeitpunkt.
    const csv = diaryCsv([eintrag({ note: 'Lauf, dann Kraft — "hart"' })]);
    const { entries, problems } = parseDiary(csv);

    expect(problems).toEqual([]);
    expect(entries[0]!.note).toBe('Lauf, dann Kraft — "hart"');
  });

  it("kennt jede Aktivitätsart, die der Motor kennt", () => {
    /**
     * Die Prüfung, die eine neue Aktivität abfängt.
     *
     * Der Export bildet die Motorschlüssel auf die Wörter ab, die `parseDiary`
     * versteht. Eine zwölfte Aktivität ohne Eintrag in dieser Abbildung ginge
     * als unbekanntes Wort hinaus — und käme als `unknown-activity` zurück,
     * also als Tag ohne Einheit. Ein stiller Lastverlust im Backup.
     */
    for (const kind of ALL_ACTIVITY_KINDS) {
      const csv = diaryCsv([
        eintrag({ sessions: [{ activityKind: kind, durationMin: 30, rpe: 5 }] }),
      ]);
      const { entries, problems } = parseDiary(csv);

      expect(problems, `${kind}: ${problems.map((p) => p.message).join(" | ")}`).toEqual([]);
      expect(entries[0]!.sessions[0]?.activityKind, kind).toBe(kind);
    }
  });

  it("kennt jeden Zeitpunkt, den der Motor kennt", () => {
    for (const timing of ["during", "after", "evening"] as const) {
      const { entries, problems } = parseDiary(diaryCsv([eintrag({ symptomScore: 5, symptomTiming: timing })]));
      expect(problems, timing).toEqual([]);
      expect(entries[0]!.symptomTiming, timing).toBe(timing);
    }
  });
});

describe("mehrere Einheiten an einem Tag", () => {
  const ZWEI = eintrag({
    sessions: [
      { activityKind: "run", durationMin: 45, rpe: 6 },
      { activityKind: "strength_lower", durationMin: 30, rpe: 7 },
    ],
  });

  it("stehen als zwei Zeilen in der Datei", () => {
    /**
     * Die Alternative wäre, die erste zu schreiben und die zweite wegzulassen
     * — ein stiller Verlust IM EXPORT, also im einen Dokument, das jemand
     * aufhebt, wenn er sein Konto löscht.
     */
    const csv = diaryCsv([ZWEI]);
    const datenzeilen = csv.trim().split("\n").slice(1);

    expect(datenzeilen).toHaveLength(2);
    expect(datenzeilen[0]).toContain("run");
    expect(datenzeilen[1]).toContain("strength_lower");
  });

  it("und der Morgenwert steht auf beiden", () => {
    // `parseDiary` weist eine Zeile ohne Morgenwert ab. Eine abgewiesene Zeile
    // wäre eine Einheit, die nicht einmal mehr als Doublette ankommt.
    const datenzeilen = diaryCsv([ZWEI]).trim().split("\n").slice(1);
    for (const z of datenzeilen) expect(z.startsWith("2026-08-20,3,")).toBe(true);
  });

  it("beim Wiedereinlesen meldet der Motor die Doublette, statt sie zu schlucken", () => {
    /**
     * Der Verlust ist damit ANGESAGT statt still. `buildIndex` behält die
     * letzte Zeile eines Tages und trägt den Tag in `duplicateDates` ein —
     * genau die Auskunft, die ein Backup schuldet.
     */
    const { entries } = parseDiary(diaryCsv([ZWEI]));
    expect(entries).toHaveLength(2);

    const index = buildIndex(entries);
    expect(index.discarded.duplicateDates).toContain("2026-08-20");
    expect(index.entries).toHaveLength(1);
  });
});

describe("Selbsttests und eigene Masse gehen durch parseTests zurück", () => {
  const TESTS: SelfTest[] = [
    { type: "calf_raise", date: "2026-08-20" as SelfTest["date"], involved: 12, uninvolved: 21, note: "Neue Schuhe" },
  ];
  const MASSE: Measurement[] = [
    { key: "Kniebeugen", date: "2026-08-21" as Measurement["date"], value: 15, unit: "reps", note: null },
  ];

  it("nimmt einen Seitenvergleich unverändert wieder an", () => {
    const { tests, problems } = parseTests(testsCsv(TESTS, []));

    expect(problems).toEqual([]);
    expect(tests).toHaveLength(1);
    expect(tests[0]).toMatchObject({ type: "calf_raise", involved: 12, uninvolved: 21 });
  });

  it("und ein eigenes Mass mit seiner Einheit", () => {
    const { measurements, problems } = parseTests(testsCsv([], MASSE));

    expect(problems).toEqual([]);
    expect(measurements).toHaveLength(1);
    expect(measurements[0]).toMatchObject({ key: "Kniebeugen", value: 15, unit: "reps" });
  });

  it("beide in derselben Datei", () => {
    // Zwei Dateien wären zwei Wege, auf denen die Hälfte vergessen wird.
    const { tests, measurements, problems } = parseTests(testsCsv(TESTS, MASSE));

    expect(problems).toEqual([]);
    expect(tests).toHaveLength(1);
    expect(measurements).toHaveLength(1);
  });

  it("trägt die Notiz mit", () => {
    const { tests } = parseTests(testsCsv(TESTS, []));
    expect(tests[0]!.note).toBe("Neue Schuhe");
  });

  it("nimmt null auf der verletzten Seite an", () => {
    // Tag eins einer Reha. Ein Export, der sie verlöre, verlöre die
    // aussagekräftigste Messung überhaupt.
    const null_seite: SelfTest[] = [
      { type: "calf_raise", date: "2026-08-20" as SelfTest["date"], involved: 0, uninvolved: 20 },
    ];
    const { tests, problems } = parseTests(testsCsv(null_seite, []));

    expect(problems).toEqual([]);
    expect(tests[0]!.involved).toBe(0);
  });
});

describe("die Sicherung", () => {
  it("nennt Form und Zeitpunkt", () => {
    // Wer die Datei in drei Jahren öffnet, muss wissen, wann sie entstand und
    // nach welcher Form sie gebaut ist.
    const json = JSON.parse(backupJson([], "2026-09-02T10:00:00.000Z")) as {
      schema: string;
      exportedAt: string;
    };
    expect(json.schema).toBe("loadwise.export.1");
    expect(json.exportedAt).toBe("2026-09-02T10:00:00.000Z");
  });

  it("trägt die Felder, die keine CSV-Spalte hat", () => {
    /**
     * Alltagslast, Morgensteifigkeit und Schmerzmittel kamen mit H17 und H18
     * in die App, nicht in den Importer für handgeführte Tagebücher. Sie haben
     * in `COLUMNS` keinen Namen — und wären damit aus einem reinen CSV-Export
     * auf immer weg.
     */
    const voll = eintrag({
      everydayLoad: "on-feet",
      morningStiffnessMin: 25,
      painMedication: true,
    } as Partial<Entry>);

    const json = backupJson(
      [
        {
          id: "e1",
          label: null,
          bodyRegion: "achilles",
          profileKey: "achilles_midportion",
          side: "left",
          startedOn: null,
          endedOn: null,
          archivedAt: null,
          createdAt: "2026-06-01T00:00:00.000Z",
          entries: [voll],
          tests: [],
          measurements: [],
          milestones: [],
        },
      ],
      "2026-09-02T10:00:00.000Z",
    );

    expect(json).toContain("on-feet");
    expect(json).toContain("25");
    expect(json).toContain('"painMedication": true');
  });

  it("und die CSV-Fassung trägt sie nachweislich NICHT", () => {
    /**
     * Die Gegenprobe, und sie ist der Grund für zwei Formate. Ohne sie stünde
     * die Behauptung »CSV ist auch ein Backup« unwidersprochen im Raum — und
     * jemand löschte sein Konto im Vertrauen darauf.
     */
    const voll = eintrag({
      everydayLoad: "on-feet",
      morningStiffnessMin: 25,
      painMedication: true,
    } as Partial<Entry>);

    const csv = diaryCsv([voll]);
    expect(csv).not.toContain("on-feet");
    expect(csv).not.toContain("25");
  });
});
