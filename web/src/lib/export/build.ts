import type { Entry, Measurement, Milestone, SelfTest } from "loadwise-engine";

/**
 * Was ein Export enthält — und warum es zwei Formate sind.
 *
 * ---------------------------------------------------------------------------
 * GESUNDHEITSDATEN NACH ART. 9 DSGVO. NICHT VERHANDELBAR.
 *
 * Ohne Export und Löschung darf niemand ausser dem Entwickler diese App
 * benutzen. Das ist keine Vorsichtsmassnahme, sondern die Bedingung dafür,
 * dass sie überhaupt jemandem angeboten werden kann.
 *
 * ---------------------------------------------------------------------------
 * ZWEI FORMATE, WEIL EIN FORMAT ZWEI AUFGABEN NICHT ERFÜLLT.
 *
 * **JSON ist die Sicherung.** Vollständig, verlustfrei, jedes Feld. Was hier
 * fehlt, ist auf immer weg, wenn ein Konto gelöscht wird.
 *
 * **CSV ist der Austausch.** Lesbar, und `parseDiary` bzw. `parseTests` nehmen
 * es wieder an — der Export ist damit auch ein Weg zurück. Dafür kann es
 * weniger tragen, und das ist keine Nachlässigkeit, sondern die Form:
 *
 *   - `parseDiary` liest EINE Einheit je Zeile. Ein Tag mit Lauf am Morgen und
 *     Kraft am Abend passt nicht in eine Zeile.
 *   - Alltagslast, Morgensteifigkeit und Schmerzmittel haben in `COLUMNS`
 *     keinen Namen. Sie kamen mit H18 und H17 in die App, nicht in den
 *     Importer für handgeführte Tagebücher.
 *
 * ---------------------------------------------------------------------------
 * MEHRERE EINHEITEN WERDEN ZU MEHREREN ZEILEN. NICHT ZU EINER.
 *
 * Die Alternative wäre, die erste Einheit zu schreiben und die übrigen
 * wegzulassen — ein stiller Verlust IM EXPORT, also im einen Dokument, das
 * jemand aufhebt, wenn er sein Konto löscht. Das ist der Standardfehler dieses
 * Projekts an der teuersten möglichen Stelle.
 *
 * Also: eine Zeile je Einheit, das Datum wiederholt. In der Datei steht dann
 * alles. Beim Wiedereinlesen behält `buildIndex` die letzte Zeile eines Tages
 * und MELDET die Doublette — der Verlust ist dort also angesagt statt still.
 *
 * Der Morgenwert steht auf jeder Zeile des Tages, nicht nur auf der ersten:
 * `parseDiary` weist eine Zeile ohne Morgenwert ab, und eine abgewiesene Zeile
 * wäre eine Einheit, die nicht einmal mehr als Doublette ankommt.
 * ---------------------------------------------------------------------------
 */

