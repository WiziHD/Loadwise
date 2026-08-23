# Loadwise — Technische Machbarkeit und Umsetzung

> Kritische Durchsicht vor der ersten Zeile Code.

| | |
|---|---|
| **Stand** | 20. August 2026 |
| **Bezug** | [KONZEPT.md](KONZEPT.md) |
| **Status** | Empfehlung — noch nicht entschieden |

---

## 0. Ausgangslage

**Programmiererfahrung:** grundlegend. Supabase-Datenbank anlegen und eine Web-App hosten ist machbar.

Daraus folgt eine Anpassung an Abschnitt 5: Der Stack bleibt, aber die Architektur wird bewusst langweilig gehalten, damit möglichst wenig Framework-Eigenheiten gelernt werden müssen — **Lesen über Server-Komponenten, Schreiben über Server-Aktionen, keine Zustandsbibliothek, keine eigene Schnittstellenschicht.** Alles, was nach »fortgeschrittenem Next.js« aussieht, wird vermieden.

---

## 1. Die vier echten Risiken

Nicht die Datenbank, nicht das Framework, nicht die Auswertung. Das hier:

### Risiko 1 — Erinnerungen funktionieren auf iPhones schlecht

**Das ist das größte technische Problem des ganzen Projekts, und es entsteht direkt aus der Entscheidung für eine Web-App.**

Das Konzept setzt auf die morgendliche Erinnerung, weil ohne täglichen Eintrag die gesamte Auswertung wertlos ist. Aber:

- Auf **Android und Desktop** funktionieren Web-Push-Benachrichtigungen problemlos.
- Auf **iOS** funktionieren sie nur, wenn der Nutzer die Seite vorher **aktiv auf den Startbildschirm gelegt hat**. Ein Browser-Tab allein bekommt keine Benachrichtigungen.

Das bedeutet: Ein erheblicher Teil deiner Zielgruppe — Sportler, iPhone-Anteil hoch — muss einen unüblichen manuellen Schritt gehen, den kaum jemand von selbst kennt. Und genau diese Nutzer brauchen die Erinnerung am dringendsten.

**Umgang:**

| Weg | Bewertung |
|---|---|
| Ausdrückliche Anleitung zum Ablegen auf dem Startbildschirm, direkt nach dem ersten Eintrag | Nötig, aber ein Teil wird es nicht tun |
| **E-Mail am Morgen als Rückfallebene** | Zuverlässig zustellbar, aber deutlich schwächere Wirkung als eine Benachrichtigung |
| Native App | Löst das Problem, sprengt aber Zeitbudget und Plattformentscheidung |

**Meine Einschätzung:** Kein Ausschlussgrund, aber du musst wissen, dass du hier gegen die Plattform arbeitest. Plan: Push wo möglich, E-Mail immer, und die Startbildschirm-Anleitung als festen Teil des Einstiegs — nicht als versteckte Einstellung.

### Risiko 2 — Ohne Ruhetage keine Auswertung

Ein unterschätztes Detail mit harten Folgen. Die 24-Stunden-Regel braucht einen **Vergleichswert**: Wie fühlt sich die Stelle an einem Tag ohne Belastung an? Ohne diesen Ausgangswert lässt sich nicht beurteilen, ob der Zustand nach dem Training erhöht war.

Das heißt: Nutzer müssen **auch an Tagen ohne Training** einen Eintrag machen. Genau das ist der Tag, an dem man es am ehesten vergisst.

**Umgang:** Der Eintrag an Ruhetagen muss noch kürzer sein als sonst — im Idealfall zwei Tippser. Und die App muss erklären, warum er zählt, sonst wirkt er sinnlos.

### Risiko 3 — Datum und Zeitzone zerstören die Auswertung lautlos

„Am nächsten Morgen" ist eine Aussage über die lokale Zeit des Nutzers. Wer Zeitstempel in UTC speichert und daraus Tage ableitet, bekommt Einträge, die je nach Uhrzeit auf den falschen Tag fallen. Die Auswertung ist dann nicht kaputt, sondern **falsch — ohne Fehlermeldung**.

**Umgang:** Das Tagebuchdatum wird als reines Datum gespeichert, ermittelt in der lokalen Zeitzone des Geräts. Kein Zeitstempel, keine Umrechnung. Zusätzlich die Zeitzone am Nutzer hinterlegen, ausschließlich für den Versand der Erinnerung.

### Risiko 4 — Datenqualität

Die gesamte Auswertung steht und fällt mit ehrlichen, gleichmäßigen Einträgen. Wer die Anstrengung mal auf einer Zehnerskala und mal nach Gefühl einträgt, produziert Rauschen, und die App zieht daraus Schlüsse, die nicht tragen.

**Umgang:** Wenige Felder, immer dieselben, immer mit derselben Skala und derselben Erklärung. **Kein Freitextfeld, das die Auswertung beeinflusst.** Notizen dürfen existieren, aber nur für den Menschen, nicht für die Rechnung.

---

## 2. Die KI-Frage

