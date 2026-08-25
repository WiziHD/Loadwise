# Belastbar

> Ein Begleiter für die 167 Stunden pro Woche, in denen kein Physiotherapeut danebensteht.

| | |
|---|---|
| **Stand** | 20. August 2026 |
| **Phase** | Konzept — abgeschlossen bis auf Abschnitt 15 |
| **Plattform** | Web-App, englisch- und deutschsprachig |
| **Zeitbudget** | 10–20 h/Woche |
| **Arbeitstitel** | Belastbar — Namensfindung läuft |

---

## 1. Kurzfassung

**Belastbar** ist eine Web-App für Menschen, die nach einer Verletzung zurück in ihren Sport wollen. Sie ersetzt keine Physiotherapie — sie füllt die Zeit dazwischen.

Der Kern ist bewusst *keine* Sammlung von Übungen, sondern die Steuerung der Belastung: wie viel, wie oft, wann mehr, wann zurück. Dazu kommt die frühzeitige Erkennung von Ausweichmustern, aus denen die nächste Verletzung an anderer Stelle entsteht.

Zielgruppe sind Betroffene selbst, die ihren Sport ernst nehmen und nach der Entlassung aus der Physiotherapie allein dastehen. Der Start erfolgt kostenlos; die Monetarisierung ist vorbereitet, aber abgeschaltet.

---

## 2. Das Problem

Ausgangspunkt ist eine reale Verletzungsgeschichte: Tendinose im Musculus soleus durch Überlastung, neun Monate Rehabilitation — verlängert dadurch, dass trotz laufender Physiotherapie vieles falsch gemacht wurde. Anschließend eine Entzündung der Patellasehne, ausgelöst durch muskuläre Dysbalancen, die dazu führten, dass die Kniescheibe nicht mehr gerade läuft.

Die Recherche zeigt: kein Einzelfall, sondern der Normalfall.

| Befund | Wert | Bedeutung |
|---|---|---|
| Adhärenz bei Heimübungsprogrammen (23 Studien, gepoolt) | **21 %** | Vier von fünf machen nicht, was verordnet wurde |
| Nichtbefolgung je nach Patientengruppe | **bis 70 %** | Kein Randproblem, sondern der Regelfall |
| Rezidivrate Achillessehne, Spitzenfußball | **27 %** | Jede vierte Rückkehr scheitert |
| Lebenszeitprävalenz bei Mittel- und Langstreckenläufern | **52 %** | Jeden Zweiten trifft es einmal |
| Prävalenz bei Sportlern allgemein | **24 %** | Großer, ständig nachwachsender Kreis |

Fachliche Einordnung: **Tendinopathie gilt im Kern als Lastmanagement-Problem.** Die meisten Betroffenen beschreiben eine plötzliche Laststeigerung bei unzureichender Erholung; die zu frühe Rückkehr zählt zu den häufigsten Rückfallursachen.

---

## 3. Der eigentliche Befund

> **Nicht die 30 Minuten beim Physiotherapeuten sind das Problem. Die anderen 167 Stunden der Woche sind es.**

Dort passiert alles, was den Verlauf bestimmt: falsche Ausführung, falsche Dosis, zu früh zu viel, zu lange Pause, eine Alltagsbelastung, die den Fortschritt zunichtemacht. Und dort ist niemand.

### Die Kaskade

Der zweite Befund ist der wertvollere, weil ihn kein vorhandenes Produkt adressiert. Erste Verletzung führt zu Ausweichbewegung, Ausweichbewegung zu Dysbalance, Dysbalance zur zweiten Verletzung an anderer Stelle. Wade, dann Knie.

**Niemand beobachtet diese Kette.** Die Physiotherapie behandelt, was gerade schmerzt. Bestehende Apps zeigen Übungen für die betroffene Stelle. Dass sich über Wochen eine Schieflage aufbaut, die später woanders zuschlägt, sieht niemand — weil es über Monate und über Körperregionen hinweg passiert. Genau darin ist der Mensch schlecht und Software gut.

---

## 4. Was es ausdrücklich nicht ist

Drei Abgrenzungen, jede aus einer Recherche abgeleitet, die eine frühere Produktidee gekippt hat.

