/**
 * Feuern die Tests überhaupt?
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
 * verhindert, macht sie wirkungslos, lässt die GANZE Suite laufen und stellt
 * die Zeile zurück. Überlebt eine Mutation, ist der zugehörige Test Dekoration.
 *
 * ---------------------------------------------------------------------------
 * ES LIEF EINMAL NUR ÜBER DIE BAUTEILTESTS, UND DAS WAR EINE HALBE PRÜFUNG.
 *
 * `--project=bauteile` deckte 66 Tests ab und liess 118 aus — darunter die
 * Schreibreihenfolge, gegen die eine stille Entwarnung steht, die Rückabbildung
 * der Datenbankzeilen und die Auflösung des Profilschlüssels. Ein Wächter, der
 * die Hälfte der Suite nicht anschaut, sagt über sie nichts, und die Zahl am
 * Ende las sich trotzdem wie volle Deckung.
 *
 * Aufgefallen bei der Abnahme der zweiten Woche.
 * ---------------------------------------------------------------------------
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
    name: "ReportView: der Beweis unter dem Satz faellt weg",
    datei: "src/components/ReportView.tsx",
    von: "        {evidenceText(flag, config, locale)}",
    nach: '        {""}',
  },
  {
    // Der Beleg rechnet gegen ANDERE Schwellen als die, unter denen geurteilt
    // wurde. Genau dafür trägt jede Auswertung ihre eigene `config` mit sich;
    // ohne sie erklärt der Bericht ein Urteil mit Zahlen, nach denen es nie
    // gefällt wurde.
    //
    // Mutiert wird die Übergabestelle, nicht das Bauteil: Ein `DEFAULT_CONFIG`
    // im Bauteil bräuchte einen Import, den dort niemand benutzt — und ein
    // ungenutzter Export ist in diesem Projekt eine eigene Fehlerfamilie.
    name: "ReportView: der Beweis rechnet gegen fremde Schwellen",
    datei: "src/components/ReportView.tsx",
    von: "config={run.config}",
    nach: "config={{ ...run.config, stagnation: { ...run.config.stagnation, windowDays: 999 } }}",
  },
  {
    name: "ReportView: die Zahlen stehen in englischer Schreibweise",
    datei: "src/components/ReportView.tsx",
    von: "        {evidenceText(flag, config, locale)}",
    nach: '        {evidenceText(flag, config, "en")}',
  },
  {
    // Die Asymmetrie umgedreht: Ermutigung vor Warnung. Damit stünde »seit
    // sechs Wochen besser« an der Stelle, an der »gestern deutlich stärker als
    // sonst« stehen müsste.
    name: "MainVerdict: Genesung verdraengt den Befund",
    datei: "src/components/MainVerdict.tsx",
    von: "  const befunde = aktuell.filter((f) => f.severity !== \"green\");",
    nach: "  const befunde = aktuell.filter((f) => f.severity !== \"green\" && false);",
  },
  {
    // Jedes unauffällige Urteil zählt als Genesung. Dann käme die
    // Genesungszeile fast täglich, und aus einem ruhigen Tag würde eine
    // Behauptung über den Verlauf — genau das, was E8 verbietet.
    name: "MainVerdict: jedes gruene Urteil gilt als Genesung",
    datei: "src/components/MainVerdict.tsx",
    von: "  const genesung = aktuell.filter((f) => isRecovery(f.reason));",
    nach: '  const genesung = aktuell.filter((f) => f.severity === "green");',
  },
  {
    name: "MainVerdict: der Spiegel bekommt eine Urteilsfarbe",
    datei: "src/components/MainVerdict.tsx",
    von: '<p style={{ ...verdictLine, color: "var(--unjudged)" }}>',
    nach: '<p style={{ ...verdictLine, color: "var(--green)" }}>',
  },
  {
    name: "MainVerdict: der Spiegel deutet die Richtung",
    datei: "src/components/MainVerdict.tsx",
    von: "          {werte.join(\" · \")}",
    nach: "          {werte.join(\" · \")} ↑",
  },
  {
    // Die Linie wird über die Lücke gezogen. Das behauptet, der Wert sei
    // dazwischen gleichmässig gewandert.
    name: "CourseCurve: die Linie ueberbrueckt Luecken",
    datei: "src/components/CourseCurve.tsx",
    von: "    if (p.morning === null) {",
    nach: "    if (false) {",
  },
  {
    name: "CourseCurve: die Markierung sitzt woanders",
    datei: "src/components/CourseCurve.tsx",
    von: "  const markIndex = markDate === null ? -1 : points.findIndex((p) => p.date === markDate);",
    nach: "  const markIndex = markDate === null ? -1 : 0;",
  },
  {
    name: "CourseCurve: die Kurve sagt nicht, was sie zeigt",
    datei: "src/components/CourseCurve.tsx",
    von: "        aria-label={beschreibung}",
    nach: 'aria-label=""',
  },
  {
    // Zurück zur alten Fassung: nur die Tage, ohne den Satz. Damit erfährt
    // jemand, WELCHER Tag nicht gelesen werden konnte, aber nicht WAS daran
    // fehlte — und kann es nicht in Ordnung bringen.
    name: "ReportView: der Eingabefehler sagt nicht, was fehlte",
    datei: "src/components/ReportView.tsx",
    von: "                  {problemText(code, locale)}",
    nach: '                  {""}',
  },
  {
    // Nicht mehr nach Code zusammengefasst: fünf Tage mit demselben Problem
    // ergeben fünfmal denselben Satz.
    name: "ReportView: derselbe Fund steht mehrfach da",
    datei: "src/components/ReportView.tsx",
    von: "            {[...new Set(run.problems.map((p) => p.code))].map((code) => {",
    nach: "            {run.problems.map((p) => p.code).map((code) => {",
  },
  {
    // Die Schreibreihenfolge umgedreht: erst die Auswertung, dann die Flags.
    // Bricht es dazwischen ab, steht eine Auswertung ohne ihre Flags da — und
    // die liest sich als »keine Auffälligkeiten«. Siehe E12.
    name: "verdict-write: erst die Auswertung, dann die Flags",
    datei: "src/lib/db/verdict-write.ts",
    von: "  // --- 1. Die Flags. Eine Anweisung, also eine Transaktion: ganz oder gar nicht.",
    nach: "  await db.from(\"evaluations\").insert(toEvaluationRow(evaluation, laufId, episodeId));",
  },
  {
    // Eine Flag aus einer Fassung, die es nicht mehr gibt, wird übernommen
    // statt gezählt. Sie erscheint dann als Zeile ohne Regelnamen und ohne
    // Urteilssatz — sichtbar, aber unlesbar.
    name: "toStoredRun: unbekannte Flagarten werden uebernommen",
    datei: "src/lib/db/types.ts",
    von: "  if (!FLAG_KINDS.has(row.kind)) return null;",
    nach: "  if (false) return null;",
  },
  {
    // Der Profilschlüssel geht auf dem Weg in den Motor verloren. Dann urteilt
    // er unter dem Standardprofil der Region, und das Ergebnis sieht plausibel
    // aus.
    name: "toEpisodeContext: der Profilschluessel geht verloren",
    datei: "src/lib/db/types.ts",
    von: "    profileKey: row.profile_key ?? undefined,",
    nach: "    profileKey: undefined,",
  },
  {
    // Der Vergleich kippt: Ein aktueller Lauf gilt als zurückliegend und
    // umgekehrt.
    name: "runIsBehind: der Vergleich zeigt in die falsche Richtung",
    datei: "src/lib/run-freshness.ts",
    von: "  return compareDates(newestEntry, run.lastDate) > 0;",
    nach: "  return compareDates(newestEntry, run.lastDate) < 0;",
  },
  {
    name: "runIsBehind: ein Lauf ueber ein leeres Tagebuch gilt als aktuell",
    datei: "src/lib/run-freshness.ts",
    von: "  if (run.lastDate === null) return true;",
    nach: "  if (run.lastDate === null) return false;",
  },
  {
    name: "MainVerdict: der Hinweis auf den Stand des Laufs faellt weg",
    datei: "src/components/RunBehindNotice.tsx",
    von: "  if (!active) return null;",
    nach: "  return null;",
  },
  {
    name: "ArchiveButton: ein Fehlschlag wird nicht gemerkt",
    datei: "src/components/ArchiveButton.tsx",
    von: "              if (!result.ok) setFailed(true);",
    nach: "              if (false) setFailed(true);",
  },

  // -------------------------------------------------------------------------
  // Karte 3.1 — der Seitenvergleich.
  //
  // Diese Mutationen sind die schärfsten der ganzen Liste, weil ihr Schaden
  // unsichtbar ist. Eine falsch erfasste Messung erzeugt ein Verhältnis, das
  // Verhältnis ein Urteil, und das Urteil steht dann in derselben Schrift auf
  // demselben Bildschirm wie ein zutreffendes.
  // -------------------------------------------------------------------------
  {
    // Der teuerste denkbare Fehler dieses Formulars: Ein leeres Feld wird zu
    // einer 0. `Number("")` ist 0, und 0 ist auf der verletzten Seite eine
    // gültige, sehr deutliche Messung — die nicht gemachte Messung würde also
    // als die schlechtestmögliche gespeichert.
    name: "SelfTestForm: ein leeres Feld wird zur Null statt zu null",
    datei: "src/components/SelfTestForm.tsx",
    von: '  if (sauber === "") return null;',
    nach: '  if (sauber === "") return 0;',
  },
  {
    // Die Gegenrichtung: Eine getippte 0 kommt als »fehlt« an. Tag eins einer
    // Reha liesse sich dann nicht erfassen.
    name: "SelfTestForm: eine getippte Null gilt als leeres Feld",
    datei: "src/components/SelfTestForm.tsx",
    von: "  return Number.isFinite(n) ? n : Number.NaN;",
    nach: "  return Number.isFinite(n) && n !== 0 ? n : null;",
  },
  {
    name: "SelfTestForm: das Komma wird nicht zum Punkt",
    datei: "src/components/SelfTestForm.tsx",
    von: '  const sauber = text.trim().replace(",", ".");',
    nach: "  const sauber = text.trim();",
  },
  {
    // Das Formular bietet jede Testart an, egal was das Profil führt. Bei einer
    // Schulter stünde dann ein Wadenheber zur Wahl.
    name: "SelfTestForm: die Auswahl ignoriert das Profil",
    datei: "src/components/SelfTestForm.tsx",
    von: "            {tests.map((t) => (",
    nach: '            {(["calf_raise", "single_hop", "rom"] as TestType[]).map((t) => (',
  },
  {
    // Das Vorladen bleibt stehen, wenn Art oder Tag woandershin zeigen: Die
    // Wiederholungszahl des Fersenhebers würde als Sprungweite gespeichert.
    name: "SelfTestForm: der Entwurf wird beim Wechsel nicht geraeumt",
    datei: "src/components/SelfTestForm.tsx",
    von: "      vorhanden === undefined\n        ? LEER",
    nach: "      vorhanden === undefined\n        ? draft",
  },
  {
    // Ohne diesen Satz ersetzt das Speichern eine vorhandene Messung
    // stillschweigend — derselbe Fehler, der beim Tageseintrag eine erfasste
    // Einheit gekostet hat, gemeldet als »Gespeichert.«
    name: "SelfTestForm: der Hinweis aufs Ersetzen faellt weg",
    datei: "src/components/SelfTestForm.tsx",
    von: "        {vorhanden !== undefined && (",
    nach: "        {false && (",
  },
  {
    // Die Einheit verschwindet. »14 / 21« neben »96 / 122« liest sich dann als
    // dieselbe Messung mit anderen Zahlen.
    name: "SelfTestForm: die Einheit steht nicht am Feld",
    datei: "src/components/SelfTestForm.tsx",
    von: '        <span style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>{einheit}</span>',
    nach: "        <span />",
  },
  {
    // Die halbe Paarung wird ergänzt statt verworfen. Es gibt keinen Wert, mit
    // dem sich eine fehlende Seite füllen liesse, der nicht erfunden wäre.
    name: "validateSelfTest: eine halbe Paarung geht durch",
    datei: "src/lib/selftest-validation.ts",
    von: '  if (input.involved === null || input.uninvolved === null) return "half-pairing";',
    nach: '  if (input.involved === null && input.uninvolved === null) return "half-pairing";',
  },
  {
    // Null auf der GESUNDEN Seite wird angenommen — sie ist der Divisor.
    name: "validateSelfTest: die Bezugsseite darf null sein",
    datei: "src/lib/selftest-validation.ts",
    von: '  if (input.uninvolved === 0) return "reference-side-zero";',
    nach: '  if (false) return "reference-side-zero";',
  },
  {
    // Und die Gegenrichtung: Null auf der VERLETZTEN Seite wird abgewiesen.
    // Genau dieser Fehler stand einmal im Schema und wies die
    // aussagekräftigste Messung überhaupt ab.
    name: "validateSelfTest: null auf der verletzten Seite gilt als Fehler",
    datei: "src/lib/selftest-validation.ts",
    von: "  if (!Number.isFinite(n) || n < 0) return false;",
    nach: "  if (!Number.isFinite(n) || n <= 0) return false;",
  },
  {
    // Eine Testart, die das Profil nicht führt, wird angenommen. Die Messung
    // läge dann in der Datenbank und ginge in kein Urteil ein — erfasst und
    // stumm, ohne dass jemand das erkennen könnte.
    name: "validateSelfTest: das Profil begrenzt die Testarten nicht",
    datei: "src/lib/selftest-validation.ts",
    von: '  if (!erlaubteTests.includes(type)) return "test-not-in-profile";',
    nach: '  if (false) return "test-not-in-profile";',
  },
  {
    name: "validateSelfTest: eine halbe Wiederholung geht durch",
    datei: "src/lib/selftest-validation.ts",
    von: "  reps: 0,\n  cm: 1,",
    nach: "  reps: 1,\n  cm: 1,",
  },
  {
    // Die Aktion nimmt die erlaubten Tests aus dem Aufruf statt aus der
    // Episode. Ein Aufruf von aussen könnte sich dann selbst erlauben, was er
    // will — und eine Server-Aktion ist ein öffentlicher Endpunkt.
    name: "saveSelfTestAction: die Pruefung laeuft gegen alles statt gegens Profil",
    datei: "src/app/actions/self-tests.ts",
    von: "  const problem = validateSelfTest(input, profile.tests, utcToday());",
    nach: '  const problem = validateSelfTest(input, ["calf_raise", "single_hop", "rom"], utcToday());',
  },
  {
    // Nach einer Messung wird nicht neu gerechnet. Die erste Messung des Lebens
    // stünde in der Datenbank, und der Bildschirm sagte weiter »noch nicht
    // genug beurteilt« — mit dem Wort, das sie gerade widerlegt hat.
    name: "saveSelfTestAction: nach der Messung wird nicht neu gerechnet",
    datei: "src/app/actions/self-tests.ts",
    von: "    await evaluateAndStore(episodeId);",
    nach: "    await Promise.resolve();",
  },
  {
    // Die Selbsttests kommen unsortiert. Bei zwei Messungen am selben Tag
    // entscheidet dann die Reihenfolge der Abfrage, also nichts.
    name: "verdicts: die Selbsttests kommen unsortiert",
    datei: "src/lib/db/verdicts.ts",
    von: '      .order("test_date", { ascending: true })',
    nach: "",
  },

  // -------------------------------------------------------------------------
  // Karte 3.2 — eigene Masse.
  //
  // Zwei stille Fehler, und beide ergeben einen Verlauf, der plausibel
  // aussieht und nichts bedeutet: dieselbe Zahl in zwei Einheiten, dasselbe
  // Mass in zwei Schreibweisen.
  // -------------------------------------------------------------------------
  {
    // Der Fehler, den die Karte beim Namen nennt: 30 Minuten gegen 30 Sekunden.
    name: "validateMeasurement: die Einheit friert nicht ein",
    datei: "src/lib/measurement-validation.ts",
    von: '  if (vorhanden !== undefined && vorhanden.unit !== unit) return "unit-conflict";',
    nach: '  if (false) return "unit-conflict";',
  },
  {
    // Verglichen wird mit Rücksicht auf Schreibweise. Dann liesse sich die
    // eingefrorene Einheit mit einem grossen K umgehen, und es stünden zwei
    // Reihen da, wo eine gemeint war.
    name: "measureKeyId: die Schreibweise zaehlt wieder",
    datei: "src/lib/measurement-validation.ts",
    von: "  return key.trim().toLowerCase();",
    nach: "  return key.trim();",
  },
  {
    // Ein leerer Name kommt durch. Das zweite »   « träfe dann auf den Index
    // aus 0010 — mit einer Meldung über Eindeutigkeit statt über ein leeres
    // Feld.
    name: "validateMeasurement: ein leerer Name geht durch",
    datei: "src/lib/measurement-validation.ts",
    von: '  if (name === "") return "key-missing";',
    nach: '  if (false) return "key-missing";',
  },
  {
    // Ein leeres Feld wird zur Null statt zu null — dieselbe Falle wie beim
    // Seitenvergleich, und hier heisst sie »null Kniebeugen geschafft«.
    name: "MeasurementForm: ein leeres Feld wird zur Null",
    datei: "src/components/MeasurementForm.tsx",
    von: '  if (sauber === "") return null;',
    nach: '  if (sauber === "") return 0;',
  },
  {
    // Die eingefrorene Einheit wird nicht nachgezogen: Das Formular schickt
    // die zuletzt gewählte, und die Aktion lehnt ab, ohne dass jemand
    // verstünde warum.
    name: "MeasurementForm: die eingefrorene Einheit wird nicht uebernommen",
    datei: "src/components/MeasurementForm.tsx",
    von: "    if (eingefroren !== undefined) setDraft((d) => ({ ...d, unit: eingefroren.unit }));",
    nach: "    if (false) setDraft((d) => d);",
  },
  {
    // Das Formular vergleicht Namen mit Rücksicht auf Schreibweise. Dann bliebe
    // die Auswahl offen, wo sie gesperrt gehoert.
    name: "MeasurementForm: der Namensvergleich achtet auf Grossschreibung",
    datei: "src/components/MeasurementForm.tsx",
    von: "  const eingefroren = known.find((k) => measureKeyId(k.key) === measureKeyId(draft.key));",
    nach: "  const eingefroren = known.find((k) => k.key === draft.key);",
  },
  {
    // Die Vorschlagsliste zeigt etwas, das die App erfunden hat. Genau das,
    // was `MeasureKey` im Motor ausdrücklich verhindern soll.
    name: "MeasurementForm: die App schlaegt selbst Masse vor",
    datei: "src/components/MeasurementForm.tsx",
    von: "            {known.map((k) => (",
    nach: '            {[...known, { key: "Kniebeugen", unit: "reps" as Unit }].map((k) => (',
  },
  {
    // Die Schreibschicht weicht still auf die eingefrorene Einheit aus, statt
    // zu werfen. Wer 30 Sekunden eintippt, bekommt 30 Minuten gespeichert.
    name: "saveMeasurement: der Einheitenkonflikt wird stillschweigend umgedeutet",
    datei: "src/lib/db/measurements.ts",
    von: "      throw new UnitConflictError(treffer.key, treffer.unit, input.unit);",
    nach: "      keyId = treffer.id;",
  },
  {
    // Die Aktion nimmt die bekannten Masse aus dem Aufruf statt aus der
    // Datenbank — dann kann sich ein Aufruf von aussen jede Einheit erlauben.
    name: "saveMeasurementAction: die bekannten Masse kommen nicht aus der Datenbank",
    datei: "src/app/actions/measurements.ts",
    von: "  const problem = validateMeasurement(input, bekannt, utcToday());",
    nach: "  const problem = validateMeasurement(input, [], utcToday());",
  },
  {
    // Ein Konflikt aus der Schreibschicht wird zu »konnte nicht gespeichert
    // werden«. Ein zweiter Versuch ergäbe dasselbe, und niemand wüsste warum.
    name: "saveMeasurementAction: der Konflikt kommt als Fehlschlag an",
    datei: "src/app/actions/measurements.ts",
    von: '    if (fehler instanceof UnitConflictError) return { ok: false, reason: "unit-conflict" };',
    nach: "",
  },
  {
    // Der Name geht ungetrimmt in die Datenbank. Zwei Masse, die sich auf dem
    // Bildschirm nicht unterscheiden lassen.
    name: "saveMeasurementAction: der Name wird nicht beschnitten",
    datei: "src/app/actions/measurements.ts",
    von: "      key: input.key.trim(),",
    nach: "      key: input.key,",
  },
  {
    // Die eigenen Masse erreichen den Motor nicht — genau die Lücke, die 3.2
    // geschlossen hat.
    name: "verdicts: die eigenen Masse gehen nicht in den Motor",
    datei: "src/lib/db/verdicts.ts",
    von: "    measurements,\n    context,",
    nach: "    measurements: [],\n    context,",
  },

  // -------------------------------------------------------------------------
  // Karte 3.3 — den Seitenvergleich anzeigen.
  //
  // Die erste Mutation hier ist die Karte selbst: `reference-eroding` ist im
  // Motor gebaut, hat drei Szenarien in der Erwartungsdatei — und wäre umsonst
  // gebaut, wenn der Satz den Bildschirm nicht erreicht.
  // -------------------------------------------------------------------------
  {
    name: "SideComparison: der Befund erreicht den Bildschirm nicht",
    datei: "src/components/SideComparison.tsx",
    von: "            {flag !== undefined && (",
    nach: "            {false && (",
  },
  {
    // Der Befund einer Testart steht über der Tabelle einer anderen — ein
    // Urteil über Messungen, die es nie gesehen hat.
    name: "SideComparison: der Befund wird seiner Testart nicht zugeordnet",
    datei: "src/components/SideComparison.tsx",
    von: '          (f) => f.kind === "asymmetry" && (f.detail as { type?: TestType }).type === art,',
    nach: '          (f) => f.kind === "asymmetry",',
  },
  {
    // Die gesunde Seite verschwindet. Dann steht nur noch das Verhältnis da,
    // und eine erodierende Referenz ist an den Zahlen nicht mehr zu sehen.
    name: "SideComparison: die gesunde Seite faellt aus der Tabelle",
    datei: "src/components/SideComparison.tsx",
    von: '                      <td style={{ padding: "0.3rem 0.6rem 0.3rem 0" }}>{z.uninvolved}</td>',
    nach: "",
  },
  {
    // Eine Bezugsseite von null ergibt »0 %« statt eines Gedankenstrichs —
    // eine Prozentzahl für eine Messung, die es nicht gibt.
    name: "SideComparison: eine fehlende Bezugsseite wird zu null Prozent",
    datei: "src/components/SideComparison.tsx",
    von: "      index: t.uninvolved > 0 ? Math.round((t.involved / t.uninvolved) * 100) : null,",
    nach: "      index: Math.round((t.involved / (t.uninvolved || 1)) * 100),",
  },
  {
    // Der Vorbehalt zum Selbstvergleich fällt weg. Dann stehen absolute Zahlen
    // ohne den Satz da, der erklärt, warum es keinen Normwert gibt.
    name: "SideComparison: der Vorbehalt zum Selbstvergleich faellt weg",
    datei: "src/components/SideComparison.tsx",
    von: "        {SELF_COMPARISON[locale]}",
    nach: "        {null}",
  },
  {
    // Die Ansicht zeigt eine leere Tabelle, statt zu schweigen.
    name: "SideComparison: eine leere Ansicht wird trotzdem gerendert",
    datei: "src/components/SideComparison.tsx",
    von: "  if (tests.length === 0) return null;",
    nach: "  if (false) return null;",
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
    // BEIDE Projekte, seit der Abnahme von Woche 2.
    //
    // Hier stand `--project=bauteile`. Damit waren die 66 Bauteiltests geprüft und
    // die 118 reinen nicht — darunter die Schreibreihenfolge, gegen die eine
    // stille Entwarnung steht, und die Rückabbildung der Zeilen. Ein Wächter,
    // der die Hälfte der Suite nicht anschaut, sagt über sie nichts.
    out = execFileSync(process.execPath, [VITEST, "run", "--reporter=json"], {
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

// ---------------------------------------------------------------------------
// ZUERST: IST DIE SUITE ÜBERHAUPT GRÜN?
//
// Ohne diese Zeilen zählt ein Test, der schon VOR der Mutation rot ist, als
// »gefangen« — und zwar bei jeder einzelnen Mutation. Der Lauf meldet dann
// »23 von 23« und hat in Wahrheit nichts geprüft.
//
// Beobachtet, nicht ausgedacht: Beim Bau der Belegzeilen war eine Zusicherung
// falsch, die Suite rot, und dieses Skript meldete trotzdem volle Deckung.
// ---------------------------------------------------------------------------
const grundlage = lauf();
if (grundlage === null) {
  console.error("\nKein Bericht vom unmutierten Lauf. Die Suite kommt nicht durch.\n");
  process.exit(1);
}
const schonRot = (grundlage.testResults ?? []).flatMap((d) =>
  (d.assertionResults ?? []).filter((t) => t.status === "failed").map((t) => t.title ?? "(ohne Titel)"),
);
if (schonRot.length > 0) {
  console.error(
    `\n${schonRot.length} Test(s) sind schon ohne Mutation rot:\n\n` +
      schonRot.map((t) => `  ${t}`).join("\n") +
      `\n\nEin roter Test zählt bei JEDER Mutation als »gefangen«. Erst grün machen,\n` +
      `sonst misst dieser Lauf nichts.\n`,
  );
  process.exit(1);
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
