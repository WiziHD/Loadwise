/**
 * The app's own strings. See config.ts for what may never appear here.
 *
 * `Record<Locale, ...>` on purpose: adding a language and forgetting a string
 * is a compile error, the same discipline `VERDICT_WORDING` uses in the engine.
 */

import type { Locale } from "loadwise-engine";

interface Strings {
  appName: string;
  tagline: string;
  nav: {
    diary: string;
    evaluation: string;
    tests: string;
    progress: string;
    settings: string;
  };
  actions: {
    save: string;
    cancel: string;
    delete: string;
    today: string;
    signIn: string;
    signOut: string;
  };
  auth: {
    heading: string;
    intro: string;
    emailLabel: string;
    send: string;
    sent: string;
    sentDetail: string;
    invalidEmail: string;
    sendFailed: string;
    linkExpired: string;
    signedInAs: string;
  };
  /** About the app, never about the person. */
  errors: {
    notSaved: string;
    offline: string;
    notFound: string;
  };
  scaffold: {
    heading: string;
    engineLoaded: string;
    profilesAvailable: string;
    researched: string;
    generic: string;
    tests: string;
    nothingYet: string;
  };
}

export const DICTIONARY: Record<Locale, Strings> = {
  en: {
    appName: "Loadwise",
    tagline: "The other 167 hours.",
    nav: {
      diary: "Diary",
      evaluation: "Evaluation",
      tests: "Self-tests",
      progress: "Progress",
      settings: "Settings",
    },
    actions: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      today: "Today",
      signIn: "Sign in",
      signOut: "Sign out",
    },
    auth: {
      heading: "Sign in",
      intro: "No password. Enter your email address and a sign-in link arrives.",
      emailLabel: "Email address",
      send: "Send link",
      sent: "Check your inbox.",
      // Says the same thing whether or not the address is known. Confirming
      // that an account exists would leak who uses a rehabilitation app.
      sentDetail:
        "If that address can be used here, a link is on its way. It is valid for one hour.",
      invalidEmail: "That does not look like an email address.",
      sendFailed: "The link could not be sent. Nothing was lost — try again.",
      linkExpired: "That link has expired or was already used. Request a new one.",
      signedInAs: "Signed in as",
    },
    errors: {
      notSaved: "That could not be saved. Nothing was lost — try again.",
      offline: "No connection at the moment.",
      notFound: "There is nothing here.",
    },
    scaffold: {
      heading: "Scaffold",
      engineLoaded: "Rule engine loaded from the workspace, not copied.",
      profilesAvailable: "profiles registered",
      researched: "researched",
      generic: "mechanism only",
      tests: "self-tests",
      nothingYet: "Nothing is wired to a database yet. This page exists to prove the engine imports.",
    },
  },
  de: {
    appName: "Loadwise",
    tagline: "Die anderen 167 Stunden.",
    nav: {
      diary: "Tagebuch",
      evaluation: "Auswertung",
      tests: "Selbsttests",
      progress: "Fortschritt",
      settings: "Einstellungen",
    },
    actions: {
      save: "Speichern",
      cancel: "Abbrechen",
      delete: "Löschen",
      today: "Heute",
      signIn: "Anmelden",
      signOut: "Abmelden",
    },
    auth: {
      heading: "Anmelden",
      intro: "Kein Passwort. E-Mail-Adresse eingeben, dann kommt ein Anmeldelink.",
      emailLabel: "E-Mail-Adresse",
      send: "Link senden",
      sent: "Schau in dein Postfach.",
      sentDetail:
        "Falls diese Adresse hier verwendet werden kann, ist ein Link unterwegs. Er gilt eine Stunde.",
      invalidEmail: "Das sieht nicht nach einer E-Mail-Adresse aus.",
      sendFailed: "Der Link konnte nicht gesendet werden. Nichts ist verloren — bitte noch einmal.",
      linkExpired: "Dieser Link ist abgelaufen oder wurde schon benutzt. Fordere einen neuen an.",
      signedInAs: "Angemeldet als",
    },
    errors: {
      notSaved: "Das konnte nicht gespeichert werden. Nichts ist verloren — bitte noch einmal.",
      offline: "Gerade keine Verbindung.",
      notFound: "Hier ist nichts.",
    },
    scaffold: {
      heading: "Gerüst",
      engineLoaded: "Regelmodul aus dem Arbeitsbereich geladen, nicht kopiert.",
      profilesAvailable: "Profile registriert",
      researched: "recherchiert",
      generic: "nur Mechanik",
      tests: "Selbsttests",
      nothingYet: "Noch ist nichts an eine Datenbank angeschlossen. Diese Seite belegt, dass der Motor importierbar ist.",
    },
  },
};

export const t = (locale: Locale): Strings => DICTIONARY[locale];
