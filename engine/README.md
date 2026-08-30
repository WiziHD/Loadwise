# Loadwise — Regelmodul (Phase 0)

Die Auswertungslogik als reine Funktionen. Kein Framework, keine Datenbank, keine Oberfläche.

Das ist mit Absicht das erste Stück des Projekts: Wenn diese Regeln auf echten Daten nichts Nützliches sagen, trägt das Produkt nicht — und das lässt sich hier feststellen, bevor acht Wochen Oberfläche daran hängen.

## Benutzen

```bash
npm install
npm test          # 380 Motortests
npm run demo      # alle Regeln über 51 Verläufe, lesbar ausgegeben
npm run calibrate # welche Schwellenwerte etwas entscheiden — je Profil
npm run mutate    # merkt die Suite, wenn eine Schwelle kaputt ist?
npm run coverage  # Abdeckung, Regeln müssen bei 100 % liegen
npm run tagebuch -- ../tagebuch.csv achilles_midportion ../selbsttests.csv   # echtes Tagebuch plus Selbsttests
npm run typecheck
```

`npm run demo` ist der interessante Befehl. Er zeigt nicht, ob der Code läuft, sondern **was einem Nutzer tatsächlich gesagt würde**.

## Die sieben Regeln

| Regel | Frage | Braucht |
|---|---|---|
| **24-Stunden-Reaktion** | Hat sich die Belastung von gestern über Nacht gelegt? | 14 Tage |
| **Belastungsspitze** | Ist die Woche im Verhältnis zu den Vorwochen aus dem Rahmen? | 28 Tage |
| **Lastverteilung** | Hängt die ganze Wochenlast an ein, zwei Tagen? | 7 Tage |
| **Seitenasymmetrie** | Öffnet sich die Schere zwischen betroffener und gesunder Seite? | 3 Selbsttests |
| **Ausgangswert-Drift** | Wird es schleichend schlechter, ohne dass ein Tag auffällt? | 28 Tage |
| **Schmerzmuster** | Wandert der Schmerz näher an die Belastung heran? | 42 Tage mit Angaben |
| **Langzeitverlauf** | Hat sich seit Beginn der Episode überhaupt etwas gebessert? | 6 Wochen |

Jede der letzten vier schließt eine Lücke, die ein Prüflauf gefunden hat.

**Ausgangswert-Drift**: Steigen die Morgenwerte langsam, wächst der gleitende Median mit, und die 24-Stunden-Regel meldet monatelang grün. Im Szenario »Der Dauerläufer« liefert sie 35 grüne Tagesurteile.

**Langzeitverlauf**: Jede andere Regel liest eine *Differenz*, keine *Höhe*. Wer bei 8 von 10 stehenbleibt, bekommt von allen grün — der Median ist 8, also ist jede Abweichung null. Diese Regel meldet deshalb **Dauer statt Höhe** (»seit zwölf Wochen unverändert«) und braucht keine erfundene klinische Grenze.

Sie kennt **vier** Ausgänge, und drei davon fehlten lange:

| | |
|---|---|
| besser als zu Beginn | echte Verbesserung, ganz gleich auf welchem Niveau |
| **schlechter als zu Beginn** | war bis zuletzt als »unverändert« gemeldet — von 1 auf 7 ist nicht unverändert |
| unverändert | der Stillstand, für den die Regel gebaut wurde |
| **aktuell sehr niedrig** | wer bei 1 von 10 liegt, hat nicht stagniert und wird nicht ermahnt |

Für die beiden fetten Zeilen gab es vorher kein Wort. Die Regel griff auf den nächstliegenden Satz zurück und behauptete damit etwas Falsches. Beide Grenzen benutzen denselben Regler `minImprovement` in beide Richtungen — es wurde keine neue Zahl erfunden.

**Lastverteilung**: Alle anderen Lastregeln summieren nur. Ob die Wochenlast auf einem Samstag liegt oder auf vier Tagen, war für sie dieselbe Woche. Gemessen wird die inverse Simpson-Zahl über alle sieben Tage; ausgegeben wird nie die Zahl, sondern ein Satz.

## Der wichtigste Satz im Modul

> **Abdeckung begrenzt die Entwarnung, nie die Warnung.**

