# Entscheidungen

| | |
|---|---|
| **Stand** | 25. August 2026 |
| **Bezug** | [KONZEPT.md](KONZEPT.md) · [TECHNIK.md](TECHNIK.md) · [PROTOKOLLE.md](PROTOKOLLE.md) · [SICHERHEIT.md](SICHERHEIT.md) |

---

## Wozu dieses Dokument

Ein Kommentar im Code erklärt eine Zeile. Er erklärt **nicht, warum eine Alternative verworfen wurde** — und genau das ist es, was später fehlt.

Was passiert ohne dieses Dokument: Jemand liest `--webpack` in einer Skriptzeile, denkt »das ist doch veraltet«, stellt auf Turbopack um, und der Build bricht an dreissig Importen. Er repariert die dreissig Importe. Damit ist der Motor unter reinem Node nicht mehr lauffähig, eine ganze Nutzungsart ist zu, und niemand hat je bemerkt, dass eine Entscheidung rückgängig gemacht wurde.

Deshalb trägt **jeder Eintrag hier eine Bedingung, unter der man ihn wieder aufmacht.** Eine Entscheidung ohne Ablaufdatum ist ein Dogma; eine mit Bedingung ist ein Werkzeug.

Was hier **nicht** hingehört: was schon woanders begründet ist. Die Regulatorik steht in `PROTOKOLLE.md`, die Sicherheitsabwägungen in `SICHERHEIT.md`, die medizinischen Werte in den Profildokumenten. Dieses Dokument ist für Entscheidungen, die sonst nirgends stehen.

---

## E1 — Webpack statt Turbopack

**Entschieden 24.08.2026** · `web/next.config.ts`, `web/package.json`

Next 16 macht Turbopack zum Standard. Dieses Projekt baut ausdrücklich mit `--webpack`.

### Warum

Der Motor schreibt `import { x } from "./tissue.js"` — die korrekte Form für ES-Module, wo die Endung die Datei meint, die zur **Laufzeit** existiert, nicht die auf der Platte. Node löst das auf. Turbopack hat kein Gegenstück zu `extensionAlias` und wendet Nodes ESM-Regeln wörtlich an: `./tissue.js` heisst eine Datei namens `tissue.js`, und der Build scheitert an jedem internen Import des Motors.

### Die Alternative und warum sie teurer ist

Die Endungen im Motor wegzulassen wäre der kleinere Eingriff — dreissig Zeilen. Aber:

- `tsx`, der Testlauf und `npm run tagebuch` brauchen sie
- ohne sie ist der Motor unter reinem Node nicht mehr lauffähig

Damit wäre eine eigenständige Nutzung — ein Kommandozeilenwerkzeug, ein Berichtsgenerator — für die Bequemlichkeit eines Bündlers geschlossen. Das ist die Quelle der Wahrheit an einen Konsumenten zu beugen.

### Wann man das wieder aufmacht

- **Webpack-Unterstützung wird in Next zurückgezogen.** Dann ist die Frage nicht mehr »welcher Bündler«, sondern »bleibt der Motor portables ESM oder wird er bündlergebunden«. Diese Frage gehört dann neu beantwortet, nicht die alte umgedreht.
- **Turbopack bekommt ein Gegenstück zu `extensionAlias`.** Dann fällt der Grund ersatzlos weg.

---

## E2 — Der Motor behält die `.js`-Endungen

**Entschieden 24.08.2026** · gilt für `engine/src/**`

Die Kehrseite von E1, und der eigentliche Grundsatz: **Portabilität vor Bündler-Bequemlichkeit.**

Der Motor ist das, worauf alles andere sich stützt. Er hat keine Abhängigkeit zu einem Framework, keine zu einer Datenbank, keine zu einer Oberfläche — und soll auch keine zu einem Bündler haben. Was ihn heute unter Node lauffähig hält, hält ihn morgen in einer Umgebung lauffähig, die es noch nicht gibt.

### Wann man das wieder aufmacht

Wenn der Motor als **gebautes Artefakt** ausgeliefert wird statt als Quelle. Dann entscheidet der Build über die Endungen, und die Frage stellt sich nicht mehr. Heute ist genau das ausgeschlossen — aus einem anderen Grund, der ebenso wichtig ist: Zwei Kopien der Regeln, die eine mit 402 Motortests geprüft und die andere ausgeliefert, wären der Tag, an dem sich ein Urteil ändert, ohne dass es jemand entschieden hat.

---

## E3 — Der Zeithorizont wird nicht gerendert

**Entschieden 25.08.2026** (aus dem Meilenstein-Plan übernommen und hier erstmals festgeschrieben) · `engine/src/profiles/types.ts`, Feld `horizon`

Jedes recherchierte Profil trägt den berichteten Zeitverlauf — beim Achillesprofil 12 bis 52 Wochen, 19 % noch nach zehn Jahren. Das Feld ist gefüllt, mit Quelle und Evidenzgrad, und wird **von keiner Oberfläche angezeigt**.

### Warum

»Studien berichten 12 bis 52 Wochen« ist beschreibend. Neben »du bist in Woche 14« gestellt, ist es etwas anderes: eine Einladung, sich selbst einzuordnen — und damit eine Aussage über den Verlauf **dieser** Person, die aus einer Aussage über Studiengruppen nicht folgt.

Der Nutzen ist klein: Die Spannweite ist so breit, dass sie fast nichts ausschliesst. Das Risiko liegt genau auf der Linie, die dieses Projekt sonst überall meidet — der Grenze zwischen Aufzeichnen und Deuten.

Wer nach zwölf Wochen liest, dass »Studien 12 bis 52 Wochen berichten«, liest in aller Regel »ich bin spät dran«. Das ist keine Information, das ist eine Sorge mit Fussnote.

### Wann man das wieder aufmacht

- **Wenn die Zweckbestimmung anwaltlich geprüft ist** (Schritt D im Fahrplan) und die Prüfung diese Art Aussage ausdrücklich abdeckt.
- **Wenn eine Darstellung gefunden ist, die nicht zum Einordnen einlädt.** Das ist eine Gestaltungsfrage und kein Formulierungsproblem — und sie ist nicht gelöst, indem man einen Warnsatz danebenstellt.

Bis dahin bleibt das Feld gefüllt und stumm. Es zu löschen wäre falsch: Die Recherche ist gemacht, und der Wert ist richtig. Nur gezeigt wird er nicht.

---

## E4 — Meilensteine sind keine achte Regel

**Entschieden 25.08.2026** (aus dem Meilenstein-Plan übernommen) · eigener Ausgabekanal `Evaluation.progress`, gebaut in `engine/src/progress.ts`

Ein Meilenstein läuft **nicht** durch `Flag`. Drei Gründe, und der zweite ist der ernste.

### 1. Ein Meilenstein kann nie eine Warnung sein

`Flag` trägt eine `Severity`. Ein Meilenstein wäre immer grün — ein Typ, dessen einer Wert nie vorkommt.

### 2. Ein grünes Flag zählt in die Abdeckung

**Das ist der Grund, der zählt.** Die Abdeckung entscheidet, ob der Motor eine **Entwarnung** geben darf. Ein erreichter Meilenstein würde damit eine Entwarnung freischalten, die er nicht belegt: »Fünfzehn Kniebeugen geschafft« ist keine Aussage darüber, dass die letzten vier Wochen unauffällig waren.

Das verletzt den obersten Grundsatz des Motors — **Abdeckung begrenzt die Entwarnung, nie die Warnung** — und zwar an der empfindlichsten Stelle: Es würde die Entwarnung *leichter* machen, nicht schwerer.

### 3. Die Erreichbarkeitstests verlangen jeden Code in einem Szenario

Jeder `ReasonCode` muss unter jedem Profil in einem Szenario vorkommen. Meilensteine sind **Nutzerdaten**, keine Szenariodaten — sie entstehen, weil jemand sich ein Ziel setzt. Sie in dieselbe Maschinerie zu stecken hiesse, Szenarien zu erfinden, die die Ziele fremder Menschen behaupten.

### Wann man das wieder aufmacht

**Gar nicht in dieser Richtung.** Was neu entschieden werden kann, ist, ob ein Meilenstein *überhaupt* etwas zur Beweislage beiträgt — aber dann über einen eigenen, benannten Weg, nicht dadurch, dass er als Flag durch die Hintertür in die Abdeckung rutscht.

Ein Test hält das fest. Ein Meilenstein hat nie eine `Severity` und zählt nie in die Abdeckung.

**Nachgemessen bei der Abnahme der ersten Woche:** Dieselbe Auswertung mit und ohne gesetztes Ziel liefert eine byteweise identische Abdeckung — `{"judgedDays":25,"blockedDays":7,"responseRatio":0.78125,"rulesReporting":7,"rulesTotal":7}`.

**Und eine Namenswarnung**, weil sie bei genau dieser Messung fast zu einem Fehlbefund geführt hätte: Der Kanal heisst `Evaluation.progress`, nicht `.milestones`. Eingang und Ausgang tragen verschiedene Namen — `input.milestones` geht hinein, `progress.milestones` kommt heraus.

---

## E5 — Löschen kommt erst mit dem Export

**Entschieden 25.08.2026** · `supabase/migrations/0006_episode_edit.sql`, Karte H9

Eine Episode lässt sich **archivieren**, nicht löschen. Endgültiges Löschen gehört zusammen mit dem Datenexport ausgeliefert.

### Warum

Wer Monate der eigenen Aufzeichnung auslöschen kann, bevor er eine Kopie davon mitnehmen kann, hat keinen Knopf, sondern eine Falle. Bei einem Tagebuch, das über neunzig Tage geführt wird, ist der Verlust nicht rückgängig zu machen — und er passiert genau der Person, die aufhören will und dabei nichts falsch machen wollte.

Das Archiv ist der Ersatz, und es hat eine **eigene Seite**: Ein Ort, an dem Dinge verschwinden und den man nicht ansehen kann, ist ein Löschknopf mit anderem Namen.

### Wann man das wieder aufmacht

Sobald der Export steht (Karte 4.2). Dann gehören beide zusammen ausgeliefert — der Export zuerst.

**Was das nicht bedeutet:** Es ist kein Argument gegen ein Recht auf Löschung. Es ist ein Argument über die Reihenfolge.

---

## E6 — Die Prüfungen dürfen nicht nur beruhigen

**Entschieden über die ganze Härtungswoche** · sieben Prüfskripte, alle in CI

Kein neuer Wächter geht in Betrieb, ohne dass gezeigt ist, dass er **anschlägt**.

### Warum

Dieses Projekt hat mehrfach erlebt, wie eine grüne Prüfung nichts bedeutete:

- Die RLS-Prüfung meldete »alle **0** Tabellen abgedeckt« — grün, weil ein kaputter Ausdruck nichts fand
- Die Selbstprüfung in `0002_rls.sql` filterte auf `relrowsecurity` und liess eine Tabelle, bei der RLS nicht griff, aus der Abfrage fallen
- Ein Wächter im Orakel war **leergelaufen**: `baseline-unavailable` steht in 48 von 51 Szenarien, also war die Bedingung für jeden Verlauf erfüllt
- Eine Namenssuche über das Wörterbuch fand 7 tote Einträge; es waren 18

Daraus folgen drei Regeln, die für jede neue Prüfung gelten:

1. **Eine Untergrenze gegen Fail-open.** Findet die Prüfung weniger als bekannt vorhanden ist, ist das ein Fehlschlag und kein Erfolg.
2. **Eine Gegenprobe zu jedem Negativbefund.** Der Service-Role-Schlüssel steht in keiner der 336 Build-Dateien — und der anon key in 26, also funktioniert die Suche.
3. **Ein Beweis, dass sie fehlschlagen kann.** Ein Probeschlüssel im Wörterbuch, eine falsche Zahl in einem Dokument, eine gebrochene Konfiguration im Orakel.

### Wann man das wieder aufmacht

Nicht. Was verhandelbar ist, ist der Aufwand für eine einzelne Prüfung — nicht, ob sie beweisen muss, dass sie etwas prüft.