/** Eine Zelle so einpacken, dass Trennzeichen und Zeilenumbrüche überleben. */
function zelle(wert: string | number | null | undefined): string {
  if (wert === null || wert === undefined) return "";
  const text = String(wert);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function zeile(werte: (string | number | null | undefined)[]): string {
  return werte.map(zelle).join(",");
}

/**
 * Die Aktivitätsnamen, die `parseDiary` versteht.
 *
 * Aus `ACTIVITIES` dort rückwärts gelesen. Ein englischer Schlüssel schreibt
 * sich als englisches Wort — `run` liest der Importer, `laufen` auch, und der
 * kürzere Weg ist der, der bei einer neuen Aktivität nicht vergessen wird.
 */
const AKTIVITAET: Record<string, string> = {
  run: "run",
  walk: "walk",
  hike: "hike",
  cycle: "cycle",
  swim: "swim",
  strength: "strength",
  plyometric: "plyometric",
  court: "court",
  team: "team",
  climb: "climb",
  row: "row",
  other: "other",
};

/** Die Zeitpunkte, die `parseDiary` versteht. */
const ZEITPUNKT: Record<string, string> = {
  during: "during",
  after: "after",
  evening: "evening",
};

/**
 * Das Tagebuch als CSV, in genau den Spalten, die `parseDiary` liest.
 *
 * Die Kopfzeile trägt die englischen Namen aus `COLUMNS` — sie stehen dort
 * neben den deutschen, und eine Datei, die in beiden Sprachen gelesen wird,
 * ist die bessere Austauschform.
 */
export function diaryCsv(entries: Entry[]): string {
  const zeilen = ["date,morning,activity,minutes,effort,symptom,timing,note"];

  for (const e of entries) {
    const gemeinsam = [String(e.date), e.morningScore];
    const schluss = [
      e.symptomScore ?? null,
      e.symptomTiming === null || e.symptomTiming === undefined
        ? null
        : (ZEITPUNKT[e.symptomTiming] ?? e.symptomTiming),
      e.note ?? null,
    ];

    if (e.sessions.length === 0) {
      zeilen.push(zeile([...gemeinsam, null, null, null, ...schluss]));
      continue;
    }

    // Eine Zeile je Einheit. Siehe Kopf: In der Datei steht dann alles.
    for (const s of e.sessions) {
      zeilen.push(
        zeile([
          ...gemeinsam,
          AKTIVITAET[s.activityKind] ?? s.activityKind,
          s.durationMin,
          s.rpe,
          ...schluss,
        ]),
      );
    }
  }

  return `${zeilen.join("\n")}\n`;
}

/**
 * Selbsttests und eigene Masse als CSV, in den Spalten von `parseTests`.
 *
 * Beide in einer Datei, weil der Importer beide aus einer liest: Ein
 * Seitenvergleich füllt `involved` und `uninvolved`, ein eigenes Mass füllt
 * `value` und `unit`. Zwei Dateien wären zwei Wege, auf denen die Hälfte
 * vergessen wird.
 */
export function testsCsv(tests: SelfTest[], measurements: Measurement[]): string {
  const zeilen = ["date,test,involved,uninvolved,value,unit,note"];

  for (const t of tests) {
    zeilen.push(zeile([String(t.date), t.type, t.involved, t.uninvolved, null, null, t.note ?? null]));
  }
  for (const m of measurements) {
    zeilen.push(zeile([String(m.date), m.key, null, null, m.value, m.unit, m.note ?? null]));
  }

  return `${zeilen.join("\n")}\n`;
}

/** Eine Episode, so wie die Sicherung sie hält. */
export type ExportEpisode = {
  id: string;
  label: string | null;
  bodyRegion: string;
  profileKey: string | null;
  side: string;
  startedOn: string | null;
  endedOn: string | null;
  archivedAt: string | null;
  createdAt: string;
  entries: Entry[];
  tests: SelfTest[];
  measurements: Measurement[];
  milestones: Milestone[];
};

/**
 * Die vollständige Sicherung.
 *
 * ---------------------------------------------------------------------------
 * WAS HIER FEHLT, IST NACH EINER KONTOLÖSCHUNG AUF IMMER WEG.
 *
 * Deshalb steht hier alles, was der Nutzer erzeugt hat, und nicht bloss das,
 * was eine Ansicht heute zeigt. Auch die Felder, die keine Regel liest —
 * Notizen, Alltagslast, Morgensteifigkeit —, denn genau die erklären eine Zahl
 * ein Jahr später.
 *
 * NICHT enthalten: die Auswertungsläufe. Sie sind abgeleitet — aus denselben
 * Eingaben und derselben Profil- und Regelversion wieder herstellbar — und
 * würden die Datei um ein Vielfaches aufblähen, ohne etwas zu sichern, das
 * verloren gehen kann. Die Versionen, unter denen geurteilt wurde, stehen auf
 * dem Ausdruck (Karte 4.1).
 *
 * `exportedAt` und `schema` stehen oben: Wer diese Datei in drei Jahren
 * öffnet, muss wissen, wann sie entstand und nach welcher Form sie gebaut ist.
 * ---------------------------------------------------------------------------
 */
export function backupJson(episodes: ExportEpisode[], exportedAt: string): string {
  return `${JSON.stringify(
    {
      schema: "loadwise.export.1",
      exportedAt,
      episodes,
    },
    null,
    2,
  )}\n`;
}
