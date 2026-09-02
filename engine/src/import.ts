/**
 * Reading a hand-kept diary file into the engine.
 *
 * TECHNIK.md sets exactly one acceptance condition for Phase 0: pour real
 * diary data in and see whether the rules say anything useful. Everything the
 * engine has been judged on so far comes out of fixtures.ts — formulas written
 * by the same person who set the thresholds. That circularity is the largest
 * open weakness in the whole project, and this file is the way out of it.
 *
 * Deliberately forgiving about FORM and strict about CONTENT: comma or
 * semicolon, any column order, German or English labels, blank lines and a
 * byte-order mark are all fine. A value that is not a number, or a label that
 * is not recognised, is reported by line — never guessed at.
 */

import type {
  ActivityKind,
  DateStr,
  Entry,
  SelfTest,
  Session,
  SymptomTiming,
  TestType,
} from "./types.js";
import { isDateStr } from "./dates.js";
import type { Problem, ProblemCode } from "./validate.js";
import { TEST_UNIT, type Measurement, type Unit } from "./measure.js";

/** Column labels accepted for each field, lower-cased. */
const COLUMNS: Record<string, string[]> = {
  date: ["datum", "date", "tag"],
  morningScore: ["morgen", "morning", "morgenwert"],
  activityKind: ["aktivitaet", "aktivität", "activity", "sport"],
  durationMin: ["minuten", "minutes", "dauer", "duration"],
  rpe: ["anstrengung", "rpe", "effort"],
  symptomScore: ["beschwerden", "symptom", "schmerz", "pain"],
  symptomTiming: ["zeitpunkt", "timing", "wann"],
  note: ["notiz", "note", "bemerkung"],
};

const ACTIVITIES: Record<string, ActivityKind> = {
  laufen: "run",
  joggen: "run",
  run: "run",
  gehen: "walk",
  walk: "walk",
  wandern: "hike",
  hike: "hike",
  rad: "cycle",
  velo: "cycle",
  radfahren: "cycle",
  cycle: "cycle",
  schwimmen: "swim",
  swim: "swim",
  rudern: "row",
  row: "row",
  kraft_beine: "strength_lower",
  beine: "strength_lower",
  strength_lower: "strength_lower",
  kraft_oben: "strength_upper",
  oberkoerper: "strength_upper",
  strength_upper: "strength_upper",
  spruenge: "plyometric",
  sprünge: "plyometric",
  plyometric: "plyometric",
  ballsport: "court_sport",
  court_sport: "court_sport",
  anderes: "other",
  other: "other",
};

const TIMINGS: Record<string, SymptomTiming> = {
  waehrend: "during",
  während: "during",
  during: "during",
  danach: "after",
  after: "after",
  abends: "evening",
  abend: "evening",
  evening: "evening",
};

export interface ImportResult {
  entries: Entry[];
  problems: Problem[];
}

