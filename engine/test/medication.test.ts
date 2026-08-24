/**
 * Schmerzmittel: der einzige Wert, der ein Urteil verändert — und nur in eine
 * Richtung.
 *
 * ---------------------------------------------------------------------------
 * DIE ASYMMETRIE IST DER GANZE TEST.
 *
 * Wer ein entzündungshemmendes Schmerzmittel nimmt, hat einen chemisch
 * gesenkten Morgenwert. Vier der sieben Regeln lesen diesen Wert. »Schmerz
 * sinkt« bei gleichzeitig steigender Medikation ist keine Besserung, und die
 * App sagte bisher das Gegenteil.
 *
 * Was daraus folgt, ist bewusst KEINE Deutung: »Deine Besserung könnte an den
 * Tabletten liegen« wäre eine klinische Aussage. Der Motor verweigert nur die
 * ENTWARNUNG und sagt, warum.
 *
 * Eine Warnung geht weiterhin durch. Sie steht auf eigenen Füssen — dass jemand
 * ein Schmerzmittel genommen hat, macht eine Reaktion nicht ungeschehen.
 * Dieselbe Asymmetrie wie bei der Abdeckung, aus demselben Grund: Abdeckung
 * begrenzt die Entwarnung, nie die Warnung.
 * ---------------------------------------------------------------------------
 */

import { describe, expect, it } from "vitest";
import { evaluateEpisode } from "../src/evaluate.js";
import { onMedication, poorResponse, settledNearZero } from "../src/fixtures.js";
import { profileFor } from "../src/profiles/registry.js";
import { ALL_PROFILES } from "../src/profiles/registry.js";
import type { Entry } from "../src/types.js";

const ACHILLES = { bodyRegion: "achilles" as const };

const bewerte = (entries: Entry[]) =>
  evaluateEpisode({ entries, profile: profileFor("achilles"), context: ACHILLES });

describe("Medikation verweigert die Entwarnung", () => {
  it("gibt ohne Medikation eine Entwarnung", () => {
    const ohne = bewerte(settledNearZero(70));
    expect(ohne.overall.status).toBe("judged");
  });

  it("verweigert sie mit Medikation in den letzten Tagen", () => {
    const mit = bewerte(onMedication(70));
    expect(mit.overall.status).toBe("insufficient");
    if (mit.overall.status !== "insufficient") throw new Error("unerreichbar");
    expect(mit.overall.blocking).toContain("medication-in-window");
  });

  it("ändert dabei kein einziges Urteil einer Regel", () => {
    // Der Beleg dafür, dass hier nichts gedeutet wird: Die Regeln sehen
    // dieselben Zahlen und sagen dasselbe. Nur der EINE Satz darüber ändert
    // sich, und zwar von »alles in Ordnung« zu »das kann ich nicht beurteilen«.
    const ohne = bewerte(settledNearZero(70));
    const mit = bewerte(onMedication(70));

    expect(mit.flags.length).toBe(ohne.flags.length);
    expect(mit.flags.map((f) => f.reason)).toEqual(ohne.flags.map((f) => f.reason));
    expect(mit.coverage).toEqual(ohne.coverage);
  });
});

describe("eine Warnung geht trotzdem durch", () => {
  it("bleibt eine Reaktion eine Reaktion, auch mit Schmerzmittel", () => {
    // Die wichtigste Zusicherung der ganzen Änderung. Bekäme die Medikation
    // Vorrang vor der Warnung, würde ein Schmerzmittel eine echte Reaktion
    // verstecken — und das wäre das genaue Gegenteil dessen, was sie soll.
    const roh = poorResponse();
    const ohne = bewerte(roh);
    const mit = bewerte(roh.map((e) => ({ ...e, painMedication: true })));

    expect(ohne.overall.status).toBe("judged");
    expect(mit.overall.status).toBe("judged");
    if (ohne.overall.status !== "judged" || mit.overall.status !== "judged") {
      throw new Error("unerreichbar");
    }
    expect(mit.overall.severity).toBe(ohne.overall.severity);
  });
});

describe("eine fehlende Angabe ist kein Nein", () => {
  it("behandelt null und undefined nicht als »kein Schmerzmittel«", () => {
    // Wer die App vor dieser Änderung benutzt hat, hat für jeden alten Tag
    // keine Angabe. Daraus ein »nein« zu machen wäre eine erfundene Auskunft —
    // ausgerechnet dort, wo es um eine Entwarnung geht. Umgekehrt darf ein
    // fehlender Wert die Entwarnung auch nicht blockieren, sonst könnte
    // niemand je eine bekommen.
    const ohneAngabe = settledNearZero(70);
    const mitNull = ohneAngabe.map((e) => ({ ...e, painMedication: null }));

    expect(bewerte(ohneAngabe).overall.status).toBe("judged");
    expect(bewerte(mitNull).overall.status).toBe("judged");
  });

  it("blockiert nur bei einem ausdrücklichen Ja", () => {
    const einTag = settledNearZero(70);
    const letzter = einTag.length - 1;
    const mitJa = einTag.map((e, i) => (i === letzter ? { ...e, painMedication: true } : e));

    expect(bewerte(mitJa).overall.status).toBe("insufficient");
  });
});

describe("das Zeitfenster", () => {
  it("beachtet nur Tage im betrachteten Zeitraum", () => {
    // Ein Schmerzmittel vor drei Monaten sagt über heute nichts. Der Zeitraum
    // ist derselbe, den `currentFlags` benutzt — eine zweite Zahl dafür zu
    // erfinden hiesse, dieselbe Frage zweimal verschieden zu beantworten.
    const lang = settledNearZero(70);
    const ganzFrueh = lang.map((e, i) => (i < 3 ? { ...e, painMedication: true } : e));

    expect(bewerte(ganzFrueh).overall.status).toBe("judged");
  });
});

describe("unter jedem Profil", () => {
  it("verweigert die Entwarnung überall gleich", () => {
    // Medikation ist keine Eigenschaft des Gewebes. Ein Profil darf hier nichts
    // ändern — und dass es das nicht tut, ist prüfbar statt geglaubt.
    for (const profile of ALL_PROFILES) {
      const kontext = { bodyRegion: profile.bodyRegion, profileKey: profile.key };
      const ohne = evaluateEpisode({ entries: settledNearZero(70), profile, context: kontext });
      const mit = evaluateEpisode({ entries: onMedication(70), profile, context: kontext });

      // Wo schon gewarnt wird, bleibt es bei der Warnung — die geht vor.
      if (ohne.overall.status === "judged" && ohne.overall.severity === "green") {
        expect(mit.overall.status, profile.key).toBe("insufficient");
      }
    }
  });
});
