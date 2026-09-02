/**
 * Die Bezahlschranke: gebaut, versioniert, geprüft — und aus.
 *
 * ---------------------------------------------------------------------------
 * DIESELBE KONSTRUKTION WIE BEIM KRITERIENKATALOG, MIT EINEM UNTERSCHIED.
 *
 * `Protocol.enabled` im Motor ist als Literal `false` typisiert: Ein
 * eingeschaltetes Protokoll ist nicht KONSTRUIERBAR. Das ist richtig, weil das
 * Einschalten dort eine regulatorische Entscheidung ist, die eine anwaltliche
 * Prüfung braucht — kein Schalter, den jemand umlegt.
 *
 * Hier ist es anders, und deshalb ist die Bauform anders: Ob eine Bezahlschranke
 * angeht, ist eine geschäftliche Entscheidung. Sie gehört an eine Konfiguration
 * und nicht an einen Typ. Der Standardwert ist trotzdem AUS, und das Einschalten
 * ist ein ausdrücklicher Schritt.
 *
 * ---------------------------------------------------------------------------
 * DER AUSLÖSER STEHT SEIT DEM KONZEPT FEST, UND ER IST MESSBAR.
 *
 * `KONZEPT.md` §: *»Die Bezahlschranke geht an, sobald 50 Personen mindestens
 * 30 Tage lang Einträge gemacht haben. Diese Zahl misst das Richtige: nicht
 * Anmeldungen, sondern durchgehaltene Nutzung.«*
 *
 * Die Zahl steht hier als Konstante, damit sie nicht in einem Dokument
 * verstaubt, während jemand »irgendwann« entscheidet. `check:paywall-trigger`
 * zählt gegen genau diese Konstante und sagt, wie weit es ist.
 *
 * Der Satz daneben aus demselben Abschnitt ist die eigentliche Begründung:
 * *»Gratis, bis wir viele Nutzer haben« ist die häufigste Art, wie ein Produkt
 * nie Geld verdient.*
 *
 * ---------------------------------------------------------------------------
 * WAS DIE SCHRANKE NIEMALS VERSCHLIESSEN DARF: DIE EIGENEN DATEN.
 *
 * Das ist die eine Grenze, die hier keine Geschäftsentscheidung ist. Export und
 * Kontolöschung sind kein Leistungsmerkmal, sondern die Bedingung dafür, dass
 * dieses Produkt jemandem angeboten werden darf — Gesundheitsdaten nach Art. 9
 * DSGVO, siehe E21.
 *
 * Erzwungen wird das über den Typ: `GatedFeature` ist eine geschlossene Union,
 * und weder Export noch Löschung stehen darin. Ein Versuch, sie zu verschliessen,
 * ist ein Compilerfehler und keine Frage der Aufmerksamkeit. `test/paywall.test.ts`
 * hält die Union zusätzlich namentlich fest.
 *
 * ---------------------------------------------------------------------------
 * KEIN ZAHLUNGSANBIETER. DIE SCHRANKE IST DER ORT, NICHT DER KAUFVORGANG.
 *
 * Damit hängt der Start nicht an einer Preisentscheidung, und die Arbeit ist
 * trotzdem getan: Am Tag, an dem die Schranke angeht, ist die Frage »wo greift
 * sie« bereits beantwortet und geprüft.
 * ---------------------------------------------------------------------------
 */

/**
 * Wann die Schranke angehen soll. Aus `KONZEPT.md`, nicht erfunden.
 *
 * `days` misst Tage MIT Eintrag, nicht Tage seit der Anmeldung. Der Unterschied
 * ist der ganze Punkt: Wer sich vor einem Jahr angemeldet und dreimal etwas
 * eingetragen hat, beweist nichts über durchgehaltene Nutzung.
 */
export const PAYWALL_TRIGGER = { people: 50, days: 30 } as const;

