"use client";

import { useState, useTransition } from "react";
import type { Locale } from "loadwise-engine";
import { requestSignInLink } from "@/app/actions/auth";
import type { Strings } from "@/i18n/dictionary";

export function SignInForm({ locale, strings }: { locale: Locale; strings: Strings["auth"] }) {
  const [state, setState] = useState<"idle" | "sent" | "invalid-email" | "send-failed">("idle");
  const [pending, start] = useTransition();

  if (state === "sent") {
    return (
      <div role="status" style={{ border: "1px solid var(--line)", borderRadius: "0.5rem", padding: "1.25rem", background: "var(--card)" }}>
        <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>{strings.sent}</p>
        <p style={{ margin: 0, color: "var(--muted)" }}>{strings.sentDetail}</p>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        start(async () => {
          const result = await requestSignInLink(locale, formData);
          setState(result.ok ? "sent" : result.reason);
        });
      }}
      style={{ display: "grid", gap: "0.75rem", maxWidth: "24rem" }}
    >
      <label htmlFor="email" style={{ fontWeight: 600 }}>
        {strings.emailLabel}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        aria-invalid={state === "invalid-email" ? true : undefined}
        aria-describedby={state === "idle" ? undefined : "signin-problem"}
        style={{
          padding: "0.6rem 0.7rem",
          fontSize: "1rem",
          border: "1px solid var(--line)",
          borderRadius: "0.375rem",
          background: "var(--card)",
          color: "var(--fg)",
        }}
      />

      {state !== "idle" && (
        <p id="signin-problem" role="alert" style={{ margin: 0, color: "var(--amber)" }}>
          {state === "invalid-email" ? strings.invalidEmail : strings.sendFailed}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          padding: "0.6rem 1rem",
          fontSize: "1rem",
          borderRadius: "0.375rem",
          border: "1px solid var(--fg)",
          background: "var(--fg)",
          color: "var(--bg)",
          cursor: pending ? "wait" : "pointer",
          justifySelf: "start",
        }}
      >
        {strings.send}
      </button>
    </form>
  );
}