---

## E7 — Der Hauptbildschirm ist ein Satz mit seinem Beweis

**Entschieden 25.08.2026** · betrifft Karte 2.1 und 2.3

Anlass war eine Sorge, die richtig war: *»Ich sehe einen Motor, der seinen Zweck erfüllt, aber nicht, wie das Nutzer anziehen soll.«*

### Der Befund dahinter

Der Motor produziert bereits Sätze, die kein anderes Produkt sagt. Auf sechzig Tagen echter Achillesdaten, an diesem Tag gemessen:

> Der Wochenumfang ist gegenüber den Vorwochen spürbar gestiegen. Verhältnis 1,45 — **dein Gesamttraining hat sich dabei um Faktor 1,24 verändert; der Unterschied liegt in der Wahl der Aktivität.**

Und:

> Seitenvergleich: **64 % → 73 % → 78 % → 87 %**

Der erste Satz sagt: *Du hast nicht mehr trainiert, du hast anders trainiert — und das ist es, was deine Sehne spürt.* Der zweite ist eine Genesungsgeschichte in vier Zahlen.

**Beides wäre nach der ursprünglichen Planung ein Aufzählungspunkt in einer Liste geworden.** Das war das eigentliche Problem: nicht ein fehlender USP, sondern das Beste des Produkts als Fussnote gestaltet.

### Die Bauform

**Ein Satz, darunter das Bild, das ihn belegt.** Der Befund ist die *Bildunterschrift* der Verlaufskurve, keine Kachel daneben; die Stelle, um die es geht, ist auf der Kurve markiert. Das Auge geht Satz → Markierung → »ah, dort«.

Zwei gleichrangige Kästen nebeneinander wären der Fehler gewesen. Ein Bildschirm, der zwei Dinge sein will, ist meist keines von beiden — sie sind aber nicht zwei Dinge, sondern **ein Ding auf zwei Zeitskalen**: was zuletzt geschah, und wo man über Wochen steht.

### Wenn es nichts zu melden gibt

Dieselbe Zeile trägt dann die Genesung: *»Seit sechs Wochen: 64 % → 87 %.«*

Ein Ort, zwei Inhalte. Damit ist der Bildschirm nie leer und nie doppelt — und die wichtigste Kennzahl des Konzepts (»Sagt jemand: *das wusste ich nicht*?«) bekommt endlich einen Ort, an dem sie entstehen kann.

### Wann man das wieder aufmacht

Wenn sich zeigt, dass die Befunde **zu selten** kommen, um eine Zeile zu tragen. Dann ist die Antwort nicht, Befunde zu erfinden, sondern die Genesungszeile zum Regelfall und den Befund zur Ausnahme zu machen. Die Reihenfolge zu drehen ist zulässig; beides gleichzeitig gross zu zeigen nicht.

---

## E8 — Gamification: die Genesung, nie das Eintragen

**Entschieden 25.08.2026** · gilt für alle künftigen Motivationsmechanismen

Es gibt **keine Punkte, keine Abzeichen, keine Streaks fürs Eintragen** und keine Bestenlisten.

### Warum das hier kein Geschmacksurteil ist, sondern Sicherheit

Ein Streak belohnt **Eintragen**, und das stärkste Belohnungssignal einer Reha-App darf niemals »mach mehr« sein. Ein »7-Tage-Trainings-Streak« bei einer Tendinopathie ist ein Mechanismus, der Menschen kränker macht — er erzeugt Druck, an Tagen zu trainieren, an denen man es nicht sollte.

Der zweite Grund ist Bindung, nicht Sicherheit: Ein Streak bestraft genau den Nutzer, um den es geht. Wer eine Reizung bekommt und vier Tage aussetzt, kommt zurück und findet dreissig Tage zerstört. Das ist der Moment, in dem eine App gelöscht wird — ausgelöst von der Mechanik, die binden sollte.

### Der dritte Grund, der schon dastand

Karte 3.5 verbietet Serien und Punkte bereits, und mit einem schärferen Argument als den beiden oben:

> **Der Motor kann einen weggelassenen schlechten Tag nicht erkennen** — das ist dokumentiert und unlösbar. Eine Serie macht das Weglassen doppelt lohnend.

Das ist der eigentliche Grund. Ein Tagebuch, dessen Belohnung davon abhängt, wie die Reihe aussieht, erzieht dazu, den schlechten Tag nicht einzutragen — und der schlechte Tag ist genau der, um den es geht. Diese Entscheidung hebt das auf die ganze App, statt es bei der Fortschrittsansicht zu belassen.

### Was stattdessen gilt

**Die Reha trägt bereits den stärksten Spielmechanismus, den es gibt: Du wirst besser, und du kannst es nicht fühlen.** Genesung ist von innen flach. Sichtbar gemacht ist sie ein Fortschrittsbalken, den niemand erfinden musste.

Erlaubt ist also alles, was **Genesung sichtbar macht**: die sich schliessende Schere, aufgezeichnete Bestwerte, selbst gesetzte Meilensteine, »drei von fünf erreicht«. Der Massstab gehört dabei dem Nutzer — die App liefert kein klinisches Kriterium (siehe E4 und `MEILENSTEINE.md`).

Verboten ist alles, was **Verhalten belohnt**: Eintragen, Trainieren, Häufigkeit, Vergleich mit anderen.

### Wann man das wieder aufmacht

Für die **erste Woche** ist eine Ausnahme denkbar und im Konzept (Abschnitt 8) bereits angelegt: Ein Tagebuch hat an Tag 1 naturgemäss keinen Wert, und bis die Zeitfenster der Regeln greifen, muss etwas anderes tragen. Ein Fortschrittsbalken, der zeigt, **was nach 7 und nach 14 Tagen freigeschaltet wird**, belohnt nicht das Verhalten, sondern erklärt das Warten. Das ist zulässig — und es ist etwas anderes als ein Streak.

---

## E9 — Verteilung und Prävention bleiben, wie das Konzept sie plant

**Entschieden 25.08.2026** · Gegenvorschläge geprüft und verworfen

Zwei Vorschläge standen zur Wahl und wurden **abgelehnt**. Sie stehen hier, damit die Ablehnung eine Entscheidung bleibt und nicht zu einem Versehen wird.

### Was vorgeschlagen war

**Der Physiotherapeut als zweite Verteilsäule.** Ein Physio sieht 20–40 Patienten pro Woche; zehn Physios wären ein Kanal, der nicht von Suchmaschinen abhängt. Der Physio-Bericht ist als Funktion ohnehin geplant (Karte 4.1) — er wäre nur von einer Funktion zu einer Strategie geworden.

**Prävention als Schalter am Ende einer Episode.** Nicht verkaufen, sondern anbieten: Wer genesen ist, hat 90 Tage eigene Lastdaten und eine funktionierende Ausgangslage im Produkt.

### Warum abgelehnt

Beides hätte den Umfang verbreitert, bevor der Kern steht. Die Reihenfolge des Konzepts — erst muss das Reha-Produkt nachweislich funktionieren — bleibt.

### Die Rechnung, die dabei offen bleibt

Ehrlich benannt, weil sie sonst später überrascht: **Rein organisch, bei einem Bedürfnis, das mit der Genesung endet, ergibt CHF 48–96 pro Nutzer kein Produkt mit Millionen Nutzern.** Es ergibt ein gutes kleines Geschäft.

Das ist kein Widerspruch zur Entscheidung — es ist ihr Preis. Genau zwei Hebel ändern die Grössenordnung, und beide sind hiermit vertagt, nicht verworfen.

### Wann man das wieder aufmacht

- **Physio-Kanal:** sobald der Physio-Bericht steht (Karte 4.1) und einmal einer echten Physiotherapeutin gezeigt wurde. Die Frage ist dann nicht mehr theoretisch.
- **Prävention:** wenn die Bindungszahlen aus Konzept Abschnitt 14 stehen — 20 % mit mindestens 30 Tagen.
- **Beide sofort**, wenn die Suchmaschinen-Gewinnung nach sechs Monaten Inhaltsarbeit nicht trägt. Dann ist die Reihenfolge widerlegt und nicht nur unbequem.

---

## E10 — Die ersten vierzehn Tage: der Spiegel

**Entschieden 25.08.2026** · betrifft Karte 2.1 und 4.4

### Das Loch, um das es geht

Zwei bekannte Befunde ergeben zusammen einen dritten, der schwerer wiegt als beide:

- **Konzept, Abschnitt 8:** »Das grösste Risiko dieses Produkts ist nicht die Technik und nicht der Wettbewerb. Es ist, dass morgen kein zweiter Eintrag kommt.«
- **Karte 4.4:** In den ersten zwei Wochen ist das offensichtlichste Signal — Morgenwerte, die 2 → 4 → 5 → 7 steigen — für den Motor **unsichtbar**. Die 24-Stunden-Regel braucht zehn Einträge in vierzehn Tagen, die Ausgangswerte 28.

Zusammengelesen: **In genau dem Fenster, in dem jemand gehalten oder verloren wird, schweigt die App — und ist gleichzeitig blind für das Einzige, was die Person selbst sieht.** Wer merkt, dass es schlechter wird, während die App nichts sagt, zieht einen naheliegenden Schluss über die App.

Der Hauptbildschirm aus E7 hat in dieser Zeit keinen Satz, den er zeigen könnte.

### Was nicht die Lösung ist

**Eine achte Regel für die Frühphase.** Sie bräuchte eine Schwelle, und für diesen Zeitraum gibt es keine belegte. Das wäre die erste geratene Zahl im Motor — an der empfindlichsten Stelle, mit der dünnsten Datenlage. Genau der Fehler, den dieses Projekt sonst überall vermeidet.

### Was die Lösung ist

**Die App gibt zurück, was sie gesehen hat, ohne es zu deuten.**

> Deine Morgenwerte der letzten fünf Tage: **2 · 4 · 5 · 5 · 7**
>
> Ab zehn Einträgen in vierzehn Tagen kann ich sagen, ob das mit deiner Belastung zusammenhängt.

Das ist keine Auswertung, sondern ein Spiegel. Es fügt der Person keine Information hinzu, die sie nicht hat — sie hat die Zahlen selbst eingetippt. Was es hinzufügt, ist **Aufmerksamkeit**: Die App schaut hin, auch wenn sie noch nichts sagen darf.

### Drei Bedingungen, ohne die es kippt

1. **Keine Deutung, in keiner Form.** Kein »steigend«, kein Pfeil, keine Farbe der Urteile. Ein »↑« wäre eine Behauptung über einen Trend aus fünf Punkten — genau das, was der Motor über eine Regel verweigert. Wer das Zeichen hinzufügt, hat die achte Regel gebaut, nur ohne Test.

2. **Der Satz darunter nennt das ECHTE Hindernis, nicht »bald mehr«.** Der Motor liefert die Blockade-Gründe samt Zahlen bereits: *»Beurteilt: 0 von 5 erwarteten Tagen, 1 von 7 Regeln haben gesprochen.«* Der Fortschrittsbalken zeigt damit, **wie nah die App daran ist, etwas sagen zu können** — nicht, wie fleissig jemand einträgt. Das ist der Unterschied zwischen E10 und einem Streak (E8), und er ist der ganze Punkt.

3. **Der Spiegel tritt zurück, sobald der Motor spricht.** Sonst konkurrieren wieder zwei Dinge um dieselbe Stelle — der Fehler, den E7 vermeidet. Rangfolge auf dem Hauptbildschirm: **Befund → Genesung → Spiegel.**

### Gestaltung

Der Spiegel ist die eine Stelle, an der die App Daten zeigt, **ohne sie zu beurteilen** — und muss sich deshalb sichtbar von einem Urteil unterscheiden. Dafür gibt es bereits eine Farbe: `--unjudged`, angelegt als »die Farbe, die nie nach Grün aussehen darf«. Hier bekommt sie ihren zweiten Einsatz.

### Wann man das wieder aufmacht

