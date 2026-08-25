/**
 * Kaputte Dateien — der Teil des Einlesens, der bisher nie gelaufen ist.
 *
 * ---------------------------------------------------------------------------
 * WARUM AUSGERECHNET DIE FEHLERBEHANDLUNG.
 *
 * `import.ts` ist der Weg, auf dem ein von Hand geführtes Tagebuch hereinkommt
 * — die einzige Tür, durch die dieses Projekt aus seiner eigenen Zirkularität
 * herauskommt: Alles, woran der Motor bisher gemessen wurde, stammt aus
 * `fixtures.ts`, geschrieben von derselben Person, die die Schwellen gesetzt
 * hat.
 *
 * Geprüft war bis hierher der glatte Fall. Ungeprüft war, was passiert, wenn
 * eine Zeile nicht stimmt — und dort steht der Standardfehler dieses Projekts
 * bereit: Ein still verschluckter Wert wird zum Ruhetag, die Lastkurve biegt
 * sich nach unten, und niemand erfährt es. Dieselbe Familie wie H2, nur eine
 * Ebene tiefer.
 *
 * Jede Datei hier ist ein Fehler, den ein Mensch mit einer Tabellenkalkulation
 * tatsächlich macht.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { parseDiary, parseTests } from "../src/import.js";

const codes = (problems: { code: string }[]): string[] => problems.map((p) => p.code);
const HEADER = "datum,morgen,aktivitaet,minuten,anstrengung,beschwerden,zeitpunkt,notiz";

describe("Trennzeichen, die niemand beabsichtigt hat", () => {
  it("liest eine Datei mit Tabulatoren", () => {
    // Wer eine Tabelle in einen Editor kopiert, bekommt Tabulatoren. Ohne
    // Komma und ohne Semikolon war das der einzige Zweig der
    // Trennzeichenerkennung, der nie gelaufen ist.
    const { entries, problems } = parseDiary(
      ["datum\tmorgen\taktivitaet\tminuten\tanstrengung", "2026-08-21\t3\tlaufen\t30\t5"].join("\n"),
    );
    expect(problems).toEqual([]);
    expect(entries[0]).toMatchObject({
      date: "2026-08-21",
      morningScore: 3,
      sessions: [{ activityKind: "run", durationMin: 30, rpe: 5 }],
    });
  });

  it("behandelt eine Zeile mit zu wenigen Zellen als leer, nicht als Null", () => {
    // Verschobene Spalten: Die Zeile bricht früher ab als die Kopfzeile.
    // Fehlende Zellen dürfen nicht zu 0 werden — 0 ist auf der Morgenskala der
    // BESTE Wert, und ein abgeschnittener Tag würde als bester Tag zählen.
    const { entries, problems } = parseDiary([HEADER, "2026-08-21,3"].join("\n"));
    expect(problems).toEqual([]);
    expect(entries[0]).toMatchObject({
      morningScore: 3,
      sessions: [],
      symptomScore: null,
      symptomTiming: null,
      note: null,
    });
  });

  it("behält ein Anführungszeichen in einer Notiz", () => {
    // Doppelte Anführungszeichen sind die Art, wie CSV ein Anführungszeichen
    // schreibt. Ohne diesen Zweig verlöre die Notiz Zeichen.
    const { entries, problems } = parseDiary(
      [HEADER, '2026-08-21,3,,,,,,"Physio sagte ""nur bis 4"" heute"'].join("\n"),
    );
    expect(problems).toEqual([]);
    expect(entries[0]!.note).toBe('Physio sagte "nur bis 4" heute');
  });
});

describe("Daten, die es nicht gibt", () => {
  it("weist den 30. Februar zurück, statt ihn zu verschieben", () => {
    // `new Date` würde daraus stillschweigend den 2. März machen. Ein
    // verschobener Tag im Tagebuch verschiebt jede Fensterrechnung mit.
    const { entries, problems } = parseDiary([HEADER, "2026-02-30,3,,,,,,"].join("\n"));
    expect(codes(problems)).toEqual(["invalid-date"]);
    expect(entries).toEqual([]);
  });

  it("weist das deutsche Datumsformat zurück, statt es zu raten", () => {
    const { problems } = parseDiary([HEADER, "21.08.2026,3,,,,,,"].join("\n"));
    expect(codes(problems)).toEqual(["invalid-date"]);
  });
});

describe("halbe Einheiten", () => {
  it("meldet Minuten ohne Anstrengung", () => {
    const { entries, problems } = parseDiary([HEADER, "2026-08-21,3,laufen,30,,,,"].join("\n"));
    expect(codes(problems)).toEqual(["load-incomplete"]);
    expect(problems[0]!.message).toContain("die Minuten");
    // Der Tag bleibt erhalten — nur ohne Einheit. Ihn ganz zu verwerfen wäre
    // ein zweiter Verlust obendrauf.
    expect(entries[0]).toMatchObject({ morningScore: 3, sessions: [] });
  });

  it("meldet Anstrengung ohne Minuten", () => {
    const { problems } = parseDiary([HEADER, "2026-08-21,3,laufen,,5,,,"].join("\n"));
    expect(codes(problems)).toEqual(["load-incomplete"]);
    expect(problems[0]!.message).toContain("die Anstrengung");
  });

  it("meldet eine Einheit ohne Aktivität", () => {
    // Ohne Aktivität hat der Gewebefaktor nichts nachzuschlagen, und die Last
    // liefe gegen einen Standardwert, den niemand gewählt hat.
    const { problems } = parseDiary([HEADER, "2026-08-21,3,,30,5,,,"].join("\n"));
    expect(codes(problems)).toEqual(["load-incomplete"]);
    expect(problems[0]!.message).toContain("Aktivität");
  });
});

describe("kaputte Selbsttestdateien", () => {
  const KOPF = "datum,test,betroffen,gesund,wert,einheit,notiz";

  it("weist ein unmögliches Datum zurück", () => {
    const { tests, problems } = parseTests([KOPF, "2026-02-30,wadenheber,18,20,,,"].join("\n"));
    expect(codes(problems)).toEqual(["invalid-date"]);
    expect(tests).toEqual([]);
  });

  it("meldet eine Zeile ohne Testangabe", () => {
    const { problems } = parseTests([KOPF, "2026-03-02,,18,20,,,"].join("\n"));
    expect(codes(problems)).toEqual(["unknown-test-type"]);
    expect(problems[0]!.message).toContain("welcher Test");
  });

  it("meldet einen halben Seitenvergleich", () => {
    // Die andere Seite zu erfinden hiesse, dem Symmetrieindex eine Zahl zu
    // füttern, die niemand gemessen hat.
    const { problems } = parseTests([KOPF, "2026-03-02,wadenheber,18,,,,"].join("\n"));
    expect(codes(problems)).toEqual(["test-side-missing"]);
  });

  it("meldet Seitenwerte, die keine Zahlen sind", () => {
    const { problems } = parseTests([KOPF, "2026-03-02,wadenheber,achtzehn,zwanzig,,,"].join("\n"));
    expect(codes(problems)).toEqual(["not-a-number"]);
  });

  it("meldet eine unbekannte Einheit an einem bekannten Test", () => {
    const { problems } = parseTests([KOPF, "2026-03-02,wadenheber,18,20,,klafter,"].join("\n"));
    expect(codes(problems)).toEqual(["unknown-unit"]);
  });

  it("meldet eine Einheit, die dem Test widerspricht", () => {
    // Zentimeter gegen Wiederholungen verglichen ist still, plausibel und
    // vollständig falsch.
    const { problems } = parseTests([KOPF, "2026-03-02,wadenheber,18,20,,cm,"].join("\n"));
    expect(codes(problems)).toEqual(["unit-mismatch"]);
  });

  it("meldet einen unbekannten Test, der Seitenwerte trägt", () => {
    const { problems } = parseTests([KOPF, "2026-03-02,einbeinstand,18,20,,,"].join("\n"));
    expect(codes(problems)).toEqual(["unknown-test-type"]);
    expect(problems[0]!.message).toContain("Seitenvergleich");
  });

  it("meldet einen unbekannten Test ganz ohne Zahl", () => {
    const { problems } = parseTests([KOPF, "2026-03-02,einbeinstand,,,,,"].join("\n"));
    expect(codes(problems)).toEqual(["unknown-test-type"]);
    expect(problems[0]!.message).toContain("trägt auch keinen Wert");
  });

  it("meldet einen Wert, der keine Zahl ist", () => {
    const { problems } = parseTests([KOPF, "2026-03-02,kniebeugen,,,fünfzehn,wdh,"].join("\n"));
    expect(codes(problems)).toEqual(["not-a-number"]);
  });

  it("meldet ein eigenes Mass ohne Einheit", () => {
    // Ohne Einheit ist die Zahl nicht vergleichbar — und derselbe Name in zwei
    // Einheiten ist der eine Fehler, den die Datenbank per Fremdschlüssel
    // ausschliesst.
    const { problems } = parseTests([KOPF, "2026-03-02,kniebeugen,,,15,,"].join("\n"));
    expect(codes(problems)).toEqual(["unknown-unit"]);
  });

  it("überspringt eine leere Vorlagenzeile", () => {
    // Wer eine Tabelle mit Leerzeilen vorbereitet und nur manche ausfüllt,
    // schickt genau das. Eine Zeile ohne Datum ist keine Messung und kein
    // Fehler.
    const { tests, measurements, problems } = parseTests(
      [KOPF, ",,,,,,", "2026-03-02,wadenheber,18,20,,,", ",,,,,,"].join("\n"),
    );
    expect(problems).toEqual([]);
    expect(tests).toHaveLength(1);
    expect(measurements).toEqual([]);
  });

  it("behandelt eine abgeschnittene Zeile als leer", () => {
    // Verschobene Spalten, hier im Testblatt: Die Zeile endet vor den
    // Seitenwerten. Sie muss als fehlende Angabe ankommen, nicht als Null.
    const { problems } = parseTests([KOPF, "2026-03-02,wadenheber"].join("\n"));
    expect(codes(problems)).toEqual(["test-side-missing"]);
  });

  it("behält die Notiz an einem eigenen Mass", () => {
    const { measurements, problems } = parseTests(
      [KOPF, "2026-03-02,kniebeugen,,,15,wdh,ohne Pause"].join("\n"),
    );
    expect(problems).toEqual([]);
    expect(measurements[0]).toMatchObject({ key: "kniebeugen", value: 15, note: "ohne Pause" });
  });

  it("meldet einen Einheitenwechsel mitten in der Datei nicht — das kann sie nicht", () => {
    // Ehrlich benannt statt vorgetäuscht: Beide Zeilen sind für sich gültig,
    // und der Import beurteilt Zeilen einzeln. Dass »kniebeugen« einmal in
    // Wiederholungen und einmal in Sekunden dasteht, fällt erst dort auf, wo
    // beide zusammenkommen — die Datenbank hält je Schlüssel genau eine
    // Einheit fest (`one_unit_per_key`). Diese Zeile hält fest, WO die Grenze
    // liegt, damit niemand sie später beim Importeur sucht.
    const { measurements, problems } = parseTests(
      [KOPF, "2026-03-02,kniebeugen,,,15,wdh,", "2026-04-06,kniebeugen,,,30,sek,"].join("\n"),
    );
    expect(problems).toEqual([]);
    expect(measurements.map((m) => m.unit)).toEqual(["reps", "sec"]);
  });
});
