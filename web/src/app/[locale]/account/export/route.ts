import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { collectExport } from "@/lib/db/export";
import { backupJson } from "@/lib/export/build";

/**
 * Die vollständige Sicherung des Kontos. Ein Route Handler, keine Server-Aktion.
 *
 * ---------------------------------------------------------------------------
 * WEIL EIN DOWNLOAD EINE ANTWORT MIT KOPFZEILEN IST.
 *
 * Eine Server-Aktion gibt einen Wert zurück; die Datei entstünde dann im
 * Browser aus einem Blob, mit einem erfundenen Dateinamen und dem ganzen Text
 * einmal durch den Arbeitsspeicher der Seite. Ein Route Handler setzt
 * `Content-Disposition` und `Content-Type` und ist damit das, was ein Download
 * ist.
 *
 * ---------------------------------------------------------------------------
 * HIER GIBT ES NUR JSON, UND DAS IST EINE ENTSCHEIDUNG.
 *
 * Eine erste Fassung bot auch CSV über das ganze Konto an. Das war falsch:
 * `parseDiary` kennt keine Episodenspalte. Zwei Verläufe mit einem gemeinsamen
 * Tag — eine Achillessehne und ein Knie im selben Sommer, genau der Fall aus
 * dem Konzept — landeten in derselben Datei, und beim Wiedereinlesen behielte
 * `buildIndex` einen der beiden Tage.
 *
 * Ein Austauschformat, das zwei Verläufe stillschweigend zu einem macht, ist
 * kein Austauschformat. Die CSV-Ausgaben stehen deshalb an der Episode, wo sie
 * genau das bedeuten, was `parseDiary` darunter versteht.
 *
 * ---------------------------------------------------------------------------
 * NICHT ZWISCHENSPEICHERN. NIRGENDS.
 *
 * Die Antwort ist das vollständige Gesundheitstagebuch eines Menschen. Ein
 * Zwischenspeicher — im Browser, in einem Proxy, in einem Netz-Cache — wäre
 * eine Kopie davon an einem Ort, den niemand gewählt hat und niemand löschen
 * kann.
 * ---------------------------------------------------------------------------
 */
export async function GET(): Promise<Response> {
  // Ohne Anmeldung gibt es nichts. Die Zugriffsregeln lieferten ohnehin eine
  // leere Liste — aber eine leere Datei auszugeben sähe aus wie ein Konto ohne
  // Daten und nicht wie »du bist nicht angemeldet«.
  const user = await currentUser();
  if (user === null) {
    return NextResponse.json({ error: "not-signed-in" }, { status: 401 });
  }

  const episodes = await collectExport();
  const jetzt = new Date();

  return new NextResponse(backupJson(episodes, jetzt.toISOString()), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="loadwise-sicherung-${jetzt
        .toISOString()
        .slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