Wenn sich an echten Verläufen zeigt, dass der Spiegel **beunruhigt** statt zu binden. Das ist messbar — nicht an einer Zahl, sondern an der Frage aus Konzept Abschnitt 14: Was sagen Leute, wenn man sie fragt. Fällt das Urteil negativ aus, ist die Antwort Bedingung 1 zu verschärfen, nicht den Spiegel abzuschaffen: Zahlen zurückzugeben, die jemand selbst eingetippt hat, kann für sich nicht beunruhigen.

---

## E11 — Zwei Testumgebungen, und die Dateiendung entscheidet

**Entschieden 26.08.2026** · `web/vitest.config.mts`, `web/scripts/run-tests.ts`

`.test.ts` läuft unter node, `.test.tsx` unter jsdom. Zwei Projekte, keine Anmerkung pro Datei.

### Warum nicht einfach jsdom für alles

Das wäre eine Zeile weniger und würde eine Prüfung wegnehmen: **Ein Servermodul, das versehentlich nach `window` oder `document` greift, liefe unter jsdom durch** und bräche erst im Betrieb. Diese App hat genau das schon einmal getroffen — eine Client-Funktion, die der Server rief.

Die reinen Tests brauchen kein Dokument. Was sie prüfen, sind Entscheidungen: welcher Wert zulässig ist, welche Sprache ein Pfad bekommt, welches Profil eine Episode trägt.

### Der Fund, der `run-tests.ts` erzwungen hat

Der erste kalte Lauf mit der zweiten Umgebung sah so aus:

```
Failed to start forks worker for .../umgebung.test.tsx
Caused by: Timeout waiting for worker to respond
Test Files  8 passed (8)   Tests  95 passed (95)   Errors  1 error
EXITCODE=0
```

**Das ganze jsdom-Projekt lief nicht, und der Lauf meldete grün.** In CI wäre das ein Haken bei »App — Tests« mit null Bauteiltests gewesen — und CI hat bei jedem Lauf einen kalten Cache, das ist dort also der Normalfall.

Der Startfehler selbst ist behoben: `pool: "threads"` statt der voreingestellten forks, kalt 4,5 s statt Zeitüberschreitung. Nachgemessen wurde ausserdem die Gegenrichtung — ein **Importfehler** in einer Testdatei beendet den Lauf mit 1. Der Fail-Open betrifft also nur den Pool, nicht das Laden.

Geblieben ist trotzdem die Bauform, und die überlebt jede Ursache. `run-tests.ts` vergleicht deshalb zwei unabhängig ermittelte Tatsachen: **welche Testdateien unter `test/` liegen** und **welche einen Befund gemeldet haben.** Keine Mindestzahl — die wäre die Sorte Zahl, gegen die `check:docs` gebaut wurde.

Belegt, dass die Untergrenze feuert: Ein verengtes Suchmuster in `vitest.config.mts` lässt den Lauf mit 1 enden und benennt die stumme Datei.

### Und die Tests selbst brauchen denselben Beweis

204 Bauteiltests sagen für sich genommen nichts. `npm run check:ui-mutation --workspace=web` macht jede Zeile, die einen dokumentierten Datenverlust verhindert, wirkungslos und schaut, ob der zugehörige Test rot wird. In der Woche, in der dieser Eintrag entstand, waren es **neun von neun gefangen**, beide Richtungen der Gerätetag-Korrektur; die Liste ist seither mit jeder Karte gewachsen.

Der Lauf hat sich dabei selbst bewährt: Eine Prüfung stand mit `serverToday === Gerätetag` da und konnte gar nicht fehlschlagen. Sichtbar wurde das nur daran, dass die Mutation »das Gerät korrigiert nie« lediglich EINE der beiden Prüfungen umriss.

### Der Wächter hatte selbst eine Lücke — dieselbe wie die, gegen die er gebaut ist

**Gefunden bei Karte 3.4.** Er meldete eine Mutation als UEBERLEBT, die von Hand nachgestellt drei Tests rot macht. Der Grund lag nicht in der Mutation, sondern im Lauf: Es kamen **weniger Testdateien zurück, als es gibt.**

Das ist genau die Klasse Fehler, für die `run-tests.ts` weiter oben in diesem Eintrag existiert — ein Bauteil-Projekt, das stillschweigend nichts ausführt und mit 0 endet. `check-ui-mutation.ts` besass eine Sicherung gegen **schon rote** Tests und keine gegen Tests, die **gar nicht liefen**.

Neu vergleicht es die Zahl gemeldeter Dateien gegen den Grundlagenlauf und meldet `UNVOLLSTAENDIG` statt `UEBERLEBT`. Fail-closed, und die Schwelle hebt sich mit jeder neuen Testdatei von selbst — eine feste Zahl wäre die Sorte Wert, gegen die `check:docs` gebaut wurde.

**Die Fehlerrichtung war harmlos, die Lehre ist es nicht.** Ein Fehlalarm ist besser als eine stille Deckung — aber ein Wächter, der sonst nie irrt, verliert durch einen Fehlalarm genauso viel Vertrauen wie durch einen Durchlasser. Beim nächsten Mal glaubt man ihm den echten Fund nicht mehr.

Im selben Lauf hat er ausserdem eine Mutation als `NICHT ANWENDBAR` gemeldet: Karte 3.4 hatte `milestones` zwischen `measurements` und `context` geschoben, und der Anker einer älteren Mutation passte nicht mehr. Auch das ist fail-closed — ein Wächter, der einen verschobenen Anker still überspringt, prüft ab dann weniger, als seine Zahl behauptet.

Nicht in CI, aus demselben Grund wie `npm run mutate` im Motor: Ein Wert als Tor verleitet dazu, ihn künstlich zu heben.

### Wann man das wieder aufmacht

- **Vitest beendet einen Lauf mit ungestartetem Pool nicht mehr mit 0.** Dann fällt der Grund für `run-tests.ts` weg — die Prüfung selbst darf trotzdem bleiben, sie kostet nichts und deckt auch verengte Suchmuster ab.
- **Die App bekommt einen dritten Testtyp** (Browserlauf, Vertragstest). Dann ist neu zu beantworten, ob die Dateiendung noch das richtige Unterscheidungsmerkmal ist — nicht, ob die Trennung bleibt.

---

## E12 — Der Service-Role-Schlüssel kommt zurück, unter vier Bedingungen

**Entschieden 26.08.2026** · `web/src/lib/db/verdict-write.ts`, `web/scripts/check-service-role.ts`, Karte 2.2

In der Härtungswoche wurde er gelöscht, weil ihn niemand benutzte. Jetzt gibt es einen Benutzer: Urteile entstehen serverseitig, und die Zugriffsregeln erlauben einem Konto auf `flags` und `evaluations` nur das Lesen.

### Warum `security definer` hier nicht hilft

Der naheliegende Ausweg — eine Postgres-Funktion, wie der Trigger für Profilwechsel — funktioniert nicht, und der Grund lohnt das Aufschreiben, weil er beim nächsten Mal wieder naheliegen wird.

**Der Trigger ist sicher, weil er ein Trigger ist.** Er feuert auf ein UPDATE, das dem Konto ohnehin erlaubt ist, und schreibt `old.profile_key → new.profile_key` — Werte, die das Konto der Aufzeichnung nicht übergibt. Es kann ihn nicht belügen.

**Eine Funktion ist das Gegenteil.** `record_evaluation(episode_id, status, severity, flags)` bekäme das Urteil vom Konto. Jeder Angemeldete könnte sie mit `severity = 'green'` rufen. Die eine Zusicherung, für die diese Tabellen nur lesbar sind, wäre weg — und sie sähe sicher aus, weil »security definer« im Quelltext steht.

Sicher wäre sie nur, wenn sie das Urteil selbst berechnete, also mit den sieben Regeln in PL/pgSQL. Das sind zwei Kopien der Regeln, und E2 nennt das »der Tag, an dem sich ein Urteil ändert, ohne dass es jemand entschieden hat«. `revoke execute from authenticated` wäre der letzte Ausweg — dann könnte nur `service_role` rufen, und dafür braucht es den Schlüssel. Im Kreis.

### Die vier Bedingungen

1. **`import "server-only"`** — der Import aus einem Client-Bauteil ist ein Build-Fehler, kein Kommentar. Die Sperre ist echt: Sie hat beim ersten Testlauf sofort geworfen.
2. **Eine Datei, eine Aufgabe.** Kein allgemeiner Admin-Client, kein Export des Clients.
3. **Er liest nie.** Lesen läuft über den anon key, damit jede Abfrage durch die Regeln geht.
4. **Von aussen kommt nur eine Episodenkennung.** Der Server prüft die Zugehörigkeit über den anon key, liest die Daten selbst, lässt den Motor laufen. Ein Aufrufer kann »werte X aus« sagen, nie »trag grün ein«. **Das ist die Bedingung, die die anderen drei trägt.**

`npm run check:service-role --workspace=web` hält alle vier fest, mit Gegenproben. Die Messungen und der Beweis, dass der Wächter feuert (7 von 7 Proben), stehen im Nachtrag zu Punkt 1 in [SICHERHEIT.md](SICHERHEIT.md).

### Die Schreibreihenfolge ist eine eigene Sicherung

supabase-js kennt keine Transaktion über zwei Anweisungen. Ein Lauf schreibt Flags **und** Auswertung, und ein Abbruch dazwischen hinterlässt eine von zwei Halbheiten:

| | |
|---|---|
| Auswertung ohne Flags | liest sich als »keine Auffälligkeiten« — **eine stille Entwarnung** |
| Flags ohne Auswertung | findet kein Leser |

Also erst die Flags, dann die Auswertung. **Die Auswertungszeile ist der Punkt, an dem ein Lauf gilt.** Deshalb trägt `flags.evaluation_id` absichtlich *keinen* Fremdschlüssel — einer würde genau diese Reihenfolge verbieten. Die Migration `0007_evaluation_run.sql` bricht ab, wenn jemand ihn nachträglich anlegt.

Diese Zusicherung steht in keinem Typ und wird von keiner Datenbankregel erzwungen. Wer die zwei Zeilen umstellt, bekommt einen grünen Build und eine App, die sich genauso verhält — bis zu dem einen Netzwerkfehler, der Monate später dazwischenliegt. `test/verdict-write.test.ts` ist das, was sie von einem Kommentar unterscheidet.

### Was eine Attrappe nicht prüfen kann

Die Zeilenbauer liegen deshalb in `db/types.ts` und nicht im Schreibmodul: `server-only` **wirft** beim Import ausserhalb einer Serverumgebung, und damit wäre von dort nichts für ein Prüfskript erreichbar.

`npm run check:verdicts --workspace=web` schickt eine echte Motorausgabe durch das echte Schema — fünfzehn von Hand geschriebene Feldzuordnungen gegen ein Schema, das jemand einmal gelesen hat. Elf Prüfungen, darunter die Gegenprobe, dass die Datenbank eine Schwere ohne Beurteilung **selbst** abweist (`23514`); ohne die bewiese der Rest nur, dass sie alles schluckt. Räumt am Ende auf, anders als `check:rls` — hier gibt es nichts wiederzuverwenden.

**Ein Fund dabei, und er lag in der Prüfung:** `config` und `coverage` fielen durch, weil `JSON.stringify(a) === JSON.stringify(b)` verglichen wurde und **Postgres `jsonb` normalisiert** — die Schlüssel kommen in anderer Reihenfolge zurück. Kein Datenverlust, aber die Prüfung sagte nur »ungleich«, und der Unterschied zwischen »die Schlüssel stehen anders« und »eine Schwelle fehlt« ist genau der, auf den es hier ankommt. Der Vergleich nennt jetzt den Pfad.

### Der Bericht liest, er rechnet nicht

**Ergänzt 27.08.2026 mit Karte 2.3.** Die Berichtsseite holt den letzten gespeicherten Lauf und zeigt ihn. Sie ruft `evaluateEpisode` nicht auf.

Neu zu rechnen wäre kürzer — kein Leseweg, keine Rückabbildung von Zeilen auf Motortypen, keine Frage, was mit einer Flag aus einer alten Fassung passiert. Und es nähme genau das weg, wofür 2.2 gebaut wurde: Ein verbessertes Profil schriebe rückwirkend um, was jemandem letzten Monat gesagt wurde, und niemand könnte den Unterschied sehen.