| Nicht | Begründung |
|---|---|
| **Keine Übungsbibliothek** | Physitrack bedient 110 000 Behandelnde in 174 Ländern mit 18 000 Übungen und medizinischer Zertifizierung. Dieser Wettbewerb ist weder zu gewinnen noch nötig. |
| **Keine Videoanalyse der Ausführung** | Die Messung des Knievalgus per Kamera weist einen Fehler von 18–19 Grad auf. Mindestens elf Anbieter versuchen es trotzdem. Genau dort ist eine frühere Idee gescheitert. |
| **Keine medizinische Behandlung** | Wir diagnostizieren nicht und verordnen keine Protokolle. Wir strukturieren, dokumentieren und machen sichtbar — auf Grundlage dessen, was die behandelnde Person ohnehin vorgegeben hat. |

Jede dieser Abgrenzungen entfernt gleichzeitig einen übermächtigen Wettbewerber, ein technisches Risiko und eine Haftungsfrage.

---

## 5. Die universelle Schicht

Die Entscheidung, alle Verletzungsarten zu bedienen statt nur eine, trägt aus einem bestimmten Grund: **Lastmanagement ist von Natur aus verletzungsunabhängig.** Was sich zwischen einem Kreuzbandriss und einer Tendinose unterscheidet, sind die konkreten Protokolle — und die kommen ohnehin von der behandelnden Person, nicht von uns.

Vier Prinzipien gelten für alle. Sie bilden den Produktkern.

| Prinzip | Was die Software daraus macht |
|---|---|
| **Progressive Belastung** | Steigerung nachvollziehbar planen statt nach Gefühl — und dokumentieren, was tatsächlich passiert ist. |
| **Schmerzreaktion nach 24 Stunden** | Die etablierte Entscheidungsregel: Nicht der Schmerz während der Belastung zählt, sondern der Zustand am nächsten Morgen. Über Monate im Kopf nicht zu behalten, für Software trivial. |
| **Seitenasymmetrie** | Regelmäßige Selbsttests im Seitenvergleich. Öffnet sich die Schere, ist das die Frühwarnung vor der Kaskade. |
| **Belastungsspitzen** | Verhältnis der letzten Woche zum Durchschnitt der Vorwochen. Der klassische Auslöser ist der plötzliche Sprung, nicht die absolute Höhe. |
| **Schleichende Verschlechterung** | Der Vergleichswert selbst im Blick: Wird es über Wochen langsam schlechter, ohne dass ein einzelner Tag auffällt? |
| **Schmerzmuster** | Wandert der Schmerz näher an die Belastung heran — abends, dann danach, dann während? |
| **Lastverteilung** | Hängt die ganze Wochenlast an ein, zwei Tagen? |
| **Langzeitverlauf** | Hat sich seit Beginn der Episode überhaupt etwas gebessert? |

Die letzten beiden entstanden während der Umsetzung. Die schleichende Verschlechterung schließt eine Lücke in der 24-Stunden-Regel: Steigen die Morgenwerte langsam, wächst der Vergleichswert mit und die Regel verstummt. In einem Prüfszenario liefert sie 35 grüne Tagesurteile am Stück, während es messbar bergab geht.

**Technisches Risiko:** Keines dieser Prinzipien braucht Bildverarbeitung, Sensorik oder Modelle mit unklarer Genauigkeit. Es braucht strukturierte Erfassung, saubere Zeitreihen und klar formulierte Regeln. Diesmal ist die Technik nicht das Risiko.

---

## 6. Was erfasst wird

Leitsatz: **Jedes Feld muss eine Frage beantworten, die die App später stellt.** Nichts wird „für alle Fälle" erhoben — jedes zusätzliche Feld senkt die Wahrscheinlichkeit, dass morgen wieder ein Eintrag kommt.

### Einmalig, beim Start

- Verletzung, betroffene Körperregion, betroffene Seite
- Datum des Beginns
- Sportart und konkretes Ziel (»wieder 10 km laufen«, »wieder 140 kg Kniebeuge«)
- Ob eine Behandlung läuft, und was dort vorgegeben wurde

### Täglich, in unter 30 Sekunden

- **Zustand beim Aufstehen:** 0–10, eigenes Feld
- **Belastung:** Aktivität, Dauer, empfundene Anstrengung 1–10
- **Beschwerden zur Einheit:** Stärke 0–10
- **Zeitpunkt der Beschwerden:** während · direkt danach · abends
- **Kontext, optional:** Schlaf grob, ungewöhnliche Alltagsbelastung

