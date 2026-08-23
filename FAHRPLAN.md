# Loadwise — Fahrplan

**Stand 21.08.2026, abends.** Eine Seite, die zusammenführt, was über `KONZEPT.md`, `TECHNIK.md`, `PROTOKOLLE.md` und die Profildokumente verteilt liegt.

Der Plan hat **vier Ebenen**, die ineinandergreifen. Wir stehen in Ebene 1 ganz am Anfang — und das mit Absicht.

---

## Ebene 1 — Die Projektphasen

| | Phase | Inhalt | Ergebnis |
|---|---|---|---|
| ⏳ | **Phase 0** | **Die Regeln zuerst, ohne jede Oberfläche.** Reine TypeScript-Funktionen mit Tests. Kein Framework, keine Datenbank, keine Seite. | Die Antwort auf die einzige Frage, an der alles hängt: **Sagen diese Regeln auf echten Daten etwas Nützliches?** |
| | Phase 1 | Woche 1–2: Projektaufbau, Datenbank, Anmeldung per Magic Link, Episode anlegen, Tageseintrag, Verlaufskurve. Mehrsprachigkeit ab der ersten Zeile. | Du selbst kannst dein Tagebuch darin führen. |
| | Phase 2 | Woche 3–4: Regelmodul anschließen, Ergebnisse speichern, Bewertungen anzeigen und begründen. | Die App sagt etwas, das man selbst nicht sieht. |
| | Phase 3 | Woche 5–6: Geführte Selbsttests, LSI-Berechnung, Warnung bei sich öffnender Schere. | Das Alleinstellungsmerkmal steht. |
| | Phase 4 | Woche 7–8: Physio-Bericht, Erinnerungen, Export und Löschung, englische Fassung vollständig, Bezahlschranke gebaut und **ausgeschaltet**. | Fremde Menschen können es benutzen. |
| | Danach | Präventionsstufe, sportartspezifisch — sobald die Bindungszahlen stimmen. | |
| | Durchgehend | Inhalte schreiben. Ab Woche 1, nicht später. | |

> **Abbruchkriterium für Phase 0, vereinbart:** Die Liste ist abgearbeitet **und** ein erneuter Audit-Lauf findet nichts Neues ab Schweregrad „major".
>
> Phase 1 beginnt erst auf dein ausdrückliches OK.

---

## Ebene 2 — Innerhalb Phase 0: der Profil-Fahrplan

Ausgelöst durch deine Beobachtung, dass ein allgemeines Tagebuch wenig bringt und die Auswertung auf verletzungsspezifische Protokolle ausgerichtet werden muss.

| | Schritt | Inhalt |
|---|---|---|
| ✅ | **A** | Kern fertigstellen: Typvertrag und Wortwahl (0.10), Prüfmittel und Orakel (0.11), Gewebematrix (0.12) |
| ✅ | **B** | Profilmechanik: `Profile`-Typ, Registry mit Erschöpfungsprüfung, Testtypen aus dem Profil, `profileVersion` auf jedem Flag, Schalter für den präskriptiven Teil |
| ⏳ | **C** | **Profil 1: Achillessehne, mittlerer Abschnitt** — Schritte 1 bis 4 durch, 5 und 6 blockiert |
| ⏸ | **D** | **Anwaltliche Prüfung der Zweckbestimmung nach MepV**, bevor irgendetwas Präskriptives eingeschaltet wird — Grundlage dafür liegt in [MEILENSTEINE.md](MEILENSTEINE.md) |
| ⏳ | **E** | Profile 2 bis 5: Patellasehne, Patellofemoral, Plantarfaszie, Kreuzbandplastik — Schritte 1 bis 4 durch |
| | **F** | Rest der Prioritätsstufe 1, dann Stufe 2 |

> **Schritt D ist kein Formalismus.** Die Recherche hat eine Annahme gekippt: Die Schweizer MepV ist **absichtlich** an die EU-MDR angeglichen, die Definitionen sind praktisch deckungsgleich, und die Schweiz gilt gegenüber der EU als Drittland. **Ein Schweizer Sitz addiert Aufwand, er subtrahiert keinen.**

---

## Ebene 3 — Die sechs Schritte je Profil

Jedes der rund siebzig Profile durchläuft dieselben sechs Schritte. Der Stand gilt inzwischen für **alle fünf** recherchierten Profile:

| | Schritt | Stand |
|---|---|---|
| ✅ | **1 — Rechercheauftrag** | Fünf Fragen beantwortet, Quellenrang angewandt, zwei Beinahe-Fehler abgefangen |
| ✅ | **2 — Profilentwurf** | Eine Zahl korrigiert (`plyometric` 1.5 → 1.2), zwei bewusst gehalten, Evidenzgrad plus Quelle an jedem Wert |
| ✅ | **3 — Szenarienbibliothek** | Zwei fehlende Verlaufsarten ergänzt, beide fanden je einen echten Motorfehler |
| ✅ | **4 — Erreichbarkeit und Kalibrierung** | 27/27 Urteile je Profil, Kalibrierung ist profilfähig |
| ⛔ | **5 — Echtdaten-Abgleich** | **BLOCKIERT** — siehe unten |
| ⛔ | **6 — Abnahme** | Braucht Schritt 5 **und** den JOSPT-Volltext 2024 |

### Was Schritt 5 blockiert — und warum das wichtig ist