Kurze Antwort: **Für den Kern braucht es keine — und das ist eine gute Nachricht.** Die Auswertung besteht aus deterministischen Regeln über Zeitreihen: testbar, erklärbar, und ohne Kosten, die mit der Nutzerzahl mitwachsen. Genau Letzteres ist die Bedingung für den kostenlosen Start.

Drei naheliegende Ideen wurden geprüft und verworfen oder verschoben.

### 2.1 Ein Modell lokal betreiben — nein

**Im Browser des Nutzers.** WebGPU läuft seit Kurzem in allen großen Browsern, seit iOS 26 auch auf dem iPhone; Modelle mit 1–3 Milliarden Parametern sind auf den meisten Geräten lauffähig. Die Zahlen dahinter erledigen die Idee trotzdem: **ein bis zwei Gigabyte Download**, oft über Mobilfunk, und 6–8 GB freier Gerätespeicher — für eine App, die 30 Sekunden am Morgen genutzt wird.

**Auf einem eigenen Server.** Hier liegt das häufigste Missverständnis:

> Ein kostenloses Modell heißt nicht kostenloser Betrieb. Frei sind die Gewichte — bezahlt wird die Rechenzeit.

Selbst hosten lohnt gegenüber günstigen Modell-Schnittstellen erst ab etwa **50–100 Millionen Token im Monat**. Loadwise erreicht davon im ersten Jahr vermutlich nicht ein Prozent. Bei diesem Volumen ist eine fremdgehostete Schnittstelle nicht teurer, sondern um Größenordnungen billiger — günstige Anbieter liegen bei rund 0.14–0.50 $ pro Million Token.

### 2.2 Ein Modell auf Physiodaten trainieren — nein, und zwar grundsätzlich

**Der entscheidende Grund ist regulatorisch.** Der europaweit maßgebliche Leitfaden MDCG 2019-11 wurde in der Neufassung ausdrücklich um Software erweitert, die **klinische Prognosen oder Vorhersagen** liefert, und ordnet sie höheren Risikoklassen zu. Software mit rein verwaltendem oder Wellness-Zweck fällt nicht darunter.

| | |
|---|---|
| Regelbasiertes Tagebuch | Dokumentiert, strukturiert, zeigt Verläufe. Keine Prognose. |
| Trainiertes Vorhersagemodell | »Dein Rückfallrisiko liegt bei 34 %« — das *ist* eine Prognose. |

Medizinprodukt zu werden bedeutet Konformitätsbewertung, benannte Stelle, Qualitätsmanagementsystem, klinische Bewertung, CE-Kennzeichnung. Für eine Einzelperson ist das kein Aufwand, sondern das Ende des Projekts.

Dazu kommen drei praktische Sperren:

- **Keine Daten.** Physiotherapiedaten sind besonders geschützt; brauchbare öffentliche Datensätze existieren nicht.
- **Eigene Nutzer helfen nicht.** Training mit Gesundheitsdaten braucht gesonderte, ausdrückliche, widerrufbare Einwilligung nach Art. 9 DSGVO — und zum Start gibt es null Nutzer.
- **Keine Zielgröße.** Woran soll gelernt werden? An »hat sich wieder verletzt«? Dafür bräuchte es tausende Menschen über Monate mit bekanntem Ausgang. Das ist eine klinische Studie, kein Nebenprojekt.

Und selbst wenn all das gelöst wäre: Die Regeln aus Abschnitt 4 stammen aus veröffentlichter Forschung mit weit mehr Teilnehmern, als dieses Projekt je haben wird. Ein selbst trainiertes Modell wäre mit hoher Wahrscheinlichkeit **schlechter**.

### 2.3 Ein Chatbot zur Auswertung — richtige Idee, falscher Ort

Technisch trivial: Die Daten eines Nutzers sind wenige Kilobyte und passen komplett in eine Anfrage. Kosten pro Frage: Bruchteile eines Rappens.

Das Problem ist weder Technik noch Geld. **Ein frei formulierender Chatbot in einer Gesundheits-App wird gefragt werden »soll ich morgen trainieren?« — und er wird antworten.** Damit steht genau die Aussage im Produkt, die die gesamte Positionierung vermeidet. Eine Regel kann nicht versehentlich medizinisch beraten; ein Chatbot kann kaum etwas anderes. Erfindet er zudem einmal eine Zahl aus dem Tagebuch, ist die Glaubwürdigkeit weg.

### 2.4 Die Leitlinie

> **KI als Übersetzer ist sicher und billig. KI als Ratgeber ist keines von beidem.**

Eingeplant, aber erst nach Phase 4 und erst bei Einnahmen:

- **Freitext in Felder umwandeln.** »5 km gelaufen, Wade danach ziepig« wird zu Aktivität, Dauer und Beschwerdezeitpunkt — und **dem Nutzer zur Bestätigung gezeigt**, bevor gespeichert wird. Bedient direkt die 30-Sekunden-Vorgabe, Ausgabe überprüfbar.
- **Den Physio-Bericht formulieren.** Aus strukturierten Zahlen lesbare Sätze, vor dem Ausdrucken sichtbar.