export function parseDiary(text: string): ImportResult {
  const problems: Problem[] = [];
  const entries: Entry[] = [];

  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    problems.push(problem("empty-file", null, null, "Die Datei enthält keine Zeilen."));
    return { entries, problems };
  }

  const delimiter = detectDelimiter(lines[0]!);
  const header = splitRow(lines[0]!, delimiter).map((h) => normalise(h));
  const columnOf = mapColumns(header);

  if (columnOf.date === undefined) {
    problems.push(
      problem("missing-column", null, "datum", "Es fehlt eine Spalte für das Datum."),
    );
    return { entries, problems };
  }
  if (columnOf.morningScore === undefined) {
    problems.push(
      problem("missing-column", null, "morgen", "Es fehlt eine Spalte für den Morgenwert."),
    );
    return { entries, problems };
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = splitRow(lines[i]!, delimiter);
    const at = (key: keyof typeof COLUMNS): string => {
      const index = columnOf[key];
      return index === undefined ? "" : (cells[index] ?? "").trim();
    };

    const rawDate = at("date");
    if (rawDate === "") continue; // an empty template row, not an error

    if (!isDateStr(rawDate)) {
      problems.push(
        problem("invalid-date", null, "datum", `Zeile ${i + 1}: »${rawDate}« ist kein Datum im Format JJJJ-MM-TT.`),
      );
      continue;
    }
    const date = rawDate as DateStr;

    const morning = toNumber(at("morningScore"));
    if (morning === null) {
      problems.push(
        problem("not-a-number", date, "morgen", `Zeile ${i + 1}: Der Morgenwert fehlt oder ist keine Zahl.`),
      );
      continue;
    }

    const activityRaw = normalise(at("activityKind"));
    let activityKind: ActivityKind | null = null;
    if (activityRaw !== "") {
      const mapped = ACTIVITIES[activityRaw];
      if (mapped === undefined) {
        problems.push(
          problem("unknown-activity", date, "aktivitaet", `Zeile ${i + 1}: Aktivität »${at("activityKind")}« ist unbekannt.`),
        );
      } else {
        activityKind = mapped;
      }
    }

    const timingRaw = normalise(at("symptomTiming"));
    let symptomTiming: SymptomTiming | null = null;
    if (timingRaw !== "") {
      const mapped = TIMINGS[timingRaw];
      if (mapped === undefined) {
        problems.push(
          problem("unknown-timing", date, "zeitpunkt", `Zeile ${i + 1}: Zeitpunkt »${at("symptomTiming")}« ist unbekannt. Erlaubt: während, danach, abends.`),
        );
      } else {
        symptomTiming = mapped;
      }
    }

    // A typo in a numeric cell must not quietly become "nothing". Reading
    // `abc` in the minutes column as an empty value turns a real session into
    // a rest day and bends the load curve downward without a word — which is
    // this project's signature failure mode wearing a different hat.
    const numeric = (key: "durationMin" | "rpe" | "symptomScore", label: string): number | null => {
      const raw = at(key);
      if (raw.trim() === "") return null;
      const value = toNumber(raw);
      if (value === null) {
        problems.push(
          problem("not-a-number", date, label, `Zeile ${i + 1}: »${raw}« ist keine Zahl (Spalte ${label}).`),
        );
      }
      return value;
    };

    const note = at("note");

    const durationMin = numeric("durationMin", "minuten");
    const rpe = numeric("rpe", "anstrengung");

    // ---------------------------------------------------------------------
    // HIER lebt `load-incomplete`, und nur noch hier.
    //
    // Der Typ `Session` verlangt alle drei Angaben, eine halbe Einheit ist im
    // Motor also nicht mehr darstellbar. Eine CSV-Datei kann sie trotzdem
    // enthalten — jemand hat die Anstrengung eingetragen und die Minuten
    // vergessen —, und dann muss sie GEMELDET werden. Sie stillschweigend als
    // Ruhetag zu zählen, bögest die Lastkurve nach unten, ohne ein Wort zu
    // sagen: der Standardfehler dieses Projekts in anderem Gewand.
    //
    // Auch eine Einheit ohne Aktivität ist keine: Der Gewebefaktor hätte nichts
    // nachzuschlagen, und die Last liefe gegen einen Standardwert, den niemand
    // gewählt hat.
    // ---------------------------------------------------------------------
    const sessions: Session[] = [];

    if (durationMin !== null || rpe !== null) {
      if (durationMin === null || rpe === null) {
        problems.push(
          problem(
            "load-incomplete",
            date,
            rpe !== null ? "minuten" : "anstrengung",
            `Zeile ${i + 1}: Eine Einheit braucht Minuten UND Anstrengung. Nur ${rpe !== null ? "die Anstrengung" : "die Minuten"} steht da.`,
          ),
        );
      } else if (activityKind === null) {
        problems.push(
          problem(
            "load-incomplete",
            date,
            "aktivitaet",
            `Zeile ${i + 1}: Eine Einheit braucht eine Aktivität — sonst ist nicht bekannt, welches Gewebe sie belastet.`,
          ),
        );
      } else {
        sessions.push({ activityKind, durationMin, rpe });
      }
    }

    entries.push({
      date,
      morningScore: morning,
      sessions,
      symptomScore: numeric("symptomScore", "beschwerden"),
      symptomTiming,
      note: note === "" ? null : note,
    });
  }

  return { entries, problems };
}

/** German spreadsheets export semicolons; everything else uses commas. */
function detectDelimiter(headerLine: string): string {
  const semis = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  if (semis === 0 && commas === 0) return "\t";
  return semis > commas ? ";" : ",";
}

/** Minimal quoted-field handling — enough for a note containing a separator. */
function splitRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (ch === delimiter && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function mapColumns(header: string[]): Partial<Record<keyof typeof COLUMNS, number>> {
  const out: Partial<Record<keyof typeof COLUMNS, number>> = {};
  for (const [field, labels] of Object.entries(COLUMNS)) {
    const index = header.findIndex((h) => labels.includes(h));
    if (index >= 0) out[field as keyof typeof COLUMNS] = index;
  }
  return out;
}

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/^"|"$/g, "");
}

function toNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function problem(code: ProblemCode, date: DateStr | null, field: string | null, message: string): Problem {
  return { code, date, field, message };
}


// ---------------------------------------------------------------------------
// Self-tests and self-recorded measurements
// ---------------------------------------------------------------------------

/**
 * Reading a hand-kept test file.
 *
 * ---------------------------------------------------------------------------
 * This closes the largest hole in Phase 0, and it is not the milestone feature
 * that needed it.
 *
 * The side-to-side comparison is the product's stated differentiator, and
 * until now it had NEVER run on a real measurement — not because the rule was
 * unfinished, but because there was no way for a real measurement to reach it.
 * `parseDiary` read diary rows only, and the command-line tool passed
 * `tests: []` as a literal. Every self-test the engine has ever judged was
 * constructed in code by the person who wrote the rule.
 * ---------------------------------------------------------------------------
 */
const TEST_COLUMNS: Record<string, string[]> = {
  date: ["datum", "date", "tag"],
  test: ["test", "testart", "uebung", "übung", "type", "exercise"],
  involved: ["betroffen", "involved", "verletzt", "seite"],
  uninvolved: ["gesund", "uninvolved", "referenz", "andere"],
  value: ["wert", "value", "ergebnis", "result"],
  unit: ["einheit", "unit"],
  note: ["notiz", "note", "bemerkung"],
};

const TEST_LABELS: Record<string, TestType> = {
  wadenheber: "calf_raise",
  fersenheber: "calf_raise",
  zehenstand: "calf_raise",
  calf_raise: "calf_raise",
  heel_raise: "calf_raise",
  sprung: "single_hop",
  einbeinsprung: "single_hop",
  weitsprung: "single_hop",
  hop: "single_hop",
  single_hop: "single_hop",
  beweglichkeit: "rom",
  dorsalextension: "rom",
  rom: "rom",
};

const UNIT_LABELS: Record<string, Unit> = {
  wdh: "reps",
  wiederholungen: "reps",
  reps: "reps",
  cm: "cm",
  zentimeter: "cm",
  grad: "deg",
  deg: "deg",
  "°": "deg",
  min: "min",
  minuten: "min",
  minutes: "min",
  sek: "sec",
  s: "sec",
  sec: "sec",
  sekunden: "sec",
};

export interface TestImportResult {
  tests: SelfTest[];
  measurements: Measurement[];
  problems: Problem[];
}

function mapTestColumns(header: string[]): Partial<Record<keyof typeof TEST_COLUMNS, number>> {
  const out: Partial<Record<keyof typeof TEST_COLUMNS, number>> = {};
  for (const [field, labels] of Object.entries(TEST_COLUMNS)) {
    const index = header.findIndex((h) => labels.includes(h));
    if (index >= 0) out[field as keyof typeof TEST_COLUMNS] = index;
  }
  return out;
}