> **Eine Iteration zählt nur, wenn sie gegen echte Daten oder gegen einen publizierten Wert läuft.** Schwellen tausendfach gegen selbst geschriebene Szenarien zu drehen konvergiert nicht auf die Wahrheit, sondern auf die eigenen Annahmen.

Alles bis hierher prüft **Widerspruchsfreiheit**, nicht Richtigkeit. 43 der 44 Szenarien stammen aus Formeln derselben Person, die die Schwellen gesetzt hat.

**Zwei Dinge stehen offen, und beide brauchen dich:**

1. **Ein selbst geführtes Tagebuch über mehrere Wochen.** Papier, Notiz-App, `tagebuch.html` oder `selbsttests.csv` — gleichgültig. **Zugesagt für etwa Ende September 2026.** Bis dahin bleibt Schritt 5 zu.
2. **Der Volltext der JOSPT-Leitlinie in der Revision 2024.** Die aktuellste Quelle, hinter HTTP 403 auf drei Domains. Über eine Bibliothek oder einen Kauf zu beschaffen.

---

## Ebene 4 — Die Profil-Prioritätsstufen

Rund **70 klinisch sinnvolle Kombinationen** aus 16 Verletzungsarten und 14 Körperregionen.

### Stufe 1 — die ersten neun (**alle durch Schritt 1 bis 4**, bis auf die ansatznahe Achillessehne)

| | Profil | Warum hier |
|---|---|---|
| ✅ | Achillessehne, mittlerer Abschnitt | Deine Verletzung. Beste Studienlage. Startprofil. |
| | Achillessehne, ansatznah | Eigenes Profil — die Belastungstoleranz unterscheidet sich deutlich |
| ✅ | Patellasehnen-Tendinopathie | Deine zweite Verletzung |
| ✅ | Patellofemorales Schmerzsyndrom | **Deine aktuelle Lage** — und der Kaskadenfall, den das Produkt erklären will |
| ✅ | Plantarfasziopathie | Sehr häufig, klarer Lastbezug, einfacher Selbsttest |
| ✅ | **Nach Kreuzbandplastik** (vorgezogen aus Stufe 2) | Einziger postoperativer Fall mit echten diskreten Meilensteinen — trägt den Kriterienkatalog |
| ✅ | Schienbeinkantensyndrom | **Verschiebt drei Schwellen** — die 24-Stunden-Regel gilt bei Knochenstress nicht unverändert |
| ✅ | Ischiocrurale Muskelverletzung | Erstes Nicht-Sehnen-Profil; ein Muskel reisst in einem Moment |
| ✅ | Gluteale Tendinopathie | Hauptbelastung ist Kompression — keine Trainingseinheit, keine Tagebuchspalte |
| ✅ | Rotatorenmanschetten-Tendinopathie | **Obere Extremität** — der Kern musste nicht angefasst werden |

### Stufe 2 — nach der Validierung

Ellenbogen-Tendinopathie lateral und medial · Adduktorenbeschwerden · Knochenstressreaktion Tibia und Mittelfuß · Zustand nach vorderer Kreuzbandplastik · Sprunggelenksdistorsion · Achillessehnenriss nach Versorgung.

**Dazu die Kaskade**: zwei gleichzeitige Episoden verschiedener Regionen bekommen einen Bezug — dein eigener Fall, Wade dann Knie. Der stärkste Nebeneffekt der Profil-Umstellung.

### Stufe 3 — später oder nie

Wirbelsäule, Nervenkompression, Instabilitäten, Kompartmentsyndrom. **Bei mehreren davon ist Last nicht der Haupthebel** — dort ist ein ehrliches „dafür ist dieses Werkzeug nicht gemacht" mehr wert als ein vorgetäuschtes Profil.

---

## Wo wir gerade stehen

```
Phase 0  ██████████████████████░░  Kern fertig, fünf Profile bei Schritt 4 von 6
  └─ A ✅  B ✅  C ⏳  D ⏸  E ⏳  F ·
       └─ 1 ✅  2 ✅  3 ✅  4 ✅  5 ⛔  6 ⛔
```

**Neun recherchierte Profile** — Übersicht in [PROFILE.md](PROFILE.md), Details in den `evidence`-Feldern des Codes.

Zwei teilen sich `knee`; dafür musste die Registry von Körperregion auf Profilschlüssel umgebaut werden. Zwei verschieben eigene Schwellen — die Schienbeinkante gleich drei, weil die 24-Stunden-Regel bei Knochenstress nicht unverändert gilt.

**Motor:** 7 Regeln · **306 Tests** · 50 Szenarien · 27 Urteilscodes · 8 Blockade-Gründe · 16 Problemcodes · **9 recherchierte Profile**, zwei davon mit eigenen Schwellen · Meilenstein-Kanal Stufe 1 und 2 nutzbar, Stufe 3 gebaut und aus · drei Ban-Listen

**Was ohne dich weitergehen kann:** Stufe 2 — Ellenbogen, Adduktoren, Knochenstress an Tibia und Mittelfuss, Sprunggelenksdistorsion, Achillessehnenriss nach Versorgung. Dazu die **Kaskade**: zwei gleichzeitige Episoden verschiedener Regionen mit Bezug zueinander — dein eigener Fall, Wade dann Knie.

**Was ohne dich nicht weitergeht:** Schritt 5 und 6, für alle fünf Profile. Sie brauchen gelebte Daten und den JOSPT-Volltext.

---

*Arbeitsdokument. Wird bei jedem abgeschlossenen Schritt fortgeschrieben.*