Zwei Dinge folgen daraus, und beide sind beim Bau aufgefallen:

**`Overall.blocking` ging beim Ablegen verloren.** Die Union hat drei Varianten; gespeichert wurden zwei Spalten. Für `insufficient` fehlte damit genau das Feld, das den Zustand erklärt — derselbe Fehler wie in der Härtungswoche (»gesetzt und nie gezeigt«), eine Ebene tiefer. Migration `0008` holt es zurück, und ein Test prüft nicht mehr »blocking ist da«, sondern **dass jedes Feld der Motorausgabe eine Zuordnung hat**; ein neues Feld bricht ihn, bis jemand entscheidet.

**Die Auswahl der regellosen Blockadegründe liegt im Motor.** `unnamedBlocking` — der Konsolenbericht und der Bericht der App brauchen dieselbe, und sie zweimal hinzuschreiben hiesse, denselben Fund an einer zweiten Stelle wieder möglich zu machen.

### Wann man das wieder aufmacht

- **Wenn ein Lauf teurer wird als eine Abfrage.** Heute ist Speichern die Reproduzierbarkeit wert. Sollte die Ablage einmal mehr kosten als sie einbringt, ist neu zu beantworten, ob der Verlauf woanders festgehalten wird — nicht, ob Reproduzierbarkeit noch zählt.
- **Wenn die Auswertung aus der Anfrage herauswandert** — ein Hintergrundlauf, eine Edge Function, `pg_cron`. Dann kann der Aufrufer eine Rolle sein statt einer Anfrage, und Bedingung 4 lässt sich strenger fassen als »der Server hat es selbst gelesen«.
- **Wenn supabase-js Transaktionen bekommt.** Dann fällt der Grund für die Reihenfolge weg — die Reihenfolge selbst darf bleiben, sie kostet nichts.

---

## E13 — Die Haltung: sportlich-direkt, begleitend — und wo »motivierend« aufhört

**Entschieden 30.08.2026** · `web/src/app/globals.css`, `web/src/lib/ui.ts`, `web/scripts/check-tokens.ts`, Karte A1

Die Haltung des Produkts ist **sportlich-direkt, begleitend und motivierend**. Der Name ist **Loadwise** (KONZEPT §15).

### Die Grenze, die daraus folgt — und sie ist keine Auslegungsfrage

**»Motivierend« erreicht die Urteilssätze nie.** Die Sperrliste `ACHIEVEMENT` in `test/wording.test.ts` verbietet dem Motor genau das: »gut gemacht«, »fast am Ziel«, »weiter so«, »auf gutem Weg«. Der Kommentar dort sagt, warum: *»Fast am Ziel« behauptet, dass die verbleibende Strecke zurückgelegt wird — eine Vorhersage, die Ermutigung als Verkleidung trägt.* Und E8 hat entschieden: gamifiziert wird die **Genesung**, nie das Eintragen.

Ein Motor, der lobt, zeichnet nicht mehr auf. Das ist keine Stilfrage, sondern dieselbe Linie, an der die Zweckbestimmung hängt.

### Wo die Haltung stattdessen wohnt

| | |
|---|---|
| **Typografie** | Überschriften schwerer und enger als der Fliesstext. »Direkt« kommt aus Gewichtskontrast, nicht aus einer lauten Schrift |
| **Der eine Knopf** | `--weight-semibold` und enge Laufweite: Ein Knopf, der »Speichern« sagt, soll aussehen, als meine er es |
| **Begleitend** | Kein leerer Bildschirm. Jeder Zustand hat einen Satz — auch »noch keine Auswertung« |
| **Motivierend** | Der Fortschritt als **Zahl**, die für sich spricht: 64 % → 87 %. Das ist E10s Spiegel, und er fügt der Person nichts hinzu, was sie nicht selbst eingetippt hat |

### Die Schrift wird nicht von Google geladen

`next/font` lädt Inter beim **Bauen** herunter und liefert sie von der eigenen Herkunft. Zur Laufzeit geht keine Anfrage an Google — **gemessen**: null Verweise auf `fonts.gstatic.com` in den Bündeln, alle Dateien unter `/_next/static/media/`.

Das ist dieselbe Überlegung, aus der es keine Google-Anmeldung gibt: Bei Gesundheitsdaten ist schon die Zugehörigkeit die Auskunft. Erzwungen ist es ohnehin — die Inhaltsrichtlinie trägt `font-src 'self'`, eine Schrift von aussen würde blockiert.

**Was das kostet:** Der Bau braucht einmal Netz. Fällt Google beim Bauen aus, bricht der Build — nicht der Betrieb.

### Die Skala ist abgeleitet, nicht erfunden

Vorher: **75 Schriftgrössen verstreut, darunter fünf Werte für »kleiner Text« in 54 Verwendungen** — 0.8, 0.85, 0.88, 0.9 und 0.92 rem. Keiner war eine Entscheidung; sie sind durch Kopieren und Nachjustieren entstanden.

Sechs Stufen ersetzen das, plus Gewichte, Abstände und Radien. `npm run check:tokens --workspace=web` hält es: keine rohe Grösse ausserhalb von `lib/ui.ts`, und **jeder benutzte Token existiert auch** — `var(--text-md)` gibt es nicht, CSS wirft dafür keinen Fehler, und der Text erbt still.

Eine dokumentierte Ausnahme: `0.85em` in `DayCount`. Diese Zeile steht *innerhalb* eines Satzes und soll relativ zu dessen Grösse schrumpfen.

### Was dabei wieder herausgeflogen ist

Tabellenziffern standen kurz auf `body`, mit der Begründung, Messwerte würden untereinander fluchten. **Diese App hat keine Spalte, in der Zahlen untereinander stünden** — jede Zahl steht in einem Satz. Die Begründung war erfunden, also ist die Regel weg. Nachgemessen wurde auch der Verdacht, Inter ziehe mit `tnum` den Bindestrich auf Ziffernbreite: tut es nicht, dieselbe Breite mit und ohne.

### Wann man das wieder aufmacht

- **Wenn die Typografie zu neutral liest.** Dann ist eine zweite Schriftfamilie für Überschriften der nächste Hebel — nicht ein weiteres Gewicht und keine Farbe.
- **Wenn ein Bau offline laufen muss.** Dann `next/font/local` mit mitgelieferten Dateien; kostet ein paar hundert Kilobyte im Repository.
- **Wenn eine echte Zahlenspalte entsteht** (Tabelle im Physio-Bericht): Tabellenziffern gehören dann dorthin, nicht auf `body`.
- **Nicht aufgemacht wird die Grenze oben.** Dass »motivierend« die Urteilssätze nicht erreicht, hängt an der Zweckbestimmung und nicht am Geschmack.

---

## E14 — Der Fersenheber-Takt: 60/min, und warum die Anleitung nicht unter den Ban-Listen steht

**Entschieden 30.08.2026** · `engine/src/procedure.ts`, `engine/test/procedure.test.ts`, `supabase/migrations/0009_selftest_one_per_day.sql`, Karte 3.1

Der Seitenvergleich ist die eine Regel, die dieses Produkt von einem Schmerztagebuch unterscheidet. Bis Woche 3 war er **nie auf einer echten Messung gelaufen** — der Motor konnte ihn, `verdicts.ts` las die Tabelle seit Wochen aus, und die Abfrage kam jedes Mal leer zurück, weil kein Formular hineinführte.

### Der Takt: 60 Schläge pro Minute

`PROFIL-ACHILLES.md` §8.3 führt ihn als **strittig**: 60/min (Achilles Tendinopathy Toolkit, UBC, Okt. 2021) gegen 30/min (PMC7249277). Beides publiziert, keines widerlegt, beide auf Rang 3.

Gewählt wird **60/min**, und der Grund ist nicht die höhere Quelle, sondern die eigene Konsistenz: Dieses Projekt trägt bereits Toolkit-Zahlen — die Normwert-Mediane nach Jahrzehnt und Geschlecht (37/33/28/24/19/14) und die Spannweite 6 bis 70 bei Gesunden zwischen 20 und 59. **Diese Zahlen sind unter dem Toolkit-Takt entstanden.** 30/min zu wählen hiesse, eine Normtabelle weiterzuführen, die zum eigenen Verfahren nicht mehr passt: Alles liefe weiter, nur bedeuteten die Vergleichszahlen etwas anderes als die gemessenen.

Die Richtung des Fehlers zählt zusätzlich. Ein langsamerer Takt ergibt **mehr** Wiederholungen. Wer bei 30/min misst und sich an 28 als Median orientiert, hielte sich für schlechter, als er ist — also genau die Richtung, in die dieses Projekt am wenigsten irren will.

Für den Seitenvergleich selbst ist der Takt gleichgültig; beide Seiten messen im selben Takt, und ein Verhältnis kürzt ihn weg. Er zählt für den **Verlauf**: dieselbe Person, sechs Wochen später. Genau der Fall, für den die Karte existiert.

### Die Messanleitung steht ausserhalb der Ban-Listen — mit eigener Disziplin

`wording.ts` ist eine regulatorische Grenze: drei Sperrlisten über jedem Satz, jede mit einem Beweistest. Ein Satz wie »die Ferse bis zur grösstmöglichen Höhe anheben« verletzt die erste — und zu Recht, **als Urteil** wäre er eine Belastungsvorgabe.

Als Messanleitung ist er das Gegenteil. Er sagt nicht, was jemand tun soll, sondern **wie eine Zahl zustande kommt, die sonst keine ist**. `PROTOKOLLE.md` §1 zieht die Linie bei »Du bist in Phase 2, mach jetzt X« und bei Freigabekriterien — beides Aussagen über den Verlauf dieser Person. Eine Messanleitung ist die Aussage »so hältst du das Thermometer«.

Der Preis ist eine **eigene Regel, nicht deren Fehlen**. `TEST_PROCEDURE` ist bewusst kein `Phrase`, damit `allPhrases()` es nicht einsammelt, und `test/procedure.test.ts` hält fest, was hier trotzdem verboten ist:

| Verboten | Weil |
|---|---|
| Das Ergebnis deuten (»normal sind 28«) | Ordnet einen Menschen ein, an der Stelle, an der niemand ein Urteil erwartet |
| Ein Ziel setzen oder loben | Dieselbe Grenze wie E13, nur an einem Ort, den `wording.test.ts` nicht sieht |
| Sagen, **wann** gemessen wird | »Alle vier Wochen wiederholen« ist ein Belastungsplan in einem Satz |
| Vorhersagen | Wie überall |

Jede Liste trägt einen gepflanzten Satz, der greifen muss. Ein Wächter, der nie ausgelöst hat, ist Dekoration.

`check:boundary` deckt die Anleitung mit ab (322 → 362 Sätze). Das ist hier wichtiger als anderswo: Sie ist der einzige Motortext, den die App **vollständig ausgibt** und der aussieht, als dürfte man ihn anfassen. »Wir schreiben das kurz um« wäre der Tag, an dem in der App 30 steht und im Motor 60.

### Eine Messung je Testart und Tag

Nebenbefund, gefunden bevor die erste Messung existierte: `rules/asymmetry.ts` sortiert stabil nach Datum und nimmt die letzte Messung. Bei zwei Zeilen mit demselben Datum entscheidet damit die Reihenfolge der Datenbankabfrage — und die sortierte nicht. Das Ergebnis wäre nicht falsch, sondern **unbestimmt**.

Zwei Antworten, beide eingebaut: `0009` macht (Episode, Testart, Tag) eindeutig, und `verdicts.ts` sortiert die Abfrage. Die Migration allein reichte nicht — Import und fremde Clients gehen an ihr vorbei.

Bewusst nicht gewählt: beide behalten und die spätere gewinnen lassen. Das verlangt an jeder lesenden Stelle dieselbe Entscheidung noch einmal (Motor, Bericht, Kurve, Export), und eine davon würde sie irgendwann anders treffen. Ebenso verworfen: eine zweite Messung als »Versuch 2« behalten — das ist die Einladung, den besseren von zwei Versuchen zu speichern, eine Auswahl, die den Verlauf nach oben verzerrt, ohne dass jemand gelogen hätte.

