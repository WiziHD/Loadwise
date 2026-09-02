/**
 * Keine Zahl in einem Dokument, die nicht mehr stimmt.
 *
 * ---------------------------------------------------------------------------
 * DIE DOKUMENTE SIND DAS GEDÄCHTNIS DIESES PROJEKTS.
 *
 * Sie tragen die BEGRÜNDUNGEN, nicht bloss Beschreibungen. Wenn sie
 * hinterherhinken, ist das Wissen weg, sobald der Kontext weg ist — und dann
 * wird eine sorgfältig getroffene Entscheidung später versehentlich rückgängig
 * gemacht.
 *
 * Eine Zahl, die niemand nachzieht, ist der leiseste Fall davon. Sie schlägt
 * nirgends fehl, sie sieht weiter richtig aus, und irgendwann glaubt jemand
 * »316 Tests«, obwohl es 364 sind. Gefunden wurden bei diesem Lauf sieben
 * solcher Zahlen in vier Dateien; zwei davon waren erst diese Woche falsch
 * geworden, durch eigene Arbeit.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIE DOKUMENTE EINE FESTE WENDUNG BENUTZEN MÜSSEN.
 *
 * Ein Skript kann nicht raten, welche Zahl in einem Fliesstext eine Behauptung
 * über den Code ist. Also wird die Wendung festgelegt: »364 Motortests«, nicht
 * »364 Tests«. Die blosse Form `<Zahl> Tests` ist deshalb VERBOTEN — sonst
 * liesse sich jede Prüfung dadurch umgehen, dass man die Wendung wegkürzt, und
 * genau das würde beim nächsten Umschreiben passieren.
 *
 * ---------------------------------------------------------------------------
 * WAS AUSDRÜCKLICH ERLAUBT IST.
 *
 * Ein Dokument darf einen ZUSTAND VON DAMALS festhalten — »Stand: 246 Tests«
 * in einem Profilprotokoll ist ein Datum, keine Behauptung über heute. Solche
 * Zeilen stehen unten in `HISTORISCH`, jede mit Begründung, und eine Ausnahme
 * für eine Zeile, die es nicht mehr gibt, ist ihrerseits ein Fehler — sonst
 * verdeckt sie später einen echten Fund.
 * ---------------------------------------------------------------------------
 *
 *   npm run check:docs
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";

const WURZEL = resolve(import.meta.dirname, "..");

/**
 * Aufgerufen wird NODE, nicht `npm` oder `npx`.
 *
 * Unter Windows sind beide `.cmd`-Dateien, und Node weigert sich seit der
 * Behebung von CVE-2024-27980, solche ohne Shell zu starten. Mit `shell: true`
 * wiederum werden die Argumente unmaskiert zu einer Befehlszeile verkettet —
 * Node warnt selbst davor, und in einem Projekt, das gerade eine
 * Sicherheitsdurchsicht hinter sich hat, ist das kein Warnhinweis zum
 * Wegklicken.
 *
 * `process.execPath` ist die laufende Node-Binärdatei; die beiden Werkzeuge
 * werden über ihren JS-Einstiegspunkt geladen. Keine Shell, keine Verkettung,
 * kein Plattformunterschied.
 */
const VITEST = resolve(WURZEL, "node_modules/vitest/vitest.mjs");
const TSX = resolve(WURZEL, "node_modules/tsx/dist/cli.mjs");

function fail(message: string): never {
  console.error(`\nDokumentenprüfung FEHLGESCHLAGEN\n\n${message}\n`);
  process.exit(1);
}

