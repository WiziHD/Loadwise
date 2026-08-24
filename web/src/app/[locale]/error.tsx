"use client";

import { usePathname } from "next/navigation";
import { localeFrom } from "@/i18n/config";
import { ErrorScreen } from "@/components/ErrorScreen";

/**
 * Die Fehlergrenze für alles unter einer Sprache.
 *
 * Muss ein Client-Bauteil sein — das schreibt Next vor — und bekommt deshalb
 * KEINE Routenparameter. Die Sprache kommt daher aus dem Pfad; sie steht dort
 * ohnehin, weil dieses Produkt sie von Anfang an in die Adresse legt statt in
 * einen Zustand.
 *
 * Denselben Weg geht `not-found.tsx` nicht: Eine Nicht-gefunden-Grenze rendert
 * Next serverseitig, und dort liest sie die Sprache aus der Kopfzeile, die der
 * Proxy setzt. Zwei Wege für dieselbe Frage, weil die beiden Grenzen an
 * verschiedenen Orten laufen.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = localeFrom(usePathname().split("/")[1]);
  return <ErrorScreen locale={locale} error={error} reset={reset} />;
}