### Was der Mutationslauf gefunden hat, und warum das der wichtigste Teil ist

Erster Lauf: **51 von 53 gefangen.** Die zwei Überlebenden lagen beide in der Server-Aktion, und sie sind das Muster, das dieses Projekt an sechs Stellen schon hatte — eine Änderung, die nichts sichtbar kaputtmacht:

| Mutation | Was sie angerichtet hätte |
|---|---|
| Die Prüfung läuft gegen alle Testarten statt gegen das Profil | Eine Messung liegt in der Datenbank und geht in kein Urteil ein. Erfasst und stumm, und niemand könnte das erkennen |
| Nach der Messung wird nicht neu gerechnet | Der Bildschirm sagt weiter »noch nicht genug beurteilt« — mit dem Wort, das die Messung gerade widerlegt hat |

Der Grund war schlicht: Für die Aktion gab es keinen Test. Die Bauteil- und Prüfregeltests waren grün und hätten beides widerstandslos durchgelassen. Genau dafür ist der Wächter da.

`test/self-tests-action.test.ts` schliesst es mit zwölf Prüfungen. Die schärfste ist **dreiteilig**, weil eine einzelne Zeile nicht zeigen könnte, dass die Einschränkung überhaupt etwas unterscheidet: Fersenheber an einer Schulter (`rotator_cuff` führt nur `rom`) abgelehnt, Beweglichkeit an derselben Schulter angenommen, derselbe Fersenheber an einer Achillessehne angenommen. Damit ist bewiesen, dass die **Episode** entscheidet und nicht die Testart für sich.

Dazu die Reihenfolge als eigener Test — geschrieben **vor** gerechnet. Andersherum liefe die Auswertung über einen Stand ohne die Messung und schriebe ein Urteil, das sie nicht kennt, mit frischem `computed_at` — also ohne dass `RunBehindNotice` etwas zu melden hätte.

Zweiter Lauf: **53 von 53.**

### Die Abnahme — und was dabei sichtbar wurde

Die Karte fordert: *»Drei Messungen über sechs Wochen erzeugen ein Asymmetrie-Urteil in der App.«* `test/selftest-abnahme.test.ts` geht dafür die Kette so weit, wie sie ohne Datenbank geht — drei Nutzlasten in der Form, die `SelfTestForm` absendet, durch dieselben Prüfregeln, die die Server-Aktion anwendet, in denselben Motoraufruf, den `evaluateAndStore` macht.

**Der Befund ist besser als die Bedingung.** Dasselbe Tagebuch, zweimal gerechnet:

| | Urteil |
|---|---|
| Sechs Wochen Tagebuch, **ohne** Messungen | **grün** — alle sieben Regeln melden nichts |
| Dieselben sechs Wochen, **mit** drei Messungen | **bernstein** — `asymmetry/mild-deficit` |

Der Morgenwert fällt von 5 auf 1, die Last ist gleichmässig, jede Einheit klingt binnen 24 Stunden ab. Ein Schmerztagebuch wäre hier fertig und zufrieden. Die verletzte Seite schafft in diesem Moment **81 % der gesunden** — nur der Seitenvergleich sieht das, und ohne ein Formular dafür hätte es niemand je gesehen. Das ist die Aussage des Konzepts, zum ersten Mal als Zahl statt als Absicht.

Dazu die Zuschreibung als eigener Test: Der Unterschied ist **genau ein Flag**, und alle übrigen sind grün. Ohne diese Zeile wäre »die Messungen haben das gemacht« geraten.

Ein erster Entwurf des Tagebuchs stand 43 Tage konstant bei 3 — und erzeugte damit selbst ein `stagnation/amber`. Der Test wäre grün gewesen und hätte nichts bewiesen: Das Urteil kam gar nicht von den Messungen. Aufgefallen ist das nur, weil die Gegenprobe »ohne Messungen« mitlief und `judged` statt `insufficient` lieferte.

**Und die Hälfte, die eine Attrappe nicht kann.** `check:verdicts` deckt seit 0009 auch den Seitenvergleich ab, acht Prüfungen gegen die echte Datenbank:

| | |
|---|---|
| Eine Messung geht durch | Beweist zugleich den Index aus 0009 — ohne ihn lehnt Postgres `on conflict` mit 42P10 rundweg ab |
| `involved = 0` wird angenommen, `uninvolved = 0` mit **23514** abgewiesen | Die CHECK-Bedingungen aus 0001. Über die sagt keine Attrappe etwas, und die aussagekräftigste Messung überhaupt hängt daran |
| Dieselbe Testart am selben Tag ersetzt: **zwei Zeilen, nicht drei** | Das Upsert löst wirklich auf, statt anzuhängen |
| Zurückgelesen ergibt sie ein Asymmetrie-Urteil | Der Schluss der Kette |
| Die Zahlen sind `number`, nicht Zeichenkette | `numeric` kommt über PostgREST auch als String zurück. Dann wäre der Index `NaN` und die Regel stumm — ohne dass irgendetwas einen Fehler meldete |

Dabei ist die Prüfung selbst über sich gestolpert: Der letzte Vergleich zeigte nach einer Umbenennung noch auf die äussere Variable — eine Auswertungszeile statt der Messungsliste. Ein Objekt hat kein `[0]`, also kam `undefined` heraus und die Prüfung schlug fehl. Sie hätte ebenso gut vakuum grün werden können, wäre dort etwas Wahrheitsfähiges gestanden.

### Was offen bleibt

- **Kein MDC für den Fersenheber.** `PROFIL-ACHILLES.md` §8.2 hält es fest: 2 gegen 6 Wiederholungen aus verschiedenen Populationen. Ohne belastbaren Wert darf keine Ansicht sagen, eine Verbesserung sei **echt** — 12 → 15 ist von Messrauschen nicht zu trennen. Die Zahlen werden deshalb aufgezeichnet und nebeneinandergestellt, nie als erreichte Verbesserung ausgewiesen.
- **Der Winkel braucht ein Gerät.** Die Beweglichkeitsmessung setzt einen Neigungsmesser voraus (jedes Telefon hat einen). Die verbreitete Laienform misst stattdessen den Wandabstand in Zentimetern — eine andere Grösse, die `TEST_UNIT.rom = "deg"` nicht abbildet. Aufgemacht wird das erst, wenn eine echte Messung daran scheitert.
- **JOSPT 2024** bleibt hinter der Bezahlschranke und ist die aktuellste Quelle. Vor Abnahme des Achillesprofils (Schritt 6) muss der Volltext her; er könnte den Takt anders festlegen.

---

## E15 — Eigene Masse: Die App schlägt nichts vor, und die Einheit friert ein

**Entschieden 31.08.2026** · `web/src/lib/measurement-validation.ts`, `web/src/lib/db/measurements.ts`, `supabase/migrations/0010_measurement_one_per_day.sql`, Karte 3.2

»Fünfzehn Kniebeugen« ist kein Seitenvergleich. Eine Kniebeuge hat keine gesunde Seite, gegen die sie sich messen liesse — sie in `SelfTest` zu zwängen hiesse, ein `uninvolved` zu erfinden, das der Symmetrieindex dann zu einem Urteil verrechnete. Deshalb ist `Measurement` ein eigener Typ mit eigener Oberfläche.

### Die Abwesenheit ist das Merkmal

Es gibt **keine Vorschlagsliste**, was zu messen sich lohnt. Der Kommentar an `MeasureKey` im Motor nennt den Grund: *»Closing this union would also mean the app shipping a list of what is worth measuring, and a list of what is worth measuring is a clinical criterion.«*

Das ist der bequemste denkbare Weg über die Grenze, um die sich dieses Projekt sonst überall bemüht — und er sähe aus wie Benutzerfreundlichkeit. Eine Auswahl mit »Kniebeugen · Einbeinstand · Treppen« wäre eine Aussage darüber, was bei dieser Verletzung zählt, und niemand würde sie als Urteil lesen.

Angeboten werden ausschliesslich die Masse, die der Nutzer **selbst** benannt hat, und zwar als `datalist`: Sie schränkt nicht ein. Ein `select` machte die Liste zur Vorgabe. Der Nutzen ist trotzdem echt — er verhindert, dass derselbe Verlauf beim vierten Mal unter »Kniebeugen tief« weiterläuft.

Eine Prüfung sichert die Abwesenheit ab: Fünf eigenwillige Namen (»Wie weit bis zum Briefkasten«, ein Emoji, »asdf«) müssen durchkommen. Eine Erlaubnisliste, die sich später einschleicht, macht sie rot.

### Zwei stille Fehler, und beide ergeben einen plausiblen Verlauf

| Fehler | Was passiert |
|---|---|
| **Dieselbe Zahl in zwei Einheiten** | Dreissig Minuten gegen dreissig Sekunden verglichen geht glatt auf und heisst nichts. Der Verlauf zeigt entweder gar keine Veränderung oder das Sechzigfache — je nachdem, welche zuerst kam |
| **Dasselbe Mass in zwei Schreibweisen** | »Kniebeugen« und »kniebeugen« sind zwei Reihen, jede für sich plausibel, wo eine gemeint war. Auf dem Bildschirm ist der Unterschied nicht zu sehen |

Den ersten hat 0001 gesehen und mit `one_unit_per_key` geschlossen. Den zweiten nicht: `unique (episode_id, key)` unterscheidet Gross- und Kleinschreibung. **0010** schliesst ihn mit einem Index über `lower(btrim(key))` — derselbe Fehler eine Spalte weiter links.

Gespeichert bleibt die **erste Schreibweise**. Der Nutzer hat das Mass benannt, und es soll dastehen, wie er es geschrieben hat; verglichen wird unempfindlich. Dieselbe Regel wie bei der Einheit: Was zuerst da war, gilt.

`0010` bringt ausserdem — wie 0009 für die Selbsttests — eine Messung je Mass und Tag. `progress.ts` sammelt in `seriesOf` jede Lesung; zwei Zeilen mit demselben Datum ergäben zwei Punkte übereinander.

### Die Schreibschicht wirft, statt auszuweichen

Ein erster Entwurf nahm bei einem Konflikt still die eingefrorene Einheit. Das klang nach Nachsicht und wäre genau der Fehler gewesen, den diese Karte verhindern soll: Wer 30 Sekunden eintippt und 30 Minuten gespeichert bekommt, hat eine Zahl im Verlauf, die niemand mehr als falsch erkennen kann.

`UnitConflictError` ist deshalb eine eigene Klasse und kein `Error` mit einer Zeichenkette darin — die Server-Aktion soll daraus »dieses Mass ist in Sekunden erfasst« machen können und nicht »konnte nicht gespeichert werden«. Der zweite Satz schickte jemanden dazu, es noch einmal zu versuchen, mit demselben Ergebnis.

Erreichbar wird der Wurf nur im Rennen zwischen zwei Reitern; die Prüfregeln lehnen den Konflikt vorher ab. Dass er schwer erreichbar ist, macht den Unterschied zwischen den beiden Sätzen nicht kleiner.

### Und die Lücke, die dabei auffiel

`verdicts.ts` hat die eigenen Masse **nie gelesen**. `EvaluationInput` hatte das Feld, die Datenbank hatte die Tabellen, der Aufruf liess es weg — dieselbe Lücke wie bei den Selbsttests, eine Tabelle weiter, und beide Male war jedes Bauteil für sich in Ordnung.

### Was heute noch nichts bewirkt — und warum das hier steht

`progress.ts` baut `records` nur für Masse, die ein **Meilenstein** nennt (`measuresInUse(input.milestones)`). Ohne Meilensteine erzeugen zwei erfasste Kniebeugen-Werte also keinen einzigen Eintrag.

Das ist kein Fehler, sondern die Reihenfolge der Karten: 3.2 erfasst, **3.4** gibt dem Nutzer die Meilensteine, gegen die gemessen wird. Aber es ist genau der Zustand, den dieses Projekt sonst als »geschrieben und nie gelesen« verfolgt.