Beides sind Umwandlungsaufgaben mit kontrollierbarem Ergebnis. Keine gibt Rat.

---

## 3. Datenmodell

Bewusst klein. Fünf Tabellen.

### `users`
| Feld | Typ | Zweck |
|---|---|---|
| `id` | uuid | |
| `email` | text | Anmeldung per Magic Link |
| `locale` | text | `en` oder `de` |
| `timezone` | text | nur für den Versandzeitpunkt der Erinnerung |
| `created_at` | timestamptz | |

### `episodes`
Eine Verletzungsepisode. Ein Nutzer kann mehrere haben, nacheinander oder parallel.

| Feld | Typ | Zweck |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | |
| `label` | text | frei, z. B. »linke Wade« |
| `body_region` | text | aus fester Liste |
| `side` | enum | `left` · `right` · `both` · `n/a` |
| `sport` | text | aus fester Liste |
| `goal` | text | frei, z. B. »wieder 10 km« |
| `started_on` | date | |
| `ended_on` | date, null | gesetzt bei Abschluss |

### `entries`
Der tägliche Eintrag. **Ein Eintrag pro Episode und Tag**, erzwungen durch einen eindeutigen Index.

| Feld | Typ | Zweck |
|---|---|---|
| `id` | uuid | |
| `episode_id` | uuid | |
| `entry_date` | **date** | lokal ermittelt, nie aus UTC abgeleitet |
| `morning_score` | int 0–10 | Zustand beim Aufstehen **an diesem Morgen** |
| `activity_kind` | text, null | null bedeutet Ruhetag |
| `duration_min` | int, null | |
| `rpe` | int 1–10, null | empfundene Anstrengung |
| `load` | int, generiert | `rpe × duration_min`, sonst 0 |
| `symptom_score` | int 0–10, null | Beschwerden im Zusammenhang mit der Belastung |
| `symptom_timing` | enum, null | `during` · `after` · `evening` |
| `note` | text, null | **nur für Menschen, geht nie in die Rechnung** |

Der entscheidende Kniff: `morning_score` gehört zum Tag, an dem er gemessen wird, beschreibt aber die Reaktion auf den **Vortag**. Damit ist die 24-Stunden-Regel ein simpler Vergleich zwischen zwei benachbarten Zeilen.

### `tests`
| Feld | Typ | Zweck |
|---|---|---|
| `id` | uuid | |
| `episode_id` | uuid | |
| `test_type` | enum | `calf_raise` · `single_hop` · `rom` |
| `tested_on` | date | |
| `value_involved` | numeric | betroffene Seite |
| `value_uninvolved` | numeric | gesunde Seite |
| `lsi` | numeric, generiert | `involved / uninvolved × 100` |

### `flags`
Ergebnisse der Auswertung, gespeichert statt bei jedem Aufruf neu berechnet. Grund: Eine Warnung, die gestern angezeigt wurde, muss heute noch nachvollziehbar sein — auch wenn sich die Regeln inzwischen geändert haben.

| Feld | Typ | Zweck |
|---|---|---|
| `id` | uuid | |
| `episode_id` | uuid | |
| `kind` | enum | `response_24h` · `load_spike` · `asymmetry` |
| `severity` | enum | `green` · `amber` · `red` |
| `for_date` | date | |
| `payload` | jsonb | die Zahlen, mit denen begründet wurde |
| `rule_version` | text | welche Regelfassung das erzeugt hat |

**Datenmenge:** Ein Nutzer erzeugt pro Jahr wenige hundert Zeilen à wenige hundert Byte. Tausend aktive Nutzer liegen bei einigen Megabyte. Das ist für jede Datenbank belanglos — Skalierung ist hier kein Thema und darf keine Entscheidung beeinflussen.

---

## 4. Die Rechenlogik

Alle drei Regeln als reine Funktionen: Zeitreihe rein, Bewertung raus. Kein Zustand, keine Nebenwirkungen, vollständig testbar.

### 4.1 Belastung vereinheitlichen

Problem: Wie vergleicht man 5 km Laufen mit 3×8 Kniebeugen?

Grundlage: **Session-RPE.** In der Sportwissenschaft etabliert und denkbar einfach.

```
load = RPE (1–10) × Dauer in Minuten × Gewebefaktor
```

Der **Gewebefaktor** korrigiert die größte Schwäche des Verfahrens. Ohne ihn zählen 60 Minuten Radfahren genauso wie 60 Minuten Laufen — für eine Achillessehne ein gewaltiger Unterschied, für eine Schulter genau umgekehrt. Der Faktor hängt deshalb an **beidem**, Aktivität und betroffener Körperregion:

| | Achillessehne | Patellasehne | Schulter |
|---|---|---|---|
| Laufen | 1.0 | 0.9 | 0.1 |
| Radfahren | 0.2 | 0.5 | 0.2 |
| Schwimmen | 0.1 | 0.1 | 1.2 |
| Sprünge | 1.5 | 1.4 | 0.3 |

