# Verletzungsspezifische Profile — Programm für Phase 0.5

| | |
|---|---|
| **Stand** | 20. August 2026 |
| **Bezug** | [KONZEPT.md](KONZEPT.md) · [TECHNIK.md](TECHNIK.md) · [engine/README.md](engine/README.md) |
| **Status** | freigegeben, Umsetzung läuft |

Dieses Dokument steuert die Umstellung vom allgemeinen Tagebuch auf verletzungsspezifische Profile. Die offenen Punkte der laufenden Runde (0.10 bis 0.12) laufen darin als Schritt A weiter.

---

## Kontext

Der Anstoß war die Beobachtung, dass ein allgemeines Tagebuch wenig bringt. Der erste Lauf auf echten Daten hat das bestätigt: sieben Einträge, sechs von sieben Regeln stumm — und das offensichtlichste Signal darin (Morgenwerte 2 → 4 → 5 → 7) für den Motor unsichtbar.

**Die Diagnose stimmt, die vorgeschlagene Bauform nicht ganz.** Was fehlt, ist nicht ein eigener Motor je Verletzung, sondern **Wissen darüber, was bei dieser Verletzung überhaupt zu messen lohnt.** Ein Wadenheber sagt bei einer Achillessehne alles und bei einem Tennisarm nichts. Heute behandelt der Motor beide gleich.

Drei Entscheidungen sind getroffen: **Kompromiss aus geteiltem Kern und eigenen Profilen**, **volle Protokolle als Ziel mit vorheriger Prüfung der Schweizer Regulatorik**, **ein Profil bis zum Ende, dann skalieren**.

---

## 1. Der Regulatorik-Befund — er kippt eine Annahme

Die Annahme war: Schweiz statt EU verschafft Luft. **Das Gegenteil ist der Fall.**

| Befund | Beleg |
|---|---|
| Die Definitionen sind praktisch identisch | »Die Definition eines Medizinprodukts ist in MDR und MepV nahezu deckungsgleich« |
| Der Bundesrat hat die Angleichung **absichtlich** herbeigeführt | Um Gleichwertigkeit mit der EU zu erhalten, wurde die MepV durch eine an die MDR angelehnte Fassung ersetzt |
| Die Schweiz ist gegenüber der EU **Drittland** | Das Rahmenabkommen scheiterte 2021; das gegenseitige Anerkennungsabkommen entfiel |
| Schweizer Hersteller haben es **schwerer**, nicht leichter | Bevollmächtigter nötig, oft ein zusätzliches Konformitätsbewertungsverfahren, EUDAMED-Registrierung |

Für ein englischsprachiges Produkt mit internationalem Anspruch heißt das: **Schweizer Sitz addiert Aufwand, er subtrahiert keinen.**

### Was daraus folgt — und wie wir trotzdem bekommen, was du willst

Entscheidend ist die **Zweckbestimmung**, nicht die Datenmenge. Die Linie verläuft dort:

| Bleibt unterhalb | Überschreitet |
|---|---|
| *Welche* Tests bei dieser Verletzung aussagekräftig sind | »Du bist in Phase 2, mach jetzt X« |
| Wie stark eine Aktivität dieses Gewebe belastet | »Du darfst wieder laufen« |
| Welcher Zeithorizont bei dieser Verletzung berichtet wird | »Dein Rückfallrisiko liegt bei 34 %« |
| Welche Warnzeichen kein Tagebuch behandelt | Freigabekriterien, Belastungsvorgaben |

**Vorgehen — dieselbe Konstruktion wie bei der Bezahlschranke: bauen, ausgeschaltet lassen.**

Jedes Profil bekommt zwei getrennte Abschnitte. Der **beschreibende Teil** geht sofort live und ist deutlich spezifischer als alles Heutige. Der **präskriptive Teil** (Phasen, Freigaben, Vorgaben) wird mitentworfen, mitversioniert und mitgetestet — aber hinter einem Schalter, der aus bleibt, bis eine anwaltliche Prüfung vorliegt.

Damit ist die Arbeit nicht umsonst, und das Projekt hängt nicht an einer Frage, die erst ein Anwalt beantworten kann.

---

## 2. Architektur — der Kompromiss

Drei Schichten. Ein Fehler im Kern wird einmal behoben, nicht sechzigmal.