Deshalb steht er als Prüfung in `test/verdicts-measurements.test.ts` und nicht als Kommentar. **Diese Prüfung soll rot werden, wenn 3.4 kommt** — dann muss jemand sie anfassen und dabei entscheiden, was nun gilt. Ein stiller Zustand, den niemand mehr erklärt, wäre die Alternative.

Daneben steht die Gegenrichtung als Zusicherung: Derselbe Lauf mit und ohne Messungen ergibt **dasselbe Urteil**. Ein Meilenstein trägt keine Severity und zählt nicht in die Abdeckung — täte er es, schaltete ein erreichtes Ziel eine Entwarnung frei, die es nicht belegt.

### Der Mutationslauf hat ausgerechnet die korrigierte Zeile gefunden

Erster Lauf: **64 von 65.** Die eine, die durchkam, war der Wurf bei Einheitenkonflikt — also genau die Zeile, die im Bau als Fehler erkannt und geändert worden war.

Der Grund ist eine Testschicht, die zu hoch ansetzt: `test/measurements-action.test.ts` **ersetzt** `saveMeasurement`. Es prüft damit die Aktion und nie die Schreibschicht. Ein Umbau, der das Werfen wieder herausnimmt und still auf die eingefrorene Einheit ausweicht, hätte 337 grüne Tests gehabt.

`test/db-measurements.test.ts` schliesst das mit elf Prüfungen, und zwei davon sind der Kern:

- Der Wurf **schreibt dabei nichts**. Ein Fehler, nach dem trotzdem eine Zeile in der Datenbank steht, wäre schlimmer als gar keine Prüfung.
- Er wirft **nicht**, wenn die Einheit passt. Ohne diese Gegenprobe könnte die Prüfung jedes bekannte Mass ablehnen und wäre trotzdem grün.

Die Lehre ist nicht neu, aber sie hat hier zum zweiten Mal in einer Woche zugeschlagen: Wo ein Test eine Schicht ersetzt, ist diese Schicht ungesichert — bei 3.1 war es die Server-Aktion, bei 3.2 die Schreibschicht darunter. Beide Male war das Bauteil für sich in Ordnung, und beide Male hat erst die Mutation es gezeigt.

Zweiter Lauf: **65 von 65.**

---

## E16 — Der Seitenvergleich wird als Zahl gezeigt, nie als Balken

**Entschieden 31.08.2026** · `web/src/components/SideComparison.tsx`, `engine/src/wording.ts` (`SELF_COMPARISON`), Karte 3.3

### Kein Fortschrittsbalken. Das ist die Gestaltungsentscheidung dieser Karte

Ein Balken hätte ein Ende, und ein Ende ist ein Ziel. Der Symmetrieindex ist aber ein **Verhältnis**: Er sagt, wie sich eine Seite zur anderen verhält, nicht, wie weit jemand ist. **100 % heisst »beide Seiten gleich«** — nicht gesund, nicht fertig, nicht freigegeben.

Ein Balken machte daraus stillschweigend eine Freigabeanzeige, und das ist die Linie aus `PROTOKOLLE.md` §1. Deshalb: eine Tabelle mit Zahlen, keine Skala mit Obergrenze.

**Gesichert wird eine Abwesenheit**, und das ist der Grund, aus dem sie schwer zu erhalten ist: Niemand fügt einen Balken böswillig hinzu. Er kommt als Verbesserung — »die Zahl allein sagt so wenig« — und bringt das Ziel mit. Vier Prüfungen:

| | |
|---|---|
| kein `progress`, kein `meter` | die offensichtliche Form |
| keine Rolle `progressbar` | die Form, die ein `div` mit ARIA annimmt |
| kein Element mit Prozentbreite | die Form ohne jede Semantik: `width: 81%`, aus dem Index gerechnet |
| eine Gegenprobe, die genau so einen Balken findet | sonst wäre nicht sichtbar, dass das Muster trifft |

Die dritte war zuerst zu grob und schlug auf `<table width: 100%>` an, also auf Layout. Geschärft statt aufgeweicht: `<table>` ausgenommen, mit **benannter Lücke** — ein Balken bei genau 100 % ginge durch. Eine Breite aus Daten ist fast nie glatt 100 %, und an den Werten dieser Fixtur (57, 71, 81) fiele sie sofort auf. Festgehalten, statt verschwiegen.

### Beide Seiten absolut, nicht nur das Verhältnis

Der Motor meldet `reference-eroding`, wenn auch die **gesunde** Seite absinkt. Der Fall ist unauffällig und übel: verletzte Seite bleibt bei 12, gesunde fällt von 21 auf 15 — das Verhältnis **steigt** von 57 % auf 80 %, und niemand ist besser geworden.

Der Code ist im Motor gebaut und hat drei Szenarien in der Erwartungsdatei. Erreichte der Satz den Bildschirm nicht, wäre er umsonst gebaut, und die Ansicht zeigte ein Verhältnis, dessen Nenner wegbricht.

Deshalb steht die Spalte der gesunden Seite gleichberechtigt neben der verletzten, und der Befund steht **über** der Tabelle: Wer liest, soll wissen, worauf er blickt, bevor er die Zahlen aufnimmt. Ein Nachsatz käme zu spät — dieselbe Überlegung wie bei `RunBehindNotice`.

Zugeordnet wird er seiner Testart. Ohne die Einschränkung stünde der Befund des Fersenhebers über der Tabelle des Einbeinsprungs — ein Urteil über Messungen, die es nie gesehen hat.

### Der Vorbehalt ist ein Motorsatz, kein App-Text

`SELF_COMPARISON` trägt eine belegte Zahl: Gesunde zwischen 20 und 59 erreichen beim Fersenheber **6 bis 70** Wiederholungen (`asymmetry.selfComparison`, Grad B, UBC-Toolkit 2021). Eine Spannweite, aus der sich für einen einzelnen Menschen nichts ablesen lässt — genau deshalb kann ein absoluter Normwert hier kein Urteil tragen.

Im App-Wörterbuch stünde der Satz ausserhalb der drei Ban-Listen, und die natürliche Kurzfassung wäre »ein guter Wert sind 25«. Also steht er in `wording.ts`, läuft durch `allPhrases()` und ist in `check:boundary` aufgenommen.

### Die Zahlen kommen live, das Urteil aus dem gespeicherten Lauf

Dieselbe Aufteilung wie auf dem Hauptbildschirm, und aus demselben Grund (E12): Ein Urteil ist nur reproduzierbar, wenn `ruleVersion` und `profileVersion` mitgeschrieben sind. Hier neu zu rechnen machte die Ansicht zu etwas, das sich bei jedem Aufruf ändern kann.

Beides kann auseinanderfallen — die Messung gespeichert, die Neuberechnung danach fehlgeschlagen. Dafür steht `RunBehindNotice` über der Ansicht.

### Wann man das wieder aufmacht

- **Nicht beim Balken.** Dass 100 % kein Ziel ist, hängt an der Zweckbestimmung und nicht am Geschmack.
- **Wenn eine Verlaufsdarstellung dazukommt** (eine Linie über die Zeit, wie `CourseCurve` sie für Morgenwerte zeichnet): Die darf keine Bezugslinie bei 100 % tragen. Eine Linie ohne Obergrenze ist zulässig, eine Skala, die bei 100 endet, ist der Balken in anderer Form.
- **Wenn ein MDC für den Fersenheber gefunden wird.** Dann — und erst dann — darf die Ansicht zwischen »über dem Messfehler« und »innerhalb der Messgenauigkeit« unterscheiden. Heute steht dort bewusst nichts dergleichen.

---

## E17 — Eigene Ziele: Der Zieltext läuft durch keinen Filter

**Entschieden 31.08.2026** · `web/src/lib/milestone-validation.ts`, `web/src/components/MilestoneList.tsx`, `supabase/migrations/0011_evaluation_progress.sql`, Karte 3.4

### Die Ban-Listen enden am Zielfeld, und das ist keine Nachlässigkeit

Drei Listen prüfen jeden Satz des Motors auf Imperative, Vorhersagen und Lob. Auf den Zieltext eines Menschen angewandt verböten sie das Speichern von »Ich will in sechs Wochen wieder laufen« — und damit einem Menschen, im eigenen Tagebuch über das eigene Ziel zu sprechen.

Die Konstruktion, die das verhindert, ist der Typ: `Milestone.label` ist ein einfacher `string`, wo jeder Motorsatz ein `Phrase` ist. `allPhrases()` sammelt nur `Phrase`. Ein Kommentar allein hielte das nicht — jemand erweitert die Sammlung »der Vollständigkeit halber«, und ab dann lehnt die App Ziele ab.

Gesichert ist es doppelt: `engine/test/wording.test.ts` hält fest, dass Nutzertext nicht eingesammelt wird, und `test/milestone-validation.test.ts` lässt **zehn Sätze durch, die als Motortext an den Listen scheitern würden** — »Du schaffst das«, »Ich sollte bis Weihnachten schmerzfrei sein«, »Fast am Ziel«, »Das wird sich bessern«, ein Emoji, ein Satz in Kleinschreibung. Die schärfste Mutation der ganzen Liste macht aus dem Feld etwas Geprüftes; sie macht 28 Prüfungen in dieser einen Datei rot.

Geprüft werden Länge und Vorhandensein. Nichts sonst.

### »Drei von fünf im Tagebuch belegt«

Der Satz, um den es in der Karte geht — und jedes Wort darin trägt die Position:

| | |
|---|---|
| **belegt**, nicht **erreicht** | »Belegt« ist eine Aussage über das Buch, »erreicht« eine über die Person. Der Motor benennt seine Zustände nach derselben Regel: `recorded` gegen `achieved`, `not-in-record` gegen `not-reached` |
| **von fünf** | Die Zahl der eigenen Ziele, nicht eine Skala mit Ende. Wer ein sechstes schreibt, steht bei »drei von sechs« und ist nicht zurückgefallen |
| **kein Balken** | Dieselbe Regel wie E16, aus demselben Grund |

Gezählt werden `recorded` und `marked-by-user`. **`partly-recorded` zählt nicht** — »einzelne Tage erfüllen es, noch nicht so viele wie verlangt« als erreicht zu führen wäre eine Aussage, die das Tagebuch nicht deckt. Ebensowenig `untracked`: Ein Ziel, das kein Tagebuch sehen kann, ist erst belegt, wenn der Mensch es selbst einträgt.

### Selbst abhaken gibt es nur ohne prüfbare Bedingung

Ein Ziel mit Bedingung beantwortet das Tagebuch. Ein Häkchen daneben wäre eine zweite, widersprechende Antwort auf dieselbe Frage — und welche gölte, müsste dann jede lesende Stelle für sich entscheiden. `manual_tick_only_when_untracked` in 0001 setzt es durch; in der Ansicht fehlt der Knopf schlicht.

**Zurücknehmen ist ausdrücklich vorgesehen.** Ein Häkchen, das bleibt, wäre eine Behauptung über einen Menschen, die er selbst nicht mehr los wird.

### Ein Ziel wird wirklich gelöscht — anders als eine Episode

E5 sagt: Eine Episode wird archiviert, nie gelöscht, weil Löschen ohne Export eine Falle ist. Für ein Ziel gilt das nicht, und der Unterschied ist, was verloren geht: Eine Episode trägt Monate erfasster Tage, ein zurückgezogenes Ziel trägt einen Satz, den derselbe Mensch geschrieben hat. Es weiter anzuzeigen — und sei es unter »Archiv« — hiesse, ihn an etwas zu erinnern, das er ausdrücklich zurückgenommen hat.

Weil es unwiderruflich ist, gibt es eine Rückfrage.

### Der vierte Ausgang des Motors ging beim Speichern verloren

`Evaluation` hat vier: `flags`, `overall`, `coverage`, `progress`. Abgelegt wurden drei. Der vierte wurde bei jedem Lauf berechnet und beim Schreiben fallen gelassen.

