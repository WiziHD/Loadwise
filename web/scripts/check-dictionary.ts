/**
 * Jeder Satz im Wörterbuch muss irgendwo auf einem Bildschirm landen.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS EINE EIGENE PRÜFUNG BRAUCHT.
 *
 * Ein Wörterbucheintrag, der nie gezeigt wird, schlägt nirgends fehl. Er steht
 * in zwei Sprachen da, wird bei jeder Übersetzungsrunde mitgepflegt, taucht in
 * jeder Durchsicht auf — und ist ein Versprechen, das die App nicht einlöst.
 * Genau dieselbe Familie wie der Zustand, der gesetzt und nie gerendert wird:
 * `errors.notSaved` war geschrieben, übersetzt und unerreichbar, während ein
 * fehlgeschlagenes Speichern aussah wie ein erfolgreiches.
 *
 * ---------------------------------------------------------------------------
 * WARUM NICHT NACH NAMEN GESUCHT WIRD.
 *
 * Der naheliegende Weg — den Schlüsselnamen im Quelltext suchen — ist
 * MESSBAR FALSCH, und zwar in die gefährliche Richtung. Gemessen an dieser
 * Fassung: `actions.delete` galt als benutzt, weil `entries.ts` ein `.delete()`
 * aufruft. `nav.tests` galt als benutzt wegen `profile.tests`. `entry.date`
 * wegen `entry.date` auf dem Motortyp. Die Namenssuche fand 7 tote Einträge,
 * die Typauflösung findet deutlich mehr — eine Prüfung, die beruhigt statt zu
 * prüfen, ist schlimmer als keine.
 *
 * Hier wird deshalb der Typprüfer selbst gefragt: Für jeden
 * Eigenschaftszugriff im Quellbaum wird das Symbol aufgelöst und geschaut, ob
 * seine Deklaration in `dictionary.ts` steht. Symbolgleichheit, nicht
 * Namensgleichheit — `p.researched` auf einem `PickerProfile` und
 * `strings.researched` auf `Strings["episode"]` sind damit unterscheidbar.
 *
 * ---------------------------------------------------------------------------
 * WAS DAS VORAUSSETZT.
 *
 * Dass es genau EINE Deklaration gibt. Solange ein Bauteil seinen eigenen
 * `type Strings = { date: string; ... }` mitbringt, zeigt der Zugriff dorthin
 * und nicht hierher, und die Prüfung meldete jeden Eintrag als tot. Deshalb
 * nehmen die Bauteile ihre Scheibe als `Strings["entry"]` — siehe den Kommentar
 * oben in `dictionary.ts`.
 *
 * ---------------------------------------------------------------------------
 * GEPRÜFT WIRD `src/`, NICHT `test/`.
 *
 * Ein Eintrag, den nur ein Test liest, ist von der App aus gesehen tot. Die
 * Prüfung würde sonst genau das durchgehen lassen, wofür sie gebaut ist.
 * ---------------------------------------------------------------------------
 */

import { readdirSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import ts from "typescript";

const WURZEL = process.cwd();
const WOERTERBUCH = resolve(WURZEL, "src/i18n/dictionary.ts");

function fail(message: string): never {
  console.error(`\nWörterbuchprüfung FEHLGESCHLAGEN\n\n${message}\n`);
  process.exit(1);
}

/** Alle .ts/.tsx unter src/ — der Anwendungscode, nicht die Tests. */
function quelldateien(dir: string): string[] {
  const out: string[] = [];
  for (const eintrag of readdirSync(dir)) {
    const pfad = resolve(dir, eintrag);
    if (statSync(pfad).isDirectory()) out.push(...quelldateien(pfad));
    else if (/\.tsx?$/.test(eintrag)) out.push(pfad);
  }
  return out;
}

/**
 * Die Blätter der `Strings`-Schnittstelle, mit Pfad.
 *
 * `activities: Record<ActivityKind, string>` zählt als EIN Blatt: Die Namen
 * darin kommen aus dem Motor und werden über `activityLabels[kind]` gelesen,
 * also dynamisch. Dass jede Aktivität einen Namen hat, sichert bereits der
 * Typ — dafür braucht es diese Prüfung nicht.
 */
function blaetter(
  typ: ts.Type,
  checker: ts.TypeChecker,
  pfad: string[],
  gesehen: Set<ts.Type>,
): { pfad: string; symbol: ts.Symbol }[] {
  if (gesehen.has(typ)) return [];
  gesehen.add(typ);

  const out: { pfad: string; symbol: ts.Symbol }[] = [];
  for (const prop of checker.getPropertiesOfType(typ)) {
    const deklaration = prop.declarations?.[0];
    if (deklaration === undefined) continue;
    if (resolve(deklaration.getSourceFile().fileName) !== WOERTERBUCH) continue;

    const propTyp = checker.getTypeOfSymbolAtLocation(prop, deklaration);
    const eigene = [...pfad, prop.getName()];

    // Eine verschachtelte Gruppe wird durchlaufen; alles andere ist ein Blatt.
    const istGruppe =
      (propTyp.flags & ts.TypeFlags.Object) !== 0 &&
      checker.getPropertiesOfType(propTyp).some(
        (p) => resolve(p.declarations?.[0]?.getSourceFile().fileName ?? "") === WOERTERBUCH,
      );

    if (istGruppe) out.push(...blaetter(propTyp, checker, eigene, gesehen));
    else out.push({ pfad: eigene.join("."), symbol: prop });
  }
  return out;
}

function main(): void {
  const konfigDatei = ts.findConfigFile(WURZEL, ts.sys.fileExists, "tsconfig.json");
  if (konfigDatei === undefined) fail("Keine tsconfig.json gefunden.");

  const roh = ts.readConfigFile(konfigDatei, ts.sys.readFile);
  const konfig = ts.parseJsonConfigFileContent(roh.config, ts.sys, WURZEL);

  const program = ts.createProgram(konfig.fileNames, konfig.options);
  const checker = program.getTypeChecker();

  const quelle = program.getSourceFile(WOERTERBUCH);
  if (quelle === undefined) fail(`${WOERTERBUCH} ist nicht Teil des Programms.`);

  // Die exportierte `Strings`-Schnittstelle finden.
  const modul = checker.getSymbolAtLocation(quelle);
  const exporte = modul === undefined ? [] : checker.getExportsOfModule(modul);
  const stringsSymbol = exporte.find((s) => s.getName() === "Strings");
  if (stringsSymbol === undefined) {
    fail(
      `dictionary.ts exportiert kein \`Strings\`.\n` +
        `Ohne EINE exportierte Deklaration kann diese Prüfung Zugriffe nicht\n` +
        `zuordnen — siehe den Kommentar oben in dieser Datei.`,
    );
  }

  const stringsTyp = checker.getDeclaredTypeOfSymbol(stringsSymbol);
  const alle = blaetter(stringsTyp, checker, [], new Set());
  if (alle.length === 0) {
    // Fail-open-Sperre. Genau dieser Fehler ist der RLS-Prüfung schon einmal
    // passiert: Die Suche fand nichts, und die Prüfung meldete grün.
    fail(`Kein einziges Blatt in \`Strings\` gefunden. Die Prüfung misst nichts.`);
  }

  // Jedes Symbol, das der Anwendungscode tatsächlich liest.
  const gelesen = new Set<ts.Symbol>();
  const appDateien = new Set(quelldateien(resolve(WURZEL, "src")).map((f) => resolve(f)));

  for (const datei of program.getSourceFiles()) {
    const pfad = resolve(datei.fileName);
    if (pfad === WOERTERBUCH || !appDateien.has(pfad)) continue;

    const besuche = (node: ts.Node): void => {
      if (ts.isIdentifier(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        if (symbol !== undefined) {
          const ziel =
            (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
          gelesen.add(ziel);
        }
      }
      ts.forEachChild(node, besuche);
    };
    besuche(datei);
  }

  const tot = alle.filter((b) => !gelesen.has(b.symbol));

  if (tot.length > 0) {
    fail(
      `${tot.length} Wörterbucheintrag/-einträge werden von keinem Bauteil gelesen:\n\n` +
        tot.map((b) => `  ${b.pfad}`).join("\n") +
        `\n\nJe Eintrag entscheiden: ANZEIGEN oder LÖSCHEN.\n` +
        `Ein dritter Weg — stehen lassen und einen Kommentar danebenschreiben —\n` +
        `ist genau der Zustand, den diese Prüfung beenden soll. Wer den Satz\n` +
        `später braucht, schreibt ihn später, in der Sprache der Seite, für die\n` +
        `er dann gilt.`,
    );
  }

  console.log(
    `Jeder Wörterbucheintrag kommt an: ${alle.length} Einträge, gelesen aus ` +
      `${appDateien.size} Dateien unter src/.\n` +
      `Aufgelöst über den Typprüfer, nicht über Namen — siehe ` +
      `${["scripts", "check-dictionary.ts"].join(sep)}.`,
  );
}

main();
