/**
 * Feuern die Bauteiltests überhaupt?
 *
 * ---------------------------------------------------------------------------
 * EIN TEST, DER NICHT FEHLSCHLAGEN KANN, IST KEIN TEST.
 *
 * Grüne Bauteiltests sagen für sich genommen nichts. Sie sagen erst dann etwas,
 * wenn gezeigt ist, dass sie rot werden, sobald das Bauteil kaputtgeht — und
 * zwar auf genau die Art, gegen die sie wachen sollen.
 *
 * (Ohne Zahl, mit Absicht: `check:docs` liest nur Dokumente, eine Zahl in
 * diesem Kommentar wäre also ungeprüft. Genau so ist »24 Bauteiltests« hier
 * hineingeraten, als es 22 waren.)
 *
 * Dieses Skript nimmt jede Zeile, die einen dokumentierten Datenverlust
 * verhindert, macht sie wirkungslos, lässt die Bauteiltests laufen und stellt
 * die Zeile zurück. Überlebt eine Mutation, ist der zugehörige Test Dekoration.
 *
 * **Es hat sich beim ersten Lauf selbst bewährt.** Eine Prüfung der
 * Gerätetag-Korrektur stand mit `serverToday === Gerätetag` da und konnte
 * deshalb gar nicht fehlschlagen. Aufgefallen ist das nur, weil die Mutation
 * »das Gerät korrigiert nie« lediglich EINE der beiden Prüfungen umriss statt
 * beider. Ohne diesen Lauf wäre sie als grüner Test stehen geblieben.
 *
 * ---------------------------------------------------------------------------
 * ZWEI RICHTUNGEN JE ZUSICHERUNG, WO ES SIE GIBT.
 *
 * »Das Gerät korrigiert nie« und »das Gerät liegt um einen Tag daneben« sind
 * dasselbe Verhalten von beiden Seiten. Nur eine davon zu prüfen liesse Raum
 * für ein Bauteil, das immer korrigiert — und ein Formular, das jemandem unter
 * den Fingern wegspringt, ist kein besserer Fehler als eines, das stehen bleibt.
 *
 * ---------------------------------------------------------------------------
 * NICHT IN CI, aus demselben Grund wie `npm run mutate` im Motor: Ein Wert, der
 * als Tor dient, verleitet dazu, ihn künstlich zu heben. Von Hand laufen
 * lassen, wenn ein Bauteil oder seine Tests sich ändern.
 *
 *   npm run check:ui-mutation --workspace=web
 * ---------------------------------------------------------------------------
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const WEB = resolve(import.meta.dirname, "..");
const VITEST = resolve(WEB, "..", "node_modules/vitest/vitest.mjs");

type Mutation = { name: string; datei: string; von: string; nach: string };

/**
 * Jede Mutation entspricht einem Eintrag in der Fehlerliste der Härtungswoche
 * oder im Kopf des betroffenen Bauteils. Eine, die nicht mehr passt, beendet
 * den Lauf rot — sonst verschwände die Prüfung still.
 */
