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
