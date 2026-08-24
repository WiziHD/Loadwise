/**
 * Die Regeln, die ein Tageseintrag erfüllen muss.
 *
 * Diese Woche wurden sechs stille Datenverluste im Tageseintrag gefunden und
 * von Hand im Browser belegt. Was von Hand belegt ist, ist beim nächsten Umbau
 * wieder offen — hier steht es fest.
 *
 * Jeder Fall hier ist einer, der einmal wirklich falsch war oder falsch werden
 * konnte, nicht eine Aufzählung der Zweige.
 */

import { describe, expect, it } from "vitest";
import { utcToday, validateEntry, type EntryPayload } from "@/lib/entry-validation";

const HEUTE = "2026-08-24";

const tag = (over: Partial<EntryPayload> = {}): EntryPayload => ({
  date: "2026-08-20",
  morningScore: 3,
  sessions: [],
  everydayLoad: null,
  symptomScore: null,
  symptomTiming: null,
  note: null,
  ...over,
});

describe("ein Ruhetag ist der einfachste Fall", () => {
  it("nimmt einen Tag mit nichts als einem Morgenwert an", () => {
    expect(validateEntry(tag(), HEUTE)).toBeNull();
  });

  it("nimmt eine Null an — das ist ein Wert, kein fehlender Wert", () => {
    expect(validateEntry(tag({ morningScore: 0 }), HEUTE)).toBeNull();
  });
});

describe("der Morgenwert darf nicht aus Versehen zur Null werden", () => {
  // Der schwerste der sechs Funde: Im Formular ergab ein leeres Feld
  // `Number("")` und damit 0 — den BESTEN Wert der Skala. Die Prüfung liess
  // das durch, weil 0 im erlaubten Bereich liegt. Er reist jetzt als null.
  it("lehnt einen fehlenden Morgenwert ab", () => {
    expect(validateEntry(tag({ morningScore: null }), HEUTE)).toBe("invalid");
  });

  it("lehnt Werte ausserhalb der Skala ab", () => {
    expect(validateEntry(tag({ morningScore: 11 }), HEUTE)).toBe("invalid");
    expect(validateEntry(tag({ morningScore: -1 }), HEUTE)).toBe("invalid");
  });

  it("lehnt Bruchzahlen und Unfug ab", () => {
    expect(validateEntry(tag({ morningScore: 3.5 }), HEUTE)).toBe("invalid");
    expect(validateEntry(tag({ morningScore: Number.NaN }), HEUTE)).toBe("invalid");
    expect(validateEntry(tag({ morningScore: "3" as unknown as number }), HEUTE)).toBe("invalid");
  });
});

describe("eine Einheit ist ganz oder gar nicht", () => {
  it("nimmt eine vollständige Einheit an", () => {
    expect(
      validateEntry(tag({ sessions: [{ activityKind: "run", durationMin: 40, rpe: 6 }] }), HEUTE),
    ).toBeNull();
  });

  it("nimmt mehrere Einheiten an einem Tag an", () => {
    // Der Grund für den ganzen Umbau: Wer morgens läuft und abends Kraft
    // macht, konnte vorher nur eines eintragen — und die Last des Tages fiel zu
    // niedrig aus, ausgerechnet an den Tagen mit der höchsten.
    expect(
      validateEntry(
        tag({
          sessions: [
            { activityKind: "run", durationMin: 40, rpe: 6 },
            { activityKind: "strength_lower", durationMin: 30, rpe: 5 },
          ],
        }),
        HEUTE,
      ),
    ).toBeNull();
  });

  it("lehnt Anstrengung ohne Minuten ab", () => {
    expect(
      validateEntry(tag({ sessions: [{ activityKind: "run", durationMin: null, rpe: 6 }] }), HEUTE),
    ).toBe("load-incomplete");
  });

  it("lehnt Minuten ohne Anstrengung ab", () => {
    expect(
      validateEntry(tag({ sessions: [{ activityKind: "run", durationMin: 40, rpe: null }] }), HEUTE),
    ).toBe("load-incomplete");
  });

  it("lehnt eine Einheit ohne Aktivität ab", () => {
    // Der Gewebefaktor hätte nichts nachzuschlagen, und die Last liefe gegen
    // einen Standardwert, den niemand gewählt hat.
    expect(
      validateEntry(tag({ sessions: [{ activityKind: null, durationMin: 40, rpe: 6 }] }), HEUTE),
    ).toBe("load-incomplete");
  });

  it("lehnt »ich bin gegangen« ohne Minuten ab — und das ist ein Verlust", () => {
    // EHRLICH FESTGEHALTEN: Vorher liess sich eine Aktivität ohne Minuten
    // erfassen. Sie trug null Last, war also für jede Regel unsichtbar, sah auf
    // dem Bildschirm aber aus wie etwas.
    //
    // Seit eine Einheit alle drei Angaben verlangt, geht das nicht mehr. Wer
    // gegangen ist und nicht auf die Uhr geschaut hat, hat jetzt zwei Wege:
    // die Minuten schätzen, oder es unter »sonst auf den Beinen« festhalten.
    // Das ist bewusst so — ein Eintrag, der nichts bewirkt und so tut, als
    // bewirke er etwas, ist schlechter als keiner.
    expect(
      validateEntry(tag({ sessions: [{ activityKind: "walk", durationMin: null, rpe: null }] }), HEUTE),
    ).toBe("load-incomplete");
  });

  it("lehnt eine Aktivität ab, die der Motor nicht kennt", () => {
    expect(
      validateEntry(tag({ sessions: [{ activityKind: "quidditch", durationMin: 40, rpe: 6 }] }), HEUTE),
    ).toBe("invalid");
  });

  it("lehnt eine unglaubwürdige Zahl von Einheiten ab", () => {
    // Eine Server-Aktion ist ein öffentlicher Endpunkt. Neun Einheiten an einem
    // Tag sind keine Trainingswoche, sondern jemand, der etwas ausprobiert.
    const viele = Array.from({ length: 9 }, () => ({ activityKind: "run", durationMin: 10, rpe: 3 }));
    expect(validateEntry(tag({ sessions: viele }), HEUTE)).toBe("invalid");
  });
});