/** Wie viele Tests ein Arbeitsbereich wirklich hat — gezählt, nicht geglaubt. */
function testAnzahl(workspace: string, projekt?: string): number {
  const args = [VITEST, "run"];
  if (projekt !== undefined) args.push("--project=" + projekt);
  const out = execFileSync(process.execPath, args, {
    cwd: resolve(WURZEL, workspace),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const treffer = out.match(/Tests\s+(\d+)\s+passed/);
  if (treffer === null) fail(`Konnte die Testzahl von ${workspace} nicht ablesen.`);
  return Number(treffer[1]);
}

/**
 * Die Zählwerte des Motors — aus dem Motor, nicht aus einer zweiten Liste hier.
 *
 * Über eine kurzlebige Datei statt `--eval`: Ein mehrzeiliges Programm über die
 * Befehlszeile zu schicken hält keine Anführungszeichen aus, und eine Prüfung,
 * die an der Zitierung scheitert, prüft nichts.
 */
function motorZahlen(): Record<string, number> {
  const datei = resolve(WURZEL, "engine", "_zahlen.mts");
  writeFileSync(
    datei,
    [
      `import { ALL_PROFILES } from "./src/profiles/registry.js";`,
      `import { SCENARIOS } from "./src/fixtures.js";`,
      `import { ALL_REASON_CODES, ALL_BLOCKING_REASONS } from "./src/types.js";`,
      `import { ALL_PROBLEM_CODES } from "./src/validate.js";`,
      `console.log(JSON.stringify({`,
      `  Szenarien: SCENARIOS.length,`,
      `  Urteilscodes: ALL_REASON_CODES.length,`,
      `  "Blockade-Gründe": ALL_BLOCKING_REASONS.length,`,
      `  Problemcodes: ALL_PROBLEM_CODES.length,`,
      `  "recherchierte Profile": ALL_PROFILES.filter((p) =>`,
      `    Object.values(p.evidence).some((e) => e.grade !== "D"),`,
      `  ).length,`,
      `}));`,
    ].join("\n"),
    "utf8",
  );

  try {
    const out = execFileSync(process.execPath, [TSX, "_zahlen.mts"], {
      cwd: resolve(WURZEL, "engine"),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const zeile = out.trim().split(/\r?\n/).pop() ?? "";
    return JSON.parse(zeile) as Record<string, number>;
  } finally {
    rmSync(datei, { force: true });
  }
}

type Behauptung = {
  /** Die Wendung, die ein Dokument benutzen MUSS. */
  wendung: RegExp;
  name: string;
};

/**
 * Was ein Dokument über den Code behaupten darf, und wie es das schreiben muss.
 *
 * Der Name ist zugleich der Schlüssel, unter dem der wahre Wert steht — so gibt
 * es keine zweite Liste, die mit dieser auseinanderlaufen könnte.
 */
const BEHAUPTUNGEN: Behauptung[] = [
  { wendung: /(\d+)\s+Motortests\b/g, name: "Motortests" },
  { wendung: /(\d+)\s+Webtests\b/g, name: "Webtests" },
  // Eigene Wendung, weil diese Zahl mich beim Schreiben von E11 selbst erwischt
  // hat: »24 Bauteiltests« stand in drei Dokumenten, es waren 22. Nachgezählt
  // habe ich nur, weil die Zahl im Bericht komisch aussah — die Prüfung hier
  // kannte das Wort nicht, also gab es keine.
  { wendung: /(\d+)\s+Bauteiltests\b/g, name: "Bauteiltests" },
  { wendung: /(\d+)\s+Szenarien\b/g, name: "Szenarien" },
  { wendung: /(\d+)\s+Urteilscodes\b/g, name: "Urteilscodes" },
  { wendung: /(\d+)\s+Blockade-Gründe\b/g, name: "Blockade-Gründe" },
  { wendung: /(\d+)\s+Problemcodes\b/g, name: "Problemcodes" },
  { wendung: /(\d+)\s+recherchierte Profile/g, name: "recherchierte Profile" },
];

/**
 * Die Form, die niemand benutzen darf.
 *
 * »364 Tests« ist nicht prüfbar — Motor oder App? Wer so schreibt, hat die
 * Prüfung umgangen, und beim nächsten Umschreiben stimmt die Zahl nicht mehr.
 */
const UNGEPRUEFBAR = /(\d+)\s+Tests\b/g;

/**
 * Zeilen, die einen Zustand von DAMALS festhalten.
 *
 * Jede Ausnahme mit Begründung, und eine Ausnahme für etwas, das es nicht mehr
 * gibt, ist ein Fehler — sonst verdeckt sie später einen echten Fund. Dieselbe
 * Disziplin wie `GLEICH_ERLAUBT` in test/dictionary.test.ts.
 */
const HISTORISCH: { datei: string; enthaelt: string; warum: string }[] = [
  {
    datei: "PROFIL-ACHILLES.md",
    enthaelt: "Stand: 246 Tests",
    warum: "Protokoll von Schritt 4 — der Zustand an dem Tag, nicht heute.",
  },
  {
    datei: "PROFIL-ACHILLES.md",
    enthaelt: "Stand: 248 Tests",
    warum: "Protokoll von Schritt 5 — dasselbe, einen Schritt später.",
  },
  {
    datei: "PROFIL-ACHILLES.md",
    enthaelt: "Alle 11 Profile, Stand Schritt 4",
    warum:
      "Das Ergebnis der Erreichbarkeitsprüfung an dem Tag: elf Profile, acht Blockade-Gründe. " +
      "Beide Zahlen sind seither gewachsen. Die Zeile trägt deshalb ihr Datum im Text, damit " +
      "nicht erst diese Liste erklären muss, dass sie kein Stand von heute ist.",
  },
  {
    datei: "ENTSCHEIDUNGEN.md",
    enthaelt: "222 Bauteiltests sagen für sich genommen nichts",
    warum:
      "E11, der Eintrag über die zwei Testumgebungen. Die Zahl ist der Stand jenes Tages, und " +
      "die Zeile sagt das zwei Sätze später selbst: »In der Woche, in der dieser Eintrag " +
      "entstand« und »die Liste ist seither mit jeder Karte gewachsen«. Sie nachzuziehen " +
      "hiesse, ein Protokoll umzuschreiben, damit es wie heute aussieht.",
  },
  {
    datei: "ENTSCHEIDUNGEN.md",
    enthaelt: "Woche 3 stand mit 85 von 85 gefangenen Mutationen",
    warum:
      "E19, die Abnahme von Woche 3. Der ganze Satz ist eine Aussage über den Zustand AN " +
      "jenem Tag — und der Eintrag handelt davon, dass diese grüne Bilanz trotzdem einen " +
      "Fund verdeckt hat. Eine nachgezogene Zahl würde genau die Pointe zerstören.",
  },
];

function markdownDateien(dir: string): string[] {
  const out: string[] = [];
  for (const eintrag of readdirSync(dir)) {
    if (eintrag === "node_modules" || eintrag === ".git" || eintrag === ".next") continue;
    const pfad = resolve(dir, eintrag);
    if (statSync(pfad).isDirectory()) out.push(...markdownDateien(pfad));
    else if (eintrag.endsWith(".md")) out.push(pfad);
  }
  return out;
}

function main(): void {
  const dateien = markdownDateien(WURZEL);
  if (dateien.length < 5) {
    // Fail-open-Sperre, wie bei der RLS- und der Kontrastprüfung: Eine leere
    // Liste besteht jede Prüfung mühelos.
    fail(`Nur ${dateien.length} Dokumente gefunden. Der Baum wurde nicht gelesen.`);
  }

  const falsch: string[] = [];
  const gefunden = new Set<string>();
  let geprueft = 0;

  // Einmal ermitteln, nicht je Datei.
  const werte = new Map<string, number>(Object.entries(motorZahlen()));
  werte.set("Motortests", testAnzahl("engine"));
  werte.set("Webtests", testAnzahl("web"));
  werte.set("Bauteiltests", testAnzahl("web", "bauteile"));

  const fehlend = BEHAUPTUNGEN.filter((b) => !werte.has(b.name));
  if (fehlend.length > 0) {
    fail(`Für ${fehlend.map((b) => b.name).join(", ")} wurde kein wahrer Wert ermittelt.`);
  }

  for (const pfad of dateien) {
    const kurz = pfad.slice(WURZEL.length + 1).split(sep).join("/");
    const zeilen = readFileSync(pfad, "utf8").split(/\r?\n/);

    zeilen.forEach((zeile, i) => {
      const ausnahme = HISTORISCH.find((h) => kurz.endsWith(h.datei) && zeile.includes(h.enthaelt));
      if (ausnahme !== undefined) {
        gefunden.add(ausnahme.datei + "|" + ausnahme.enthaelt);
        return;
      }

      for (const b of BEHAUPTUNGEN) {
        for (const treffer of zeile.matchAll(b.wendung)) {
          geprueft++;
          const behauptet = Number(treffer[1]);
          const ist = werte.get(b.name)!;
          if (behauptet !== ist) {
            falsch.push(`${kurz}:${i + 1}  »${treffer[0]}« — es sind ${ist}`);
          }
        }
      }

      for (const treffer of zeile.matchAll(UNGEPRUEFBAR)) {
        falsch.push(
          `${kurz}:${i + 1}  »${treffer[0]}« ist nicht prüfbar — »Motortests« oder »Webtests« schreiben`,
        );
      }
    });
  }

  const tot = HISTORISCH.filter((h) => !gefunden.has(h.datei + "|" + h.enthaelt));
  if (tot.length > 0) {
    falsch.push(
      ...tot.map(
        (h) => `Ausnahme für »${h.enthaelt}« in ${h.datei} — die Zeile gibt es nicht mehr`,
      ),
    );
  }

  if (falsch.length > 0) {
    fail(
      `${falsch.length} Stelle(n):\n\n` +
        falsch.map((z) => `  ${z}`).join("\n") +
        `\n\nEine Zahl, die niemand nachzieht, ist eine Behauptung. Entweder sie\n` +
        `stimmt, oder sie steht als Zustand von damals in HISTORISCH — mit\n` +
        `Begründung.`,
    );
  }

  const stand = [...werte].map(([n, w]) => `${w} ${n}`).join(" · ");
  console.log(
    `Jede geprüfte Zahl in ${dateien.length} Dokumenten stimmt: ${geprueft} Behauptungen.\n${stand}\n`,
  );
}

main();