Unbekannte Kombinationen fallen auf 1.0 zurück, nie auf 0 — eine unbekannte Aktivität darf nicht unsichtbar werden.

**Ehrlichkeitshinweis:** Diese Faktoren sind begründete Schätzungen, keine gemessenen Werte. Eine belastbare veröffentlichte Matrix dieser Art existiert nicht. Sie bilden nur die unstrittige grobe Gestalt ab und werden nie als Wissenschaft ausgegeben.

Abgesichert sind deshalb nicht die Werte, sondern die **Ordnungen**: Laufen belastet eine Achillessehne stärker als Radfahren, Schwimmen belastet eine Schulter stärker als Laufen, Oberkörperarbeit ist für eine Achillessehne nahezu belanglos. Eine vertauschte Zeile lässt sechs Tests scheitern; die Zahlen selbst bleiben frei beweglich, bis die Profile Belege dafür bringen.

**Gewichtet und ungewichtet zugleich.** Wer während einer Sehnenreizung vom Laufen aufs Rad wechselt, hat nicht weniger trainiert — nur die Sehne wird weniger belastet. Der Motor führt beide Zahlen mit, weil sonst die Rückkehr zum Laufen als starker Anstieg gemeldet würde und die Person zu Recht erwidert, ihr Training habe sich überhaupt nicht verändert. Das Urteil bleibt richtig, der Satz wird glaubwürdig:

> »Der Wochenumfang ist gegenüber den Vorwochen stark gestiegen (Verhältnis 5.00 — dein Gesamttraining ist dabei praktisch gleich geblieben; der Unterschied liegt in der Wahl der Aktivität).«

*Kritisch angemerkt:* Auch mit Gewebefaktor bleibt es eine Näherung. Für unseren Zweck — Erkennen von Sprüngen im Verlauf — reicht es. Für eine absolute Aussage taugt es nicht, und die treffen wir auch nicht.

### 4.2 Die 24-Stunden-Regel

Die etablierte klinische Faustregel: Nicht der Schmerz während der Belastung entscheidet, sondern ob der Zustand sich binnen 24 Stunden wieder einpendelt.

```
Ausgangswert = Median der morning_score der letzten 14 Tage

Für jeden Tag D mit load > 0:
  reaktion = entry[D+1].morning_score − ausgangswert

  reaktion ≤ 1                         → grün
  reaktion 2–3, wieder normal an D+2   → gelb
  reaktion ≥ 2 und noch erhöht an D+2  → rot
```

**Voraussetzungen, die man kennen muss:**
- Mindestens 14 Tage Daten für einen belastbaren Ausgangswert. Vorher zeigt die App keine Bewertung — sie erfindet keine.
- `entry[D+1]` muss existieren. Fehlt der Folgetag, gibt es keine Bewertung, nicht etwa eine geratene.
- Der Median ist absichtlich gewählt statt des Durchschnitts: Ein einzelner schlechter Tag verschiebt ihn nicht.

### 4.3 Belastungssprünge

Verhältnis der jüngsten Woche zum vorangegangenen Durchschnitt:

```
akut       = Summe load der letzten 7 Tage        (Tag D−6 … D)
chronisch  = Durchschnittswoche der 3 Wochen davor (Tag D−27 … D−7)
verhältnis = akut / chronisch

> 1.5   → rot   (zu schnell gesteigert)
1.3–1.5 → gelb
0.8–1.3 → grün
< 0.8   → gelb  (Abbau — auch das ist eine Information)
```

**Wichtig: die beiden Zeitfenster überlappen sich nicht.** Die verbreitete Variante rechnet die aktuelle Woche auch in den Vergleichszeitraum ein — dieselbe Belastung steht also über *und* unter dem Bruchstrich. Das dämpft jeden Ausschlag und macht es rechnerisch unmöglich, dass der Nenner null ist, während oben etwas steht.

Genau dieser Fall ist aber der klinisch wichtigste: **jemand, der nach langer Pause wieder anfängt.** In der überlappenden Variante wird er nie erkannt. Der Fehler ist in Phase 0 durch einen Test aufgefallen, nachdem die erste Fassung ihn enthielt.

*Kritisch angemerkt:* Dieses Verhältnis ist in der Sportwissenschaft **umstritten** — es gab methodische Kritik an den Ursprungsstudien. Ich nehme es trotzdem, aber ausdrücklich als **Hinweis, nicht als Urteil**. Die App formuliert entsprechend: »Deine Belastung ist diese Woche stark gestiegen« — nicht »du wirst dich verletzen«. Diese Unterscheidung ist auch haftungsrechtlich wichtig.

Braucht 28 Tage Daten. Vorher keine Anzeige.

### 4.4 Asymmetrie — das Alleinstellungsmerkmal

