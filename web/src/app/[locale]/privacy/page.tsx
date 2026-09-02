/**
 * Was gespeichert wird, wo, und wie lange.
 *
 * ---------------------------------------------------------------------------
 * OHNE ANMELDUNG LESBAR, UND DAS IST ABSICHT.
 *
 * Wer entscheiden soll, ob er ein Gesundheitstagebuch anlegt, muss vorher
 * wissen, wo es liegt. Eine Datenschutzerklärung hinter der Anmeldung
 * beantwortet die Frage erst, wenn sie nicht mehr gestellt wird.
 *
 * Deshalb steht diese Seite auch auf der Erlaubnisliste von
 * `check:prerender`: Sie darf statisch ausgeliefert werden, weil sie über
 * niemanden etwas sagt.
 *
 * ---------------------------------------------------------------------------
 * KURZ, UND OHNE EINEN SATZ, DER NICHT STIMMT.
 *
 * Die Versuchung bei so einer Seite ist der Baukasten — drei Seiten Text, von
 * denen die Hälfte auf Dinge verweist, die es hier nicht gibt: Cookies,
 * Analysewerkzeuge, Auftragsverarbeiter in Drittländern.
 *
 * Was hier steht, ist nachprüfbar: `connect-src` hat zwei Einträge,
 * `font-src` ist `self`, es gibt kein Analyseskript und keine Anmeldung über
 * einen anderen Anbieter. Ein Satz, der auf etwas Nichtvorhandenes verweist,
 * wäre in einer Datenschutzerklärung genau die Art Fehler, die sie wertlos
 * macht.
 * ---------------------------------------------------------------------------
 */

import Link from "next/link";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { navLink, sectionHeading } from "@/lib/ui";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = localeFrom(rawLocale);
  const s = t(locale);

  const abschnitte: [string, string][] = [
    [s.privacy.storedHeading, s.privacy.storedBody],
    [s.privacy.whereHeading, s.privacy.whereBody],
    [s.privacy.howLongHeading, s.privacy.howLongBody],
    [s.privacy.rightsHeading, s.privacy.rightsBody],
    [s.privacy.noTrackingHeading, s.privacy.noTrackingBody],
  ];

  return (
    <main>
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)" }}>
        <Link href={`/${locale}`} style={{ ...navLink, color: "var(--muted)" }}>
          ← {s.diary.back}
        </Link>
      </p>

      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 2rem" }}>{s.privacy.heading}</h1>

      {abschnitte.map(([titel, text]) => (
        <section key={titel} style={{ marginBottom: "var(--space-5)" }}>
          <h2 style={sectionHeading}>{titel}</h2>
          <p style={{ margin: 0, maxWidth: "42rem" }}>{text}</p>
        </section>
      ))}
    </main>
  );
}
