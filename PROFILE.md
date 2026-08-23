# Die Profile

**Neun recherchierte Verletzungsprofile, Stand 21.08.2026.**

Dieses Dokument ist die Übersicht. Die vollständige Recherche zum Achillesprofil steht in [PROFIL-ACHILLES.md](PROFIL-ACHILLES.md); für die übrigen acht liegt sie in den `evidence`-Feldern des jeweiligen Profils unter `engine/src/profiles/` — jede Zahl mit Grad, Quelle und Strittig-Kennzeichen.

---

## Was ein Profil ist

Drei Schichten, damit ein Kernfehler einmal behoben wird und nicht siebzigmal:

```
Kern      die sieben Regeln, Orchestrierung, Abdeckung, Eingabeprüfung
Profil    Tests · Gewebefaktoren · Schwellen · Zeithorizont · Warnzeichen · Evidenzgrad
Zusatz    optionaler Steckplatz für Verletzungen mit eigener Logik — bislang leer
```

Ein Profil gilt als **recherchiert**, sobald ein einziger Wert über Evidenzgrad D liegt. Dann greift die volle Checkliste: Warnzeichen, Zeithorizont, ausformulierte Grenzen, eigene Version, Quellenangabe zu jedem Grad. Ein halbfertiges Profil kann nicht aussehen, als trüge es Wissen.

---

## Die neun

| Profil | Region | Selbsttests | Verschobene Schwellen |
|---|---|---|---|
| **Achillessehne, Mittelabschnitt** | `achilles` | Fersenheber · Sprung · Beweglichkeit | — |
| **Schienbeinkante** | `calf` | Fersenheber · Beweglichkeit | `greenMaxDelta 0` · `settledWithin 0` · `minWeeks 4` |
| **Patellasehne** | `patella` | Sprung · Beweglichkeit | — |
| **Patellofemorales Syndrom** | `knee` | Sprung · Beweglichkeit | — |
| **Nach Kreuzbandplastik** | `knee` | Sprung · Beweglichkeit | — |
| **Ischiocrurale Muskulatur** | `hamstring` | Sprung · Beweglichkeit | `minWeeks 4` |
| **Gluteale Sehnenansätze** | `hip` | Sprung · Beweglichkeit | — |
| **Plantarfaszie** | `foot` | Fersenheber · Beweglichkeit | — |
| **Rotatorenmanschette** | `shoulder` | Beweglichkeit | — |

Noch generisch: Ellenbogen, Rücken, nicht näher bestimmt.

**Zwei Profile teilen sich `knee`.** Dafür musste die Registry von Körperregion auf Profilschlüssel umgebaut werden — bei rund siebzig klinisch sinnvollen Kombinationen und elf Regionen war die alte Form ohnehin nicht tragfähig.

---

## Was jedes Profil an den Tag gebracht hat

### Achillessehne — die 24-Stunden-Regel ist belegt, aber anders als erwartet

Silbernagel 2007, RCT mit 38 Personen, in Leitlinien eingegangen. Aber wörtlich: *„No significant differences in the rate of improvements were found between the groups."*

**Das Modell ist als gleichwertig belegt, nicht als überlegen.** Wer überwacht weitertrainiert, heilt nicht schneller — er heilt nicht langsamer. Der Motor darf nie andeuten, Weitertrainieren beschleunige die Heilung.

Unstrittig über alle Quellen: Schmerz muss bis zum nächsten Morgen auf den Ausgangswert zurück, und darf von Woche zu Woche nicht steigen. Das sind genau `response24h` und `baselineDrift` → beide Prinzipien Grad **A**.

Korrigierte Zahl: `plyometric` von 1,5 auf **1,2**, weil Laufen, Springen und Hüpfen in einer Gruppe von 5,13–6,35 Körpergewichten berichtet werden — die Gruppe spannt nur den Faktor 1,24.

### Schienbeinkante — das Profil, das die zentrale Regel des Motors verschiebt

`PROTOKOLLE.md` §5 hatte die Frage offen gelassen: *„Ist die 24-Stunden-Regel hier überhaupt die richtige Entscheidungsregel? Bei Sehnen ja — bei einer Knochenstressreaktion womöglich nicht."*

**Die Antwort ist nein.** Belastungsempfehlungen für Knochenstress verlangen Last, die *„does not produce symptoms during, after, or the day following"* — also **schmerzfreie** Belastung, nicht Schmerz, der sich legt. Die Begründung ist mechanisch: Der Umbau des Knochens ist bereits vom Schaden überholt; zusätzliche Last addiert sich zum Schaden, statt Anpassung auszulösen.