const MUTATIONEN: Mutation[] = [
  {
    name: "EntryForm: die Meldung wird nie gerendert",
    datei: "src/components/EntryForm.tsx",
    von: "      {message !== null && (",
    nach: "      {false && message !== null && (",
  },
  {
    name: "EntryForm: das Formular startet immer leer",
    datei: "src/components/EntryForm.tsx",
    von: "  if (entry === undefined) return { date, ...BLANK };",
    nach: "  if (entry === undefined || true) return { date, ...BLANK };",
  },
  {
    name: "EntryForm: kein catch um die Server-Aktion",
    datei: "src/components/EntryForm.tsx",
    von: '          } catch {\n            setState("failed");\n            return;\n          }',
    nach: "          } catch {\n            return;\n          }",
  },
  {
    name: "EntryForm: die Offline-Sperre fehlt",
    datei: "src/components/EntryForm.tsx",
    von: '        if (typeof navigator !== "undefined" && navigator.onLine === false) {',
    nach: "        if (false) {",
  },
  {
    name: "EntryForm: das Geraet korrigiert den Servertag NIE",
    datei: "src/components/EntryForm.tsx",
    von: "    if (actual !== serverToday) {",
    nach: "    if (false) {",
  },
  {
    name: "EntryForm: das Geraet liegt um einen Tag daneben",
    datei: "src/components/EntryForm.tsx",
    von: "pad(now.getDate())}`;",
    nach: "pad(now.getDate() + 1)}`;",
  },
  {
    name: "SignInForm: die beiden Fehlschlaege sind vertauscht",
    datei: "src/components/SignInForm.tsx",
    von: '{state === "invalid-email" ? strings.invalidEmail : strings.sendFailed}',
    nach: '{state === "invalid-email" ? strings.sendFailed : strings.invalidEmail}',
  },
  {
    name: "SignInForm: der Hinweis haengt nicht am Feld",
    datei: "src/components/SignInForm.tsx",
    von: '        aria-describedby={state === "idle" ? undefined : "signin-problem"}',
    nach: "        aria-describedby={undefined}",
  },
  {
    name: "ReportView: nicht genug beurteilt sieht aus wie eine Entwarnung",
    datei: "src/components/ReportView.tsx",
    von: 'return { text: s.stateInsufficient, tone: "var(--unjudged)", unjudged: true };',
    nach: 'return { text: s.stateGreen, tone: "var(--green)", unjudged: false };',
  },
  {
    name: "ReportView: die Farbe stimmt, das Wort nicht mehr",
    datei: "src/components/ReportView.tsx",
    von: 'return { text: s.stateInsufficient, tone: "var(--unjudged)", unjudged: true };',
    nach: 'return { text: s.stateGreen, tone: "var(--unjudged)", unjudged: true };',
  },
  {
    name: "ReportView: Gruende ohne Regel werden nicht gezeigt",
    datei: "src/components/ReportView.tsx",
    von: "const weitereGruende = unnamedBlocking(run.overall, run.pending);",
    nach: "const weitereGruende: never[] = [];",
  },
  {
    name: "ReportView: nicht lesbare Befunde verschwinden still",
    datei: "src/components/ReportView.tsx",
    von: "{run.unreadableFlags > 0 && (",
    nach: "{false && run.unreadableFlags > 0 && (",
  },
  {
    name: "ReportView: zurueckliegende Befunde werden weggeworfen",
    datei: "src/components/ReportView.tsx",
    von: "{frueher.length > 0 && (",
    nach: "{false && frueher.length > 0 && (",
  },
  {
    // -----------------------------------------------------------------------
    // HIER STAND EINE GLEICHWERTIGE MUTATION, UND SIE WAR NICHT ZU FANGEN.
    //
    // »Zeige AKTUELLE Befunde nur, wenn beurteilt wurde« änderte nichts — nicht,
    // weil ein Test fehlte, sondern weil der Zustand unmöglich ist:
    // `evaluateEpisode` schliesst kurz, `if (worst !== "green") return judged`
    // steht VOR dem Abdeckungstor. Wo `insufficient` steht, gibt es keinen
    // aktuellen nicht-grünen Befund, den man verstecken könnte.
    //
    // Eine Mutation, die dasselbe Programm ergibt, ist kein offener Wächter,
    // sondern eine falsche Frage. Entfernt, statt sie mit einem Test zu
    // erschlagen, den es nicht geben kann.
    //
    // Für ZURÜCKLIEGENDE Befunde gilt das nicht: `worst` wird nur über die
    // aktuellen gebildet, ein roter Tag von vor fünf Wochen hält `insufficient`
    // nicht auf. Genau dort kann die Ansicht die Asymmetrie umdrehen — und
    // genau das prüft die Mutation hier.
    // -----------------------------------------------------------------------
    name: "ReportView: zurueckliegende Befunde haengen an der Abdeckung",
    datei: "src/components/ReportView.tsx",
    von: '  const frueher = run.flags.filter((f) => f.severity !== "green" && !aktuell.has(f));',
    nach:
      "  const frueher = run.flags.filter(\n" +
      '    (f) => run.overall.status === "judged" && f.severity !== "green" && !aktuell.has(f),\n' +
      "  );",
  },
  {
    name: "ReportView: der Zustand hat keine eigene Form mehr",
    datei: "src/components/ReportView.tsx",
    von: "border: \"1px dashed var(--unjudged)\",",
    nach: "border: \"none\",",
  },
  {
    name: "ReportView: jeder Zustand bekommt den Rahmen",
    datei: "src/components/ReportView.tsx",
    von: "            zustand.unjudged\n              ? {",
    nach: "            true\n              ? {",
  },
  {
    // Der Disclaimer wird nur bei einem Befund gezeigt. Genau die Ansicht, in
    // der die App am wenigsten weiss, stünde dann ohne die Zweckbestimmung da.
    // `check:boundary` sieht das nicht — der Import bliebe stehen.
    name: "ReportView: der Disclaimer haengt an einem Befund",
    datei: "src/components/ReportView.tsx",
    von: "        {DISCLAIMER[locale]}",
    nach: "        {run.flags.length > 0 ? DISCLAIMER[locale] : \"\"}",
  },
  {
    name: "ReportView: die Warnzeichen werden nicht gezeigt",
    datei: "src/components/ReportView.tsx",
    von: "      {redFlags.length > 0 && (",
    nach: "      {false && redFlags.length > 0 && (",
  },
  {
    name: "ReportView: Eingabefehler werden verschluckt",
    datei: "src/components/ReportView.tsx",
    von: "      {run.problems.length > 0 && (",
    nach: "      {false && run.problems.length > 0 && (",
  },
  {
    name: "ArchiveButton: ein Fehlschlag wird nicht gemerkt",
    datei: "src/components/ArchiveButton.tsx",
    von: "              if (!result.ok) setFailed(true);",
    nach: "              if (false) setFailed(true);",
  },
];

