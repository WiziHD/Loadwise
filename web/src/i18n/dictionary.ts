/**
 * The app's own strings. See config.ts for what may never appear here.
 *
 * `Record<Locale, ...>` on purpose: adding a language and forgetting a string
 * is a compile error, the same discipline `VERDICT_WORDING` uses in the engine.
 */

import type { ActivityKind, Locale } from "loadwise-engine";

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
  episode: {
    newHeading: string;
    chooseProfile: string;
    profileHint: string;
    whatItCannotTell: string;
    side: string;
    sideLeft: string;
    sideRight: string;
    sideBoth: string;
    sideNone: string;
    startedOn: string;
    startedOnHint: string;
    label: string;
    create: string;
    none: string;
    noneHint: string;
    newEpisode: string;
    researched: string;
    mechanismOnly: string;
  };
  /**
   * Exhaustive by type: a twelfth activity in the engine is a compile error
   * here until it has a name in every language.
   */
  activities: Record<ActivityKind, string>;
  entry: {
    heading: string;
    date: string;
    morning: string;
    morningHint: string;
    activity: string;
    duration: string;
    rpe: string;
    loadHint: string;
    loadIncomplete: string;
    symptom: string;
    timing: string;
    timingDuring: string;
    timingAfter: string;
    timingEvening: string;
    note: string;
    noteHint: string;
    saved: string;
    /** Both forms, because "1 Tage erfasst" shipped once and read as a bug. */
    daysRecordedOne: string;
    daysRecordedMany: string;
  };
  diary: {
    day: string;
    anchorDeclared: string;
    anchorFirstEntry: string;
    history: string;
    noEntries: string;
    noEntriesHint: string;
    restDay: string;
    editHint: string;
    back: string;
    notDefault: string;
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
    episode: {
      newHeading: "New episode",
      chooseProfile: "What is being tracked?",
      profileHint:
        "The profile decides which self-tests mean anything and where the lines sit. Two of them share a knee, so naming the joint is not enough.",
      whatItCannotTell: "What this profile cannot tell apart",
      side: "Side",
      sideLeft: "Left",
      sideRight: "Right",
      sideBoth: "Both",
      sideNone: "Not applicable",
      startedOn: "When did it start?",
      startedOnHint:
        "Optional, and used only to count days. No rule reads it — every verdict is anchored to the diary itself rather than to a recollection.",
      label: "Your own name for it",
      create: "Create episode",
      none: "No episode yet.",
      noneHint: "An episode is one injury, tracked over time.",
      newEpisode: "New episode",
      researched: "researched",
      mechanismOnly: "mechanism only",
    },
    activities: {
      run: "Running",
      walk: "Walking",
      hike: "Hiking",
      cycle: "Cycling",
      swim: "Swimming",
      row: "Rowing",
      strength_lower: "Strength, legs",
      strength_upper: "Strength, upper body",
      plyometric: "Jumping",
      court_sport: "Court sport",
      other: "Something else",
    },
    entry: {
      heading: "Today",
      date: "Date",
      morning: "Morning score",
      morningHint: "0 means nothing at all, 10 the worst you have had. First thing, before moving about.",
      activity: "Activity",
      duration: "Minutes",
      rpe: "Effort",
      loadHint: "Effort and minutes belong together. Either both or neither.",
      loadIncomplete: "Effort and minutes belong together — either fill in both or leave both empty.",
      symptom: "Symptoms",
      timing: "When",
      timingDuring: "During",
      timingAfter: "After",
      timingEvening: "In the evening",
      note: "Note",
      noteHint: "For you. No rule reads this, in any language, at any time.",
      saved: "Saved.",
      daysRecordedOne: "day recorded",
      daysRecordedMany: "days recorded",
    },
    diary: {
      day: "Day",
      anchorDeclared: "counted from the day you gave",
      anchorFirstEntry: "counted from your first entry",
      history: "Recorded so far",
      noEntries: "Nothing recorded yet.",
      noEntriesHint: "The first entry starts the count.",
      restDay: "no activity",
      editHint: "Recording a day again replaces it. Filling in yesterday is fine.",
      back: "All episodes",
      notDefault: "not the default for this region",
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
    episode: {
      newHeading: "Neue Episode",
      chooseProfile: "Worum geht es?",
      profileHint:
        "Das Profil entscheidet, welche Selbsttests etwas bedeuten und wo die Grenzen liegen. Zwei davon teilen sich ein Knie — das Gelenk zu nennen reicht also nicht.",
      whatItCannotTell: "Was dieses Profil nicht unterscheiden kann",
      side: "Seite",
      sideLeft: "Links",
      sideRight: "Rechts",
      sideBoth: "Beide",
      sideNone: "Nicht zutreffend",
      startedOn: "Seit wann?",
      startedOnHint:
        "Freiwillig, und nur zum Zählen der Tage. Keine Regel liest das — jedes Urteil hängt am Tagebuch selbst und nicht an einer Erinnerung.",
      label: "Eigene Bezeichnung",
      create: "Episode anlegen",
      none: "Noch keine Episode.",
      noneHint: "Eine Episode ist eine Verletzung, über die Zeit verfolgt.",
      newEpisode: "Neue Episode",
      researched: "recherchiert",
      mechanismOnly: "nur Mechanik",
    },
    activities: {
      run: "Laufen",
      walk: "Gehen",
      hike: "Wandern",
      cycle: "Velofahren",
      swim: "Schwimmen",
      row: "Rudern",
      strength_lower: "Kraft, Beine",
      strength_upper: "Kraft, Oberkörper",
      plyometric: "Springen",
      court_sport: "Rückschlagsport",
      other: "Etwas anderes",
    },
    entry: {
      heading: "Heute",
      date: "Datum",
      morning: "Morgenwert",
      morningHint: "0 heisst gar nichts, 10 das Schlimmste, das du hattest. Als Erstes, vor dem Herumlaufen.",
      activity: "Aktivität",
      duration: "Minuten",
      rpe: "Anstrengung",
      loadHint: "Anstrengung und Minuten gehören zusammen. Entweder beides oder keines.",
      loadIncomplete: "Anstrengung und Minuten gehören zusammen — entweder beides ausfüllen oder beides leer lassen.",
      symptom: "Beschwerden",
      timing: "Wann",
      timingDuring: "Während",
      timingAfter: "Danach",
      timingEvening: "Abends",
      note: "Notiz",
      noteHint: "Für dich. Keine Regel liest das, in keiner Sprache, zu keinem Zeitpunkt.",
      saved: "Gespeichert.",
      daysRecordedOne: "Tag erfasst",
      daysRecordedMany: "Tage erfasst",
    },
    diary: {
      day: "Tag",
      anchorDeclared: "gezählt ab dem Tag, den du angegeben hast",
      anchorFirstEntry: "gezählt ab deinem ersten Eintrag",
      history: "Bisher erfasst",
      noEntries: "Noch nichts erfasst.",
      noEntriesHint: "Der erste Eintrag beginnt die Zählung.",
      restDay: "keine Aktivität",
      editHint: "Ein Tag noch einmal erfasst ersetzt ihn. Gestern nachtragen ist in Ordnung.",
      back: "Alle Episoden",
      notDefault: "nicht der Standard für diese Region",
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
