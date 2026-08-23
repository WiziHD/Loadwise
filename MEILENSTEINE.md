# Meilensteine und Heilungsverläufe

**Die medizinische und regulatorische Grundlage des Fortschritts-Features.**
Stand 21.08.2026. Jede Zahl trägt ihre Quelle; was strittig ist, steht als strittig da.

---

## Worum es ging

> „Ich würde es cool finden, wenn wir das Belastungstagebuch mit einem Heilungsprotokoll synchronisieren könnten, damit der Nutzer seine eigenen Meilensteine sieht — zum Beispiel wieder gehen zu können nach ACL — und dann sieht, wie weit im Heilungsprozess er ist. Meilensteine werden durch spezifische Tests erreicht, z. B. 15 Kniebeugen."

Die Recherche hat drei Dinge ergeben, die den Bau bestimmt haben. Alle drei sind unbequem, und zwei davon widersprechen der naheliegenden Umsetzung.

---

## 1. Das Feature berührt die Grenze zum Medizinprodukt — frontal

### 1.1 Die Regel

**MDR Regel 11:** Software, die Informationen liefert, *die zu Entscheidungen mit diagnostischem oder therapeutischem Zweck herangezogen werden*, ist mindestens **Klasse IIa**. Bei Gefahr des Todes oder irreversibler Verschlechterung Klasse III, bei schwerer Verschlechterung oder chirurgischem Eingriff Klasse IIb.

Ein System, das sagt „du hast Phase 3 erreicht" oder „Kriterium erfüllt", liefert genau solche Informationen.

### 1.2 Die Trennlinie, wörtlich aus der Auslegungspraxis

| | |
|---|---|
| **Kein Medizinprodukt** | Eine Diabetes-App, die Glukosewerte **dokumentiert** — „no direct medical purpose". Ebenso: Speichern, Archivieren, Übermitteln, einfache Suche. |
| **Medizinprodukt** | Eine Diabetes-App, die die dokumentierten Werte **auswertet und Empfehlungen gibt** — etwa eine Insulindosis. |

