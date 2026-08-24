import { redirect } from "next/navigation";
import { ALL_PROFILES } from "loadwise-engine";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { currentUser } from "@/lib/supabase/server";
import { createEpisodeAction } from "@/app/actions/episodes";
import { ProfilePicker } from "@/components/ProfilePicker";
import { toPickerProfile } from "@/lib/profile-view";

const field: React.CSSProperties = {
  padding: "0.55rem 0.6rem",
  fontSize: "1rem",
  border: "1px solid var(--line)",
  borderRadius: "0.375rem",
  background: "var(--card)",
  color: "var(--fg)",
  maxWidth: "26rem",
  width: "100%",
};

export default async function NewEpisodePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = localeFrom((await params).locale);
  const s = t(locale);

  if ((await currentUser()) === null) redirect(`/${locale}/signin`);

  // Researched profiles first: they are the ones that actually carry knowledge.
  //
  // `localeCompare` without a locale asks the HOST for its default collation
  // rather than the page. Harmless while both are Latin-1, and wrong in
  // principle the whole time: the order of a German list is a property of the
  // list, not of whichever machine happens to render it.
  const profiles = [...ALL_PROFILES]
    .map((p) => toPickerProfile(p, locale))
    .sort(
      (a, b) =>
        Number(b.researched) - Number(a.researched) || a.label.localeCompare(b.label, locale),
    );

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 1.5rem" }}>{s.episode.newHeading}</h1>

      <form action={createEpisodeAction.bind(null, locale)} style={{ display: "grid", gap: "1.25rem" }}>
        <ProfilePicker profiles={profiles} strings={s.episode} />

        <label style={{ display: "grid", gap: "0.35rem", maxWidth: "26rem" }}>
          <span style={{ fontWeight: 600 }}>{s.episode.side}</span>
          <select name="side" defaultValue="n/a" style={field}>
            <option value="left">{s.episode.sideLeft}</option>
            <option value="right">{s.episode.sideRight}</option>
            <option value="both">{s.episode.sideBoth}</option>
            <option value="n/a">{s.episode.sideNone}</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.35rem", maxWidth: "26rem" }}>
          <span style={{ fontWeight: 600 }}>{s.episode.startedOn}</span>
          <input type="date" name="startedOn" style={field} />
          <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{s.episode.startedOnHint}</span>
        </label>

        <label style={{ display: "grid", gap: "0.35rem", maxWidth: "26rem" }}>
          <span style={{ fontWeight: 600 }}>{s.episode.label}</span>
          <input type="text" name="label" maxLength={80} style={field} />
        </label>

        <button
          type="submit"
          style={{
            padding: "0.6rem 1rem",
            fontSize: "1rem",
            borderRadius: "0.375rem",
            border: "1px solid var(--fg)",
            background: "var(--fg)",
            color: "var(--bg)",
            cursor: "pointer",
            justifySelf: "start",
          }}
        >
          {s.episode.create}
        </button>
      </form>
    </main>
  );
}