```
LSI = betroffene Seite / gesunde Seite × 100

Einzelwert:
  ≥ 90 %   → grün
  80–90 %  → gelb
  < 80 %   → rot

Verlauf (das eigentlich Wertvolle):
  LSI fällt über 3 aufeinanderfolgende Messungen → Warnung,
  unabhängig vom absoluten Wert
```

Der Verlauf ist wichtiger als der Einzelwert. Genau das ist die Kaskaden-Frühwarnung aus dem Konzept: Nicht »du bist asymmetrisch«, sondern »die Schere öffnet sich seit sechs Wochen«.

Braucht mindestens drei Messungen, also bei zweiwöchigem Rhythmus etwa sechs Wochen. **Das ist der Grund, warum diese Funktion im Fahrplan spät steht — sie kann vorher gar nichts zeigen.**

### 4.5 Schleichende Verschlechterung

Diese Regel entstand nachträglich, weil die 24-Stunden-Regel eine Lücke hat, die man erst sieht, wenn man sie sucht.

Der Ausgangswert ist ein gleitender Median über vierzehn Tage. Werden die Morgenwerte **langsam** schlechter, wächst dieser Median mit: Das »schlecht« von gestern wird zum »normal« von heute, die Abweichung bleibt klein, und die Regel meldet monatelang grün, während es bergab geht.

Der Mensch sieht es genauso wenig — es passiert über Wochen, und wie sich die Wade vor sechs Wochen anfühlte, weiß niemand zuverlässig.

Die Regel beobachtet deshalb den Vergleichswert selbst statt die einzelnen Tage:

```
Vergleiche Median der letzten 14 Tage mit dem der 14 Tage davor.

Anstieg ≥ 2                 → rot
Anstieg ≥ 1                 → gelb
3 steigende Fenster in Folge → gelb, unabhängig von der Höhe
```

Der Nachweis, dass diese Lücke real ist, steckt im Test: Im Szenario »Der Dauerläufer« liefert die 24-Stunden-Regel **35 grüne Urteile in Folge**. Der Test prüft ausdrücklich, dass sie alle grün sind — die Begründung der Regel wird behauptet *und* belegt.

### 4.6 Schmerzmuster

Nutzt den Zeitpunkt der Beschwerden, der bis dahin erfasst, aber von keiner Regel gelesen wurde.

Klinischer Hintergrund bei Sehnen: Schmerz, der zu Beginn da ist und sich einläuft, ist typisch und meist tolerierbar. Schmerz, der **während** der Belastung auftritt oder danach kommt und bleibt, ist das Warnzeichen.

Der Zeitpunkt wird deshalb als geordnete Skala behandelt — näher an der Belastung heißt schlechter:

```
abends (1)  <  danach (2)  <  während (3)

Gewichteter Mittelwert der letzten 21 Tage
gegen die 21 Tage davor.

Verschiebung ≥ +0.4 → gelb
Verschiebung ≤ −0.4 → grün, ausdrücklich als Besserung
```

Gewichtet wird mit der gemeldeten Schmerzstärke. Sitzungen ohne Beschwerden zählen nicht mit — sie tragen keine Zeitpunkt-Information, und als Null gezählt würden sie den Mittelwert zu dem Ende der Skala ziehen, das zufällig die kleinere Zahl trägt.

Der Reiz dieser Regel: **Die Verschiebung kann stattfinden, während die gemeldete Schmerzstärke unverändert bleibt.** Kein Mensch bemerkt das über zwei Monate.

### 4.7 Langzeitverlauf — das absolute Niveau

Ein Prüflauf hat eine Lücke gefunden, die quer durch den ganzen Motor läuft: **Jede Regel liest eine Differenz, keine Höhe.** Wer von 2 auf 8 steigt und dann bei 8 stehenbleibt, bekommt von allen grün — der gleitende Median ist 8, also ist die 24-Stunden-Abweichung null, die Drift null, der Umfang unverändert. Der Motor sagt einem Menschen mit dauerhaft starken Beschwerden, alles sei in Ordnung, und kann gar nicht anders: Ihm fehlt das Wort dafür.

**Die naheliegende Lösung wäre eine klinische Schwelle** — ab 6 von 10 rot. Die müssten wir erfinden. Dafür gibt es in diesem Projekt keine Daten, und eine falsch gesetzte Grenze wäre eine *neue* Quelle falscher Urteile.

Deshalb meldet die Regel **Dauer statt Höhe** und vergleicht die Person nur mit sich selbst:

```
Ausgangswert der ersten 14 Tage der Episode
gegen den der letzten 14 Tage.

Verbesserung ≥ 1                    → grün
Aktuelles Niveau unter 2            → grün (nichts mehr zu verbessern)
sonst                               → gelb
```

»Der Ausgangswert liegt seit zwölf Wochen unverändert bei 8 von 10« ist eine Beschreibung, keine Beurteilung, braucht keine erfundene Grenze — und ist genau das, was von innen niemand bemerkt.

### 4.8 Lastverteilung innerhalb der Woche

Alle übrigen Lastregeln summieren nur. Ob 1152 Lasteinheiten auf einen Samstag fallen oder auf vier Tage, war für jede von ihnen dieselbe Woche.