```
Kern (ein Codebestand, unverändert für alle Verletzungen)
  Die sieben Regeln, Orchestrierung, Abdeckungsmessung,
  Eingabeprüfung, Erreichbarkeitstests, Golden-Datei
        │
Profildaten (eine deklarative Datei je Verletzung)
  Tests · Gewebefaktoren · Schwellenwerte · Zeithorizont
  Vokabular · Warnzeichen · Evidenzgrad je Wert
        │
Profilregeln (optional, nur wo wirklich nötig)
  z. B. eine Sprungtest-Batterie, die es nur nach
  Kreuzbandplastik gibt
```

**Die dritte Schicht ist dein Kompromiss.** Sie existiert, damit eine Verletzung, die tatsächlich eigene Logik braucht, sie bekommen kann — ohne dass jede Verletzung ihren eigenen Motor mitschleppt. Erwartung: Die allermeisten Profile brauchen sie nie.

### Was im Code schon darauf zuläuft

| Vorhanden | Wird zu |
|---|---|
| `tissue.ts` — Matrix Aktivität × Körperregion | Der Gewebeteil des Profils, je Verletzung verfeinert |
| `EpisodeContext.bodyRegion` | Wird zu `profileKey`; die Region ergibt sich daraus |
| `TestType` — heute drei feste Werte | Wird je Profil deklariert statt global fest verdrahtet |
| `Config` — alle Schwellen an einer Stelle | Basis bleibt, das Profil überschreibt gezielt |
| `RULE_VERSION` auf jedem Flag | Bekommt `profileVersion` daneben |

Der einzige echte Umbau: `TEST_TYPES` in `evaluate.ts:48` ist heute eine globale Konstante und muss aus dem Profil kommen.

---

## 3. Die Matrix

Verletzungsarten quer, Körperregionen längs. **Nicht jede Kombination existiert** — ein Meniskus kommt nur im Knie vor, eine Apophysitis nur bei Jugendlichen an bestimmten Ansätzen. Die Matrix bildet ab, was klinisch vorkommt, nicht das kartesische Produkt.

### Verletzungsarten

| # | Art | Ist Last der Haupthebel? |
|---|---|---|
| 1 | Tendinopathie / Tendinose | **Ja** — Kerngeschäft |
| 2 | Sehnenriss, partiell oder komplett | Nach Versorgung ja |
| 3 | Muskelverletzung (Zerrung bis Faserriss) | **Ja** |
| 4 | Bandverletzung (Distorsion bis Ruptur) | Teilweise |
| 5 | Knochenstressreaktion / Ermüdungsbruch | **Ja** — reines Lastproblem |
| 6 | Knorpelschaden | Teilweise |
| 7 | Meniskus- / Labrumriss | Teilweise |
| 8 | Bursitis | Teilweise |
| 9 | Impingement / Engpasssyndrom | Teilweise |
| 10 | Nervenkompression | **Nein** — Profil nur zur Abgrenzung |
| 11 | Faszienreizung | **Ja** |
| 12 | Zustand nach Operation | **Ja** |
| 13 | Instabilität nach Luxation | Teilweise |
| 14 | Chronisches Kompartmentsyndrom | Teilweise |
| 15 | Apophysitis (Jugendliche) | **Ja** |
| 16 | Patellofemorales Schmerzsyndrom / Maltracking | **Ja** |

Die Spalte rechts ist ein Auswahlkriterium: **Wo Last nicht der Haupthebel ist, kann dieses Produkt wenig — und sollte das sagen, statt ein Profil vorzutäuschen.**

### Körperregionen und was dort vorkommt

| Region | Vorkommende Arten |
|---|---|
| **Fuß / Plantarfaszie** | 1, 5, 11, 15 |
| **Sprunggelenk / Achillessehne** | 1, 2, 4, 5, 12, 15 |
| **Unterschenkel (Wade, Schienbein)** | 1, 3, 5, 14 |
| **Knie** | 1, 2, 4, 6, 7, 8, 12, 15, 16 |
| **Oberschenkel (Ischiocrural, Quadrizeps, Adduktoren)** | 1, 2, 3, 5 |
| **Hüfte / Leiste** | 1, 3, 5, 7, 8, 9, 12 |
| **Becken / ISG** | 3, 5 |
| **Lendenwirbelsäule** | 3, 5, 6, 10 |
| **Brustwirbelsäule / Rippen** | 3, 5 |
| **Halswirbelsäule** | 3, 10 |
| **Schulter** | 1, 2, 7, 8, 9, 12, 13 |
| **Ellenbogen** | 1, 2, 8, 10, 15 |
| **Handgelenk / Hand** | 1, 5, 9, 10, 13 |
| **Bauchwand / Rumpf** | 3 |

