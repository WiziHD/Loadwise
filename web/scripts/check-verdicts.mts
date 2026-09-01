/**
 * Gehen die Zeilen, die der Motor erzeugt, durch die echte Datenbank?
 *
 * ---------------------------------------------------------------------------
 * WAS EINE ATTRAPPE NICHT PRÜFEN KANN.
 *
 * `test/verdict-write.test.ts` belegt die Reihenfolge — erst die Flags, dann die
 * Auswertung — und dass die Felder heissen, wie `db/types.ts` sie nennt. Mehr
 * nicht. Ob eine Spalte wirklich so heisst, ob der Aufzählungstyp `severity`
 * den Wert kennt, ob `for_date` ein Datum in dieser Form annimmt, ob der CHECK
 * `severity_only_when_judged` hält: Darüber sagt eine Attrappe **nichts**.
 *
 * Es sind fünfzehn von Hand geschriebene Feldzuordnungen gegen ein Schema, das
 * jemand einmal gelesen hat. Genau die Klasse Fehler, die kompiliert, alle
 * Tests besteht und beim ersten echten Tag scheitert.
 *
 * ---------------------------------------------------------------------------
 * DREI FRAGEN, UND ZWEI SIND GEGENPROBEN.
 *
 * Eine echte Motorausgabe muss hineingehen. Eine Zeile, die den CHECK verletzt,
 * darf es NICHT — sonst bewiese die erste Frage nur, dass die Datenbank alles
 * schluckt. Und was hineinging, muss unverändert wieder herauskommen: `config`
 * und `coverage` gehen als jsonb durch einen Umweg, und ein stiller Verlust
 * dort hiesse, dass der Bericht gegen andere Schwellen rendert als die, nach
 * denen geurteilt wurde.
 *
 * ---------------------------------------------------------------------------
 * DIESES SKRIPT RÄUMT AUF, `check:rls` NICHT — UND DAS IST KEIN WIDERSPRUCH.
 *
 * `check:rls` benutzt `findOrCreate` und lässt seine Zeilen liegen, damit der
 * nächste Lauf sie wiederverwendet. Der Preis dafür ist bekannt: Migration 0007
 * ist genau daran gescheitert, weil sie leere Tabellen braucht.
 *
 * Hier gibt es nichts wiederzuverwenden — jeder Lauf braucht eine frische
 * Auswertung, sonst prüft er die alte. Also wird die Probeepisode am Ende
 * gelöscht, und `on delete cascade` nimmt Flags und Auswertungen mit.
 *
 * ---------------------------------------------------------------------------
 * Braucht den Service-Role-Key und schreibt in die echte Datenbank. Wie
 * `check:rls` und `check:signin`: von Hand, nie in CI.
 *
 *   npm run check:verdicts --workspace=web
 * ---------------------------------------------------------------------------
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { evaluateEpisode, type Entry, type Evaluation } from "loadwise-engine";
import { toEvaluationRow, toFlagRow, toSelfTest, type SelfTestRow } from "../src/lib/db/types.js";

const ERLAUBNIS = "LOADWISE_ALLOW_PROBE_ACCOUNTS";
const PROBE_LABEL = "Urteils-Sonde";
const PROBE_EMAIL = "rls-probe-a@loadwise.test";

function fail(message: string): never {
  console.error(`\nUrteilsprüfung FEHLGESCHLAGEN\n\n${message}\n`);
  process.exit(1);
}

function readEnv(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) fail(`Kein ${path}. Dieses Skript redet mit dem echten Projekt.`);
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((z) => z.trim() !== "" && !z.trim().startsWith("#"))
      .map((z) => {
        const i = z.indexOf("=");
        return [z.slice(0, i).trim(), z.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

type Pruefung = { name: string; ok: boolean; detail: string };
const pruefungen: Pruefung[] = [];

function record(name: string, ok: boolean, detail = ""): void {
  pruefungen.push({ name, ok, detail });
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail === "" ? "" : ` — ${detail}`}`);
}

/**
 * Wo unterscheiden sich zwei Werte — und zwar mit Pfad, nicht mit »ungleich«.
 *
 * ---------------------------------------------------------------------------
 * NICHT `JSON.stringify(a) === JSON.stringify(b)`, UND DAS WAR EIN FUND.
 *
 * Die erste Fassung verglich so, und `config` und `coverage` fielen durch.
 * **Postgres normalisiert `jsonb`** — Schlüssel kommen in anderer Reihenfolge
 * zurück, als sie hineingingen. Zwei gleiche Objekte ergeben damit zwei
 * verschiedene Zeichenketten.
 *
 * Das war ein Fehler in der Prüfung, kein Datenverlust. Aber die Prüfung sagte
 * nur »ungleich«, und der Unterschied zwischen »die Schlüssel stehen anders« und
 * »eine Schwelle fehlt« ist genau der, auf den es hier ankommt: Das eine ist
 * belanglos, das andere hiesse, dass der Bericht gegen andere Zahlen rendert
 * als die, nach denen geurteilt wurde.
 * ---------------------------------------------------------------------------
 */