Bei einer Sehne ist das Gegenteil der Fall — Silbernagels Modell existiert genau deshalb.

Also `greenMaxDelta: 0`. Der Konfigurations-Wächter verlangte daraufhin auch `settledWithinDelta: 0`, und das ist inhaltlich richtig: „gelegt" muss hier *zurück auf den Ausgangswert* heissen.

> **Der unbequemste Befund des ganzen Profils:** Selbstberichtete Schmerzwerte sagen eine Stressfraktur der Tibia **nicht** vorher. Die klinische Beurteilung der Druckschmerzhaftigkeit ist aussagekräftiger — und genau die kann ein Tagebuch nicht erheben. Das Werkzeug arbeitet hier mit dem schwächeren der beiden Signale, und das steht in den Grenzen.

### Patellasehne — das erste Profil, das einen Test verwirft

Ein Wadenheber sagt über die Patellasehne nichts. Er belastet Wade und Achillessehne; die Kniestrecker sind kaum beteiligt.

Damit tut die Profilschicht zum ersten Mal das, wofür sie gebaut wurde. `PROTOKOLLE.md` begründete das ganze Programm mit diesem einen Satz — bis hierher war er eine Absichtserklärung.

Zur Belastung ein Fall, in dem zwei Lesarten auseinandergehen: Sprunglandung bis **17 × Körpergewicht** gegen Laufen 4,7–6,9 ×. Nach Spitzenkraft wäre Springen 2,5- bis 3,6-fach; nach Impuls je Minute — ein Sprungtraining hat etwa ein Drittel der Bodenkontakte — etwa gleichauf. Der Motor summiert je Minute. Der ausgelieferte Wert liegt zwischen beiden Lesarten und bleibt, aber die Begründung steht jetzt da.

### Patellofemorales Syndrom — das Profil, das am wenigsten weiß, und das sagt

Die etablierten Untersuchungen bewerten **Bewegungsqualität**: einbeinige Kniebeuge mit fünf Kriterien zu Rumpf- und Beinachse, Step-Down, Treppabsteigen. Ein schriftliches Tagebuch sieht davon nichts.

Belastbare quantitative Fortschrittskriterien wurden für diese Diagnose **nicht gefunden**. Das ist der Befund, nicht eine Lücke in der Arbeit.

Und die Prognose ist die schlechteste der neun:

| | |
|---|---|
| schmerzfrei nach einem Jahr | **nur etwa ein Drittel** |
| unbefriedigendes Ergebnis nach 5–8 Jahren | **über 50 %** |
| Rezidiv | bis **90 %** |

### Nach Kreuzbandplastik — der Kriterienkatalog, gebaut und ausgeschaltet

Das einzige Profil mit Operationsdatum, diskreten Phasen und publizierten Ausstiegskriterien. Genau deshalb wurde es vorgezogen: Das Meilenstein-Feature liess sich an drei Tendinopathien nicht sinnvoll entwerfen.

Der Katalog trägt beide Hälften der Evidenz. Dafür: Kyritsis 2016 — sechs nicht erfüllte Entlasskriterien bedeuten vierfaches Rerupturrisiko. Dagegen: **158 männliche Profifussballer**, und ein Scoping Review hält fest, dass das Bestehen dieser Tests nicht zuverlässig vorhersagt, wer sich erneut verletzt.

**Fünf von neun Kriterien kann kein Tagebuch prüfen** — Erguss, isokinetische Kraft, volle Beweglichkeit, Schmerz beim Hüpfen, psychologische Bereitschaft. Der Typ `Criterion` hat dafür die Variante `observation`: benannt, nicht geprüft. Details in [MEILENSTEINE.md](MEILENSTEINE.md).

### Ischiocrurale Muskulatur — das erste Nicht-Sehnen-Profil

Ein Muskel reisst in einem Moment. Die Regeln zur schleichenden Überlastung beschreiben den Anlauf zu einem Sehnenproblem und haben über einen Riss beim Sprint wenig zu sagen.

Was zählt, ist die Rückkehr — und da ist diese Verletzung gefährlich: **nahezu ein Drittel kehrt im ersten Jahr zurück**, und die zweite ist häufig schwerer als die erste.

Ein Test fand hier einen Fehler von mir: Ich hatte den Zeithorizont mit **3 Wochen** angesetzt. Das war die schnellste *Rückkehr in den Wettkampf* bei Profisportlern mit apparativer Testung — und eine Rückkehr ist keine Genesung. Da die Langzeitregel frühestens nach vier Wochen sprechen kann, hätte ein Drei-Wochen-Horizont sie für diese Verletzung strukturell nutzlos gemacht. Korrigiert auf 6–52 Wochen.