`overall` trägt eine Schwere nur, wenn genug beurteilt wurde — sonst meldet es ausdrücklich »nicht genug beurteilt«. Ein Befund dagegen steht auf eigenen Beinen: Wenn eine Regel einen Lastanstieg gesehen hat, ist der passiert. »Alles in Ordnung« ist eine Aussage über alles, was *nicht* passiert ist, und die verlangt, hingeschaut zu haben.

Der Typ erzwingt das: An eine Schwere kommt man nur über `status === "judged"`.

## Der zweitwichtigste

> **Das Gesamtbild beantwortet »wie steht es«, nicht »was ist hier je passiert«.**

Bis ein Szenario danach fragte, nahm die Zusammenfassung die schlimmste Schwere der **gesamten** Episode. Wer in Woche fünf vier schlechte Tage hatte, trug bis zum Ende rot — auch nach sieben Wochen vollständiger Erholung. Der Motor hatte kein Mittel mehr, jemandem zu sagen, dass es gut läuft.

Zwei Sorten Befund liegen in derselben Liste und altern völlig verschieden:

| | |
|---|---|
| **Zustand** | Sechs Regeln lesen ein Fenster bis zum letzten Tag und geben genau ein Urteil ab. Das *ist* die Gegenwart, und jede verwaltet ihre Aktualität selbst — die Asymmetrie-Regel erklärt ihre eigenen Messungen nach sechs Wochen für veraltet. |
| **Ereignis** | Die 24-Stunden-Regel spricht einmal je Trainingstag, und diese Befunde häufen sich über den ganzen Verlauf. Eine Reaktion an einem Dienstag im März beschreibt nicht den heutigen Stand. |

Der erste Versuch schnitt schlicht nach Datum ab — ein Test fing das sofort: Ein Selbsttest von vor drei Wochen zählte nicht mehr. Ein Kraftdefizit läuft nicht in drei Wochen ab, und wann es das tut, entscheidet die Asymmetrie-Regel, nicht die Zusammenfassung.

**Das schwächt den obersten Grundsatz nicht.** Ein *aktueller* Befund umgeht das Abdeckungstor weiterhin. Und nichts wird gelöscht: Jeder Befund bleibt im Bericht, unter der Überschrift »Früher im Verlauf, inzwischen zurückliegend«. Zu entscheiden, dass ein alter roter Tag nicht mehr den heutigen **Stand** setzt, ist ein Urteil über die Bedeutung eines Wortes. Ihn aus dem **Protokoll** verschwinden zu lassen, wäre das Löschen von Beweisen — ein völlig anderes Ding.

## Aufbau

```
src/
  types.ts            Datentypen, alle Schwellenwerte, alle Urteilscodes
  dates.ts            Kalenderrechnung auf YYYY-MM-DD, ohne Zeitzonenfallen
  tissue.ts           Gewebefaktor je Aktivität und Körperregion
  load.ts             load = Anstrengung × Minuten × Gewebefaktor
  episode.ts          Index mit genau einer Zeile je Kalendertag
  baseline.ts         Gleitender Median als Vergleichswert
  config.ts           Prüft die Schwellenwerte gegen unerreichbare Zweige
  validate.ts         Prüft die Eingabe, meldet Befunde statt zu werfen
  import.ts           Liest ein handgeführtes Tagebuch als CSV ein
  profiles/           Was je Verletzung variiert — als Daten, nicht als Code
    achilles.ts       Das erste recherchierte Profil
  rules/              Die sieben Regeln
  evaluate.ts         Führt alle aus, misst die Abdeckung, liefert Flags
  fixtures.ts         51 Verläufe — 50 erzeugt, einer von außen
  course-achilles.ts  60 Tage Achillessehne, nicht von uns geschrieben
  report.ts           Lesbare Darstellung
  demo.ts             Ausgabe
  calibrate.ts        Empfindlichkeitsanalyse aller 25 Schwellenwerte
  wording.ts          Freigegebene Sätze je Urteil, Sicherheitsgrenze
  expectations.ts     Das Orakel: was jedes Szenario bedeutet
  dials.ts            Alle Schwellen, geteilt von Kalibrierung und Mutation
  mutate.ts           Mutationstest
  tagebuch.ts         Auswertung einer echten Tagebuchdatei
```

