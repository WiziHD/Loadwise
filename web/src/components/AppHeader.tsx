import type { Locale } from "loadwise-engine";
import { t } from "@/i18n/dictionary";
import { currentUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { quietButton } from "@/lib/ui";

/**
 * The one bar that is on every page, and the way out of the app.
 *
 * ---------------------------------------------------------------------------
 * THERE WAS NO WAY TO SIGN OUT.
 *
 * The server action existed, fully written, and nothing in the product called
 * it. `actions.signOut` sat in the dictionary in both languages and was never
 * rendered. The session refreshes on every request, so it held indefinitely:
 * anybody who opened this on a borrowed laptop, a shared tablet or a phone they
 * later sold had no way to close it.
 *
 * For a diary of health data that is not a missing convenience. It is the
 * difference between "my data" and "data on a device I no longer control".
 *
 * The account's email address is deliberately NOT shown here. Knowing whose
 * diary is open matters, but this bar is on the screen in a physiotherapy
 * waiting room and on a phone somebody hands to a friend — and an address is
 * the one field that identifies a person to whoever is standing behind them.
 * It belongs on an account page that somebody chooses to open.
 *
 * The label for it used to sit in the dictionary, in both languages, waiting
 * for that page. It has been deleted. A string parked against a page that does
 * not exist is the same shape as a state that is set and never rendered, and
 * this bar is where that habit cost the most: `actions.signOut` sat here
 * translated and unreachable while there was no way out of the app at all. The
 * sentence gets written when the page is, in the words that page needs.
 * ---------------------------------------------------------------------------
 */
export async function AppHeader({ locale }: { locale: Locale }) {
  const s = t(locale);
  const user = await currentUser();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "1rem",
        padding: "0.75rem 1.25rem 0",
        maxWidth: "46rem",
        margin: "0 auto",
      }}
    >
      <LanguageSwitch current={locale} />

      {user !== null && (
        <form action={signOut.bind(null, locale)} style={{ margin: 0 }}>
          <button
            type="submit"
            // Deliberately quiet. It has to be findable without hunting and
            // impossible to press by accident on a phone — which is why it is a
            // real button with padding rather than a link in a row of links.
            style={quietButton}
          >
            {s.actions.signOut}
          </button>
        </form>
      )}
    </header>
  );
}