Rund **70 klinisch sinnvolle Kombinationen.** Bei einem Profil pro Woche wären das anderthalb Jahre — deshalb die Priorisierung unten, und deshalb die geteilte Architektur.

---

## 4. Prioritätsstufen

Sortiert nach: Häufigkeit bei Freizeitsportlern · Last als Haupthebel · Existenz laientauglicher Selbsttests · deine eigene Erfahrung.

### Stufe 1 — die ersten neun

| Profil | Warum hier |
|---|---|
| **Achillessehnen-Tendinopathie (mid-portion)** | Deine Verletzung. Beste Studienlage von allen. Startprofil. |
| **Achillessehnen-Tendinopathie (ansatznah)** | Eigenes Profil, nicht dasselbe — die Belastungstoleranz unterscheidet sich deutlich |
| **Patellasehnen-Tendinopathie** | Deine zweite Verletzung |
| **Patellofemorales Schmerzsyndrom / Maltracking** | **Deine aktuelle Lage** — und der Kaskadenfall, den das Produkt erklären will |
| **Plantarfasziopathie** | Sehr häufig, klarer Lastbezug, einfacher Selbsttest |
| **Schienbeinkantensyndrom** | Klassiker bei Laufeinsteigern |
| **Ischiocrurale Muskelverletzung** | Häufigste Muskelverletzung im Sport, hohe Rezidivrate |
| **Gluteale Tendinopathie** | Häufig, wird oft als »Hüftschmerz« fehlgedeutet |
| **Rotatorenmanschetten-Tendinopathie** | Häufigste Schulterbeschwerde, prüft die Architektur an der oberen Extremität |

Die ersten vier sind deine eigene Verletzungsgeschichte. Das ist kein Zufall der Bequemlichkeit — es ist der einzige Punkt, an dem wir echte Daten und echte Erfahrung gleichzeitig haben.

### Stufe 2 — nach der Validierung

Laterale und mediale Ellenbogen-Tendinopathie · Adduktorenbeschwerden · Knochenstressreaktion Tibia und Mittelfuß · Zustand nach vorderer Kreuzbandplastik · Sprunggelenksdistorsion · Achillessehnenriss nach Versorgung.

### Stufe 3 — später oder nie

Wirbelsäule, Nervenkompression, Instabilitäten, Kompartmentsyndrom. **Bei mehreren davon ist Last nicht der Haupthebel** — dort ist ein ehrliches »dafür ist dieses Werkzeug nicht gemacht« mehr wert als ein Profil.

---

## 5. Das Verfahren je Profil

Sechs Schritte, jedes Mal gleich. Das ist der Teil, den du für »tausende Iterationen« brauchst.

### Schritt 1 — Rechercheauftrag

**Zu finden:**
- Welche Selbsttests sind für diese Verletzung etabliert und laientauglich? Einheit, Durchführung, bekannte Streuung
- Welche Aktivitäten belasten dieses Gewebe stark, welche kaum? (Speist den Gewebefaktor)
- Welcher Zeithorizont wird berichtet? Spannweite, nicht Mittelwert
- Welche Warnzeichen gehören ausdrücklich **nicht** in ein Tagebuch?
- Ist die 24-Stunden-Regel hier überhaupt die richtige Entscheidungsregel? *Bei Sehnen ja — bei einer Knochenstressreaktion womöglich nicht.*

**Quellenrang:** Systematische Übersichten und Leitlinien vor Einzelstudien vor Fachverbänden vor Lehrbüchern. **Anbieterblogs zählen nicht** — dieselbe Disziplin, die die Barrierefreiheits-Recherche gerettet hat.

**Festzuhalten:** je Aussage die Quelle, das Jahr und ob sie unstrittig ist. Was strittig ist, wird als strittig markiert und nicht geglättet.

### Schritt 2 — Profilentwurf

Eine deklarative Datei. Jeder Zahlenwert trägt seinen **Evidenzgrad**:

```
A  aus Leitlinie oder systematischer Übersicht
B  aus Einzelstudien, konsistent
C  Fachkonsens ohne belastbare Zahl
D  begründete Schätzung   ← wie heute jeder Gewebefaktor
```

Ein Profil mit überwiegend D ist zulässig — aber es sagt das über sich selbst, und die Kalibrierung weiß dann, wo sie zuerst hinschauen muss.

### Schritt 3 — Szenarienbibliothek

Je Profil eigene Verläufe, nach dem etablierten Muster in `fixtures.ts`: ein sauberer Verlauf, ein Rückfall, ein Plateau, ein lückenhaftes Tagebuch, und **die verletzungstypische Falle** (bei Sehnen das Einlaufen, bei Muskeln die zu frühe Rückkehr, bei Knochenstress der Nachtschmerz).

