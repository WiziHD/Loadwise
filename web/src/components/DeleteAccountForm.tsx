"use client";

import { useState, useTransition } from "react";
import type { Locale } from "loadwise-engine";
import { deleteAccountAction } from "@/app/actions/account";
import type { Strings } from "@/i18n/dictionary";
import { field, fieldLabel } from "@/lib/ui";

/**
 * Das Konto löschen — der eine Knopf in dieser App, der nichts zurücklässt.
 *
 * ---------------------------------------------------------------------------
 * EIN GETIPPTES WORT, KEIN ZWEITER KLICK.
 *
 * Ein Bestätigungsfeld, in das jemand LÖSCHEN schreiben muss, ist mehr als ein
 * »Sind Sie sicher?«: Es lässt sich nicht wegklicken, ohne gelesen zu haben,
 * was danebensteht. Ein zweiter Knopf wird zur zweiten Bewegung derselben Hand.
 *
 * Die Server-Aktion prüft dasselbe noch einmal. Das Formular ist eine Hürde
 * für den Menschen davor; eine Server-Aktion ist ein öffentlicher Endpunkt und
 * hat kein Formular vor sich.
 *
 * ---------------------------------------------------------------------------
 * DER KNOPF IST GESPERRT, BIS DAS WORT STIMMT — UND SAGT WARUM.
 *
 * Ein gesperrter Knopf ohne Begründung ist ein kaputter Knopf. Der Satz
 * daneben steht deshalb von Anfang an da und nicht erst nach einem
 * Fehlversuch.
 *
 * ---------------------------------------------------------------------------
 * KEIN »ERFOLG«-ZUSTAND. DEN GIBT ES NICHT.
 *
 * Nach dem Löschen leitet die Aktion weiter, und es gibt niemanden mehr, dem
 * man »gelöscht« zeigen könnte. Dieses Bauteil kennt nur zwei Ausgänge: Das
 * Wort stimmte nicht, oder es ging nicht durch — beide heissen, dass die Daten
 * noch da sind.
 * ---------------------------------------------------------------------------
 */
export function DeleteAccountForm({
  locale,
  strings,
}: {
  locale: Locale;
  strings: Strings["account"];
}) {
  const [wort, setWort] = useState("");
  const [state, setState] = useState<"idle" | "not-confirmed" | "failed">("idle");
  const [pending, start] = useTransition();

  const passt = wort.trim().toLowerCase() === strings.deleteConfirmWord.trim().toLowerCase();

  const meldung =
    state === "not-confirmed"
      ? strings.deleteNotConfirmed
      : state === "failed"
        ? strings.deleteFailed
        : null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          try {
            // Gelingt es, leitet die Aktion weiter und kommt nie zurück. Was
            // hier ankommt, ist immer ein Fehlschlag.
            const result = await deleteAccountAction(locale, wort, strings.deleteConfirmWord);
            setState(result.reason);
          } catch {
            // `redirect` wirft — das ist der ERFOLGSFALL und darf nicht als
            // Fehler erscheinen. Next unterscheidet das über einen eigenen
            // Fehlertyp; ihn hier zu prüfen hiesse, sich auf ein Internum zu
            // stützen. Stattdessen: nichts tun. Die Weiterleitung übernimmt.
          }
        });
      }}
      style={{ display: "grid", gap: "var(--space-3)", maxWidth: "28rem" }}
    >
      <p style={{ margin: 0 }}>{strings.deleteIntro}</p>

      <div style={{ display: "grid", gap: "0.3rem" }}>
        <label htmlFor="deleteConfirm" style={fieldLabel}>
          {strings.deleteConfirmLabel}
        </label>
        <input
          id="deleteConfirm"
          value={wort}
          autoComplete="off"
          onChange={(e) => {
            setWort(e.target.value);
            if (state !== "idle") setState("idle");
          }}
          style={{ ...field, maxWidth: "14rem" }}
        />
      </div>

      {meldung !== null && (
        <p role="alert" style={{ margin: 0, color: "var(--red)" }}>
          {meldung}
        </p>
      )}

      <button
        type="submit"
        disabled={!passt || pending}
        data-delete=""
        style={{
          minHeight: "2.75rem",
          padding: "0.6rem 1.25rem",
          fontSize: "var(--text-base)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--red)",
          background: passt ? "var(--red)" : "var(--card)",
          color: passt ? "var(--bg)" : "var(--muted)",
          cursor: !passt ? "not-allowed" : pending ? "wait" : "pointer",
          justifySelf: "start",
        }}
      >
        {pending ? "…" : strings.deleteButton}
      </button>
    </form>
  );
}
