# Anmeldung einrichten

| | |
|---|---|
| **Stand** | 25. August 2026 |
| **Status** | Der Code ist fertig und geprüft. Was fehlt, ist der Mailversand — und den kann nur jemand mit Zugang zu den Konten einrichten. |
| **Bezug** | [SICHERHEIT.md](SICHERHEIT.md) Punkt 4b und 5 · [ENTSCHEIDUNGEN.md](ENTSCHEIDUNGEN.md) |

---

## Warum passwortlos

**Entschieden 24.08.2026.** Der Magic Link bleibt, dazu eigener Mailversand.

| Weg | Warum nicht |
|---|---|
| Google-Anmeldung | Bequemer — aber allein die Anmeldung verriete Google, dass es diese Person bei einer Reha-App gibt. Bei Gesundheitsdaten ist schon die Zugehörigkeit die Auskunft. |
| Passwörter | Ein weiterer Ort in einer Datenbank mit Gesundheitsdaten, der auslaufen kann. Und fürs Zurücksetzen bräuchte es am Ende doch Mailversand — also dieselbe Arbeit plus ein Passworthash. |
| Supabase-Mailversand | Funktioniert, aber die Drosselung ist streng und projektweit. Für einen Test reicht es, für Menschen nicht. |

Was das kostet, ehrlich: **Ohne Postfach kein Zugang.** Wer seine Adresse verliert, verliert das Tagebuch. Der Export (Karte 4.2) ist die Antwort darauf, und er ist noch nicht gebaut.

---

## Was schon steht

Beide Wege durch den Rückweg sind gebaut und **gegen die echte Datenbank geprüft** (`npm run check:signin --workspace=web`, 7 Prüfungen):

| | |
|---|---|
| `?code=` | PKCE. Kommt an, wenn der Link im selben Browser geöffnet wird. Der stärkere der beiden — der Code allein ist ohne den Verifizierer-Keks wertlos. |
| `?token_hash=` | Geräteunabhängig. **Das ist der Weg, der heute noch nie gelaufen ist**, weil Supabase mit der Standardvorlage den PKCE-Link schickt. |

Der zweite ist kein Randfall: Link am Rechner anfordern, Mail am Telefon öffnen — bei einer App, die neunzig Tage lang geführt werden soll, passiert das dauernd. Vorher bekam man dafür »Link abgelaufen« für einen gültigen Link.

Geprüft ist ausserdem, dass ein erfundener Token **nicht** hineinlässt, dass derselbe Token **kein zweites Mal** gilt, und dass die Sprache aus dem Link erhalten bleibt.

---

## Schritt 1 — Absender einrichten

1. Konto bei **Resend** (3000 Mails/Monat gratis, 100/Tag) oder **Brevo** (300/Tag).
2. Domäne verifizieren: DNS-Einträge für **SPF** und **DKIM**.
3. SMTP-Zugangsdaten notieren.

> **Ohne SPF und DKIM landen die Mails im Spam.** Ein Anmeldelink im Spam ist derselbe Fehlschlag wie kein Link — nur schwerer zu erkennen, weil nichts fehlschlägt.

---

## Schritt 2 — In Supabase eintragen

**Project Settings → Authentication → SMTP Settings.** Host, Port, Benutzer, Passwort, Absenderadresse.

---

## Schritt 3 — Die Vorlage umstellen

**Authentication → Email Templates → Magic Link.** Den Link ersetzen durch:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink
```

Ohne das bleibt es beim PKCE-Weg, und die Anmeldung am zweiten Gerät scheitert weiter.

---

## Schritt 4 — Die zwei Einstellungen, die aus der Sicherheitsdurchsicht kommen

Diese beiden stehen nicht auf der ursprünglichen Liste. Sie kamen bei H11 dazu, und sie werden **genau jetzt** angefasst — deshalb stehen sie hier und nicht in einer Fussnote.

### 4a — Die Liste erlaubter Rückkehradressen

**Authentication → URL Configuration → Redirect URLs.**

Nur echte Adressen eintragen. **Kein Platzhalterzeichen.**

Der Grund: Der Anmeldelink trägt einen Token, der ein Konto öffnet. Wohin dieser Link zeigt, wurde bis zur Durchsicht aus dem `Origin`-Header der Anfrage gebaut — und den setzt, wer die Server-Aktion aufruft. Das war nur deshalb nicht ausnutzbar, **weil Supabase gegen diese Liste prüft**.

Der Code stützt sich inzwischen nicht mehr darauf (siehe 4c). Die Liste bleibt trotzdem die zweite Schicht, und ein `**` darin nimmt sie weg.

### 4b — Rate Limits

**Authentication → Rate Limits.** Mit eigenem SMTP sind die Werte frei einstellbar; vorher gelten die gedrosselten Standardwerte weiter.

Was daran zu bedenken ist: Eine **projektweite** Obergrenze für Mails heisst, dass jemand, der wiederholt Anmeldelinks anfordert, das Kontingent für **alle** aufbrauchen kann. Das ist keine Datenpreisgabe, aber es legt die Anmeldung lahm. Eine Begrenzung pro Herkunftsadresse bräuchte Zustand am Rand des Netzes — Infrastruktur, die es noch nicht gibt.

### 4c — `NEXT_PUBLIC_SITE_URL` setzen

In der Umgebung der Auslieferung, ohne abschliessenden Schrägstrich:

```
NEXT_PUBLIC_SITE_URL=https://…
```

In der Entwicklung optional. **Vor einer Auslieferung Pflicht** — dann hängt das Ziel des Anmeldelinks gar nicht erst an einer Kopfzeile.

---

## Schritt 5 — Prüfen, und zwar den Fall, der vorher kaputt war

1. `npm run check:signin --workspace=web` — der Code, gegen die echte Datenbank. Sieben Prüfungen. Braucht einen laufenden Entwicklungsserver und `LOADWISE_ALLOW_PROBE_ACCOUNTS=ja`.
2. **Link am Rechner anfordern, Mail am Telefon öffnen.** Das ist der Fall, der vorher fehlschlug, und der einzige, der etwas über den Mailversand beweist. Schritt 1 kann er nicht ersetzen und umgekehrt.
3. Und einmal in den Spam-Ordner schauen, auch wenn die Mail ankommt.

---

## Was danach immer noch offen ist

- **Kein Weg zurück ohne Postfach.** Wer die Adresse verliert, verliert den Zugang. Der Export ist die Antwort, und er fehlt.
- **Keine Begrenzung pro Herkunftsadresse.** Siehe 4b.
- **Der Zeitkanal bei der Anmeldung ist ungemessen.** Ein Lauf, der ein Konto anlegt, macht einen Schreibvorgang mehr als einer, der keines anlegt. Siehe [SICHERHEIT.md](SICHERHEIT.md) Punkt 4.
- **Die Testkonten** `dev-test@`, `rls-probe-a/b@loadwise.test` liegen im selben Projekt. Vor einer Veröffentlichung müssen Entwicklung und Produktion getrennt sein; solange sie es nicht sind, ist das nicht abschliessbar.