### Schritt 4 — Erreichbarkeit und Kalibrierung

Die vorhandene Maschinerie, je Profil angewandt:
- Erreichbarkeitstest über alle Urteilscodes **und** alle Blockade-Gründe
- `npm run calibrate` gegen die Profilbibliothek: welche Schwelle entscheidet hier etwas?
- Golden-Datei je Profil

### Schritt 5 — Echtdaten-Abgleich

**Der einzige Schritt, der wirklich validiert.** Alles davor prüft nur Widerspruchsfreiheit.

> **Warnung zum Begriff »tausende Iterationen«:** Schwellen tausendfach gegen selbst geschriebene Szenarien zu drehen konvergiert nicht auf die Wahrheit, sondern auf die eigenen Annahmen. Genau diese Zirkularität hat der Prüflauf als größte offene Schwäche benannt. **Eine Iteration zählt nur, wenn sie gegen echte Daten oder gegen einen publizierten Wert läuft.** Alles andere ist Bewegung, kein Fortschritt.

### Schritt 6 — Abnahme

Ein Profil gilt als fertig, wenn: alle Codes erreichbar · Kalibrierung benennt die kritischen Schwellen · mindestens ein echter Verlauf durchgelaufen ist · die Warnzeichenliste steht · der Abschnitt »was dieses Profil nicht weiß« geschrieben ist · `profileVersion` vergeben.

### Der Terminkonflikt, ausgesprochen

**Schritt 5 und 6 stehen für alle neun Profile offen, und sie hängen an einem Tagebuch, das noch geführt werden muss.**

Ein Verlauf, der etwas über Schwellen aussagt, braucht Wochen — nicht weil das Erfassen dauert, sondern weil die Regeln Zeitfenster lesen: Die Ausgangswerte brauchen 28 Tage, die Lastspitze vergleicht 7 gegen 28, der Langzeitverlauf will Wochen. Ein Tagebuch, das heute beginnt, kann frühestens **um Tag 30 herum** etwas beitragen.

Das steht im Konflikt mit dem 25-Tage-Ziel bis Phase 4. **Der Konflikt ist real und lässt sich nicht wegplanen** — er ist eine Eigenschaft des Gegenstands, nicht der Planung. Wer ihn auflösen will, hat genau drei Möglichkeiten:

| Weg | Was er kostet |
|---|---|
| Termin verschieben | Nichts inhaltlich. Der ehrlichste Weg. |
| Ohne Schritt 5 ausliefern | Die Schwellen bleiben unvalidiert — und das Produkt sagt dann Dinge über Körper, die nur gegen selbst geschriebene Szenarien geprüft sind. Genau die Zirkularität, die dieses Dokument als grösste Schwäche benennt. |
| Schritt 5 auf EIN Profil beschränken | Machbar. Dann gilt die Validierung für die Achillessehne und für sonst nichts — und das muss im Produkt stehen, nicht nur hier. |

**Nicht möglich** ist, Schritt 5 durch mehr Iterationen zu ersetzen. Siehe die Warnung oben: Das konvergiert auf die eigenen Annahmen, nicht auf die Wahrheit.

Die Karte dazu liegt in »Blockiert«. Der Termin ist eine Entscheidung, die dir gehört; hier steht nur, was daran hängt.

---

## 6. Meine Ergänzungen

Fünf Dinge, die nicht in deiner Aufzählung standen und die ich für notwendig halte.

**Warnzeichen sind Pflicht, nicht Kür.** Jedes Profil führt die Situationen, in denen der Motor schweigen und auf einen Menschen verweisen muss — Wadenschmerz mit Schwellung und Rötung, Nachtschmerz bei Knochenstress, Taubheit, plötzlicher Funktionsverlust. **Das ist gleichzeitig Sicherheit und Glaubwürdigkeit:** Ein Werkzeug, das seine eigenen Grenzen benennt, wird für den Rest ernster genommen.

**Jeder Wert deklariert seine Herkunft.** Die Ehrlichkeitsnotiz in `tissue.ts` wird zum Prinzip: Kein Zahlenwert ohne Evidenzgrad. Damit ist jederzeit sichtbar, wie viel von einem Profil Wissen und wie viel Schätzung ist.

**Die Profilliste wird compilergeprüft.** Wie `ALL_REASON_CODES`: Eine Körperregion ohne Profil ist ein Übersetzungsfehler, kein stilles Nichts. Dieselbe Disziplin, die in diesem Projekt schon fünfmal einen toten Zweig gefunden hat.