Zwei dieser Felder tragen je eine eigene Regel, und sie dürfen nicht verwechselt werden:

**Der Zustand beim Aufstehen** ist ein eigenständiges Feld und die Grundlage der 24-Stunden-Regel. Er wird an dem Morgen erfasst, an dem er gefühlt wird, beschreibt aber die Reaktion auf den Vortag — dieser Versatz macht die Regel zu einem simplen Vergleich zweier benachbarter Zeilen.

**Der Zeitpunkt der Beschwerden** ist etwas anderes: Er beschreibt, wo im Verlauf der Einheit der Schmerz sitzt, und trägt die Schmerzmuster-Regel. Wandert er über Wochen näher an die Belastung heran, ist das ein Warnzeichen — auch wenn die gemeldete Stärke gleich bleibt.

*Frühere Fassungen dieses Dokuments führten beides in einem Feld zusammen. Beim Bauen zeigte sich, dass zwei getrennte Felder zuverlässiger sind und zwei verschiedene Fragen beantworten.*

### Periodisch, alle ein bis zwei Wochen

Geführte Selbsttests im Seitenvergleich, ohne Geräte durchführbar:

- Einbeiniger Wadenheber, Wiederholungen bis zur Erschöpfung
- Einbeiniger Sprung, Weite
- Schmerzfreier Bewegungsumfang

Das ist der einzige objektive Fortschrittsbeleg, den ein Betroffener selbst erheben kann — und der direkte Rohstoff für die Asymmetrie-Warnung.

---

## 7. Funktionen

| Funktion | Zweck | Stufe |
|---|---|---|
| **Belastungstagebuch** | Tageseintrag in unter 30 Sekunden | Kern |
| **24-Stunden-Auswertung** | War die Belastung verträglich, grenzwertig oder zu viel | Kern |
| **Verlaufskurve** | Belastung und Beschwerden über Wochen in einem Bild | Kern |
| **Selbsttests** | Geführte Tests im Seitenvergleich, objektiver Fortschrittsbeleg | Kern |
| **Asymmetrie-Warnung** | Meldet die sich öffnende Schere — das Alleinstellungsmerkmal | Kern |
| **Drift-Warnung** | Meldet schleichende Verschlechterung, die kein einzelner Tag zeigt | Kern |
| **Schmerzmuster-Warnung** | Meldet, wenn der Schmerz näher an die Belastung rückt | Kern |
| **Lastverteilungs-Warnung** | Meldet, wenn die Wochenlast auf zu wenigen Tagen liegt | Kern |
| **Langzeit-Warnung** | Meldet, wenn sich über Wochen nichts gebessert hat | Kern |
| **Physio-Bericht** | Eine Seite zum Mitnehmen zum Termin | Kern |
| Erinnerungen | Ohne tägliche Einträge kein Verlauf | Später |
| Belastungsplanung | Vorschlag für die kommende Woche | Später |
| Wearable-Anbindung | Automatische Lasterfassung | Nicht jetzt |
| Übungsbibliothek, Videoanalyse, Community | Bewusst ausgeschlossen, siehe Abschnitt 4 | Nicht jetzt |

---

## 8. Der erste Eindruck

Das größte Risiko dieses Produkts ist nicht die Technik und nicht der Wettbewerb. **Es ist, dass morgen kein zweiter Eintrag kommt.**

Ein Tagebuch hat am ersten Tag naturgemäß keinen Wert — der Wert entsteht aus der Zeitreihe. Diese Lücke muss das Produkt bewusst überbrücken:

- **Erster Eintrag ohne Konto.** Registrierung erst, wenn jemand die Daten behalten will.
- **Sofortige Struktur statt sofortiger Erkenntnis.** Nach dem ersten Eintrag zeigt die App keine erfundene Auswertung, sondern die konkrete Frage für morgen früh: »Wie fühlt sich die Stelle beim Aufstehen an?« Das ist ehrlich und liefert trotzdem sofort etwas.
- **Das Versprechen sichtbar machen.** Von Tag 1 an ist erkennbar, was nach 7 und nach 14 Tagen freigeschaltet wird. Der Fortschrittsbalken trägt die Motivation, bis die echte Auswertung greift.
- **Erinnerung am Morgen, nicht am Abend.** Die 24-Stunden-Reaktion wird beim Aufstehen erfasst.

---

## 9. Geschäftsmodell

