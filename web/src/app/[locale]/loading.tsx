import { headers } from "next/headers";
import { LOCALE_HEADER, localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";

/**
 * Was dasteht, während eine Seite geholt wird.
 *
 * Jede Seite dieses Produkts rendert bei jedem Aufruf neu — sie liest Cookies
 * und danach die Datenbank. Ohne diese Datei passiert für die Dauer beider
 * Schritte sichtbar nichts, und wer auf einer langsamen Verbindung ein Tagebuch
 * öffnet, weiss nicht, ob er noch einmal tippen soll.
 *
 * Bewusst karg: ein Satz, kein Platzhaltergerüst. Ein Gerüst, das die spätere
 * Seite nachahmt, ist eine zweite Fassung derselben Oberfläche, die getrennt
 * veraltet — und es täuscht Inhalt vor, wo noch keiner da ist.
 */
export default async function Loading() {
  const locale = localeFrom((await headers()).get(LOCALE_HEADER) ?? undefined);

  return (
    <main>
      <p style={{ color: "var(--muted)", margin: 0 }} role="status" aria-live="polite">
        {t(locale).errors.loading}
      </p>
    </main>
  );
}