**Profile dürfen den Kern nicht brechen.** Ein Test läuft alle Kern-Invarianten gegen **jedes** Profil: kein Flag ohne Eintrag, Reihenfolgeunabhängigkeit, Abdeckung begrenzt nur die Entwarnung. Ein Profil kann Werte setzen, aber keine Zusicherung aufheben.

**Die Kaskade wird endlich baubar.** Dein eigener Fall — Wade, dann Knie — ist heute nicht darstellbar, weil es nur eine Episode gibt. Mit Profilen bekommen zwei gleichzeitige Episoden verschiedener Regionen einen Bezug, und der Motor kann die Kette sehen, um die es im Konzept von Anfang an ging. **Das ist der stärkste Nebeneffekt dieser ganzen Umstellung** und gehört als Ziel der Stufe 2 festgehalten.

---

## 7. Fahrplan

| | Was | Ergebnis |
|---|---|---|
| **A** ✅ | Restliche Punkte der laufenden Runde: 0.10 Typvertrag und Wortwahl, 0.11 Prüfmittel, 0.12 `tissue.ts` | Der Kern ist fertig, bevor Profile darauf gesetzt werden |
| **B** ✅ | Profilmechanik: `Profile`-Typ, Registry mit Erschöpfungsprüfung, `TEST_TYPES` aus dem Profil, `profileVersion` auf jedem Flag, Schalter für den präskriptiven Teil | Ein Profil ist ladbar, der Kern kennt keine Verletzung mehr namentlich |
| **C** | **Profil 1: Achillessehnen-Tendinopathie**, Schritte 1 bis 6 vollständig | Das Verfahren ist einmal durchgelaufen und bewiesen |
| | ↳ Schritt 1 Recherche ✅ → [PROFIL-ACHILLES.md](PROFIL-ACHILLES.md) | Fünf Fragen beantwortet, zwei Beinahe-Fehler durch den Quellenrang abgefangen |
| | ↳ Schritt 2 Profilentwurf ✅ → engine/src/profiles/achilles.ts | Eine Zahl korrigiert, zwei bewusst gehalten; dabei zwei Lücken in der Regulatorik-Grenze gefunden |
| | ↳ Schritt 3 Szenarienbibliothek ✅ → warmUp, relapse | Zwei Szenarien, zwei echte Motorfehler: das Gesamtbild ließ nie los, der Bericht widersprach sich |
| | ↳ Schritt 4 Erreichbarkeit und Kalibrierung ✅ | 27/27 Urteile je Profil, Kalibrierung ist profilfähig; keine Abweichung beim Achillesprofil |
| | ↳ Schritt 5 Echtdaten-Abgleich — **offen, braucht ein selbst geführtes Tagebuch** | Der einzige Schritt, der wirklich validiert |
| | ↳ Schritt 6 Abnahme — offen, braucht zusätzlich den JOSPT-Volltext 2024 | |
| **D** | Anwaltliche Prüfung der Zweckbestimmung nach MepV, vor dem Einschalten des präskriptiven Teils | Entscheidung, ob volle Protokolle gehen |
| **E** | Profile 2 bis 4 — Patellasehne, Patellofemoral, Plantarfaszie | Erste Breite, gegen deine eigene Geschichte prüfbar |
| **F** | Rest der Stufe 1, dann Stufe 2 | |

**Schritt D ist kein Formalismus.** Bevor irgendetwas Präskriptives eingeschaltet wird, muss die Zweckbestimmung geprüft sein — und die Recherche oben zeigt, dass der Schweizer Sitz das eher erschwert.

---

## 8. Prüfen

```bash
cd "NEW APP/engine"
npm run typecheck
npm test                  # Kern-Invarianten gegen jedes Profil
npm run calibrate         # je Profil
npm run tagebuch -- ../tagebuch.csv achilles_midportion
```

Die Umstellung gilt als geglückt, wenn:

1. Alle 189 bestehenden Tests weiterlaufen — der Kern darf sich nicht ändern
2. Ein Kern-Invariantentest läuft gegen jedes registrierte Profil
3. Eine Region ohne Profil ist ein **Compilerfehler**
4. Das Achillesprofil ist nach Schritt 6 abgenommen
5. `npm run tagebuch` mit Profilangabe sagt etwas, das die generische Fassung nicht sagen konnte

**Was auch danach offen bleibt:** Ob die Profilwerte klinisch stimmen. Das entscheidet Schritt 5 je Profil — und nur echte Verläufe, nicht die Zahl der Iterationen.