## Das Orakel

`src/expectations.ts` hält fest, was jedes Szenario BEDEUTET — unabhängig davon, was der Code gerade tut. Die Golden-Datei ist ein Abzug des Verhaltens und lässt sich wegregenerieren; diese Aussagen nicht.

`npm run mutate` stellt jede Schwelle absichtlich falsch ein und fragt, ob das Orakel es merkt. **Aktuell: 38 %.** Das ist eine ehrliche Zahl, keine gute — und sie darf nicht durch Grenzwert-Szenarien gehoben werden, die nur beweisen würden, dass der Code zu sich selbst passt.

Die 34 % wurden zu 36 %, als ein Verlauf dazukam, den **nicht dieselbe Person geschrieben hat, die die Schwellen gesetzt hat** — er liegt näher an den Grenzen, als konstruierte Verläufe das tun. Genau so darf diese Zahl steigen: durch fremdes Material, nicht durch nachgereichte Grenzfälle.

## Profile

Der Kern kennt keine Verletzung namentlich. Was je Verletzung variiert — welche Selbsttests zählen, wie stark eine Aktivität dieses Gewebe belastet, welche Schwellen gelten, welche Warnzeichen kein Tagebuch behandelt — liegt in `src/profiles/` als **Daten**.

`Record<BodyRegion, Profile>` ist erschöpfend: Eine Körperregion ohne Profil ist ein Compilerfehler. Jedes Flag trägt neben `ruleVersion` auch `profileVersion`, weil ein Urteil nur reproduzierbar ist, wenn beide Hälften festgehalten sind.

Drei Schichten, damit ein Kernfehler einmal behoben wird und nicht siebzigmal:

```
Kern       die sieben Regeln, Orchestrierung, Abdeckung, Eingabeprüfung
Profil     Tests · Gewebefaktoren · Schwellen · Warnzeichen · Evidenzgrad
Zusatz     optionaler Steckplatz für Verletzungen mit eigener Logik
```

**Neun Profile tragen Wissen, drei nur die Mechanik.** `src/profiles/achilles.ts` ist recherchiert (siehe [PROFIL-ACHILLES.md](../PROFIL-ACHILLES.md)); die übrigen bilden exakt das bisherige Verhalten ab. Der Test unterscheidet beides selbst: Ein Profil gilt als recherchiert, sobald **ein** Wert über Evidenzgrad D liegt — und muss dann die volle Liste erfüllen (Warnzeichen, Zeithorizont, ausformulierte Grenzen, eigene Version, Quelle zu jedem Grad). Ein halbfertiges Profil kann nicht aussehen, als trüge es Wissen.

Die Registry ist nach **Profilschlüssel** aufgebaut, nicht nach Körperregion — sonst könnten patellofemorales Syndrom und Kreuzbandplastik nicht beide unter `knee` liegen. Jede Region benennt weiterhin ein Standardprofil, und eine Region ohne Standard bleibt ein Compilerfehler.

Jedes recherchierte Profil sieht etwas anderes an — die Schulter zum Beispiel nur noch die Beweglichkeit, weil ein Fersenheber und ein Sprungtest über eine Rotatorenmanschette nichts sagen. **Dass der Motor das weiß, ist der ganze Zweck der Profilschicht.** Zwei Profile verschieben inzwischen eigene Schwellen: Bei einer Knochenstressreaktion gilt die 24-Stunden-Regel nicht unverändert, weil dort schmerzfreie Belastung das Ziel ist und nicht Schmerz, der sich legt. Übersicht in [PROFILE.md](../PROFILE.md).

Der Zeithorizont ist kein Beiwerk: Er macht `stagnation.minWeeks` prüfbar. Eine Regel, die einen Stillstand erst meldet, wenn die meisten längst genesen sind, sagt niemandem etwas — der Test verlangt deshalb, dass sie deutlich vor der berichteten Untergrenze sprechen darf (sechs Wochen gegen zwölf).

Der präskriptive Teil (Phasen, Freigabekriterien) ist entworfen und **ausgeschaltet** — siehe [PROTOKOLLE.md](../PROTOKOLLE.md).

## Fünf Grundsätze