function abweichung(a: unknown, b: unknown, pfad = ""): string | null {
  if (a === b) return null;

  const beideObjekte =
    typeof a === "object" && a !== null && typeof b === "object" && b !== null;
  if (!beideObjekte) return `${pfad || "(Wurzel)"}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`;

  if (Array.isArray(a) !== Array.isArray(b)) return `${pfad}: Liste gegen Objekt`;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${pfad}: ${a.length} gegen ${b.length} Einträge`;
    for (let i = 0; i < a.length; i += 1) {
      const d = abweichung(a[i], b[i], `${pfad}[${i}]`);
      if (d !== null) return d;
    }
    return null;
  }

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  // Vereinigung beider Schlüsselmengen, damit auch ein FEHLENDER Schlüssel
  // auffällt. Nur über die eine Seite zu laufen wäre in der gefährlichen
  // Richtung blind.
  for (const k of new Set([...Object.keys(ao), ...Object.keys(bo)])) {
    if (!(k in ao)) return `${pfad}.${k}: fehlt links`;
    if (!(k in bo)) return `${pfad}.${k}: fehlt rechts`;
    const d = abweichung(ao[k], bo[k], `${pfad}.${k}`);
    if (d !== null) return d;
  }
  return null;
}

/**
 * Ein Tagebuch, das den Motor zum Sprechen bringt.
 *
 * Ein stummer Motor wäre die stillste Art, diese Prüfung zu bestehen: keine
 * Flags, keine Zeilen, kein Widerspruch. Deshalb wird unten ausdrücklich
 * geprüft, dass tatsächlich Befunde entstanden sind.
 */
function tagebuch(): Entry[] {
  const tage: Entry[] = [];
  for (let i = 0; i < 20; i += 1) {
    tage.push({
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      morningScore: i < 18 ? 2 : 7,
      sessions: i === 17 ? [{ activityKind: "run", durationMin: 90, rpe: 9 }] : [],
    });
  }
  return tage;
}

async function main(): Promise<void> {
  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    fail("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY werden gebraucht.");
  }
  if (env[ERLAUBNIS] !== "ja") {
    fail(
      `Dieses Skript legt eine Probeepisode an und schreibt Urteile.\n` +
        `Es läuft nur, wenn in .env.local steht:\n\n  ${ERLAUBNIS}=ja\n\n` +
        `In einer Produktionsumgebung steht das nicht.`,
    );
  }

  const db: SupabaseClient = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\nUrteile gegen ${url}\n`);

  // --- Aufbau: ein Konto, eine frische Episode ----------------------------
  const { data: konten, error: kontenFehler } = await db.auth.admin.listUsers();
  if (kontenFehler !== null) fail(`Konten lesen: ${kontenFehler.message}`);
  const konto = konten.users.find((u) => u.email === PROBE_EMAIL);
  if (konto === undefined) {
    fail(`Kein Konto ${PROBE_EMAIL}. Zuerst: npm run check:rls --workspace=web`);
  }

  // Hat ein früherer Lauf etwas liegen lassen?
  //
  // Das Aufräumen unten steht in einem `finally` und sollte immer greifen —
  // aber »sollte« ist keine Messung. Ein abgebrochener Prozess (Strg-C, ein
  // Absturz) erreicht kein finally, und die Zeilen blieben dann still liegen,
  // bis die nächste Migration mit leeren Tabellen dagegen läuft.
  //
  // Eng gefasst: Kennung des Prüfkontos UND das Etikett. Nur nach dem Etikett
  // zu löschen hiesse, eine echte Episode zu treffen, falls jemand sie zufällig
  // so nennt.
  const { data: reste } = await db
    .from("episodes")
    .delete()
    .eq("user_id", konto.id)
    .eq("label", PROBE_LABEL)
    .select("id");
  if ((reste ?? []).length > 0) {
    console.log(
      `  --    ${(reste ?? []).length} Episode(n) aus einem früheren Lauf entfernt ` +
        `— dort ist etwas abgebrochen, bevor das Aufräumen dran war\n`,
    );
  }

  const { data: episode, error: episodeFehler } = await db
    .from("episodes")
    .insert({
      user_id: konto.id,
      body_region: "achilles",
      profile_key: "achilles_midportion",
      side: "right",
      label: PROBE_LABEL,
    })
    .select("id")
    .single();
  if (episodeFehler !== null) fail(`Probeepisode anlegen: ${episodeFehler.message}`);
  const episodeId = (episode as { id: string }).id;

  try {
    // --- 1. Eine echte Motorausgabe geht hinein --------------------------
    const auswertung: Evaluation = evaluateEpisode({
      entries: tagebuch(),
      context: { bodyRegion: "achilles", profileKey: "achilles_midportion" },
    });

    record(
      "der Motor hat überhaupt etwas gefunden",
      auswertung.flags.length > 0 && auswertung.overall.status === "judged",
      `${auswertung.flags.length} Flag(s), overall ${auswertung.overall.status}`,
    );

    const laufId = crypto.randomUUID();

    const { error: flagFehler } = await db
      .from("flags")
      .insert(auswertung.flags.map((f) => toFlagRow(f, laufId, episodeId)));
    record(
      "die Flags gehen durch die echte Tabelle",
      flagFehler === null,
      flagFehler?.message ?? `${auswertung.flags.length} Zeile(n)`,
    );

    const { error: evalFehler } = await db
      .from("evaluations")
      .insert(toEvaluationRow(auswertung, laufId, episodeId));
    record("die Auswertung auch", evalFehler === null, evalFehler?.message ?? laufId);

    // --- 2. Gegenprobe: die Datenbank setzt ihre Bedingung selbst durch ---
    //
    // Ohne diese Zeile bewiese Punkt 1 nur, dass die Datenbank alles schluckt.
    // `severity_only_when_judged` ist die Bedingung, die verhindert, dass eine
    // Auswertung eine Schwere trägt, ohne genug beurteilt zu haben — also
    // genau: eine Entwarnung ohne Deckung.
    const { error: verboten } = await db.from("evaluations").insert({
      ...toEvaluationRow(auswertung, crypto.randomUUID(), episodeId),
      overall_status: "insufficient",
      overall_severity: "green",
    });
    record(
      "eine Schwere ohne Beurteilung weist die Datenbank ab",
      verboten !== null,
      verboten === null
        ? "SIE GING DURCH — der CHECK severity_only_when_judged fehlt"
        : (verboten.code ?? verboten.message),
    );

    // --- 3. Was hineinging, kommt unverändert heraus ----------------------
    const { data: zurueck, error: leseFehler } = await db
      .from("evaluations")
      .select("*")
      .eq("id", laufId)
      .single();
    if (leseFehler !== null) fail(`Auswertung zurücklesen: ${leseFehler.message}`);

    const zeile = zurueck as Record<string, unknown>;

    const configDiff = abweichung(zeile.config, auswertung.config);
    record(
      "config übersteht den Weg durch jsonb",
      configDiff === null,
      // Der Unterschied gehört in die Zeile, die fehlschlägt — nicht die
      // Begründung in die, die hält. Stand hier kurz andersherum und las sich
      // wie eine Warnung neben einem grünen Haken.
      configDiff === null
        ? ""
        : `${configDiff} — der Bericht rendert dann gegen andere Schwellen als die, nach denen geurteilt wurde`,
    );

    const coverageDiff = abweichung(zeile.coverage, auswertung.coverage);
    record("coverage ebenso", coverageDiff === null, coverageDiff ?? "");

    // Gegenprobe zu den beiden darüber: Findet dieser Vergleich überhaupt
    // etwas? Ein `abweichung`, das immer null liefert, bestünde beide Zeilen
    // mühelos — und wäre die teuerste Sorte grüner Haken.
    record(
      "Gegenprobe: der Vergleich findet einen fehlenden Wert",
      abweichung(zeile.config, { ...(auswertung.config as object), zzz_erfunden: 1 }) !== null,
    );
    record("last_date steht da", zeile.last_date === auswertung.lastDate, String(zeile.last_date));
    record(
      "overall_severity ist gesetzt",
      zeile.overall_severity !== null,
      String(zeile.overall_severity),
    );

    const { data: flagsZurueck, error: flagLeseFehler } = await db
      .from("flags")
      .select("id, kind, severity, for_date")
      .eq("evaluation_id", laufId);
    if (flagLeseFehler !== null) fail(`Flags zurücklesen: ${flagLeseFehler.message}`);

    record(
      "alle Flags hängen an ihrem Lauf",
      (flagsZurueck ?? []).length === auswertung.flags.length,
      `${(flagsZurueck ?? []).length} von ${auswertung.flags.length}`,
    );

    // Gegenprobe zur Zeile darüber: Eine Abfrage auf eine erfundene Laufkennung
    // muss leer sein. Sonst hiesse »alle Flags hängen an ihrem Lauf« nur, dass
    // die Bedingung gar nicht filtert.
    const { data: fremde } = await db
      .from("flags")
      .select("id")
      .eq("evaluation_id", crypto.randomUUID());
    record("und eine fremde Laufkennung liefert nichts", (fremde ?? []).length === 0);

    // ---------------------------------------------------------------------
    // 4. DER SEITENVERGLEICH, DURCH DIE ECHTE DATENBANK.
    //
    // `test/selftest-abnahme.test.ts` beweist die Kette bis zum Motor —
    // Formular, Prüfregeln, Urteil. Was es NICHT kann, ist der Teil
    // dazwischen: ob `on conflict (episode_id, test_type, test_date)`
    // überhaupt auflöst.
    //
    // Ohne den eindeutigen Index aus 0009 lehnt Postgres das rundweg ab
    // (»there is no unique or exclusion constraint matching the ON CONFLICT
    // specification«). Das Speichern schlüge also fehl statt still danebenzu-
    // gehen — aber es schlüge fehl, und keine Attrappe könnte das zeigen:
    // `test/self-tests-action.test.ts` ersetzt genau diese Funktion.
    //
    // Und die CHECK-Bedingungen aus 0001 sind derselbe Fall wie
    // `severity_only_when_judged` oben: `involved >= 0` gegen
    // `uninvolved > 0`. Eine Attrappe sagt darüber nichts, und die
    // aussagekräftigste Messung überhaupt — null auf der verletzten Seite —
    // hängt daran.
    // ---------------------------------------------------------------------
    const messung = (datum: string, involved: number, uninvolved: number) => ({
      episode_id: episodeId,
      test_type: "calf_raise",
      test_date: datum,
      involved,
      uninvolved,
      note: null,
    });

    const { error: ersteFehler } = await db
      .from("self_tests")
      .upsert(messung("2026-08-01", 12, 21), { onConflict: "episode_id,test_type,test_date" });
    record(
      "eine Messung geht durch — und damit greift der Index aus 0009",
      ersteFehler === null,
      ersteFehler?.message ?? "",
    );

    // Null auf der VERLETZTEN Seite: Tag eins einer Reha, Index 0, ein echtes
    // Urteil. Eine frühere Fassung des Schemas hat genau das abgewiesen.
    const { error: nullFehler } = await db
      .from("self_tests")
      .upsert(messung("2026-08-02", 0, 21), { onConflict: "episode_id,test_type,test_date" });
    record("null auf der verletzten Seite nimmt die Datenbank an", nullFehler === null, nullFehler?.message ?? "");

    // Die Gegenprobe: null auf der GESUNDEN Seite ist der Divisor.
    const { error: divisorFehler } = await db
      .from("self_tests")
      .upsert(messung("2026-08-03", 5, 0), { onConflict: "episode_id,test_type,test_date" });
    record(
      "und null auf der gesunden Seite lehnt sie ab",
      divisorFehler !== null,
      divisorFehler?.code ?? "durchgelassen",
    );

    // Zweimal derselbe Tag, dieselbe Testart: ERSETZT, nicht angehängt. Genau
    // das, was `saveSelfTest` tut, wenn jemand eine Messung korrigiert.
    const { error: zweiteFehler } = await db
      .from("self_tests")
      .upsert(messung("2026-08-01", 17, 21), { onConflict: "episode_id,test_type,test_date" });
    record("dieselbe Testart am selben Tag ersetzt", zweiteFehler === null, zweiteFehler?.message ?? "");

    const { data: rohMessungen, error: messungLeseFehler } = await db
      .from("self_tests")
      .select("*")
      .eq("episode_id", episodeId)
      .order("test_date", { ascending: true });
    if (messungLeseFehler !== null) fail(`Messungen zurücklesen: ${messungLeseFehler.message}`);

    const messungenZurueck = ((rohMessungen ?? []) as SelfTestRow[]).map(toSelfTest);
    record(
      "es stehen zwei Zeilen da, nicht drei",
      messungenZurueck.length === 2,
      `${messungenZurueck.length} Zeile(n)`,
    );
    record(
      "und die ersetzte trägt den neuen Wert",
      messungenZurueck.find((m) => String(m.date) === "2026-08-01")?.involved === 17,
      String(messungenZurueck.find((m) => String(m.date) === "2026-08-01")?.involved),
    );

    // Der Schluss: Was aus der Datenbank kommt, ergibt im Motor ein Urteil.
    // `numeric` kommt über PostgREST als String zurück, wenn etwas schiefgeht
    // — dann wäre `limbSymmetryIndex` NaN und die Regel stumm, ohne dass
    // irgendetwas einen Fehler meldete.
    const mitMessungen = evaluateEpisode({
      entries: tagebuch(),
      tests: messungenZurueck,
      context: { bodyRegion: "achilles", profileKey: "achilles_midportion" },
    });
    const asym = mitMessungen.flags.filter((f) => f.kind === "asymmetry");
    record(
      "und aus der Datenbank gelesen ergibt sie ein Asymmetrie-Urteil",
      asym.length === 1,
      asym.map((f) => `${f.severity}/${f.reason}`).join(", ") || "keins",
    );
    record(
      "die Zahlen sind Zahlen, nicht Zeichenketten",
      typeof messungenZurueck[0]?.involved === "number" &&
        typeof messungenZurueck[0]?.uninvolved === "number",
      `${typeof messungenZurueck[0]?.involved} / ${typeof messungenZurueck[0]?.uninvolved}`,
    );

    // ---------------------------------------------------------------------
    // 5. EIGENE MASSE — DIE VIER REGELN, DIE NUR DIE DATENBANK DURCHSETZT.
    //
    // `test/measurement-validation.test.ts` prüft dieselben vier als reine
    // Funktion, und `test/db-measurements.test.ts` die Schreibschicht gegen
    // eine Attrappe. Was beide NICHT können: sagen, ob die Bedingungen im
    // Schema wirklich greifen.
    //
    // Und hier hängt daran mehr als sonst. Zwei der vier sind erst mit 0010
    // entstanden, und beide verhindern denselben stillen Fehler in
    // verschiedener Verkleidung: dieselbe Zahlenreihe, die unter zwei Namen
    // oder in zwei Einheiten auseinanderfällt.
    // ---------------------------------------------------------------------
    const mass = (key: string, unit: string) => ({ episode_id: episodeId, key, unit });

    const { data: massZeile, error: massFehler } = await db
      .from("measure_keys")
      .insert(mass("Kniebeugen", "reps"))
      .select("id")
      .single();
    record("ein eigenes Mass geht durch", massFehler === null, massFehler?.message ?? "");
    const massId = (massZeile as { id: string } | null)?.id ?? "";

    // `one_unit_per_key` aus 0001. Dreissig Minuten gegen dreissig Sekunden
    // verglichen ist still, plausibel und vollständig falsch.
    const { error: einheitFehler } = await db
      .from("measure_keys")
      .insert(mass("Kniebeugen", "sec"));
    record(
      "dasselbe Mass in einer zweiten Einheit lehnt die Datenbank ab",
      einheitFehler !== null,
      einheitFehler?.code ?? "durchgelassen",
    );

    // Der Index aus 0010. Ohne ihn wären »Kniebeugen« und »kniebeugen« zwei
    // Masse — zwei Reihen, jede für sich plausibel, wo eine gemeint war.
    const { error: schreibweiseFehler } = await db
      .from("measure_keys")
      .insert(mass("  kniebeugen  ", "reps"));
    record(
      "und dasselbe Mass in anderer Schreibweise ebenso — das ist 0010",
      schreibweiseFehler !== null,
      schreibweiseFehler?.code ?? "durchgelassen",
    );

    // `measure_key_not_blank`, ebenfalls 0010. Ohne die Bedingung wäre »   «
    // ein gültiges Mass, und das zweite träfe auf den Index darüber — mit
    // einer Meldung über Eindeutigkeit statt über ein leeres Feld.
    const { error: leerFehler } = await db.from("measure_keys").insert(mass("   ", "reps"));
    record(
      "ein Mass ohne Namen ebenso",
      leerFehler !== null,
      leerFehler?.code ?? "durchgelassen",
    );

    // Die Gegenprobe zu den dreien: Ein wirklich anderes Mass muss durch.
    // Ohne sie bewiesen sie nur, dass die Tabelle nichts mehr annimmt.
    const { error: anderesFehler } = await db.from("measure_keys").insert(mass("Stehen", "min"));
    record("ein anderes Mass geht weiterhin durch", anderesFehler === null, anderesFehler?.message ?? "");

    // Der Upsert auf (Mass, Tag) — der Index aus 0010, zweiter Teil.
    const wert = (tag: string, value: number) => ({
      measure_key_id: massId,
      measured_on: tag,
      value,
      note: null,
    });
    await db.from("measurements").upsert(wert("2026-08-01", 8), {
      onConflict: "measure_key_id,measured_on",
    });
    const { error: zweiterWertFehler } = await db
      .from("measurements")
      .upsert(wert("2026-08-01", 15), { onConflict: "measure_key_id,measured_on" });
    record(
      "eine zweite Messung am selben Tag ersetzt",
      zweiterWertFehler === null,
      zweiterWertFehler?.message ?? "",
    );

    const { data: werteZurueck } = await db
      .from("measurements")
      .select("*")
      .eq("measure_key_id", massId);
    record(
      "es steht eine Zeile da, nicht zwei",
      (werteZurueck ?? []).length === 1,
      `${(werteZurueck ?? []).length} Zeile(n)`,
    );
    record(
      "und sie trägt den neuen Wert",
      (werteZurueck as { value: number }[] | null)?.[0]?.value === 15,
      String((werteZurueck as { value: number }[] | null)?.[0]?.value),
    );
    record(
      "als Zahl, nicht als Zeichenkette",
      typeof (werteZurueck as { value: unknown }[] | null)?.[0]?.value === "number",
      typeof (werteZurueck as { value: unknown }[] | null)?.[0]?.value,
    );
  } finally {
    // Immer, auch nach einem Abbruch. `on delete cascade` auf episode_id nimmt
    // Flags und Auswertungen mit — sonst blieben Zeilen liegen, und die nächste
    // Migration, die leere Tabellen braucht, liefe gegen dieselbe Wand wie 0007.
    const { error } = await db.from("episodes").delete().eq("id", episodeId);
    if (error !== null) {
      console.error(`\nAUFRÄUMEN FEHLGESCHLAGEN: ${error.message}`);
      console.error(`Die Probeepisode ${episodeId} liegt noch da.\n`);
    } else {
      console.log(`\n  --    aufgeräumt: Probeepisode ${episodeId} gelöscht`);
    }
  }

  const durchgefallen = pruefungen.filter((p) => !p.ok);
  if (durchgefallen.length > 0) {
    fail(`${durchgefallen.length} von ${pruefungen.length} Prüfungen fehlgeschlagen.`);
  }
  console.log(`\nAlle ${pruefungen.length} Prüfungen halten.\n`);
}

try {
  await main();
} catch (fehler: unknown) {
  console.error(`\n${fehler instanceof Error ? fehler.message : String(fehler)}\n`);
  process.exitCode = 1;
}

// Kein ausdrückliches Beenden — siehe check-rls.mts: `process.exit` reisst die
// offenen Sockets des Clients mitten im Abbau weg, und genau darüber stolpert
// libuv.