```
effektive Trainingstage = 1 / Σ (Anteil_i)²

sieben gleiche Tage → 7.0
alles auf einem Tag → 1.0

unter 2.0 → gelb
```

Ein echtes Streuungsmaß über die ganze Woche. Sein üblicher Nachteil ist, dass die Zahl niemandem etwas sagt — und ein unerklärbares Urteil kann sich dieses Produkt nicht leisten. Die Lösung: **Die Zahl wird nie gezeigt.** Sie wird zu einem Satz, weil »effektive Trainingstage« eine Größe ist, die man sich vorstellen kann.

> »Deine Woche entspricht effektiv 1,3 Trainingstagen, obwohl du an 4 Tagen trainiert hast.«

### 4.9 Wo das läuft

Ein einziges TypeScript-Modul ohne Abhängigkeiten, importierbar von Server und Client. Die Regeln sind das Produkt — sie gehören nicht verstreut in Datenbankabfragen oder Oberflächenkomponenten.

**Diese Funktionen bekommen echte Tests mit erfundenen Zeitreihen.** Wenn irgendwo in diesem Projekt Testabdeckung nötig ist, dann hier. Alles andere kann man von Hand prüfen; eine falsche Auswertungsregel merkt niemand.

Umgesetzt mit einem harten Anspruch: **die Regeln liegen bei 100 % Abdeckung in allen vier Maßen** — Anweisungen, Zweige, Funktionen, Zeilen. Der Rest des Moduls bei 98 %.

### 4.10 Der Erreichbarkeitstest

Der wichtigste einzelne Test des Moduls, und die Verallgemeinerung des ersten gefundenen Fehlers:

> Jeder der zwanzig Urteilscodes muss in mindestens einem Szenario tatsächlich vorkommen.

Ein unerreichbarer Codepfad ist damit ein roter Testlauf statt eines stillen Schweigens. **Der Mechanismus hat sich viermal bewährt**, seit es ihn gibt: in der Asymmetrie-Verarbeitung, wo eine Bedingung auf einen Grund prüfte, den die Regel nie zurückgibt; in der Drift-Regel, wo ein Zweig unter der Standardkonfiguration nie erreicht wurde; und zweimal im Kalibrierungslauf, wo ein Schwellenwert nichts entschied, weil das passende Szenario fehlte.

Alle hätten in einer fertigen App jahrelang unbemerkt geschwiegen.

**Die zweite Hälfte fehlte lange.** Geprüft wurde die Erreichbarkeit von *Urteilen*, nie die von »das kann ich nicht beurteilen« — fünf der neun Gründe konnten einen Aufrufer gar nicht erreichen. Ein zweiter Test läuft jetzt über die Blockade-Gründe und verlangt, dass jeder in mindestens einem Szenario beim Nutzer ankommt.

### 4.10a Das Orakel und der Mutationstest

Abdeckung beweist Ausführung, nicht Richtigkeit. Der Prüflauf hat das benannt: `Scenario` trug kein erwartetes Urteil, kein Test behauptete, dass »Deutliche Verschlechterung« nicht grün sein darf, und die einzige Referenz war ein Abzug des jetzigen Verhaltens, den `npm test -- -u` jederzeit neu schreibt.

**`src/expectations.ts`** hält jetzt fest, was jedes Szenario *bedeutet* — als Absichtserklärung, nicht als Beobachtung. **`npm run mutate`** verstellt jede Schwelle absichtlich und fragt, ob das Orakel es merkt. Beide benutzen dieselbe Prüffunktion; wären es zwei, würde »das hätten die Tests gefunden« zur Vermutung.

**Ergebnis: 34 Prozent.** Zwei Drittel des Schwellenraums sind durch die Tests nicht abgesichert. Fast alle Überlebenden sind Grenzwerte — kein Szenario liegt nahe an einer Linie, weshalb bewiesen ist, dass der Motor eindeutige Fälle richtig einordnet, nicht dass er die Linie richtig zieht.

Die Zahl ließe sich trivial anheben und darf es nicht: Ein Szenario mit Verhältnis 1.55 plus die Erwartung »muss rot sein« betoniert die Schwelle in den Test ein und beweist nur noch, dass der Code zu sich selbst passt. Der Prozentsatz misst, wie viel vom Schwellenraum durch Wissen festgelegt ist — er steigt legitim erst mit den Profilen aus [PROTOKOLLE.md](PROTOKOLLE.md).

### 4.11 Der Wahrheitsgehalt der Gesamtaussage

Der schwerste Befund des Prüflaufs: **`overall` konnte grün melden, wenn nichts beurteilt wurde.** Die Zusammenfassung war ein reines Maximum über die Flags, die zufällig übrig blieben, und die 24-Stunden-Schleife verwarf jedes Ergebnis, das sie nicht erreichen konnte — die Kernregel konnte über eine ganze Episode stumm bleiben, ohne dass ihr Name in der Ausgabe auftauchte.

Der Leitsatz der Korrektur:

> **Abdeckung begrenzt die Entwarnung, nie die Warnung.**

Ein Befund steht auf eigenen Beinen. »Alles in Ordnung« ist dagegen eine Aussage über alles, was *nicht* passiert ist — und die verlangt, hingeschaut zu haben. Der Typ `Overall` erzwingt es: An eine Schwere kommt man nur über `status === "judged"`.

### 4.12 Ein Kalendertag ist eine Zeile

Jedes Zeitfenster im Motor misst seine Beweislage, indem es Einträge im Bereich zählt. Ein Duplikat und ein unmögliches Datum wie `2026-03-32` füllten diese Zähler auf — nachgewiesen mit `daysCovered: 29` in einem 28-Tage-Fenster — und wurden zusätzlich doppelt verrechnet. Beim ungültigen Datum kam erschwerend hinzu, dass die Kalenderrechnung es stillschweigend in den April rollt, sodass ein Flag für einen nie gelebten Tag entstehen konnte.

Beides wird jetzt in `episode.ts` an der Tür verworfen. Und die Belastungsspitze normiert über die **tatsächlich belegten** Tage je Fenster statt über eine feste Konstante: Vorher erzeugten Lücken im Vergleichszeitraum ein falsches `sharp-increase` und Lücken in der aktuellen Woche ein falsches `detraining`.

---

## 5. Stack-Empfehlung

### Empfehlung

| Baustein | Wahl | Begründung |
|---|---|---|
| Framework | **Next.js, App Router, TypeScript** | App und Inhaltsseiten in einem Projekt. Die Inhalte sind dein einziger Vertriebsweg — sie müssen mit dem Produkt verzahnt sein, nicht daneben stehen. |
| Sprache | **TypeScript, streng** | Bei Zeitreihen und Datumsrechnung fängt der Compiler eine ganze Fehlerklasse ab. |
| Datenbank & Auth | **Supabase**, Region Frankfurt | Postgres, Anmeldung und Zeilenschutz aus einer Hand. Spart als Einzelperson sehr viel Zeit. EU-Region erfüllt die Datenschutzanforderung. |
| Mehrsprachigkeit | **next-intl** | Ab der ersten Zeile, nicht nachgerüstet. |
| Gestaltung | **Tailwind** | |
| Diagramme | **Selbst gezeichnetes SVG** | Zwei einfache Verlaufskurven. Eine Diagrammbibliothek wiegt mehr, als sie hier nützt. |
| E-Mail | **Resend** | Magic Links und Morgen-Erinnerungen. |
| Bericht als PDF | **Druck-Stylesheet** | Eine Seite, über die Druckfunktion des Browsers. Serverseitige PDF-Erzeugung ist schwer und hier unnötig. |
| Bezahlung | **Stripe hinter einem Schalter** | Eingebaut, ausgeschaltet. |
| Betrieb | **Vercel** | |

### Kritische Anmerkungen zur eigenen Empfehlung

**Next.js ist schwerer, als dieses Projekt braucht.** Der App Router hat eine spürbare Lernkurve, und vieles daran zielt auf Anwendungen, die weit größer sind als diese. Ich empfehle ihn trotzdem, aus einem nüchternen Grund: Es gibt zu keinem Web-Framework mehr Dokumentation und besseren Beistand — was direkt bedeutet, dass ich dir darin besser helfen kann. *Wenn du bereits Erfahrung mit SvelteKit hast, nimm SvelteKit; es ist für diese Größe angenehmer.*

**Vercel hat einen Haken, den man kennen muss:** Der kostenlose Tarif ist für nichtkommerzielle Nutzung gedacht. Solange Loadwise gratis ist, passt das. In dem Moment, in dem die Bezahlschranke angeht, wird ein kostenpflichtiger Tarif fällig — Größenordnung 20 Dollar im Monat. Das ist verkraftbar, sollte aber keine Überraschung sein.

**Supabase pausiert Datenbanken im Gratistarif nach längerer Inaktivität.** In der Anfangszeit mit wenig Verkehr kann das zu langen Ladezeiten beim ersten Aufruf führen. Lösbar, aber ein bekannter Stolperstein.

### Was ich bewusst weglasse

- **Kein lokal-zuerst-Ansatz mit Offline-Synchronisierung.** Reizvoll für ein Tagebuch, aber Konfliktauflösung ist eine eigene Baustelle. Stattdessen: optimistisches Schreiben, damit sich der Eintrag sofort erledigt anfühlt.
- **Keine eigene Nutzerverwaltung mit Passwörtern.** Magic Link per E-Mail. Nichts zu speichern, nichts zu verlieren.
- **Keine Zustandsbibliothek, keine Komponentensammlung, kein Monorepo.** Alles davon kostet mehr Zeit, als es bei dieser Größe spart.

---

## 6. Betriebskosten