**Das ist derselbe Fund wie 0008, ein Feld weiter** — dort war es `overall.blocking`. Unsichtbar war es, weil es keine Ziele gab und der Kanal deshalb immer leer war; aufgefallen ist es erst, als 3.4 ihn anzeigen wollte und `StoredRun` kein Feld dafür hatte.

**0011** behebt es. Der Standardwert ist die leere Form des Kanals und damit für bestehende Zeilen nicht erfunden, sondern richtig: Es gab bis dahin keine Ziele.

Warum ablegen statt beim Anzeigen rechnen — über E12 hinaus gibt es hier einen zweiten Grund: `progress` hängt an den ZIELEN, und die ändert der Nutzer. Ein live gerechneter Stand schriebe die Vergangenheit um, sobald jemand ein Ziel löscht: »drei von fünf« würde rückwirkend zu »drei von vier«, ohne dass etwas geschehen wäre.

### Eine Vorhersage, die nicht eintraf

Bei 3.2 stand hier, die angepinnte Prüfung in `verdicts-measurements.test.ts` werde »rot werden, wenn 3.4 kommt«. **Sie ist grün geblieben, und das war richtig.**

Ihre Aussage war bedingt — »erzeugen keinen Bestwert, solange kein Meilenstein sie nennt« — und die gilt unverändert. Was fehlte, war der Gegenzweig, der erst mit 3.4 erreichbar wurde: dass ein Ziel, das ein Mass nennt, den Bestwert tatsächlich entstehen lässt (erster Wert 8, jüngster 15). Ohne beide Richtungen bliebe offen, ob die leere Liste am fehlenden Ziel liegt oder daran, dass der Kanal überhaupt nichts baut.

Festgehalten, weil die Lehre allgemein ist: Eine Prüfung, von der man erwartet, dass sie rot wird, prüft in Wahrheit oft eine Bedingung, die bestehen bleibt. Was fehlt, ist dann nicht ihre Umkehrung, sondern ihr Gegenstück.

### Wann man das wieder aufmacht

- **Nicht beim Zieltext.** Dass ein Mensch im eigenen Tagebuch sagen darf, was er will, hängt nicht am Geschmack.
- **Stufe 3 — der Katalog publizierter Kriterien** — bleibt gebaut und aus, bis die Zweckbestimmung anwaltlich geprüft ist (Schritt D im Fahrplan). Erst dann stellt sich die Frage, ob die App überhaupt etwas vorschlagen darf.
- **Wenn ein MDC vorliegt.** Dann darf der Bestwert zwischen »über dem Messfehler« und »innerhalb der Messgenauigkeit« unterscheiden. Heute sagt der Motor dazu ausdrücklich `no-mdc-established`, und dieser Satz erreicht den Bildschirm.

---

## E18 — Aufgezeichnet, nie »verbessert« — und ein Wächter, der benutzbar bleiben muss

**Entschieden 02.09.2026** · `web/src/components/ProgressRecords.tsx`, `engine/src/wording.ts` (`claimText`, `ClaimKey`), `web/scripts/check-ui-mutation.ts`, Karte 3.5

### Kein Verb der Veränderung. Für keinen Test dieser neun Profile

Nicht »besser«, nicht »+7«, nicht »Bestwert«. Für keinen Test ist belegt, wie weit zwei Messungen allein durch Zufall auseinanderliegen — ohne diese Zahl lässt sich »acht, dann fünfzehn« nicht von Messrauschen trennen.

Wie ernst das ist, zeigt der VISA-A-Fragebogen: **6,5 Punkte** als klinisch bedeutsamer Unterschied bei einer Messgenauigkeit von **mindestens 7**. Die kleinste Änderung, die etwas bedeutet, liegt dort unter der Genauigkeit der Messung.

Die Ansicht rechnet deshalb auch **keine Differenz** aus. 15 minus 8 ist 7, und stünde die Zahl irgendwo, wäre sie eine Behauptung über einen Abstand, den niemand einordnen kann.

Die Reihe heisst »erste« und »jüngste«, nicht »schlechteste« und »beste«. Beides sind Angaben über die POSITION; der Motortyp sagt es an `PersonalRecord.latest` selbst: *»Not 'best': that word needs a direction.«* Eine Richtung hätte die App zu erfinden — und bei einem Beschwerdewert zeigte sie in die andere Richtung als bei Wiederholungen.

Gesichert durch eine Wortliste mit **Gegenprobe**: drei gepflanzte Sätze (»Deine Werte haben sich verbessert«, »Neuer Bestwert«, »Du hast 7 zugelegt«) müssen gefangen werden, sonst ist die Liste Dekoration. Dazu die Zusicherung, dass überhaupt etwas gerendert wurde — eine leere Ansicht bestünde jede Verbotsprüfung.

### Zwei Schwächen im Motor, die dabei auffielen

`CLAIM_WORDING` stand als `Record<string, Phrase>` da. Ein fehlender Satz wäre damit kein Übersetzungsfehler gewesen, sondern eine leere Zeile — ausgerechnet dort, wo der Motor sagt, dass er den Abstand **nicht** einordnen kann. Ein stummer Vorbehalt ist schlimmer als gar keiner: Die Zahlen stünden nebeneinander, und nichts sagte, dass ihr Abstand nichts bedeutet. `ClaimKey` zieht die Schlüssel jetzt aus `ChangeClaim`.

Und `claimText` gab es nicht — die App hätte den Record selbst indexieren müssen, also die Zuordnung von Variante zu Schlüssel ein zweites Mal geschrieben.

### `check:boundary` deckte die neue Ansicht nicht ab

`ProgressRecords` gibt Motorsätze über die Zahlen eines Menschen aus. Den Disclaimer hatte sie — **freiwillig**, und »freiwillig« ist genau der Zustand, den diese Prüfung ersetzen soll. `claimText` steht jetzt in `VERDICT_CALLS`.

`milestoneText` und `progressBlockText` bleiben bewusst draussen. Sie sagen, was im Tagebuch steht und was dem Motor fehlt — Aussagen über den Bestand, gemessen an einem Massstab, den der Nutzer geschrieben hat. Sie an die Zweckbestimmung zu binden hiesse, jeden Bestandshinweis wie ein Urteil zu behandeln, und einen Satz, der überall steht, liest am Ende niemand mehr.

### Der Mutationswächter war zu langsam, um benutzt zu werden

**Das ist keine Bequemlichkeitsfrage.** Jede Mutation lässt die ganze Suite laufen — alle dreissig Testdateien, jedes Mal. Bei 85 Mutationen sind das über eine Viertelstunde. Ein Wächter, dessen Lauf so lange dauert, wird beim Bauen nicht mehr gestartet, und ein Wächter, den niemand startet, ist keiner.

`npm run check:ui-mutation -- ProgressRecords` läuft nur die passenden Mutationen: vier statt 85, unter einer Minute. Die Bilanz nennt das Muster und sagt ausdrücklich, dass es kein vollständiger Lauf war — ein Filter, der still eine Teilmenge prüft und »alles gefangen« meldet, wäre die Halbwahrheit, gegen die dieses Skript gebaut ist.

### Und er liess bei einem Abbruch mutierten Code zurück

Die Wiederherstellung stand in einem `finally`. Das greift bei jedem normalen Ende — **nicht**, wenn der Prozess getötet wird. Genau das ist passiert: Ein abgebrochener Lauf hinterliess `SideComparison.tsx` mit `if (false) return null;`.

Gefunden wurde es nur, weil `git diff` daneben lief. Ohne das wäre eine kaputte Zeile im nächsten Commit gelandet — aus einem Werkzeug, das den Quelltext absichtlich beschädigt und darauf baut, ihn zurückzustellen.

Der Lauf legt jetzt vor jeder Mutation den unversehrten Inhalt in einer Datei ab und stellt ihn beim nächsten Start wieder her, bevor er irgendetwas anderes tut. Dieselbe Bauform, mit der `check:verdicts` seine Probeepisoden aufräumt.

### Eine untaugliche Mutation, gefunden vom Wächter selbst

Eine der neuen setzte `hidden` an ein Element. `textContent` in jsdom ignoriert das — die Prüfung blieb grün, und der Wächter meldete UEBERLEBT für einen Test, der einwandfrei ist. Ersetzt durch einen echten Fehler: erste und jüngste Messung zeigen dieselbe Zahl.

**Eine Mutation muss das Verhalten ändern, nicht die Darstellung.** Sonst prüft man, ob der Test die Darstellung liest, und nicht, ob er die Zusicherung hält.

### Wann man das wieder aufmacht

- **Wenn ein MDC vorliegt.** Dann — und erst dann — darf die Ansicht zwischen »über dem Messfehler« und »innerhalb der Messgenauigkeit« unterscheiden. Der Motor hat beide Sätze bereits; heute erreicht keiner den Bildschirm, weil kein Profil einen belastbaren Wert trägt.
- **Nicht bei den Serien.** Der Motor kann einen weggelassenen schlechten Tag nicht erkennen; das ist dokumentiert und unlösbar. Eine Serie macht das Weglassen doppelt lohnend, und eine gerissene Serie bestraft jemanden dafür, dass sein Knie nicht mitgespielt hat.

---

## E19 — Abnahme Woche 3: Eine Notiz, die nie zurückkam

**Entschieden 02.09.2026** · `engine/src/types.ts`, `web/src/lib/db/types.ts`, Abnahme der Karten 3.1 bis 3.5

Woche 3 stand mit 85 von 85 gefangenen Mutationen, 402 Motortests, 493 Webtests und allen Wächtern grün. Die Abnahme hat trotzdem einen Fund ergeben — und zwar von genau der Sorte, gegen die dieses Projekt sonst gebaut ist.

### Drei Formulare boten ein Notizfeld an. Zwei gaben es nie wieder her

`SelfTest` im Motor trug **kein** Notizfeld, während `Entry` und `Measurement` beide eines haben. Die Datenbankspalte gab es seit 0001, das Formular bot das Feld an, die Server-Aktion schrieb es — und `toSelfTest` liess es fallen. Bei den eigenen Massen dasselbe eine Ebene später: Die Zuordnung reichte die Notiz durch, aber weder Formular noch Ansicht las sie.

**Doppelt verloren.** Sie kam nie auf einen Bildschirm zurück, UND das leere Feld überschrieb sie beim nächsten Speichern desselben Tages — gemeldet als »Gespeichert.«, genau wie die sechs Datenverluste der Härtungswoche.

Das ist schlechter als gar kein Feld. Ein Feld lädt dazu ein, Zusammenhang festzuhalten — »neue Schuhe«, »nach der Arbeit« —, und dieser Zusammenhang ist genau das, was eine Zahl sechs Wochen später erklärt.

### Warum kein Test das finden konnte

**Ein Wert, den niemand liest, fehlt nirgends.** Es gab keine Zusicherung, die brechen konnte: Der Motor braucht die Notiz nicht (keine Regel liest sie), die Datenbank hielt sie klaglos, und jede Ansicht war für sich vollständig.

Gefunden wurde es beim Durchsehen der Karten gegen den Code — nicht von der Suite, nicht vom Mutationswächter. Der Mutationswächter konnte es nicht finden, weil er prüft, ob eine Zeile GEBRAUCHT wird; eine fehlende Zeile hat er nicht zu mutieren.

Die Lehre: Der Mutationslauf sichert, was da ist. Was fehlt, findet nur ein Abgleich zwischen dem, was ein Formular verspricht, und dem, was eine Ansicht zeigt.

### Behoben, und jetzt prüfbar

`SelfTest.note` im Motor, `toSelfTest` reicht sie durch, beide Formulare laden sie zurück, beide Ansichten zeigen sie. Erst dadurch wird sie überhaupt prüfbar — vier Mutationen decken die vier Stellen ab, an denen sie wieder verschwinden könnte.

Die Notizspalte im Seitenvergleich hat eine **Gegenprobe**: Wo keine Notiz steht, steht auch nichts. Ohne sie könnte die Spalte in jeder Zeile denselben Text zeigen und wäre trotzdem grün.