### Gluteale Sehnenansätze — die Hauptbelastung ist keine Trainingseinheit

Der stärkste Reiz ist **Kompression** gegen den grossen Rollhügel: nachts auf der Seite liegen, übereinandergeschlagene Beine, Stehen mit dem Gewicht auf einer Hüfte.

Nichts davon ist eine Trainingseinheit, und das Tagebuch hat für nichts davon eine Spalte. Die berechnete Belastung — Anstrengung × Minuten × Gewebefaktor — verfehlt hier die Hauptbelastung. Das ist keine Schwelle zum Justieren, sondern eine Grenze des Datenmodells.

### Plantarfaszie — jeder Fünfte hat womöglich etwas anderes

Die Einklemmung des ersten Astes des N. plantaris lateralis (**Baxter-Nerv**) macht Berichten zufolge **bis zu einem Fünftel** aller plantaren Fersenschmerzen aus — und ist symptomatisch von einer Fasziopathie **nicht zu trennen**.

Bemerkenswert: Die 24-Stunden-Regel taucht in den Empfehlungen zur Plantarfaszie wortgleich auf wie bei den Sehnen.

### Rotatorenmanschette — der Test für die Architektur

Das erste Profil an der oberen Extremität. Eine Stunde Laufen belastet diese Sehnen etwa so viel wie Stillsitzen; eine Stunde Schwimmen ist das Schwerste der Woche.

**Die Gewebematrix hatte das vorweggenommen** — Schwimmen 1,2 · Kraft Oberkörper 1,0 · Rudern 1,0 · Laufen 0,1. Keine Überschreibung nötig. Das ist der bislang stärkste Beleg dafür, dass die Dreischichten-Architektur trägt: Der Kern musste für die obere Extremität nicht angefasst werden.

Was nicht trägt, ist die Testliste. Dieses Profil bleibt mit **einem einzigen** Selbsttest übrig: der Beweglichkeit.

Und die wichtigste Belastung an einer Schulter ist oft keine Sporteinheit, sondern **Überkopfarbeit im Beruf**. Die erfasst das Tagebuch nicht — eine Lücke im Datenmodell, nicht im Profil.

---

## Was die Profile am Motor gefunden haben

Der Erreichbarkeitstest je Profil — gebaut als „Stolperdraht für das erste Profil, das eine Schwelle verschiebt" — hat dreimal zugeschlagen, und jedes Mal auf denselben Fehler in anderer Verkleidung: **Die Szenarienbibliothek war auf die bereits geschriebenen Profile zugeschnitten.**

| Fund | Wie er sichtbar wurde |
|---|---|
| Jede Paarmessung war ein **Wadenheber** | Das erste Knieprofil hörte auf, ihn anzusehen → vier Asymmetrie-Urteile unerreichbar |
| Der einzige **Sprungtest**-Verlauf war die erodierende Referenz | Das Plantarprofil sieht keine Sprünge → dieses Urteil ging verloren |
| **`rom` hatte null Messungen** in der gesamten Bibliothek | Die Schulter sieht nur Beweglichkeit → fünf Urteile auf einmal dunkel |

Der dritte ist der bemerkenswerteste: `rom` war seit der ersten Fassung einer von drei deklarierten Testtypen, und **die Bibliothek hat nie eine einzige Messung davon enthalten**. Sichtbar wurde das erst, als ein Profil ausschliesslich auf ihn angewiesen war.

Dazu zwei Treffer der Ban-Listen, beide berechtigt: „Wer das Bein nicht mehr **belasten** kann" und „the **risk of** a further injury falls". Beide Sätze waren beschreibend gemeint, beide enthalten das gefährliche Wort. Umformuliert statt die Liste aufgeweicht.

---

## Was für alle neun offen bleibt

**Schritt 5 — Echtdaten-Abgleich.** Der einzige Schritt, der wirklich validiert; alles davor prüft nur Widerspruchsfreiheit. Braucht ein selbst geführtes Tagebuch, zugesagt für etwa Ende September 2026.

**Schritt 6 — Abnahme.** Braucht Schritt 5, und für die Achillessehne zusätzlich den Volltext der JOSPT-Leitlinie 2024 (auf drei Domains hinter HTTP 403).

**Kein einziger brauchbarer Messfehler.** Für keinen Test dieser neun Profile liegt ein MDC in passender Population und mit Evidenzgrad A oder B vor. Solange das so ist, sagt der Motor bei jeder Verlaufsreihe „aufgezeichnet" und nicht „verbessert".

---

*Arbeitsdokument. Kein medizinisches Dokument, keine Behandlungsempfehlung.*
