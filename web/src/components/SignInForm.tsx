"use client";

import { useState, useTransition } from "react";
import type { Locale } from "loadwise-engine";
import { requestSignInLink } from "@/app/actions/auth";
import type { Strings } from "@/i18n/dictionary";
import { field, primaryButton } from "@/lib/ui";

export function SignInForm({ locale, strings }: { locale: Locale; strings: Strings["auth"] }) {
  const [state, setState] = useState<"idle" | "sent" | "invalid-email" | "send-failed">("idle");
  const [pending, start] = useTransition();

  if (state === "sent") {
    return (
      <div role="status" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "1.25rem", background: "var(--card)" }}>
        <p style={{ margin: "0 0 0.5rem", fontWeight: "var(--weight-semibold)" }}>{strings.sent}</p>
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
      <label htmlFor="email" style={{ fontWeight: "var(--weight-semibold)" }}>
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
        style={field}
      />

      {state !== "idle" && (
        <p id="signin-problem" role="alert" style={{ margin: 0, color: "var(--amber)" }}>
          {state === "invalid-email" ? strings.invalidEmail : strings.sendFailed}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{ ...primaryButton, cursor: pending ? "wait" : "pointer", justifySelf: "start" }}
      >
        {strings.send}
      </button>
    </form>
  );
}
