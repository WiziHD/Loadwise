import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { getEpisode } from "@/lib/db/episodes";
import { listEntries } from "@/lib/db/entries";
import { listSelfTests } from "@/lib/db/self-tests";
import { listMeasurements } from "@/lib/db/measurements";
import { diaryCsv, testsCsv } from "@/lib/export/build";

/**
 * Eine Episode als CSV — in genau dem Format, das der Importer liest.
 *
 * ---------------------------------------------------------------------------
 * AN DER EPISODE UND NICHT AM KONTO, UND DAS IST DER GRUND.
 *
 * `parseDiary` kennt keine Episodenspalte. Ein CSV über mehrere Verläufe
 * legte zwei Tagebücher übereinander — bei einer Achillessehne und einem Knie
 * im selben Sommer wäre der 12. Juli zweimal da, und `buildIndex` behielte
 * einen davon.
 *
 * Hier ist eine Episode im Blick, und die Datei bedeutet genau das, was
 * `parseDiary` darunter versteht.
 *
 * Die vollständige Sicherung über alle Episoden liegt unter
 * `/account/export` und ist JSON. Sie ist das Backup; diese hier ist der
 * Austausch.
 * ---------------------------------------------------------------------------
 */

const FORMATE = new Set(["diary", "tests"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string; id: string }> },
): Promise<Response> {
  const user = await currentUser();
  if (user === null) {
    return NextResponse.json({ error: "not-signed-in" }, { status: 401 });
  }

  const { id } = await params;

  // Über den anon key, also durch die Zugriffsregeln. `null` heisst: weg oder
  // fremd — und beides ist dieselbe Antwort, damit niemand durch Ausprobieren
  // von Kennungen erfährt, welche existieren. Siehe SICHERHEIT.md Punkt 3.
  const episode = await getEpisode(id);
  if (episode === null) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const format = new URL(request.url).searchParams.get("format") ?? "diary";
  if (!FORMATE.has(format)) {
    // Kein Rückfall auf das Tagebuch. Wer »diray« tippt, soll das merken —
    // nicht eine Datei bekommen, die er für die andere hält.
    return NextResponse.json({ error: "unknown-format" }, { status: 400 });
  }

  const heute = new Date().toISOString().slice(0, 10);

  const { text, name } =
    format === "diary"
      ? { text: diaryCsv(await listEntries(id)), name: `loadwise-tagebuch-${heute}.csv` }
      : {
          text: testsCsv(await listSelfTests(id), await listMeasurements(id)),
          name: `loadwise-messungen-${heute}.csv`,
        };

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