### Zwei kleinere Befunde, beide stehen gelassen

- **`progress.episodeDay` wird gerechnet, gespeichert und von nichts gelesen.** Die Episodenseite rechnet ihren Tageszähler live aus dem Index. Zwei Quellen für dieselbe Zahl, aber nur eine erreicht den Bildschirm — heute kein Widerspruch, latent einer. Den ganzen Kanal zu speichern bleibt richtig; das Feld einzeln herauszuschneiden wäre eine Sonderregel im Ablegen.
- **Die beiden Messfehler-Sätze sind unerreichbar**, weil kein Profil `measurementError` setzt. Jedes dokumentiert unter `evidence` mit Grad D, warum — »No MDC found«. Konsistent mit E18, kein Fund.

---

## E20 — Der Ausdruck ist ein anderes Dokument, nicht dieselbe Seite in Grau

**Entschieden 02.09.2026** · `web/src/components/PrintReport.tsx`, `web/src/app/globals.css`, Karte 4.1

### Eine eigene Seite, kein Druckstil auf dem Bericht

Der Bericht (Karte 2.3) ist für die betroffene Person geschrieben: fünf Abschnitte, Warnzeichen, Erklärungen. Ein Ausdruck für eine behandelnde Person ist ein anderes Dokument — kürzer, mit wählbarem Zeitraum, und mit vier Versionsangaben, die ihn Monate später noch einordbar machen.

Dieselbe Seite mit `@media print` in zwei Dokumente zu verwandeln hiesse, beide Fassungen in einer Datei zu halten und bei jeder Änderung an die andere zu denken.

### Die Falle: Der Zeitraum engt ein, was aufgelistet wird — nicht das Gesamturteil

Wer »letzte vier Wochen« wählt, sieht eine kürzere Liste. Das **Gesamturteil** bleibt aber die Aussage über den ganzen Verlauf bis zur Berechnung. Es unter einer Zeitraumüberschrift zu zeigen hiesse, einen Befund von vor zwei Monaten dem gewählten Fenster zuzuschreiben — und ausgerechnet diese eine Zeile sucht eine behandelnde Person zuerst.

Also: eigener Abschnitt, mit einem Satz darüber, worauf er sich bezieht. Ihn ganz wegzulassen war die Alternative und ist verworfen.

Das Fenster rechnet vom **jüngsten erfassten Tag**, nicht von heute. Wer zwei Wochen nichts eingetragen hat, bekäme sonst eine halb leere Seite und den Eindruck, es fehlten Daten.

### Vier Angaben, ohne die ein alter Ausdruck wertlos ist

Profilname, **Profilversion**, Regelversion, Berechnungszeitpunkt. Ohne sie ist ein Blatt von vor drei Monaten nicht mehr einzuordnen: Die Schwellen können sich geändert haben, und niemand könnte sagen, ob ein anderes Ergebnis am Körper oder an einer Profilverbesserung liegt. Das ist dieselbe Überlegung, die E12 zum Ablegen der Läufe geführt hat — hier auf Papier.

### Drucken ohne PDF-Erzeuger

`@media print` in `globals.css` blendet über `[data-screen-only]` aus, was auf Papier nichts zu suchen hat: Navigation, Zeitraumwahl, Druckknopf. Ein Knopf auf einem Ausdruck ist kein Schönheitsfehler, sondern eine Aufforderung, die ins Leere geht.

Ein PDF-Erzeuger wäre eine Abhängigkeit mehr, ein zweiter Satz Schriftarten und ein Weg, auf dem Gesundheitsdaten durch fremden Code laufen.

**Die Urteilsfarben werden schwarz.** Viele Drucker sind schwarzweiss, und ein grauer Balken neben einem anderen grauen Balken sagt weniger als gar keiner. Der Satz daneben trägt die Aussage ohnehin — Farbe war nie die einzige Auskunft, das verlangt schon WCAG 1.4.1.

### Zwei Fallen beim Bauen, beide dokumentiert gewesen

- **Ein halbes Flag-Detail bringt `evidenceText` zu Fall.** Die Fixtur trug `acute`, `chronic`, `ratio` — der Typ verlangt auch die ungewichteten Zahlen. Kein Typfehler, weil die Fixtur zugesichert war; ein Absturz beim ersten Rendern.
- **Eine stehende Uhr lässt jeden Klick hängen.** `vi.useFakeTimers()` ohne `shouldAdvanceTime` liess zwei Prüfungen in den Zeitüberlauf laufen. Der Kopf von `EntryForm.test.tsx` beschreibt genau das seit der Härtungswoche.

### Wann man das wieder aufmacht

- **Wenn ein Ausdruck mehrere Episoden tragen soll.** Heute ist er eine Episode; die Kaskade (zwei gleichzeitige Episoden mit Bezug) steht bewusst nach Tag 25.
- **Nicht beim PDF-Erzeuger**, solange der Browser druckt. Erst wenn ein Ausdruck ohne Browser entstehen muss — etwa als Anhang einer E-Mail —, stellt sich die Frage neu.

---

## E21 — Löschen ohne Service-Role-Schlüssel, und zwei Formate statt eines

**Entschieden 02.09.2026** · `supabase/migrations/0012_delete_own_account.sql`, `web/src/lib/export/build.ts`, `web/scripts/check-delete-account.mts`, Karte 4.2

Gesundheitsdaten nach Art. 9 DSGVO. Ohne Export und Löschung darf niemand ausser dem Entwickler die App benutzen — keine Vorsichtsmassnahme, sondern die Bedingung dafür, sie überhaupt anzubieten.

### Die Löschung braucht den Schlüssel nicht, und das ist der Kern

`check:service-role` hält fest, dass **genau eine** Datei den Service-Role-Schlüssel anfasst. Eine zweite wäre nicht bloss eine Zeile mehr in einer Erlaubnisliste — sie wäre der Punkt, an dem aus »die eine Ausnahme« eine Sammlung wird.

`delete_own_account()` macht ihn überflüssig: eine `security definer`-Funktion **ohne Argumente**, die ausschliesslich auf `auth.uid()` handelt.

Der Kopf von `verdict-write.ts` verwirft dieselbe Bauform für das Schreiben eines Urteils, und der Unterschied ist genau der Parameter, den es hier nicht gibt:

| | |
|---|---|
| `record_evaluation(episode_id, severity, …)` | **Das Konto liefert das Urteil.** Jeder Angemeldete könnte `severity = 'green'` schreiben |
| `delete_own_account()` | Nimmt nichts entgegen. Ein Konto kann sie nicht belügen, weil es ihr nichts sagt |

`search_path` ist auf den leeren Pfad festgenagelt: Ohne das könnte ein Aufrufer ein eigenes Schema voranstellen und damit bestimmen, welche Tabelle `auth.users` meint.

**Geprüft gegen die echte Datenbank**, `check:delete-account`: Der Lauf legt **zwei** Wegwerf-Konten an, löscht eines über den anon key mit dessen eigenem Token — also genau so, wie die App es tut — und schaut beim anderen nach. Die entscheidende Zeile ist nicht »das Konto ist weg«, sondern **»das andere Konto ist unberührt«**: Eine Funktion, die zu viel löscht, bestünde alle anderen Prüfungen mit Auszeichnung. Zehn von zehn, dazu `42501` für einen Aufruf ohne Anmeldung.

### Zwei Formate, weil eines zwei Aufgaben nicht erfüllt

**JSON ist die Sicherung.** Vollständig. Alltagslast, Morgensteifigkeit und Schmerzmittel haben in `COLUMNS` keinen Namen — sie kamen mit H17 und H18 in die App, nicht in den Importer für handgeführte Tagebücher. Aus einem reinen CSV-Export wären sie auf immer weg.

**CSV ist der Austausch**, lesbar von `parseDiary` und `parseTests`. Dass das stimmt, ist nachgewiesen und nicht behauptet: Die Tests schicken jede erzeugte Datei durch den Importer zurück, erschöpfend über `ALL_ACTIVITY_KINDS` und alle drei Zeitpunkte.

Eine **Gegenprobe** hält fest, dass die CSV-Fassung die drei Felder nachweislich nicht trägt. Ohne sie stünde »CSV ist auch ein Backup« unwidersprochen im Raum, und jemand löschte sein Konto im Vertrauen darauf.

### CSV steht an der Episode, nicht am Konto

Eine erste Fassung bot CSV über das ganze Konto an. Das war falsch: `parseDiary` kennt keine Episodenspalte. Zwei Verläufe mit einem gemeinsamen Tag — eine Achillessehne und ein Knie im selben Sommer, genau der Fall aus dem Konzept — landeten in derselben Datei, und beim Wiedereinlesen behielte `buildIndex` einen der beiden Tage.

Ein Austauschformat, das zwei Verläufe stillschweigend zu einem macht, ist keines.

### Mehrere Einheiten werden zu mehreren Zeilen

`parseDiary` liest eine Einheit je Zeile. Die erste zu schreiben und die übrigen wegzulassen wäre ein stiller Verlust **im Export** — im einen Dokument, das jemand aufhebt, wenn er sein Konto löscht.

Also eine Zeile je Einheit, Datum und Morgenwert wiederholt. In der Datei steht dann alles; beim Wiedereinlesen behält `buildIndex` die letzte Zeile und **meldet** die Doublette. Der Verlust ist damit angesagt statt still.

### Drei Funde im Importer, alle durch den Rundlauf

- **`parseTests` las die Notizspalte und hängte sie nicht an den Selbsttest.** Die Variable stand unterhalb des Zweigs, der einen baut. Derselbe Fund wie in der Abnahme von Woche 3, eine Ebene weiter.
- **Der Name eines eigenen Masses kam kleingeschrieben zurück** — er lief über dieselbe Normalisierung wie der Testnachschlag. Ein Export, der die eigene Schreibweise verliert, ist als Sicherung entsprechend weniger wert.
- **Zwei Abbildungen im Export waren toter Ballast**, und vier ihrer Einträge nannten Aktivitäten, die es nicht gibt (`strength`, `court`, `team`, `climb`), während `strength_lower`, `strength_upper` und `court_sport` fehlten. Ein `Record<string, string>` nimmt jeden Schlüssel an — deshalb hat sie kein Typfehler getroffen, und deshalb ist die erschöpfende Prüfung der eigentliche Wächter.

### Ein getipptes Wort, kein zweiter Klick

Ein Bestätigungsfeld lässt sich nicht wegklicken, ohne gelesen zu haben, was danebensteht; ein zweiter Knopf wird zur zweiten Bewegung derselben Hand. Die Server-Aktion prüft dasselbe noch einmal — ein Formular ist eine Hürde für den Menschen davor, eine Server-Aktion ist ein öffentlicher Endpunkt.

Beide Fehlermeldungen sagen ausdrücklich, dass **nichts gelöscht wurde**. »Fehlgeschlagen« allein liesse jemanden im Unklaren, ob sein Tagebuch noch da ist — an dem Punkt, an dem er es am dringendsten wissen will.

Und der Erfolgsfall wirft: `redirect` in der Aktion. Ein `catch`, das daraus eine Fehlermeldung machte, zeigte jemandem »ist nicht durchgegangen«, während sein Konto gerade verschwunden ist.

### Der Export steht über der Löschung, auf derselben Seite

E5 hat das Löschen zurückgestellt, bis es einen Export gibt: *löschen darf nur, wer vorher exportieren konnte.* Diese Reihenfolge steht als Anordnung auf der Seite — wer zum Löschknopf will, scrollt an der Sicherung vorbei. Zwei Seiten wären die Alternative gewesen; dann fände jemand die Löschung, ohne die Sicherung je gesehen zu haben.

### Wann man das wieder aufmacht

- **Wenn ein Import dazukommt.** Der Export ist heute ein Weg hinaus, der zufällig auch hineinführt. Eine echte Import-Oberfläche müsste die Doubletten-Meldung des Motors zeigen, statt sie zu verschlucken.
- **Nicht beim Service-Role-Schlüssel.** Dass genau eine Datei ihn anfasst, ist die Zusicherung, an der die ganze Konstruktion hängt.