/**
 * Was überhaupt hinter einer Schranke stehen KANN.
 *
 * ---------------------------------------------------------------------------
 * EINE GESCHLOSSENE UNION, UND WAS NICHT DARIN STEHT, IST DER PUNKT.
 *
 * Nicht darin: Tagebuch, Export, Kontolöschung, Datenschutzerklärung.
 *
 * Das Tagebuch bleibt frei, weil `KONZEPT.md` es so entschieden hat: *»Ein
 * kostenloses Tagebuch ist gleichzeitig Produkt, Werbung und Empfehlungsgrund.«*
 * Export und Löschung bleiben frei, weil sie keine Leistung sind, sondern die
 * Bedingung, unter der es diese App geben darf.
 *
 * ---------------------------------------------------------------------------
 * WELCHE MERKMALE HIER STEHEN, IST EINE PRODUKTENTSCHEIDUNG — UND OFFEN.
 *
 * Heute steht der Physio-Ausdruck darin, und die Begründung ist die
 * naheliegende: Er ist das Stück, das jemand zu einem bezahlten Termin
 * mitnimmt, also der klarste Mehrwert über das Tagebuch hinaus. Wer ihn nicht
 * bekommt, verliert keine eigenen Daten — der Export gibt sie vollständig
 * heraus.
 *
 * Das ist eine Annahme und keine getroffene Entscheidung. Sie steht hier an
 * EINER Stelle, damit das Verschieben eine Zeile ist und keine Suche.
 * ---------------------------------------------------------------------------
 */
export type GatedFeature = "print-report";

export const ALL_GATED_FEATURES = ["print-report"] as const satisfies readonly GatedFeature[];

/**
 * Ist die Schranke eingeschaltet?
 *
 * ---------------------------------------------------------------------------
 * AUS, SOLANGE NICHT AUSDRÜCKLICH ETWAS ANDERES DASTEHT.
 *
 * Geprüft wird auf `"an"` und nicht auf »irgendein Wert« oder »nicht leer«: Ein
 * versehentlich gesetztes `LOADWISE_PAYWALL=` oder `=false` würde sonst zu
 * einer eingeschalteten Schranke. Der Standardwert eines Schalters, den niemand
 * kennt, muss der harmlose sein.
 *
 * Kein `NEXT_PUBLIC_`: Der Schalter gehört auf den Server. Im Browser wäre er
 * eine Zeichenkette im Bündel, die jeder umschreiben kann — und eine Schranke,
 * die der Client entscheidet, ist keine.
 * ---------------------------------------------------------------------------
 */
// Ein schlichtes Record statt `NodeJS.ProcessEnv`: Gelesen wird genau ein
// Schlüssel, und der breitere Typ zwänge jeden Test zu einer Zusicherung mit
// `NODE_ENV` darin — eine Attrappe, die mehr behauptet als nötig.
export function paywallEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.LOADWISE_PAYWALL === "an";
}

/**
 * Steht dieses Merkmal hinter der Schranke?
 *
 * Nimmt die Umgebung als Parameter, damit ein Test beide Zustände befragen kann
 * ohne die Umgebung des Laufs zu verbiegen — dieselbe Disziplin wie bei
 * `hostToday` und `serverToday`.
 */
export function isLocked(
  feature: GatedFeature,
  env: Record<string, string | undefined> = process.env,
): boolean {
  // Die Zugehörigkeit wird zur LAUFZEIT geprüft und nicht bloss vom Typ
  // zugesichert. Ein erster Entwurf ignorierte den Parameter und schrieb
  // `void feature;` darunter — genau der tote Code, den dieses Projekt sonst
  // verfolgt.
  //
  // Er ist nicht tot: `GatedFeature` gilt beim Übersetzen, und ein Name, der
  // aus einer Konfiguration oder einem Pfadsegment kommt, ist zur Laufzeit
  // eine beliebige Zeichenkette. Was nicht ausdrücklich als verschliessbar
  // erklärt wurde, bleibt offen — die sichere Richtung.
  if (!(ALL_GATED_FEATURES as readonly string[]).includes(feature)) return false;
  return paywallEnabled(env);
}