type Bericht = {
  testResults?: {
    status?: string;
    assertionResults?: { status?: string; title?: string }[];
  }[];
};

function lauf(): Bericht | null {
  let out: string;
  try {
    out = execFileSync(process.execPath, [VITEST, "run", "--project=bauteile", "--reporter=json"], {
      cwd: WEB,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (fehler: unknown) {
    out = String((fehler as { stdout?: string }).stdout ?? "");
  }
  const i = out.indexOf("{");
  if (i < 0) return null;
  try {
    return JSON.parse(out.slice(i)) as Bericht;
  } catch {
    return null;
  }
}

type Zeile = { name: string; ergebnis: string; welche: string; offen: boolean };
const zeilen: Zeile[] = [];

for (const m of MUTATIONEN) {
  const pfad = join(WEB, m.datei);
  const original = readFileSync(pfad, "utf8");

  if (!original.includes(m.von)) {
    zeilen.push({ name: m.name, ergebnis: "NICHT ANWENDBAR", welche: "", offen: true });
    continue;
  }

  writeFileSync(pfad, original.replace(m.von, m.nach));
  let bericht: Bericht | null;
  try {
    bericht = lauf();
  } finally {
    // Immer zurückstellen. Ein abgebrochener Lauf, der eine mutierte Datei
    // zurücklässt, ist schlimmer als gar keine Prüfung.
    writeFileSync(pfad, original);
  }

  if (bericht === null) {
    zeilen.push({ name: m.name, ergebnis: "KEIN BERICHT", welche: "", offen: true });
    continue;
  }

  const rot: string[] = [];
  let dateiFehler = 0;
  for (const datei of bericht.testResults ?? []) {
    const treffer = (datei.assertionResults ?? []).filter((t) => t.status === "failed");
    rot.push(...treffer.map((t) => t.title ?? "(ohne Titel)"));
    // Eine Datei, die gar nicht erst lädt, hat KEINE Zusicherungen. Ohne diese
    // Zeile zählte ein Syntaxfehler in der Mutation als »überlebt« — genau der
    // Fehlschluss, den dieses Skript aufdecken soll. Beim Bauen passiert.
    if (datei.status === "failed" && treffer.length === 0) dateiFehler += 1;
  }

  const gefangen = rot.length + dateiFehler;
  zeilen.push({
    name: m.name,
    ergebnis: gefangen === 0 ? "UEBERLEBT" : `${gefangen} rot`,
    welche:
      dateiFehler > 0
        ? `${dateiFehler} Datei(en) luden nicht — die Mutation selbst ist unsauber`
        : rot.join(" | "),
    offen: gefangen === 0,
  });
}

console.log("");
for (const z of zeilen) {
  console.log(`${z.ergebnis.padEnd(15)} ${z.name}`);
  if (z.welche !== "") console.log(`                ${z.welche}`);
}

const offen = zeilen.filter((z) => z.offen);
console.log(`\n${zeilen.length - offen.length} von ${zeilen.length} Mutationen wurden gefangen.`);

// Fail-closed, und das ist keine Formsache. »NICHT ANWENDBAR« heisst, dass die
// mutierte Zeile es nicht mehr gibt — der Test dahinter ist dann ungeprüft.
// Eine Ausgabe, die niemand liest, ist keine Prüfung; dieselbe Regel wie
// überall hier.
if (offen.length > 0) {
  console.error(
    `\n${offen.length} Mutation(en) ohne Befund.\n\n` +
      `Entweder fehlt der Test dahinter, oder die mutierte Zeile ist umgeschrieben\n` +
      `worden und die Mutation greift ins Leere. Beides heisst: Hier wacht nichts.\n`,
  );
  process.exitCode = 1;
}
