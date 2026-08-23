# Tagebuch führen

Eine Zeile pro Tag in [`tagebuch.csv`](tagebuch.csv). Ziel sind **unter 30 Sekunden** — dauert es länger, stimmt etwas mit den Feldern nicht, und das ist ein Befund über das Produkt, kein Versagen von dir.

## Die acht Spalten

| Spalte | Was | Beispiel |
|---|---|---|
| `datum` | Immer `JJJJ-MM-TT` | `2026-08-21` |
| `morgen` | **Zustand beim Aufstehen, 0–10.** Das wichtigste Feld | `3` |
| `aktivitaet` | Leer lassen an Ruhetagen | `laufen` |
| `minuten` | Dauer der Einheit | `35` |
| `anstrengung` | Wie anstrengend war sie, 1–10 | `5` |
| `beschwerden` | Beschwerden **zur Einheit**, 0–10 | `4` |
| `zeitpunkt` | `während`, `danach` oder `abends` | `danach` |
| `notiz` | Frei. Geht **nie** in die Rechnung ein | `schlecht geschlafen` |

### Erlaubte Aktivitäten
`laufen` · `gehen` · `wandern` · `rad` · `schwimmen` · `rudern` · `kraft_beine` · `kraft_oben` · `spruenge` · `ballsport` · `anderes`

## Drei Regeln, die den Unterschied machen

**Auch an Ruhetagen eintragen.** Nur `datum` und `morgen` — der Rest bleibt leer. Ohne Ruhetage gibt es keinen Vergleichswert, und ohne Vergleichswert kann die wichtigste Regel gar nichts sagen. Das ist der Fehler, an dem Tagebücher am häufigsten scheitern.

**Den Morgenwert am Morgen erfassen, nicht abends aus der Erinnerung.** Das ganze Verfahren hängt daran, wie sich die Stelle beim Aufstehen anfühlt — der Wert beschreibt die Reaktion auf den *Vortag*.

**Lieber grob und täglich als genau und selten.** Eine geschätzte 5 jeden Tag ist um Größenordnungen wertvoller als eine sorgfältige 5,5 jeden dritten Tag.

## Beispiel

```
datum,morgen,aktivitaet,minuten,anstrengung,beschwerden,zeitpunkt,notiz
2026-08-21,3,laufen,30,5,4,danach,
2026-08-22,4,,,,,,
2026-08-23,3,kraft_beine,45,6,2,waehrend,Wade fühlte sich fest an
2026-08-24,3,,,,,,
```

Semikolon statt Komma geht auch — falls Excel die Datei so speichert, wird das automatisch erkannt.

## Auswerten

```bash
cd engine && npm run tagebuch -- ../tagebuch.csv achilles
```

Die Körperregion am Ende bestimmt, wie stark welche Aktivität gewichtet wird — Laufen belastet eine Achillessehne stark und eine Schulter kaum. Erlaubt sind `achilles`, `calf`, `patella`, `knee`, `hamstring`, `hip`, `foot`, `shoulder`, `elbow`, `back`, `other`.

## Wann es etwas zu sagen beginnt

| Nach | Was möglich wird |
|---|---|
| 14 Tagen | Die 24-Stunden-Regel bekommt ihren Vergleichswert |
| 28 Tagen | Belastungsspitzen und schleichende Verschlechterung |
| 42 Tagen | Das Schmerzmuster |

Vorher meldet die Auswertung ausdrücklich »nicht genug beurteilt«. **Das ist kein Fehler, sondern die wichtigste Eigenschaft dieses Motors:** Er sagt nicht »alles in Ordnung«, wenn er nichts geprüft hat.
