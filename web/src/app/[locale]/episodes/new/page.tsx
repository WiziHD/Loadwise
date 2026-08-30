import { redirect } from "next/navigation";
import { ALL_PROFILES } from "loadwise-engine";
import { localeFrom } from "@/i18n/config";
import { t } from "@/i18n/dictionary";
import { currentUser } from "@/lib/supabase/server";
import { createEpisodeAction } from "@/app/actions/episodes";
import { ProfilePicker } from "@/components/ProfilePicker";
import { toPickerProfile } from "@/lib/profile-view";
import { field, primaryButton } from "@/lib/ui";

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
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 1.5rem" }}>{s.episode.newHeading}</h1>

      <form action={createEpisodeAction.bind(null, locale)} style={{ display: "grid", gap: "1.25rem" }}>
        <ProfilePicker profiles={profiles} strings={s.episode} />

        <label style={{ display: "grid", gap: "0.35rem", maxWidth: "26rem" }}>
          <span style={{ fontWeight: "var(--weight-semibold)" }}>{s.episode.side}</span>
          <select name="side" defaultValue="n/a" style={{ ...field, maxWidth: "26rem" }}>
            <option value="left">{s.episode.sideLeft}</option>
            <option value="right">{s.episode.sideRight}</option>
            <option value="both">{s.episode.sideBoth}</option>
            <option value="n/a">{s.episode.sideNone}</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.35rem", maxWidth: "26rem" }}>
          <span style={{ fontWeight: "var(--weight-semibold)" }}>{s.episode.startedOn}</span>
          <input type="date" name="startedOn" style={{ ...field, maxWidth: "26rem" }} />
          <span style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>{s.episode.startedOnHint}</span>
        </label>

        <label style={{ display: "grid", gap: "0.35rem", maxWidth: "26rem" }}>
          <span style={{ fontWeight: "var(--weight-semibold)" }}>{s.episode.label}</span>
          <input type="text" name="label" maxLength={80} style={{ ...field, maxWidth: "26rem" }} />
        </label>

        <button
          type="submit"
          style={{ ...primaryButton, justifySelf: "start" }}
        >
          {s.episode.create}
        </button>
      </form>
    </main>
  );
}
