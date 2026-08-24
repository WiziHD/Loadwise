# Loadwise

**Lastmanagement für die Zeit zwischen den Physioterminen.**

Nicht die 30 Minuten beim Physio — die anderen 167 Stunden.

> Loadwise dokumentiert und ordnet. Es behandelt nicht und gibt keine Empfehlungen.
> Bei anhaltenden, neuen oder ungewöhnlichen Beschwerden gehört die Einschätzung zu einer Fachperson.

---

## Aufbau

```
engine/     Das Regelmodul. Reine Funktionen, kein Framework, keine Datenbank,
            keine Oberfläche. 316 Tests. Die Wahrheit über das, was das Produkt sagt.
web/        Next.js 16. Importiert den Motor als QUELLE, nicht als Build-Artefakt.
supabase/   Schema und zeilenbasierter Zugriffsschutz.
```

```bash
npm install
npm run check      # Motor: Typen, 316 Tests, Abdeckungsschwellen
                   # App:   Typen, Wortlaut-Grenze
npm run check:full # dasselbe plus Build und Prerender-Wächter
npm run dev        # Entwicklungsserver
```

## Warum der Motor zuerst kam

Bevor eine einzige Seite gebaut wurde, gab es die Regeln. Der Grund steht in
[TECHNIK.md](TECHNIK.md): Wenn diese Regeln auf echten Daten nichts Nützliches
sagen, trägt das Produkt nicht — und das lässt sich in zwei Abenden feststellen
statt in acht Wochen.

**Sieben Regeln:** 24-Stunden-Reaktion · Belastungsspitze · Lastverteilung ·
Seitenasymmetrie · Ausgangswert-Drift · Schmerzmuster · Langzeitverlauf

**Neun recherchierte Verletzungsprofile**, jeder Wert mit Evidenzgrad *und*
Quelle. Übersicht in [PROFILE.md](PROFILE.md).

## Drei Grundsätze, die im Code verankert sind

**Abdeckung begrenzt die Entwarnung, nie die Warnung.** Eine Schwere ist nur
über `status === "judged"` erreichbar. „Alles in Ordnung" ist eine Aussage über
alles, was *nicht* passiert ist, und die verlangt, hingeschaut zu haben.

**Das Gesamtbild beantwortet »wie steht es«, nicht »was ist hier je passiert«.**
Ein roter Tag von vor sieben Wochen setzt nicht den heutigen Stand — bleibt aber
im Bericht stehen. Zu entscheiden, dass ein alter Befund nicht mehr zählt, ist
ein Urteil über ein Wort; ihn zu tilgen wäre das Löschen von Beweisen.

**Kein Urteil darf unerreichbar sein.** Jeder der 27 Urteilscodes, 8
Blockade-Gründe und 16 Problemcodes muss in mindestens einem Szenario vorkommen —
und zusätzlich unter *jedem* Profil. Diese Disziplin hat sieben tote Zweige
gefunden. Der siebte: `rom` war seit der ersten Fassung ein deklarierter Testtyp
mit **null Messungen** in der gesamten Bibliothek.

## Die Regulatorik-Grenze

`engine/src/wording.ts` ist keine Übersetzungstabelle, sondern eine Grenze. Jeder
nutzersichtbare Satz steht dort und läuft durch drei Ban-Listen — Imperative,
Prognosen, Lob — mit je einem Beweistest, dass sie anschlagen.

`npm run check:boundary` stellt sicher, dass keiner dieser Sätze in die App
kopiert wird. Eine Kopie stünde ausserhalb der Prüfung.

Der präskriptive Teil (Phasen, Freigabekriterien) ist gebaut, belegt, versioniert
— und **ausgeschaltet**. `Protocol.enabled` ist der Literaltyp `false`. Warum:
[MEILENSTEINE.md](MEILENSTEINE.md) §1.

## Was hier nicht bewiesen wird

Die Tests zeigen, dass sich die Regeln verhalten, wie sie beschrieben sind. Sie
zeigen **nicht**, dass die Schwellenwerte klinisch stimmen. 49 von 50 Szenarien
stammen aus Formeln derselben Person, die die Schwellen gesetzt hat.

Das löst nur ein gelebtes Tagebuch.

## Dokumente

[KONZEPT.md](KONZEPT.md) · [TECHNIK.md](TECHNIK.md) · [FAHRPLAN.md](FAHRPLAN.md) ·
[PROFILE.md](PROFILE.md) · [MEILENSTEINE.md](MEILENSTEINE.md) ·
[PROTOKOLLE.md](PROTOKOLLE.md) · [PROFIL-ACHILLES.md](PROFIL-ACHILLES.md)

---

*Kein medizinisches Dokument. Keine Behandlungsempfehlung.*