export function parseTests(text: string): TestImportResult {
  const problems: Problem[] = [];
  const tests: SelfTest[] = [];
  const measurements: Measurement[] = [];

  const clean = text.replace(/^\ufeff/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    problems.push(problem("empty-file", null, null, "Die Datei enthält keine Zeilen."));
    return { tests, measurements, problems };
  }

  const delimiter = detectDelimiter(lines[0]!);
  const header = splitRow(lines[0]!, delimiter).map((h) => normalise(h));
  const columnOf = mapTestColumns(header);

  if (columnOf.date === undefined) {
    problems.push(problem("missing-column", null, "datum", "Es fehlt eine Spalte für das Datum."));
    return { tests, measurements, problems };
  }
  if (columnOf.test === undefined) {
    problems.push(problem("missing-column", null, "test", "Es fehlt eine Spalte für den Test."));
    return { tests, measurements, problems };
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = splitRow(lines[i]!, delimiter);
    const at = (key: keyof typeof TEST_COLUMNS): string => {
      const index = columnOf[key];
      return index === undefined ? "" : (cells[index] ?? "").trim();
    };
    const where = `Zeile ${i + 1}`;

    const rawDate = at("date");
    if (rawDate === "") continue;
    if (!isDateStr(rawDate)) {
      problems.push(
        problem("invalid-date", null, "datum", `${where}: »${rawDate}« ist kein Datum im Format JJJJ-MM-TT.`),
      );
      continue;
    }
    const date = rawDate as DateStr;

    // Die Notiz frueh gelesen, weil BEIDE Zweige sie brauchen. Sie stand
    // erst weiter unten und war im Selbsttest-Zweig gar nicht im Geltungs-
    // bereich -- eine Notiz zu einem Seitenvergleich ging deshalb beim Import
    // verloren, obwohl die Spalte gelesen wurde. Derselbe Fund wie in der
    // Abnahme von Woche 3, eine Ebene weiter.
    const note = at("note");

    // Kleingeschrieben NUR fuer den Nachschlag in TEST_LABELS. Der Name eines
    // eigenen Masses ist das Wort des Nutzers und wird unveraendert behalten:
    // »Kniebeugen« bleibt »Kniebeugen«. Vorher lief er ueber dieselbe
    // Normalisierung und kam als »kniebeugen« zurueck -- ein Export, der die
    // eigene Schreibweise verliert, ist als Sicherung genau so viel schlechter.
    const rohTest = at("test");
    const rawTest = normalise(rohTest);
    if (rawTest === "") {
      problems.push(problem("unknown-test-type", date, "test", `${where}: Es fehlt die Angabe, welcher Test gemessen wurde.`));
      continue;
    }

    const known = TEST_LABELS[rawTest];
    const involved = toNumber(at("involved"));
    const uninvolved = toNumber(at("uninvolved"));
    const hasInvolved = at("involved") !== "";
    const hasUninvolved = at("uninvolved") !== "";

    // ---- A paired self-test ------------------------------------------------
    if (known !== undefined) {
      if (!hasInvolved || !hasUninvolved) {
        // Half a paired test is not a paired test. Inventing the other side
        // would feed the symmetry index a number nobody measured — this
        // project's signature failure, and the same reason `load-incomplete`
        // exists for a session with an effort but no minutes.
        problems.push(
          problem("test-side-missing", date, "betroffen/gesund", `${where}: Ein ${rawTest} braucht beide Seiten. Eine allein lässt sich nicht vergleichen.`),
        );
        continue;
      }
      if (involved === null || uninvolved === null) {
        problems.push(problem("not-a-number", date, "betroffen/gesund", `${where}: Die Seitenwerte sind keine Zahlen.`));
        continue;
      }

      const stated = normalise(at("unit"));
      if (stated !== "") {
        const parsedUnit = UNIT_LABELS[stated];
        if (parsedUnit === undefined) {
          problems.push(problem("unknown-unit", date, "einheit", `${where}: »${stated}« ist keine bekannte Einheit.`));
          continue;
        }
        if (parsedUnit !== TEST_UNIT[known]) {
          // A stated unit that contradicts the procedure means something other
          // than this test was measured. Accepting it and ignoring the unit
          // would silently compare centimetres against repetitions.
          problems.push(
            problem("unit-mismatch", date, "einheit", `${where}: ${rawTest} wird in ${TEST_UNIT[known]} gemessen, hier steht ${parsedUnit}.`),
          );
          continue;
        }
      }

      tests.push({ type: known, date, involved, uninvolved, note: note === "" ? null : note });
      continue;
    }

    // ---- A single self-recorded number -------------------------------------
    if (hasInvolved || hasUninvolved) {
      problems.push(
        problem("unknown-test-type", date, "test", `${where}: »${rawTest}« ist kein bekannter Seitenvergleich-Test. Für ein eigenes Mass gehört die Zahl in die Spalte »wert«, zusammen mit einer Einheit.`),
      );
      continue;
    }

    const value = toNumber(at("value"));
    if (at("value") === "") {
      problems.push(problem("unknown-test-type", date, "test", `${where}: »${rawTest}« ist unbekannt und trägt auch keinen Wert.`));
      continue;
    }
    if (value === null) {
      problems.push(problem("not-a-number", date, "wert", `${where}: »${at("value")}« ist keine Zahl.`));
      continue;
    }

    const stated = normalise(at("unit"));
    const unit = UNIT_LABELS[stated];
    if (unit === undefined) {
      problems.push(
        problem("unknown-unit", date, "einheit", `${where}: Für »${rawTest}« fehlt eine bekannte Einheit — ohne sie ist die Zahl nicht vergleichbar.`),
      );
      continue;
    }

    measurements.push({ key: rohTest, date, value, unit, note: note === "" ? null : note });
  }

  return { tests, measurements, problems };
}