**Entscheidung: Der Start ist kostenlos.** Die zahlpflichtige Ebene wird mitentwickelt, bleibt aber abgeschaltet.

### Warum das vertretbar ist

Bei rein organischer Nutzergewinnung ist jede Hürde teuer. Ein kostenloses Tagebuch ist gleichzeitig Produkt, Werbung und Empfehlungsgrund. Und solange die Auswertung nicht nachweislich etwas zeigt, das man selbst nicht sieht, wäre eine Bezahlschranke ohnehin nicht zu rechtfertigen.

### Warum es gefährlich ist

»Gratis, bis wir viele Nutzer haben« ist die häufigste Art, wie ein Produkt nie Geld verdient. Kostenlose Nutzer sind kein Beweis für ein Geschäft — sie beweisen nur, dass etwas kostenlos ist. Wer die Bezahlschranke erst nach Jahren einzieht, hat bis dahin eine Nutzerbasis herangezogen, die aus Menschen besteht, die nicht zahlen wollen.

### Die drei Vorkehrungen

1. **Die zahlpflichtige Ebene steht von Anfang an fest.** Kostenlos bleiben Tagebuch, Verlauf und Selbsttests. Kostenpflichtig werden die 24-Stunden-Auswertung, die Asymmetrie-Warnung und der Physio-Bericht. Technisch wird das ab dem ersten Tag als Schalter gebaut, nicht später nachgerüstet.

2. **Der Auslöser ist jetzt festgelegt, nicht »irgendwann«.** Die Bezahlschranke geht an, sobald **50 Personen mindestens 30 Tage lang Einträge gemacht haben**. Diese Zahl misst das Richtige: nicht Anmeldungen, sondern durchgehaltene Nutzung.

3. **Zahlungsbereitschaft wird früh erfragt, nicht geraten.** Ab dem ersten Tag steht eine sichtbare, ehrliche Frage im Produkt: Was wäre dir das wert? Antworten sind kein Beweis, aber besser als Vermutungen — und wir erfahren es Monate früher.

### Rechnung für später

| Posten | Wert |
|---|---|
| Abopreis pro Monat | CHF 12 |
| Typische Nutzungsdauer | 4–8 Monate |
| **Ertrag pro Nutzer** | **CHF 48–96** |

Daraus folgt zwingend: **Bezahlte Werbung ist ausgeschlossen** — die Gewinnungskosten würden den Ertrag übersteigen. Organische Gewinnung ist keine Vorliebe, sondern eine Rechenbedingung.

**Kostenseite:** Solange nichts hereinkommt, zahlst du den Betrieb. Er muss deshalb bei wenigen Franken im Monat liegen und darf nicht mit der Nutzerzahl explodieren.

---

## 10. Sprache

**Englisch ist Hauptsprache, Deutsch die zweite.**

- **Technisch:** Mehrsprachigkeit ab der ersten Zeile Code. Nachträglich einzubauen ist teuer und fehleranfällig — eine der wenigen Entscheidungen, die sich später kaum korrigieren lässt.
- **Inhaltlich, ehrlich:** Dein größter Vorteil ist deine eigene Geschichte, und die trägst du auf Deutsch im Kopf. Überzeugende Langtexte auf Englisch zu schreiben ist für Nicht-Muttersprachler deutlich schwerer.
- **Daraus folgt ein Vorgehen:** Text zuerst auf Deutsch schreiben, dann sorgfältig ins Englische übertragen. Nebeneffekt: Im deutschsprachigen Raum ist der Wettbewerb um genau diese Suchanfragen geringer als im englischen. Gut möglich, dass die ersten echten Nutzer deutschsprachig sind, obwohl das Produkt englisch geführt wird.

---

## 11. Nutzergewinnung

Ohne Werbebudget bleibt genau ein Weg: gefunden werden, wenn jemand sucht.

Der Vorteil gegenüber allen bisher geprüften Ideen: Verletzte suchen **hochspezifisch und mit klarer Absicht**. »Wieder Kreuzheben nach Bandscheibenvorfall«, »Wadenschmerz kommt nach dem Laufen zurück«, »how long does soleus tendinopathy take«. Das sind lange, konkrete Anfragen — kein Kampf um überlaufene Hauptbegriffe.