**Die Regeln raten nie.** Jede liefert entweder ein Urteil mit den Zahlen dahinter oder ein ausdrückliches »nicht beurteilbar« samt Grund.

**Freitext geht nie in die Rechnung ein.** Das Feld `note` existiert für Menschen und wird von keiner Regel gelesen.

**Kein Urteil darf unerreichbar sein — auch nicht für eine einzelne Verletzung.** Der Test läuft zusätzlich je Profil: die ganze Bibliothek als diese eine Verletzung gelesen, alle 27 Urteile und alle 9 Blockade-Gründe müssen erreichbar bleiben. Heute schaffen das alle zwölf, weil sie sich kaum unterscheiden — der Test ist der Stolperdraht für das erste Profil, das eine Schwelle verschiebt. Ein Profil, das neunundneunzig Wochen wartet, bevor der Langzeitverlauf sprechen darf, verliert vier Urteile stumm; ein eingebauter Beweis stellt sicher, dass genau das auffliegt.

**Kein Urteil darf unerreichbar sein.** `test/invariants.test.ts` prüft zweierlei: dass jeder der 27 Urteilscodes in mindestens einem Szenario vorkommt, **und** dass jeder der 9 Blockade-Gründe den Nutzer tatsächlich erreicht — über BEIDE Kanäle, `pending` und `overall.blocking`. Dass nur der erste gelesen wurde, war selbst ein Fund: Der neunte Grund, den ein Schmerzmittel auslöst, hätte den Bildschirm nie erreicht. Der erste echte Fehler in diesem Modul war ein toter Zweig — nichts stürzte ab, die Regel schwieg nur. Der Mechanismus hat seither viermal genau diese Fehlerklasse gefunden.

**Ein Kalendertag ist eine Zeile.** Jedes Zeitfenster misst seine Beweislage, indem es Einträge im Bereich zählt. Ein Duplikat oder ein unmögliches Datum wie `2026-03-32` füllte diese Zähler auf und wurde doppelt verrechnet — beides wird in `episode.ts` an der Tür verworfen.

**Verhaltensänderungen sind sichtbar.** `test/__golden__/report.txt` hält die vollständige Ausgabe fest. Beim Aktualisieren mit `npm test -- -u` gehört der Unterschied **gelesen**, nicht bloß bestätigt.

## Schwellenwerte ändern

Alles in `DEFAULT_CONFIG` in `src/types.ts`. `npm run calibrate` sagt, welche davon überhaupt etwas entscheiden. Stand jetzt sind sieben kritisch:

```
spike.redAbove   spike.amberAbove   spike.amberBelow
asymmetry.greenMinLsi   asymmetry.amberMinLsi
baseline.minEntries   drift.minEntriesPerWindow
```

Die letzten beiden sind **Beweis-Tore**, keine Urteilsschwellen — sie entscheiden, ob eine Regel überhaupt spricht. Dass ausgerechnet sie zu den empfindlichsten gehören, passt zum Fehlerbild dieses Projekts: Schweigen ist hier die gefährlichste Ausgabe.

## Was hier nicht bewiesen wird

Die Tests zeigen, dass sich die Regeln so verhalten, wie sie beschrieben sind. Sie zeigen **nicht**, dass Schwellenwerte und Gewebefaktoren klinisch richtig sind.

50 der 51 Szenarien stammen aus Formeln derselben Person, die die Schwellen gesetzt hat. Jede Aussage der Kalibrierung ist damit weitgehend eine Aussage über diese Bibliothek, nicht über die Schwelle.

Das 51. (`course-achilles.ts`) ist der erste Riss in dieser Zirkularität: sechzig Tage, von außen erzeugt, mit eigenen Anmerkungen. Der Motor hat die beiden Tage gefunden, die das Tagebuch selbst als Reaktionsmuster notiert hatte — ohne je eine Notiz zu lesen.

**Auch das ist noch kein klinischer Beleg.** Der Verlauf ist von einem Sprachmodell erzeugt, das dieselben Faustregeln kennen dürfte, die hier codiert sind. Er ist plausibel geformt, nicht gelebt. Was ihn wertvoll macht, ist allein, dass seine Form nicht aus `fixtures.ts` stammt.