| Posten | Kosten anfangs | Ab wann teurer |
|---|---|---|
| Betrieb (Vercel) | 0 | ~20 $/Monat, sobald kommerziell |
| Datenbank (Supabase) | 0 | ~25 $/Monat ab ernsthafter Nutzung |
| E-Mail (Resend) | 0 | ab ~3 000 Mails/Monat |
| Domain | ~15 $/Jahr | — |
| **Summe zum Start** | **praktisch null** | |

Das erfüllt die Konzeptvorgabe: Der Betrieb wächst nicht mit der Nutzerzahl mit, solange keine Aufrufe von Sprachmodellen im Spiel sind. **Das ist der wichtigste Grund, die Auswertung regelbasiert zu halten.**

---

## 7. Datenschutz

Beschwerden und Verletzungen sind besonders schützenswerte Daten — nach DSGVO wie nach dem revidierten Schweizer Datenschutzgesetz.

**Fest eingeplant:**

1. **Datenhaltung in der EU.** Supabase-Region Frankfurt.
2. **Datensparsamkeit.** Keine Klarnamen, kein Geburtsdatum, keine Diagnosen im Freitext, wenn sie nicht gebraucht werden. E-Mail-Adresse und Körperregion reichen.
3. **Zeilenschutz in der Datenbank.** Zugriff nur auf eigene Daten, erzwungen auf Datenbankebene statt in der Anwendungslogik. Ein Fehler in der Oberfläche darf niemals fremde Daten offenlegen.
4. **Export und Löschung von Anfang an.** Beides Pflicht, beides billig, wenn man es früh baut, und teuer, wenn man es nachrüstet.
5. **Keine Auswertungsdienste Dritter im angemeldeten Bereich.** Reichweitenmessung nur auf den öffentlichen Inhaltsseiten, und dort ohne Cookies.

---

## 8. Umsetzungsplan

### Phase 0 — Die Regeln zuerst, ohne jede Oberfläche

**Das ist der wichtigste Ratschlag in diesem ganzen Dokument.**

Bevor eine einzige Seite gebaut wird: das Auswertungsmodul aus Abschnitt 4 als reine TypeScript-Funktionen schreiben, mit Tests. Dann **deine eigenen handschriftlichen Tagebuchdaten** hineinkippen.

Aufwand: ein bis zwei Abende.

Was du dafür bekommst: die Antwort auf die einzige Frage, an der das ganze Produkt hängt — **sagen diese Regeln auf echten Daten etwas Nützliches?** Wenn die Auswertung nur Offensichtliches ausspuckt oder wild flackert, ist Loadwise tot, und du hast zwei Abende verloren statt acht Wochen.

Keine andere Reihenfolge testet so viel Risiko so billig.

### Phase 1 — Woche 1–2: Eintragen und sehen
Projektaufbau, Datenbank, Anmeldung per Magic Link, Episode anlegen, Tageseintrag, Verlaufskurve. Mehrsprachigkeit von Anfang an mitgeführt.
*Ergebnis: Du selbst kannst dein Tagebuch darin führen.*

### Phase 2 — Woche 3–4: Auswertung
Regelmodul aus Phase 0 anschließen, Ergebnisse als `flags` speichern, Bewertungen anzeigen und begründen.
*Ergebnis: Die App sagt etwas, das man selbst nicht sieht.*

### Phase 3 — Woche 5–6: Tests und Asymmetrie
Geführte Selbsttests, LSI-Berechnung, Verlaufsbeobachtung, Warnung bei sich öffnender Schere.
*Ergebnis: Das Alleinstellungsmerkmal steht.*

### Phase 4 — Woche 7–8: Aus dem Werkzeug wird ein Produkt
Physio-Bericht per Druckansicht, Erinnerungen per E-Mail und Push, Startbildschirm-Anleitung, Export und Löschung, englische Fassung vollständig, Bezahlschranke gebaut und ausgeschaltet.
*Ergebnis: Fremde Menschen können es benutzen.*

### Durchgehend ab Woche 1
Inhalte schreiben. Nicht später.

---

## 9. Zuerst prüfen, bevor irgendetwas gebaut wird

1. **Phase 0 durchziehen.** Regeln gegen deine echten Daten. Alles andere hängt daran.
2. **Push auf deinem eigenen iPhone testen** — falls du eines hast. Zehn Minuten, und du weißt, wie unangenehm die Hürde wirklich ist.
3. **`loadwise` als Domain prüfen**, bevor der Name irgendwo auftaucht.

---

## 10. Offene technische Entscheidungen

- **Push oder nur E-Mail zum Start.** Push ist mehr Arbeit; E-Mail allein könnte für Phase 1 bis 3 reichen, solange du selbst der einzige Nutzer bist.
- **Eine oder mehrere Episoden gleichzeitig.** Das Datenmodell kann beides. Die Oberfläche wird deutlich einfacher, wenn zunächst nur eine aktive Episode erlaubt ist — und dein eigener Verlauf, Wade und dann Knie, spricht eigentlich für mehrere. Bewusst entscheiden, nicht schleifen lassen.

---

*Arbeitsdokument, wird fortgeschrieben. Kein medizinisches Dokument.*
