# Auslieferung auf Vercel

Stand 03.09.2026. Diese Datei existiert, weil `vercel.json` keine Kommentare
erlaubt und eine Konfiguration ohne Begründung in diesem Projekt nichts wert
ist.

---

## Der Befund, an dem die ersten beiden Versuche gescheitert sind

Zwei Ursachen, und die erste macht alles andere wirkungslos.

### 1. Vercel klont das falsche Repository

Aus dem Bereitstellungsprotokoll:

```
Cloning github.com/WiziHD/loadwisev1 (Branch: main, Commit: d24fbe0)
```

Aller Code liegt in **`WiziHD/loadwise`**. Der Commit `d24fbe0` existiert dort
nicht — es sind zwei getrennte Repositories mit getrennter Historie.

Solange das so steht, ändert **keine** Datei in diesem Repository etwas am
Ergebnis: Sie wird nie geklont.

**Zu tun, im Vercel-Dashboard:** Projekt → Settings → Git → das verbundene
Repository auf `WiziHD/loadwise` ändern. Wenn Vercel das Umhängen verweigert,
ist ein neues Projekt aus `WiziHD/loadwise` der kürzere Weg als der Versuch,
zwei Historien zusammenzuführen.

### 2. Vercel hat das Projekt nicht als Next.js erkannt

```
Error: No Output Directory named "public" found after the Build completed.
```

Das ist kein Build-Fehler. Der Build lief durch — im Protokoll steht
`Collecting build traces` bis zum Ende. Danach hat Vercel im falschen Ordner
nachgesehen.

Der Grund ist die Ordnerwahl: Das Root Directory steht auf dem
Repository-Wurzelverzeichnis, und die `package.json` dort ist ein reiner
Workspace-Kopf **ohne `next` in den Abhängigkeiten**. Genau daran erkennt
Vercel ein Next.js-Projekt. Ohne diese Erkennung fällt es auf die
Voreinstellung für unbekannte Projekte zurück, und die sucht ein Verzeichnis
namens `public`.

Der Next.js-Build liegt in `web/.next`.

---

## Was `vercel.json` deshalb festlegt

| Schlüssel | Warum |
|---|---|
| `framework: "nextjs"` | Sagt ausdrücklich, was das ist, statt es aus einer Abhängigkeitsliste raten zu lassen, die im Wurzelverzeichnis nicht steht |
| `outputDirectory: "web/.next"` | Der Ordner, den der Fehler oben nicht gefunden hat |
| `buildCommand` | Ruft den Build im Workspace `web` auf |
| `installCommand: "npm ci"` | `ci` statt `install`: Eine Auslieferung baut gegen die gesperrten Versionen aus `package-lock.json`, nicht gegen das, was heute gerade neu ist |

Die Datei liegt im Wurzelverzeichnis. Wird das Root Directory später auf `web`
gestellt, wird sie schlicht nicht mehr gelesen — Vercel erkennt Next.js dort
von selbst, und nichts bricht.

### Der Motor kommt als Quelltext mit, nicht als Bauartefakt

`next.config.ts` trägt `transpilePackages: ["loadwise-engine"]`. Der Ordner
`engine/` muss deshalb im Build erreichbar sein. Beim jetzigen Root Directory
ist er das ohnehin; wird auf `web` umgestellt, muss **»Include source files
outside of the Root Directory«** eingeschaltet bleiben (Voreinstellung: an).

### Der Prerender-Wächter läuft im Build mit, und das ist Absicht

`npm run build --workspace=web` ist `next build --webpack && npm run
check:prerender`. Der zweite Teil prüft, dass keine private Route statisch
vorgerendert wurde. Eine vorgerenderte Seite mit Tagebuchinhalt läge im
CDN — für alle. Diese Prüfung gehört an den Build und nirgendwo sonst; ein
fehlgeschlagener Deploy ist der billigere Fehler.

---

## Umgebungsvariablen

Im Dashboard unter Settings → Environment Variables. Ohne die ersten beiden
startet die App nicht.

| Variable | Sichtbar im Browser | Zweck |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ja | Supabase-Projekt |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ja | Öffentlicher Schlüssel. Er darf sichtbar sein — der Zugriffsschutz liegt in den Zeilenrichtlinien, nicht in seiner Geheimhaltung |
| `NEXT_PUBLIC_SITE_URL` | ja | Die Adresse, auf die der Anmeldelink zeigt. **Pflicht in der Auslieferung.** Ohne sie nimmt die Anmeldung den `Origin`-Header der Anfrage, und den setzt der Aufrufer. Ohne abschliessenden Schrägstrich |
| `SUPABASE_SERVICE_ROLE_KEY` | **nein** | Schreibt `flags` und `evaluations`. Umgeht den Zeilenschutz vollständig. Niemals mit `NEXT_PUBLIC_` |

### Was in der Auslieferung nicht gesetzt wird

| Variable | Warum nicht |
|---|---|
| `LOADWISE_ALLOW_PROBE_ACCOUNTS` | Öffnet `check:rls` und `check:delete-account`, die Konten anlegen und eines davon löschen. In einer Produktionsdatenbank hat das nichts zu suchen |
| `LOADWISE_PAYWALL` | Die Bezahlschranke ist gebaut und aus (E24). Sie geht erst an, wenn `check:paywall-trigger` 50 Personen mit 30 Eintragstagen zählt — und dann als Entscheidung, nicht als Schalter |

---

## Was vor dem ersten öffentlichen Deploy noch fehlt

- **SMTP.** Supabase liefert Anmeldemails nur an das eigene Konto und mit
  scharfer Ratenbegrenzung. Ohne eigenen Versand kann sich niemand anmelden.
  Siehe `ANMELDUNG.md`.
- **Die Domain**, sobald sie steht, in `NEXT_PUBLIC_SITE_URL` **und** in
  Supabase unter Authentication → URL Configuration → Redirect URLs.
- **Die rechtliche Prüfung** der Zweckbestimmung nach MepV. Sie blockiert
  nichts, was heute ausgeliefert wird — das Präskriptive ist aus — aber sie
  steht vor dem Tag, an dem es angeht.