Das ist exakt unsere Lage, und es erklärt, warum der bestehende Motor auf der richtigen Seite steht: Er beschreibt Beobachtungen („Der Wochenumfang ist gegenüber den Vorwochen spürbar gestiegen") und sagt nie, was zu tun ist. `wording.ts` erzwingt das mechanisch.

### 1.3 Was der Markt macht

**Vivira** und **Kaia Health** sind CE-zertifizierte Medizinprodukte und im deutschen DiGA-Verzeichnis gelistet. Das ist der Weg für ein System, das Übungen verordnet und Fortschritt bewertet — und er bedeutet Konformitätsbewertung, benannte Stelle, Qualitätsmanagementsystem, klinische Bewertung.

`TECHNIK.md` §2.2 nennt das für eine Einzelperson „das Ende des Projekts". Das bleibt richtig.

### 1.4 Ein Befund, der die Bauform erleichtert

Die **Revision 1 von MDCG 2019-11 (Juni 2025)** erlaubt ausdrücklich eine **Modulbetrachtung**: Die technische Dokumentation darf auf das medizinische Modul begrenzt werden, wenn es klar abgegrenzt ist, eine dokumentierte Zweckbestimmung hat und wohldefinierte Schnittstellen zum Rest der Anwendung.

Das ist der Grund, warum der Katalog überhaupt gebaut werden darf: als abgegrenztes, ausgeschaltetes Modul, dessen Einschaltung eine eigene Entscheidung mit eigener Prüfung wäre.

### 1.5 Was unsere eigenen Dokumente dazu schon sagten

`PROTOKOLLE.md` §1 nennt als Beispiele für das **Überschreiten** wörtlich: *„Du bist in Phase 2, mach jetzt X"*, *„Du darfst wieder laufen"*, *„Freigabekriterien, Belastungsvorgaben"*.
`KONZEPT.md` §13: *„Keine Protokolle, keine Diagnosen, keine Freigaben."*

Die Recherche hat diese Einschätzung nicht revidiert, sondern bestätigt und beziffert.

---

## 2. Die klinische Evidenz — und sie schneidet in beide Richtungen

### 2.1 Dafür

| Befund | Quelle |
|---|---|
| Sechs nicht erfüllte Entlasskriterien: **vierfaches** Rerupturrisiko. Je 10 % schlechteres Verhältnis Ischiocrural zu Quadrizeps: **10,6-fach** | Kyritsis et al., BJSM 2016 |
| Rückkehr ab neun Monaten **plus** symmetrische Quadrizepskraft senkt die Rate erneuter Verletzungen deutlich; berichtet werden **75–84 %** Reduktion | Grindem et al., BJSM 2016 (Delaware-Oslo); Kyritsis 2016 |
| Kriterienbasierte gegenüber zeitbasierter Progression: besseres funktionelles Ergebnis in einem RCT über alle Zielgrössen | RCT, kriterienbasiertes Protokoll nach Kreuzbandplastik |

### 2.2 Dagegen — und das wiegt schwerer, als es auf den ersten Blick aussieht

> **„Passing them has not consistently identified who will or won't sustain another injury."**
> — Scoping Review zu Return-to-Sport-Tests nach Kreuzbandplastik

> **„No single test has been shown to have predictive validity alone."**

**Und die Population:** Kyritsis 2016 untersuchte **158 männliche Profifussballer**. Die Übertragung auf eine 30-jährige Person mit Bürojob ist eine Annahme, keine Ableitung.

Dazu kommt die bekannte Kritik am Seitenvergleich selbst: Ein schlechtes Ergebnis auf **beiden** Beinen kann einen irreführend hohen Symmetrie-Index ergeben, und der Index sagt nichts über die Bewegungsqualität.

### 2.3 Was daraus folgt

**Kriterienbasierte Progression als Rahmen ist gut belegt. Die einzelnen Schwellen als Vorhersage sind es nicht.**

Eine App, die „du hast das Kriterium erfüllt" sagt, verkauft die zweite Aussage mit der Autorität der ersten.

---

## 3. Der Messfehler — der Befund, der das Feature am stärksten geformt hat

Das Kernproblem: **Ohne bekannten Messfehler lässt sich nicht sagen, ob eine Veränderung echt ist oder Rauschen.**

| Test / Instrument | Berichteter Wert | Bemerkung |
|---|---|---|
| VISA-A (Fragebogen) | MCID **6,5** Punkte bei MDC von **mindestens 7** | **Die kleinste bedeutsame Änderung liegt unter der Messgenauigkeit** |
| VISA-A, andere Arbeiten | 7,8 · 8,2 · 23,5 Punkte | strittig |
| VISA-P (Patellasehne) | Änderung über **13** Punkte als minimale wichtige Änderung | Fragebogen, nicht der Test |
| Einbeiniger Fersenheber | **2** Wiederholungen (Jugendliche 13–17) · **6** (aus Test-Retest-Daten) | verschiedene Populationen, **strittig** |
| Fersenheber bei Achillessehnen-Tendinopathie | **kein MDC publiziert** | UBC-Toolkit nennt für andere Masse ausdrücklich „no MDC to report" |
| Einbeiniger Decline Squat | **kein MDC gefunden** | |
| Sprungtests nach Kreuzbandplastik | ICC 0,84–0,92 berichtet, **kein MDC** in vergleichbarer Population | |

> Eine App, die aus „12 → 15 Wiederholungen" ein „du hast dich verbessert" macht, erfindet Genauigkeit, die die Messung nicht hergibt.

**Umgesetzt als Typ:** `ChangeClaim` mit drei Stufen. Ein Messfehler wird **nur** bei Evidenzgrad A oder B und nicht-strittig verwendet. Grad C und D werden ausdrücklich **abgelehnt** — ein geratener Rauschpegel ist schlimmer als gar keiner. Heute trägt kein Test einen brauchbaren, also lautet die Antwort überall „aufgezeichnet", nie „verbessert".

### 3.1 Der Beinahe-Fehler, der diese Regel erzwungen hat

Eine Websuche lieferte: *„For individuals with Achilles tendinopathy, the MDC for the heel-rise test is 6 repetitions."* Im Originaldokument steht diese Zahl in der Tabellenzeile der **Lower Extremity Functional Scale** — eines 20-Punkte-Fragebogens mit Maximum 80. Mit dem Fersenheber-Test hat sie nichts zu tun.

Ungeprüft übernommen stünde jetzt eine Schwelle im Motor, die aus der Maßeinheit eines Fragebogens stammt. Siehe `PROFIL-ACHILLES.md` §7.1.

---

## 4. Der Kriterienkatalog — was tatsächlich publiziert ist

### 4.1 Nach Kreuzbandplastik

| Kriterium | Schwelle | Quelle | Prüfbar im Tagebuch? |
|---|---|---|---|
| Quadrizepskraft, Seitenvergleich | 85–90 % Minimum, ≥ 90 % empfohlen, 95 % als Ziel | isokinetische Messung | **nein** |
| Verhältnis Ischiocrural zu Quadrizeps bei 60°/s | je 10 % schlechter: 10,6-faches Risiko | Kyritsis 2016 | **nein** |
| Sprungtest-Batterie (einbeinig, dreifach, überkreuz) | LSI ≥ 90 % | ICC 0,84–0,92 | **ja** |
| Zeit seit Operation | ≥ 9 Monate | Grindem 2016 | ja, mit Operationsdatum |
| Erguss | höchstens angedeutet | Voraussetzung für Sprungtests | **nein** |
| Beweglichkeit | vollständig | dieselbe Quelle | **nein** |
| Schmerz beim einbeinigen Hüpfen | keiner | dieselbe Quelle | **nein** |
| Psychologische Bereitschaft (ACL-RSI) | ≥ 65–70 | eigener Fragebogen | nein, nicht als Tagebuchzeile |
| Sprungtests frühestens ab | ~12 Wochen | protokollabhängig | ja |

**Fünf von neun kann ein Tagebuch nicht erheben.** Deshalb hat der Typ `Criterion` eine Variante `observation`: Kriterien, die benannt, aber nicht geprüft werden. Sie wegzulassen würde den Katalog vollständiger aussehen lassen, als er ist.

Randnotiz zur Verbreitung: Nur **41 %** der befragten orthopädischen Chirurgen gaben 2013 an, diese Tests zu verwenden.

### 4.2 Patellasehne

| Kriterium | Schwelle | Quelle |
|---|---|---|
| Schmerz beim einbeinigen Squat als Fortschrittskriterium | VAS ≤ **3**, Übungen mindestens eine Woche durchgeführt | Progressive-Tendon-Loading-Protokoll |
| Einbeiniger Decline Squat | 25° Neigung, bis 90° Kniebeugung oder bis zur Schmerzgrenze | JOSPT 2015 |
| Rückkehr in den Wettkampf | alle Übungen der Stufe 4 innerhalb VAS ≤ 3 | dasselbe Protokoll |
| VISA-P | Änderung > 13 Punkte als minimale wichtige Änderung | |

**Strittig:** VAS ≤ 3 (sehnenspezifisch) gegen die allgemein für Tendinopathien genannten ≤ 5 von 10 (zwei Leitlinien plus ein RCT). Beide sind publiziert.

### 4.3 Plantarfaszie

| Kriterium | Angabe | Quelle |
|---|---|---|
| Vor einer Steigerung | Symptome stabil oder besser, kein scharfer Schmerz, **bis zum nächsten Morgen zurück auf Ausgangswert** | Best-Practice-Empfehlungen |
| Stufe 1 | beidbeiniger Fersenheber, 3 × 25 langsam | verbreitete Progression |
| Stufe 2 | einbeinig, 3 × 15 | |
| Stufe 3 | einbeinig auf der Stufe, 3–4 × 8–15 | |
| Rathleff-Protokoll | hohe Last, langsame Wiederholungen, jeden zweiten Tag, Handtuch unter den Zehen (Windlass) | |

Bemerkenswert: **Die 24-Stunden-Regel taucht hier wortgleich auf** wie bei den Sehnen.

### 4.4 Patellofemorales Schmerzsyndrom

**Hier ist der Befund die Abwesenheit von Zahlen.**

Die JOSPT-Leitlinie 2019 empfiehlt Tests, die **Bewegungsqualität** bewerten: einbeinige Kniebeuge (fünf Kriterien zu Rumpf- und Beinachse, 4 von 5 in 5 Versuchen), Step-Down, Treppabsteigen. Als Fragebögen AKPS, KOOS-PF, VAS oder NPRS.

Belastbare quantitative Fortschrittskriterien, wie sie für die Achillessehne oder nach Kreuzbandplastik existieren, wurden **nicht gefunden**. Ein schriftliches Tagebuch sieht von der Bewegungsqualität nichts.

**Und die Prognose ist die schlechteste der vier:**

| | |
|---|---|
| schmerzfrei nach einem Jahr | **nur etwa ein Drittel** |
| unbefriedigendes Ergebnis nach 5–8 Jahren | **über 50 %** |
| Rezidiv | bis **90 %** |
| schlechtere Prognose bei | längerer Symptomdauer, höherem Körpergewicht, höherem Alter |

---

## 5. Zielsetzung — was für die gewählte Bauform spricht

Zielsetzung in der Rehabilitation ist untersucht, und die Ergebnisse stützen die Entscheidung, den Nutzer seine Ziele **selbst** setzen zu lassen:

- schnellere Erholung, weniger psychische Belastung, höhere Motivation, bessere Stimmung
- höhere Therapietreue und bessere Einhaltung der Heimübungen
- **„Collaboratively set goals appear to lead to a higher level of treatment compliance than physiotherapist-mandated goals."**

**Die ehrliche Einschränkung:** Metaanalysen finden einen *kleinen* Gesamteffekt bei *niedriger* Sicherheit der Evidenz, wegen methodischer Mängel der Einzelstudien.

Das reicht als Begründung dafür, dem Nutzer das Zielsetzen zu ermöglichen. Es reicht nicht als Behauptung, dass die App dadurch heilt.

---

## 6. Was daraus gebaut wurde

### Stufe 1 und 2 — nutzbar, ohne regulatorische Berührung

**Eigene Ziele.** Der Nutzer schreibt sie selbst, optional gebunden an eine prüfbare Bedingung auf die eigenen Daten. **Die App liefert kein einziges klinisches Kriterium** — kein Katalog, keine Vorschläge, keine Autovervollständigung. Der Moment, in dem die App „wieder 30 Minuten schmerzfrei gehen" *vorschlägt*, ist der Moment, in dem sie ein klinisches Kriterium verfasst hat.

**Eigene Zahlen.** Die Reihe, mit Daten, ohne Verb der Veränderung. „Am 12.03. acht, am 16.08. fünfzehn." Kein „besser", kein „+7", kein „Bestwert".

**Und so entsteht „wie weit bin ich" trotzdem:** Setzt jemand fünf eigene Meilensteine, kann die App „drei von fünf" zeigen. Fortschritt gegen den **selbst erklärten Maßstab**. Der Maßstab gehört dem Nutzer.

### Stufe 3 — gebaut, belegt, ausgeschaltet

Der Katalog aus §4 ist typisiert (`Criterion`, `ProtocolPhase`, `Protocol`), jede Phase und jedes Kriterium trägt eine eigene Quellenangabe, und `enabled` ist der Literaltyp `false` — ein eingeschalteter Katalog ist nicht konstruierbar.

**Kein Modul ausserhalb von `src/profiles/` nennt den Typ auch nur.** Ein Test greppt danach. Das ist stärker als eine Laufzeit-Absicherung und umgeht zugleich das Problem, dass ein `if (enabled)` bei einem Literaltyp einen unerreichbaren Zweig hätte — und tote Zweige sind der wiederkehrende Fehler dieses Projekts.

### Was ausdrücklich nicht gebaut wurde

| | Warum |
|---|---|
| Prozentbalken gegen einen Zielwert | „12 von 15 = 80 %" behauptet, dass 12 und 15 sich bedeutsam unterscheiden. Kein Messfehler stützt das (§3). |
| Zeitleiste, Zieldatum, „üblicherweise etwa in Woche N" | Aus einem Horizont neben einer Meilensteinliste wird ein Zeitplan, und ein Zeitplan ist eine Prognose. |
| Von der App vorgeschlagene Meilensteine | Stufe 3 in der Kleidung von Stufe 1. |
| Serien, Abzeichen, Punkte, Konfetti | Der Motor kann einen weggelassenen schlechten Tag nicht erkennen — das ist dokumentiert und unlösbar. Eine Serie macht das Weglassen doppelt lohnend, und eine gerissene Serie bestraft jemanden dafür, dass sein Knie nicht mitgespielt hat. |
| Vergleich mit anderen Nutzern | Gesunde erreichen beim Fersenheber 6 bis 70 Wiederholungen. Ein Normwert wäre hier wertlos — und eine Vorhersage obendrein. |

### Die Entscheidung zum Zeithorizont

`horizon` trägt seit dem Achillesprofil den berichteten Zeitverlauf und war „a wording and regulatory decision that has not been taken". **Sie ist jetzt getroffen: er wird weiterhin nicht gerendert.**

Der Text ist eine Aussage über Studiengruppen. Neben eine Meilensteinliste gestellt, lädt er dazu ein, sich selbst einzuordnen — und das ist genau der Graubereich, den dieses Projekt sonst überall meidet. Der Nutzen wäre gering, das Risiko liegt auf der Linie.

---

## 7. Die dritte Ban-Liste

Der Fortschritts-Wortlaut hat eine eigene Fehlerart, die die beiden bestehenden Listen durchlassen: **Lob und Zielsetzung.**

> „Fast am Ziel" ist eine Prognose, die Ermutigung als Verkleidung trägt — sie behauptet, die restliche Strecke werde zurückgelegt.
> „Nächster Meilenstein" heisst, die App verfasst ein Ziel.
> „Gut gemacht" macht aus einer Aufzeichnung ein Urteil über einen Menschen.

`ACHIEVEMENT` steht deshalb neben `IMPERATIVE` und `PREDICTIVE`, mit eigenem Beweis-Test.

**Und die Gegenprobe, die genauso wichtig ist:** Der selbst geschriebene Text eines Meilensteins darf **nicht** in die Ban-Listen geraten. Sie regeln, was der *Motor* sagt. Würde jemand sie „der Konsistenz halber" auf das Nutzerfeld ausdehnen, verweigerte die App das Speichern von „Ich will in sechs Wochen wieder laufen" — und verböte einem Menschen, im eigenen Tagebuch über das eigene Ziel zu sprechen. Der Mechanismus ist der Typ: Nutzertext ist ein `string`, jeder Motorsatz ein `Phrase`. Ein Test hält das fest.

---

## 8. Was offen bleibt

1. **Kein einziger brauchbarer Messfehler.** Für keinen der verwendeten Tests liegt ein MDC in passender Population und mit Evidenzgrad A oder B vor. Solange das so ist, sagt der Motor „aufgezeichnet" und nicht „verbessert" — und das ist die richtige Antwort, keine Übergangslösung.
2. **Die JOSPT-Leitlinie 2024** zur Achillessehne war auf drei Domains hinter HTTP 403. Vor der Abnahme des Achillesprofils zu beschaffen.
3. **Schritt D des Fahrplans** — anwaltliche Prüfung der Zweckbestimmung nach MepV — bleibt die Voraussetzung dafür, dass Stufe 3 je eingeschaltet wird.
4. **Eigene Daten.** Der Nutzer liefert das geführte Tagebuch in etwa 30 Tagen (Stand 21.08.2026). Bis dahin bleiben Schritt 5 und 6 für alle fünf Profile zu.

---

## Quellen

- [Continued Sports Activity, Using a Pain-Monitoring Model — Silbernagel et al., Am J Sports Med 2007](https://journals.sagepub.com/doi/abs/10.1177/0363546506298279)
- [Current Clinical Concepts: Conservative Management of Achilles Tendinopathy — PMC7249277](https://pmc.ncbi.nlm.nih.gov/articles/PMC7249277/)
- [Achilles Tendinopathy Toolkit, University of British Columbia, Okt. 2021](https://med-fom-clone-pt.sites.olt.ubc.ca/files/2021/10/ATT-Final-Version-Oct-19th-21.pdf)
- [Return to sport tests and criteria following ACL reconstruction: a scoping review](https://www.sciencedirect.com/science/article/pii/S0968016025002145)
- [Return to Sport After ACL Reconstruction: Strength and Functionality Testing — PMC11887908](https://pmc.ncbi.nlm.nih.gov/articles/PMC11887908/)
- [Kyritsis et al., BJSM 2016 — Likelihood of ACL graft rupture](https://scholar.google.com/scholar_lookup?doi=10.1136%2Fbjsports-2015-095908)
- [Grindem et al., BJSM 2016 — Delaware-Oslo ACL cohort](https://scholar.google.com/scholar_lookup?doi=10.1136/bjsports-2016-096031)
- [Limb Symmetry Indexes Can Overestimate Knee Function After ACL Injury — JOSPT 2017](https://www.jospt.org/doi/10.2519/jospt.2017.7285)
- [Patellofemoral Pain: Clinical Practice Guidelines — JOSPT 2019](https://www.jospt.org/doi/10.2519/jospt.2019.0302)
- [Prognosis of Patellofemoral Pain: A Systematic Review — JOSPT 2025](https://www.jospt.org/doi/10.2519/jospt.2025.13491)
- [Long-term Prognosis of Athletes With Patellar Tendinopathy — PMC12125489](https://pmc.ncbi.nlm.nih.gov/articles/PMC12125489/)
- [Patellar Tendinopathy: Clinical Diagnosis, Load Management — JOSPT 2015](https://www.jospt.org/doi/10.2519/jospt.2015.5987)
- [Plantar Heel Pain — StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK499868/)
- [Baxter's nerve: the hidden culprit of chronic heel pain — PubMed](https://pubmed.ncbi.nlm.nih.gov/40418415/)
- [Victorian Institute of Sport Assessment-Achilles: MCID — JOSPT 2021](https://www.jospt.org/doi/abs/10.2519/jospt.2021.10040)
- [Goal setting in sport injury rehabilitation: a systematic review](http://efsupit.ro/images/stories/decembrie2021/Art%20482.pdf)
- [Efficacy of interventions on adherence to physiotherapy: overview of systematic reviews](https://systematicreviewsjournal.biomedcentral.com/articles/10.1186/s13643-024-02538-9)
- [MDCG 2019-11 — Qualification and Classification of Software (Europäische Kommission)](https://health.ec.europa.eu/system/files/2020-09/md_mdcg_2019_11_guidance_en_0.pdf)
- [European Revision of MDCG 2019-11 Revision 1 — Emergo by UL](https://www.emergobyul.com/news/european-revision-primary-software-guidance-mdcg-2019-11-revision-1-small-changes-meaningful)
- [Ist Ihre Software ein Medizinprodukt? — QuickBird Medical](https://quickbirdmedical.com/en/medizinprodukt-app-software-mdr/)
- [Vivira im DiGA-Verzeichnis](https://www.diga-verzeichnis.de/en/diga/vivira)

---

*Arbeitsdokument. Kein medizinisches Dokument, keine Behandlungsempfehlung.*
