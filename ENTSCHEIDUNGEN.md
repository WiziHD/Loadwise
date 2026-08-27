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

Wenn der Motor als **gebautes Artefakt** ausgeliefert wird statt als Quelle. Dann entscheidet der Build über die Endungen, und die Frage stellt sich nicht mehr. Heute ist genau das ausgeschlossen — aus einem anderen Grund, der ebenso wichtig ist: Zwei Kopien der Regeln, die eine mit 371 Motortests geprüft und die andere ausgeliefert, wären der Tag, an dem sich ein Urteil ändert, ohne dass es jemand entschieden hat.

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

22 Bauteiltests sagen für sich genommen nichts. `npm run check:ui-mutation --workspace=web` macht jede Zeile, die einen dokumentierten Datenverlust verhindert, wirkungslos und schaut, ob der zugehörige Test rot wird. **Neun von neun Mutationen gefangen**, beide Richtungen der Gerätetag-Korrektur.

Der Lauf hat sich dabei selbst bewährt: Eine Prüfung stand mit `serverToday === Gerätetag` da und konnte gar nicht fehlschlagen. Sichtbar wurde das nur daran, dass die Mutation »das Gerät korrigiert nie« lediglich EINE der beiden Prüfungen umriss.

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

### Wann man das wieder aufmacht

- **Wenn die Auswertung aus der Anfrage herauswandert** — ein Hintergrundlauf, eine Edge Function, `pg_cron`. Dann kann der Aufrufer eine Rolle sein statt einer Anfrage, und Bedingung 4 lässt sich strenger fassen als »der Server hat es selbst gelesen«.
- **Wenn supabase-js Transaktionen bekommt.** Dann fällt der Grund für die Reihenfolge weg — die Reihenfolge selbst darf bleiben, sie kostet nichts.