**Der persönliche Vorteil:** Neun Monate Soleus-Tendinose und eine anschließende Patella-Kaskade sind genau der Rohstoff, aus dem diese Inhalte bestehen — geschrieben von jemandem, der es durchgemacht hat, statt von einer Agentur. Das ist der erste echte unfaire Vorteil in diesem Projekt.

**Der Preis dafür:** zusätzliche Arbeit neben dem Bauen, mit Wirkung erst nach Monaten. Wer diesen Teil nicht macht, hat ein Produkt ohne Nutzer.

### Nachtrag 25.08.2026 — der Satz oben war richtig und ist nicht befolgt worden

**Es existiert keine einzige Zeile Inhalt.** Ein Jahr Vorlauf, den dieses Konzept selbst als den längsten von allen bezeichnet, ist bisher nicht angelaufen.

Und zwei Befunde kommen dazu, die beim Nachsehen aufgefallen sind:

**Wer heute abgemeldet auf die Startseite kommt, sieht Name, Untertitel und einen Knopf »Anmelden«.** Das ist keine Landingpage. Jeder Besucher aus einer Suchmaschine stünde vor einer Anmeldung für ein Produkt, über das er nichts weiss — der Verkehr wäre verschwendet, bevor er entsteht. **Die Landingpage ist deshalb keine Ergänzung zur Inhaltsarbeit, sondern deren Voraussetzung.**

**Das Produkt heisst an zwei Orten verschieden.** Abschnitt 15 nennt »Belastbar« als Arbeitstitel, Code und README sagen »Loadwise«. Eine Landingpage für ein Produkt mit zwei Namen gibt es nicht; die Entscheidung aus Abschnitt 15 ist damit von »offen« zu »blockierend« geworden.

Beides hat jetzt eine eigene Bahn im Fahrplan, statt als Zeile mitzulaufen.

---

## 12. Ausbaustufe: Prävention

Geplante zweite Stufe: **sportartspezifische Verletzungsvorbeugung.**

### Warum das strategisch stärker ist, als es klingt

Das Reha-Produkt hat ein eingebautes Loch: **Wer gesund wird, geht.** Genesung ist gleichzeitig der Erfolg und der Abgang. Bei rein organischer Gewinnung bedeutet das einen Eimer, der unten ständig ausläuft.

Prävention schließt genau dieses Loch. Der natürliche nächste Schritt nach einer überstandenen Verletzung ist: nie wieder. Wer neun Monate verloren hat, ist die am stärksten motivierte Zielgruppe für Vorbeugung, die es gibt — und sie ist bereits im Produkt.

### Warum sie trotzdem nicht am Anfang steht

Prävention verkauft sich schlecht an Neukunden: Ohne akuten Schmerz gibt es keine Dringlichkeit. Menschen zahlen zuverlässig dafür, ein Problem zu beheben, und unzuverlässig dafür, eines zu vermeiden.

> **Prävention ist ein starkes Bindungsprodukt und ein schwaches Gewinnungsprodukt.** Deshalb kommt sie an zweiter Stelle — nie als Aufhänger.

### Technisch dieselbe Maschine

Dieselben vier Prinzipien aus Abschnitt 5, nur vor der Verletzung statt danach: Belastungsspitzen erkennen, Asymmetrien früh sehen, Steigerung dosieren. Der sportartspezifische Teil liegt nicht in der Logik, sondern in der Testbatterie — Laufen, Klettern und Kraftsport haben unterschiedliche Risikoprofile und brauchen unterschiedliche Tests.

**Zeitpunkt:** erst wenn das Reha-Produkt nachweislich funktioniert und Nutzer es durchhalten. Nicht vorher.

---

## 13. Risiken

| Risiko | Schwere | Umgang |
|---|---|---|
| **Der zweite Eintrag bleibt aus.** Tagebuchprodukte scheitern genau hier. | hoch | Eintrag unter 30 Sekunden, Erinnerung am Morgen, sichtbares Versprechen für Tag 7 und 14. Siehe Abschnitt 8. |
| **Medizinische Haftung.** Belastungsempfehlungen sind medizinnah, die Breite über alle Verletzungsarten verschärft das. | hoch | Konsequente Positionierung als Dokumentations- und Strukturwerkzeug. Keine Protokolle, keine Diagnosen, keine Freigaben. Vor dem Start rechtlich prüfen lassen. |
| **Nutzergewinnung.** Rein organisch, also langsam, abhängig von durchgehaltener Schreibarbeit. | hoch | Ab Woche 1 schreiben, parallel zum Bauen. |
| **Nie zu Geld kommen.** Gratis-Start ohne Auslöser wird dauerhaft gratis. | hoch | Auslöser aus Abschnitt 9 einhalten: 50 Personen mit 30 Tagen Einträgen. |
| **Auslaufender Eimer.** Genesene Nutzer verschwinden. | mittel | Präventionsstufe aus Abschnitt 12 als Anschluss. |
| **Breite des Anwendungsbereichs** verwässert die Ansprache. | mittel | Produkt breit, Vermarktung schmal: Software für alles, Inhalte starten bei Sehnen. |
| **Gesundheitsdaten** sind besonders schützenswert. | mittel | Datensparsam bauen, Speicherort Schweiz oder EU, keine Weitergabe. Von Anfang an. |