describe("die Alltagsbelastung", () => {
  it("nimmt die vier bekannten Stufen an", () => {
    for (const stufe of ["sitting", "normal", "on-feet", "very-active"]) {
      expect(validateEntry(tag({ everydayLoad: stufe }), HEUTE), stufe).toBeNull();
    }
  });

  it("darf fehlen", () => {
    expect(validateEntry(tag({ everydayLoad: null }), HEUTE)).toBeNull();
  });

  it("lehnt eine erfundene Stufe ab", () => {
    expect(validateEntry(tag({ everydayLoad: "sehr sportlich" }), HEUTE)).toBe("invalid");
  });
});

describe("ein Zeitpunkt ohne Beschwerdewert beschreibt nichts", () => {
  it("lehnt den Zeitpunkt allein ab", () => {
    // Wurde früher still verworfen und als Erfolg gemeldet. Da keine Seite
    // Zeitpunkte anzeigt, war der Verlust nicht zu bemerken.
    expect(validateEntry(tag({ symptomTiming: "after" }), HEUTE)).toBe("symptom-incomplete");
  });

  it("nimmt beides zusammen an", () => {
    expect(validateEntry(tag({ symptomScore: 4, symptomTiming: "after" }), HEUTE)).toBeNull();
  });

  it("nimmt einen Beschwerdewert ohne Zeitpunkt an", () => {
    expect(validateEntry(tag({ symptomScore: 4 }), HEUTE)).toBeNull();
  });
});

describe("ein Tag, der noch nicht war", () => {
  // Zerstörerisch statt bloss seltsam: Gespeichert wird über
  // (episode_id, entry_date), eine Zeile in der Zukunft wird also später still
  // überschrieben — oder überschreibt.
  it("lehnt einen Tag weit in der Zukunft ab", () => {
    expect(validateEntry(tag({ date: "2026-12-01" }), HEUTE)).toBe("future-date");
  });

  it("lässt genau einen Tag Vorsprung zu, wegen der Zeitzonen", () => {
    // Kein bewohnter Versatz liegt mehr als vierzehn Stunden von UTC entfernt.
    // Wer in Kiribati sitzt, hat gegenüber einem UTC-Host echt schon morgen.
    expect(validateEntry(tag({ date: "2026-08-25" }), HEUTE)).toBeNull();
    expect(validateEntry(tag({ date: "2026-08-26" }), HEUTE)).toBe("future-date");
  });

  it("lässt die Vergangenheit uneingeschränkt zu", () => {
    // Nachtragen ist ausdrücklich vorgesehen. Wer nach den Ferien drei Wochen
    // nachträgt, darf das.
    expect(validateEntry(tag({ date: "2020-01-01" }), HEUTE)).toBeNull();
  });
});

describe("das Datum selbst", () => {
  it("lehnt einen Tag ab, den es nicht gibt", () => {
    expect(validateEntry(tag({ date: "2026-02-30" }), HEUTE)).toBe("invalid");
  });

  it("lehnt ein anderes Format ab", () => {
    expect(validateEntry(tag({ date: "24.08.2026" }), HEUTE)).toBe("invalid");
    expect(validateEntry(tag({ date: "" }), HEUTE)).toBe("invalid");
  });
});

describe("die Notiz", () => {
  it("nimmt Text an und liest ihn nicht", () => {
    expect(validateEntry(tag({ note: "Auf Asphalt, neue Schuhe" }), HEUTE)).toBeNull();
  });

  it("lehnt einen Roman ab", () => {
    expect(validateEntry(tag({ note: "x".repeat(2001) }), HEUTE)).toBe("invalid");
  });
});

describe("utcToday", () => {
  it("gibt das UTC-Datum, nicht das des Rechners", () => {
    // 23:30 in Zürich am 24. ist 21:30 UTC am selben Tag; 00:30 am 25. wäre
    // 22:30 UTC am 24. Der Host antwortet also mit gestern — deshalb ist das
    // hier ausdrücklich nur eine Untergrenze und nicht »heute«.
    expect(utcToday(new Date("2026-08-24T22:30:00Z"))).toBe("2026-08-24");
    expect(utcToday(new Date("2026-01-05T00:00:00Z"))).toBe("2026-01-05");
  });
});
