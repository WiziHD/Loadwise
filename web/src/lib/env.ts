/**
 * Environment values, read once and checked loudly.
 *
 * A missing key must fail at startup with a sentence that says which one.
 * Health data behind an undefined URL fails silently in exactly the wrong
 * direction: the client builds, the page renders, and nothing is stored.
 */

function required(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Safe in the browser: the anon key only ever sees what Row Level Security allows. */
export const PUBLIC_ENV = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () =>
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};

/**
 * ---------------------------------------------------------------------------
 * HIER STAND `SERVER_ENV` MIT DEM SERVICE-ROLE-SCHLÜSSEL, UND NIEMAND HAT ES
 * BENUTZT.
 *
 * Der Schlüssel umgeht den zeilenbasierten Zugriffsschutz vollständig — die
 * eine Zugangsberechtigung, die jedes Tagebuch jedes Nutzers lesen kann. Die
 * App liest ihn nirgends: Sowohl `supabaseServer()` als auch der Browserclient
 * nehmen den anon key, damit jede Abfrage durch die Regeln geht. Nur die beiden
 * Entwicklerskripte brauchen ihn, und die lesen `.env.local` direkt.
 *
 * Ein ungenutzter Export ist die H15-Familie mit Einsatz: Er lag in DERSELBEN
 * Datei, aus der `lib/supabase/client.ts` — ein Client-Modul — sich `PUBLIC_ENV`
 * holt. Ein Wort in der Autovervollständigung daneben, und der Zugriff stünde
 * in einem Client-Bündel.
 *
 * Ehrlich dazu, wie schlimm das gewesen wäre: Next ersetzt Umgebungsvariablen
 * ohne `NEXT_PUBLIC_`-Präfix im Browserbündel durch `undefined`. Der Schlüssel
 * selbst wäre also NICHT ausgeliefert worden; es hätte einen Laufzeitfehler
 * gegeben. Belegt ist beides: Der Wert kommt in keiner der 336 Build-Dateien
 * vor, und die Gegenprobe mit dem anon key findet ihn in 26 — die Suche
 * funktioniert also.
 *
 * Trotzdem gelöscht. Wenn `flags` und `evaluations` in Woche 2 serverseitig
 * geschrieben werden, wird der Zugang dort geschrieben, wo er gebraucht wird,
 * mit der Begründung von dann. Ein Vorrat für später ist kein Vorrat, sondern
 * eine offene Tür ohne Wächter.
 * ---------------------------------------------------------------------------
 */