---

## 14. Erfolgsmessung

Ohne Umsatz braucht es andere Messgrößen. Anmeldungen gehören ausdrücklich nicht dazu — sie sind die verführerischste und nutzloseste Zahl.

| Frage | Messgröße | Zielmarke für den Anfang |
|---|---|---|
| Kommt der zweite Eintrag? | Anteil mit mindestens 7 Tagen | 40 % |
| Hält jemand durch? | Anteil mit mindestens 30 Tagen | 20 % |
| Erreicht jemand die Auswertung? | Anteil mit erster 24-Stunden-Bewertung | 60 % |
| Trägt es nach außen? | Anteil, der den Physio-Bericht erzeugt | 15 % |
| Zeigt es etwas Neues? | Qualitativ: Sagt jemand »das wusste ich nicht«? | Direkt fragen |

Die letzte Zeile ist die wichtigste und die einzige, die sich nicht automatisch erheben lässt. Sie entscheidet, ob das Produkt mehr ist als ein besseres Notizbuch.

---

## 15. Offene Entscheidungen

- **Name.** »Belastbar« ist Arbeitstitel; Auswahl läuft. Domain und Marke ungeprüft.
- **Rechtliche Prüfung.** Wer schaut sich die Positionierung an, bevor echte Nutzer damit arbeiten.
- **Technische Basis.** Noch nicht festgelegt — bewusst, weil sie sich aus den Funktionen ergibt und nicht umgekehrt. Randbedingungen: mehrsprachig ab Tag 1, Betriebskosten nahe null, Datenhaltung Schweiz oder EU.

---

## 16. Fahrplan

Grobe Reihenfolge, keine Terminzusage. Am Ende jedes Abschnitts steht etwas Benutzbares.

| Zeitraum | Ergebnis |
|---|---|
| **Jetzt** | Name wählen, technische Basis festlegen. Danach erst Code. |
| **Woche 1–2** | Tagebuch und Verlauf. Der kleinste Stand, der für dich selbst nützlich ist. |
| **Woche 3–4** | Auswertung: 24-Stunden-Regel und Belastungsspitzen. Ab hier sagt die App etwas, das man selbst nicht sieht. |
| **Woche 5–6** | Selbsttests und Asymmetrie-Warnung. Erst jetzt unterscheidet sich das Produkt von einem besseren Notizbuch. |
| **Woche 7–8** | Konto, Physio-Bericht, Mehrsprachigkeit fertigstellen. Bezahlschranke gebaut, aber aus. |
| **Eigene Bahn, ab sofort** | Design, Landingpage, technisches SEO, Inhalte. Siehe [FAHRPLAN.md](FAHRPLAN.md), Abschnitt »Die Aussenspur«. Stand als Fussnote hier und ist deshalb ein Jahr lang nicht passiert. |
| **Danach** | Präventionsstufe, sobald die Bindungszahlen aus Abschnitt 14 stimmen. |

---

## Sofortmaßnahme, unabhängig vom Bauen

Führe das Tagebuch ab jetzt **von Hand** — Papier oder Notiz-App. Datum, Belastung, Beschwerden 0–10, Zustand am nächsten Morgen.

Zwei Gründe: Du merkst innerhalb von zwei Wochen, ob das Konzept in der Praxis trägt, und du hast echte Daten zum Testen, sobald die erste Version läuft. Das ist die billigste Validierung, die zu haben ist.

---

*Arbeitsdokument, wird fortgeschrieben. Alle Zahlen stammen aus recherchierten Quellen und sind im Gesprächsverlauf belegt. Kein medizinisches Dokument.*
