/**
 * The scaffold page.
 *
 * Its only job is to prove card 1.1's acceptance criterion in a way that means
 * something: the engine is imported from the workspace — not copied, not
 * rebuilt — and the registry it exposes is the same one the 306 tests run
 * against. If this page renders nine researched profiles, the wiring is real.
 *
 * It will be replaced by the diary as soon as there is a database behind it.
 */

import { ALL_PROFILES, DEFAULT_PROFILE_FOR, TEST_UNIT } from "loadwise-engine";
import type { Profile } from "loadwise-engine";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";

const isResearched = (p: Profile): boolean =>
  Object.values(p.evidence).some((e) => e.grade !== "D");

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const locale = localeFrom((await params).locale);
  const s = t(locale);

  const researched = ALL_PROFILES.filter(isResearched);
  const generic = ALL_PROFILES.filter((p) => !isResearched(p));

  return (
    <main>
      <header style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.25rem" }}>{s.appName}</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>{s.tagline}</p>
      </header>

      <section
        style={{
          border: "1px solid var(--line)",
          borderRadius: "0.5rem",
          padding: "1.25rem",
          background: "var(--card)",
        }}
      >
        <h2 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", margin: "0 0 0.75rem" }}>
          {s.scaffold.heading}
        </h2>

        <p style={{ margin: "0 0 1rem" }}>{s.scaffold.engineLoaded}</p>

        <p style={{ margin: "0 0 1.5rem", color: "var(--muted)" }}>
          {ALL_PROFILES.length} {s.scaffold.profilesAvailable} — {researched.length}{" "}
          {s.scaffold.researched}, {generic.length} {s.scaffold.generic}
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.6rem" }}>
          {researched.map((p) => (
            <li key={p.key} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", borderTop: "1px solid var(--line)", paddingTop: "0.6rem" }}>
              <span>
                <strong>{p.label[locale]}</strong>
                <span style={{ color: "var(--muted)" }}> · {p.bodyRegion}</span>
                {DEFAULT_PROFILE_FOR[p.bodyRegion] !== p.key && (
                  <span style={{ color: "var(--muted)" }}> (kein Standard)</span>
                )}
              </span>
              <span style={{ color: "var(--muted)", whiteSpace: "nowrap", fontSize: "0.9rem" }}>
                {p.tests.map((type) => `${type} (${TEST_UNIT[type]})`).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p style={{ color: "var(--muted)", marginTop: "1.5rem", fontSize: "0.9rem" }}>
        {s.scaffold.nothingYet}
      </p>
    </main>
  );
}
