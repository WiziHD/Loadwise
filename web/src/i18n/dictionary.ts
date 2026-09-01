/**
 * The app's own strings. See config.ts for what may never appear here.
 *
 * `Record<Locale, ...>` on purpose: adding a language and forgetting a string
 * is a compile error, the same discipline `VERDICT_WORDING` uses in the engine.
 *
 * ---------------------------------------------------------------------------
 * `Strings` IS EXPORTED, AND COMPONENTS MUST TAKE THEIR SLICE FROM IT.
 *
 * Every component that receives strings used to declare the shape a second
 * time — `type Strings = { date: string; morning: string; ... }` sitting in
 * EntryForm, structurally identical and entirely unlinked. It compiled, because
 * TypeScript matches shapes rather than names, and that is precisely the
 * problem: a key added here and forgotten there was invisible, and no tool
 * could tell which of the two lists was the real one.
 *
 * `strings: Strings["entry"]` says it once. It also makes the reads findable:
 * `scripts/check-dictionary.ts` resolves every property access back to the
 * symbol declared HERE, which is only possible while there is one declaration.
 * With two, the check would report every entry string as dead.
 * ---------------------------------------------------------------------------
 */

import type { ActivityKind, FlagKind, Locale } from "loadwise-engine";

export interface Strings {
  appName: string;
  tagline: string;
  actions: {
    save: string;
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
    mechanismOnly: string;
    /**
     * Wenn der gespeicherte Profilschlüssel zu keinem Profil mehr gehört.
     * Ohne diesen Satz zeigt die Seite den Namen einer ANDEREN Verletzung.
     */
    profileMissing: string;
  };
  /**
   * Eine Episode korrigieren und wegräumen.
   *
   * Eigene Gruppe, weil hier ein Satz steht, den es sonst nirgends gibt:
   * `profileChangeWarning` sagt vorher, dass ein Profilwechsel VERGANGENE
   * Urteile verändert. Er gehört zum gefährlichsten Knopf der App und darf
   * nicht zwischen Formularbeschriftungen untergehen.
   */
  edit: {
    link: string;
    heading: string;
    profile: string;
    profileChangeWarning: string;
    save: string;
    saved: string;
    unknownProfile: string;
    futureStart: string;
    invalid: string;
    changeHistory: string;
    changedTo: string;
    archive: string;
    archiveHint: string;
    unarchive: string;
    noDelete: string;
    archiveHeading: string;
    archiveLink: string;
    archiveEmpty: string;
    archivedNote: string;
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
    addSession: string;
    removeSession: string;
    sessionNumber: string;
    everyday: string;
    everydayHint: string;
    everydaySitting: string;
    everydayNormal: string;
    everydayOnFeet: string;
    everydayVeryActive: string;
    stiffness: string;
    stiffnessHint: string;
    medication: string;
    medicationHint: string;
    loadIncomplete: string;
    symptomIncomplete: string;
    futureDate: string;
    invalid: string;
    symptom: string;
    timing: string;
    timingDuring: string;
    timingAfter: string;
    timingEvening: string;
    note: string;
    noteHint: string;
    saved: string;
    replacing: string;
    /** Both forms, because "1 Tage erfasst" shipped once and read as a bug. */
    daysRecordedOne: string;
    daysRecordedMany: string;
  };
  /**
   * Der Seitenvergleich. Die eine Regel, die dieses Produkt von einem
   * Schmerztagebuch unterscheidet — und die bis Karte 3.1 nie auf einer echten
   * Messung lief, weil kein Formular in die Tabelle führte.
   *
   * Die Durchführungstexte stehen NICHT hier, sondern in
   * `engine/src/procedure.ts`. Sie sind Motorwissen (der Fersenheber-Takt ist
   * eine dokumentierte Entscheidung zwischen zwei publizierten Werten), und
   * `check:boundary` verbietet ihre Kopie in dieses Wörterbuch.
   */
  selfTest: {
    link: string;
    heading: string;
    intro: string;
    /** Der Fall, in dem das Profil keinen Selbsttest führt. Siehe Schulter. */
    noneForProfile: string;
    type: string;
    /** Die Namen der Testarten. Namen, keine Anleitungen. */
    calfRaise: string;
    singleHop: string;
    rom: string;
    date: string;
    involved: string;
    involvedHint: string;
    uninvolved: string;
    uninvolvedHint: string;
    unitReps: string;
    unitCm: string;
    unitDeg: string;
    howHeading: string;
    fixedHeading: string;
    note: string;
    noteHint: string;
    saved: string;
    replacing: string;
    historyHeading: string;
    historyEmpty: string;
    /** Ablehnungen. Je Grund ein eigener Satz — »ungültig« für alles ist keiner. */
    halfPairing: string;
    referenceSideZero: string;
    outOfRange: string;
    notInProfile: string;
    futureDate: string;
    invalid: string;
    noEpisode: string;
  };
  /**
   * Die Asymmetrie-Ansicht.
   *
   * Nur Beschriftungen. Der Befund kommt über `verdictText` aus dem Motor, und
   * der Vorbehalt zum Selbstvergleich über `SELF_COMPARISON` — er trägt eine
   * belegte Zahl und steht deshalb unter den Ban-Listen, nicht hier.
   *
   * Was hier ebenfalls NICHT steht: irgendein Wort über ein Ziel. Der Index ist
   * ein Verhältnis; 100 % heisst »beide Seiten gleich« und nicht »fertig«.
   */
  comparison: {
    heading: string;
    calfRaise: string;
    singleHop: string;
    rom: string;
    tableCaption: string;
    colDate: string;
    colInvolved: string;
    colUninvolved: string;
    colIndex: string;
    /** Wenn die Bezugsseite null ist, gibt es kein Verhältnis — keine 0 %. */
    noIndex: string;
    unitReps: string;
    unitCm: string;
    unitDeg: string;
  };
  /**
   * Eigene Masse — Zahlen ohne Vergleichsseite.
   *
   * Hier steht **kein einziger Vorschlag**, was zu messen sich lohnt. Der
   * Kommentar an `MeasureKey` im Motor sagt, warum: Eine Liste dessen, was zu
   * messen sich lohnt, wäre ein klinisches Kriterium. Was das Formular
   * anbietet, sind ausschliesslich die Masse, die der Nutzer selbst benannt
   * hat.
   */
  measure: {
    link: string;
    heading: string;
    intro: string;
    name: string;
    nameHint: string;
    unit: string;
    unitHint: string;
    /** Steht statt der Auswahl, sobald das Mass eine Einheit hat. */
    unitFrozen: string;
    unitReps: string;
    unitCm: string;
    unitDeg: string;
    unitMin: string;
    unitSec: string;
    unitScore: string;
    date: string;
    value: string;
    valueHint: string;
    note: string;
    noteHint: string;
    saved: string;
    replacing: string;
    historyHeading: string;
    historyEmpty: string;
    keyMissing: string;
    keyTooLong: string;
    unknownUnit: string;
    unitConflict: string;
    valueMissing: string;
    outOfRange: string;
    futureDate: string;
    invalid: string;
    noEpisode: string;
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
  };
  /**
   * Der Hauptbildschirm — ein Satz mit seinem Beweis.
   *
   * -------------------------------------------------------------------------
   * HIER STEHT KEIN URTEIL UND KEINE DEUTUNG.
   *
   * Der Satz oben kommt aus dem Motor. Was hier liegt, sind Beschriftungen der
   * Kurve und die Sätze um den Spiegel herum — und der Spiegel darf per E10
   * NICHTS deuten: kein »steigend«, kein Pfeil, keine Richtung. Wer hier ein
   * Wort über einen Trend hinschreibt, hat die achte Regel gebaut, nur ohne
   * Test.
   * -------------------------------------------------------------------------
   */
  main: {
    /** Platzhalter: {days} {from} {to} */
    curveAria: string;
    curveMorningLabel: string;
    curveLoadLabel: string;
    /** Platzhalter: {date} */
    curveMarker: string;
    /** Die eigenen Morgenwerte, zurückgegeben. Ohne jede Richtungsangabe. */
    mirrorMornings: string;
    mirrorHint: string;
    /** Platzhalter: {judged} {expected} */
    mirrorDays: string;
    /** Platzhalter: {reporting} {total} */
    mirrorRules: string;
    /**
     * Der gespeicherte Lauf kennt den neuesten Tag nicht.
     *
     * Entsteht, wenn die Neuberechnung nach dem Speichern fehlgeschlagen ist —
     * der Tag steht, das Urteil hinkt. `saveEntryAction` schluckt den Fehlschlag
     * mit Absicht, weil »nicht gespeichert« falsch wäre. Ohne diesen Satz bliebe
     * er vollständig still.
     */
    behind: string;
    behindHint: string;
    /** Es gibt Einträge, aber keinen lesbaren Lauf dazu. */
    noRun: string;
    noRunHint: string;
  };
  /**
   * Der vollständige Bericht — die Ebene unter dem Hauptbildschirm.
   *
   * -------------------------------------------------------------------------
   * WAS HIER STEHT, IST NIE EIN URTEIL.
   *
   * Die Urteilssätze kommen aus `wording.ts` im Motor, über `verdictText` und
   * `blockedText`. Eine Kopie davon HIER wäre der Fehler, gegen den
   * `check:boundary` gebaut ist: Sie sähe aus wie eine gewöhnliche
   * Zeichenkette, und die erste gutgemeinte Umformulierung stellte einer
   * kranken Person eine Anweisung hin, mit nichts mehr dahinter.
   *
   * Was hier steht, sind Überschriften, Regelnamen und Sätze ÜBER den Bericht.
   * -------------------------------------------------------------------------
   */
  report: {
    link: string;
    heading: string;
    /** Es gab noch keinen Lauf. Nicht dasselbe wie »der Lauf sagt nichts«. */
    none: string;
    noneHint: string;
    /**
     * Es GAB einen Lauf, und diese Fassung kann ihn nicht lesen.
     *
     * Nicht dasselbe wie »keiner«, und zuerst war es dieselbe Antwort. Einen
     * gespeicherten Lauf, den die App nicht mehr versteht, als »noch keine
     * Auswertung« zu zeigen wäre eine Falschaussage über die eigenen Daten —
     * ausgerechnet gegenüber jemandem, der seit Wochen einträgt.
     */
    unreadableRun: string;
    unreadableRunHint: string;
    overallHeading: string;
    /**
     * Die drei Zustände von `Overall`, und der dritte ist der wichtige.
     *
     * »Nicht genug beurteilt« ist eine EIGENE Antwort und kein schwaches Grün.
     * Eine Durchsicht hat genau diesen Fehler schon einmal gefunden.
     */
    stateGreen: string;
    stateAmber: string;
    stateRed: string;
    stateInsufficient: string;
    stateNoData: string;
    /** Platzhalter: {judged} {expected} {reporting} {total} */
    coverage: string;
    pendingHeading: string;
    /** Platzhalter: {days} {expected} */
    pendingScope: string;
    currentHeading: string;
    currentNone: string;
    earlierHeading: string;
    earlierHint: string;
    /**
     * Zwei Formen statt »Befund(e)«, wie bei daysRecordedOne/Many.
     *
     * Eine Klammerform ist in keiner der beiden Sprachen ein Satz, den jemand
     * sagen würde — und ausgerechnet hier steht ein Satz über fehlende
     * Befunde. Platzhalter im Mehrzahlfall: {n}
     */
    unreadableOne: string;
    unreadableMany: string;
    computedAt: string;
    /**
     * Warnzeichen des Profils.
     *
     * Die Zeichen selbst kommen aus `profile.redFlags` im Motor und stehen
     * unter derselben Wortgrenze wie die Urteilssätze. Hier steht nur, was um
     * sie herum gehört.
     */
    redFlagsHeading: string;
    redFlagsHint: string;
    /**
     * Eingabefehler.
     *
     * Der Motor liefert je Fund einen Code, ein Datum und eine englische
     * Entwicklermeldung — für einen Wortlaut in beiden Sprachen fehlt die
     * Tabelle noch (eigene Karte). Gezeigt wird deshalb, WIE VIELE Tage
     * betroffen sind und WELCHE, nicht was genau daran fehlt. Der Satz, auf den
     * es ankommt, ist ohnehin ein anderer: Die Urteile oben stehen auf diesen
     * Daten.
     */
    problemsHeading: string;
    problemsOne: string;
    /** Platzhalter: {n} */
    problemsMany: string;
    problemsHint: string;
    /** Die Regelnamen. Als Record, damit eine neue Regel ein Compilerfehler ist. */
    rules: Record<FlagKind, string>;
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
    /** Der zweite Code, den auth/callback umleiten kann. Siehe SIGNIN_ERRORS. */
    missingCode: string;
  };
  /** About the app, never about the person. */
  errors: {
    notSaved: string;
    offline: string;
    notFound: string;
    brokeHeading: string;
    brokeBody: string;
    tryAgain: string;
  };
}

export const DICTIONARY: Record<Locale, Strings> = {
  en: {
    appName: "Loadwise",
    tagline: "The other 167 hours.",
    actions: {
      save: "Save",
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
      mechanismOnly: "mechanism only",
      profileMissing:
        "The profile this episode was created with no longer exists. What you see is the default for this body region — a different injury, and every verdict on this page is its.",
    },
    edit: {
      link: "Correct this episode",
      heading: "Correct episode",
      profile: "What is being tracked",
      // The one sentence that has to arrive BEFORE the button is pressed.
      profileChangeWarning:
        "Changing the profile changes verdicts you have already been given. The thresholds are different, the self-tests are different, the tissue factor is different — a warning from last week can turn green without a single diary day changing. Nothing in your diary is touched, and the change is recorded below.",
      save: "Save changes",
      saved: "Saved.",
      unknownProfile: "That profile does not exist.",
      futureStart: "That day has not happened yet.",
      invalid: "Those values cannot be saved. Please check the fields.",
      changeHistory: "Profile changes",
      changedTo: "changed to",
      archive: "Move to archive",
      archiveHint:
        "It leaves the list. Nothing is deleted, and you can bring it back at any time.",
      unarchive: "Bring back",
      // Says why the button somebody is looking for is not here.
      noDelete:
        "There is no delete. Deleting comes with the export — nobody should be able to erase months of their own record before they can take a copy of it.",
      archiveHeading: "Archive",
      archiveLink: "Archive",
      archiveEmpty: "Nothing archived.",
      archivedNote: "This episode is archived. It does not appear in your list.",
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
      loadHint: "A session needs all three. Two sessions in a day are two entries, not one long one.",
      addSession: "Add a session",
      removeSession: "Remove",
      sessionNumber: "Session",
      everyday: "On your feet otherwise",
      // Says plainly that nothing computes with it. A field that quietly feeds
      // no rule would be a question asked for nothing.
      everydayHint: "Outside training. Recorded for your own record — no rule reads it yet, because how much load a day on your feet carries is not established.",
      everydaySitting: "Mostly sitting",
      everydayNormal: "Normal",
      everydayOnFeet: "A lot on my feet",
      everydayVeryActive: "On my feet all day",
      stiffness: "Morning stiffness (minutes)",
      // Names the instrument rather than claiming authority of its own.
      stiffnessHint: "How long the stiffness lasted after getting up. This is the first question of the VISA-A, the standard questionnaire for the Achilles tendon. No rule reads it yet — what change in minutes means something is not established.",
      medication: "Painkiller taken?",
      // Says what it does BEFORE it does it. Somebody who is told afterwards
      // that their all-clear was withheld will read it as the app being coy.
      medicationHint: "If you ticked this, no all-clear is given for those days — a painkiller lowers the morning score, and four of the seven rules read that score. A warning still comes through.",
      loadIncomplete: "Effort and minutes belong together — either fill in both or leave both empty.",
      symptomIncomplete: "A time on its own says nothing — either give a symptom score too, or leave the time blank.",
      futureDate: "That day has not happened yet.",
      invalid: "Those values cannot be saved. Please check the numbers.",
      symptom: "Symptoms",
      timing: "When",
      timingDuring: "During",
      timingAfter: "After",
      timingEvening: "In the evening",
      note: "Note",
      noteHint: "For you. No rule reads this, in any language, at any time.",
      saved: "Saved.",
      // Shown BEFORE saving, not after. The upsert replaces the whole day, and
      // somebody adding a morning score to a day that already holds a session
      // needs to know that before they press the button, not afterwards.
      replacing: "This day is already recorded. What you see here is what is stored, and saving replaces it.",
      daysRecordedOne: "day recorded",
      daysRecordedMany: "days recorded",
    },
    selfTest: {
      link: "Side-by-side",
      heading: "Side-by-side measurement",
      intro:
        "Both sides, measured the same way on the same day. The injured side on its own is a number without a scale; against your own other side it becomes one.",
      noneForProfile:
        "This profile carries no self-test. The measurements that exist for it are not ones you can take on your own.",
      type: "Test",
      calfRaise: "Single-leg heel raise",
      singleHop: "Single hop for distance",
      rom: "Ankle dorsiflexion",
      date: "Measured on",
      involved: "Injured side",
      involvedHint:
        "Zero belongs here if that is what it was. It is a measurement, not a blank.",
      uninvolved: "Other side",
      uninvolvedHint:
        "The reference. Without it the injured side has nothing to be compared against, so the pairing is not stored.",
      unitReps: "repetitions",
      unitCm: "centimetres",
      unitDeg: "degrees",
      howHeading: "How the measurement is taken",
      fixedHeading: "Keep this the same every time",
      note: "Note",
      noteHint: "For you. No rule reads this.",
      saved: "Stored.",
      replacing:
        "This test is already recorded for this day. What you see here is what is stored, and saving replaces it.",
      historyHeading: "Measured so far",
      historyEmpty: "No measurement yet.",
      halfPairing: "Both sides are needed. A single side is not stored.",
      referenceSideZero:
        "The other side cannot be zero — it is what the injured side is measured against.",
      outOfRange: "That number is outside what this test can produce. Worth a second look.",
      notInProfile: "This test does not belong to this episode's profile.",
      futureDate: "That date is ahead of today.",
      invalid: "Something in the form did not come through. Please check the fields.",
      noEpisode: "This episode could not be found.",
    },
    comparison: {
      heading: "Side by side, over time",
      calfRaise: "Single-leg heel raise",
      singleHop: "Single hop for distance",
      rom: "Ankle dorsiflexion",
      tableCaption: "Both sides, measured in",
      colDate: "Date",
      colInvolved: "Injured",
      colUninvolved: "Other",
      colIndex: "Ratio",
      noIndex: "—",
      unitReps: "repetitions",
      unitCm: "centimetres",
      unitDeg: "degrees",
    },
    measure: {
      link: "Own measures",
      heading: "Your own measures",
      intro:
        "A number with no other side to compare it against — fifteen squats, eight minutes standing. You name the measure; nothing here suggests what is worth measuring.",
      name: "Measure",
      nameHint: "Your words. Reuse the same name and the readings line up into one record.",
      unit: "Unit",
      unitHint: "Fixed the first time and kept from then on. Thirty minutes against thirty seconds would compare cleanly and mean nothing.",
      unitFrozen: "Recorded in",
      unitReps: "repetitions",
      unitCm: "centimetres",
      unitDeg: "degrees",
      unitMin: "minutes",
      unitSec: "seconds",
      unitScore: "0 to 10",
      date: "Measured on",
      value: "Reading",
      valueHint: "Zero belongs here if that is what it was.",
      note: "Note",
      noteHint: "For you. No rule reads this.",
      saved: "Stored.",
      replacing:
        "This measure is already recorded for this day. What you see here is what is stored, and saving replaces it.",
      historyHeading: "Recorded so far",
      historyEmpty: "No reading yet.",
      keyMissing: "The measure needs a name.",
      keyTooLong: "That name is too long for a label.",
      unknownUnit: "That unit is not one this app records.",
      unitConflict:
        "This measure is already recorded in another unit. Two units under one name cannot be compared — either keep the first, or name the new one differently.",
      valueMissing: "The reading is missing.",
      outOfRange: "That number is outside what this unit can hold. Worth a second look.",
      futureDate: "That date is ahead of today.",
      invalid: "Something in the form did not come through. Please check the fields.",
      noEpisode: "This episode could not be found.",
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
    },
    main: {
      curveAria:
        "Course over {days} days, {from} to {to}. Top row: morning score. Bottom row: daily load.",
      curveMorningLabel: "Morning score",
      curveLoadLabel: "Daily load, tissue-weighted",
      curveMarker: "marked: {date}",
      mirrorMornings: "Morning scores:",
      mirrorHint:
        "Your own entries, given back. Nothing is read into them yet — the rules stay quiet until they have enough.",
      mirrorDays: "{judged} of {expected} days judged",
      mirrorRules: "{reporting} of {total} rules have spoken",
      behind: "This reading does not yet include your newest entry.",
      behindHint: "It is recomputed the next time you record a day.",
      noRun: "No reading for these entries yet.",
      noRunHint:
        "Your diary is untouched. The next entry produces one — and if this sentence keeps standing here, it is on our side.",
    },
    report: {
      link: "Full report",
      heading: "Report",
      none: "No evaluation yet.",
      noneHint: "One is produced as soon as you record a day.",
      unreadableRun: "This evaluation cannot be shown.",
      unreadableRunHint:
        "It was produced by an earlier version of the rules. Your diary is untouched, and the next entry produces a fresh one.",
      overallHeading: "Overall",
      stateGreen: "Nothing standing out",
      stateAmber: "Worth a look",
      stateRed: "Needs attention",
      stateInsufficient: "Not enough judged",
      stateNoData: "Nothing to say yet",
      coverage:
        "{judged} of {expected} expected days judged, {reporting} of {total} rules have spoken.",
      pendingHeading: "Not yet judgeable",
      pendingScope: "affects {days} of {expected} expected days",
      currentHeading: "Findings",
      currentNone: "Nothing standing out at the moment.",
      earlierHeading: "Earlier in the course, now behind you",
      earlierHint:
        "These findings have not gone away. They just no longer describe where things stand today.",
      unreadableOne:
        "One finding comes from an earlier version of the rules and is not shown here.",
      unreadableMany:
        "{n} findings come from an earlier version of the rules and are not shown here.",
      computedAt: "Computed",
      redFlagsHeading: "When to see someone",
      redFlagsHint:
        "This app records and structures. None of the following is something a diary can judge.",
      problemsHeading: "Entries that could not be read",
      problemsOne: "One day could not be evaluated.",
      problemsMany: "{n} days could not be evaluated.",
      problemsHint: "The verdicts above rest on the remaining days.",
      rules: {
        response_24h: "24-hour response",
        load_spike: "Load over time",
        asymmetry: "Side comparison",
        baseline_drift: "Baseline",
        pain_pattern: "Pain pattern",
        stagnation: "Long-term course",
        load_spread: "Load spread",
      },
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
      missingCode:
        "That link arrived empty. Forwarding a message, or opening it in a preview pane, can cut off the part that does the work. Ask for a new one below and open it directly.",
    },
    errors: {
      notSaved: "That could not be saved. Nothing was lost — try again.",
      offline: "No connection at the moment.",
      notFound: "There is nothing here.",
      // Says what happened and what to do, and nothing about WHY. The reason
      // belongs in the server log: a database error can name tables and
      // columns, and a digest number means nothing to the person reading it.
      brokeHeading: "That did not work.",
      brokeBody: "Something went wrong on our side. Nothing you have recorded is affected.",
      tryAgain: "Try again",
    },
  },
  de: {
    appName: "Loadwise",
    tagline: "Die anderen 167 Stunden.",
    actions: {
      save: "Speichern",
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
      mechanismOnly: "nur Mechanik",
      profileMissing:
        "Das Profil, mit dem diese Episode angelegt wurde, gibt es nicht mehr. Angezeigt wird das Standardprofil dieser Körperregion — eine andere Verletzung, und jedes Urteil auf dieser Seite ist seins.",
    },
    edit: {
      link: "Diese Episode korrigieren",
      heading: "Episode korrigieren",
      profile: "Was verfolgt wird",
      profileChangeWarning:
        "Ein Profilwechsel verändert Urteile, die du schon bekommen hast. Die Schwellen sind andere, die Selbsttests sind andere, der Gewebefaktor ist ein anderer — eine Warnung von letzter Woche kann grün werden, ohne dass sich ein einziger Tagebuchtag geändert hat. An deinem Tagebuch wird nichts angerührt, und der Wechsel wird unten festgehalten.",
      save: "Änderungen speichern",
      saved: "Gespeichert.",
      unknownProfile: "Dieses Profil gibt es nicht.",
      futureStart: "Dieser Tag ist noch nicht gewesen.",
      invalid: "Diese Angaben lassen sich nicht speichern. Bitte die Felder prüfen.",
      changeHistory: "Profilwechsel",
      changedTo: "gewechselt zu",
      archive: "Ins Archiv legen",
      archiveHint:
        "Sie verschwindet aus der Liste. Gelöscht wird nichts, und du kannst sie jederzeit zurückholen.",
      unarchive: "Zurückholen",
      noDelete:
        "Es gibt kein Löschen. Löschen kommt zusammen mit dem Export — niemand soll Monate der eigenen Aufzeichnung auslöschen können, bevor er eine Kopie davon mitnehmen kann.",
      archiveHeading: "Archiv",
      archiveLink: "Archiv",
      archiveEmpty: "Nichts archiviert.",
      archivedNote: "Diese Episode liegt im Archiv. Sie steht nicht in deiner Liste.",
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
      loadHint: "Eine Einheit braucht alle drei Angaben. Zwei Einheiten an einem Tag sind zwei Einträge, nicht eine lange.",
      addSession: "Einheit hinzufügen",
      removeSession: "Entfernen",
      sessionNumber: "Einheit",
      everyday: "Sonst auf den Beinen",
      everydayHint: "Ausserhalb des Trainings. Wird für dich festgehalten — noch liest keine Regel es, weil nicht belegt ist, wie viel Last ein Tag auf den Beinen trägt.",
      everydaySitting: "Überwiegend gesessen",
      everydayNormal: "Normal",
      everydayOnFeet: "Viel auf den Beinen",
      everydayVeryActive: "Den ganzen Tag auf den Beinen",
      stiffness: "Morgensteifigkeit (Minuten)",
      stiffnessHint: "Wie lange die Steifigkeit nach dem Aufstehen angehalten hat. Das ist die erste Frage des VISA-A, des Standardfragebogens für die Achillessehne. Noch liest keine Regel es — welche Veränderung in Minuten etwas bedeutet, ist nicht belegt.",
      medication: "Schmerzmittel genommen?",
      medicationHint: "Wenn das angekreuzt ist, gibt es für diese Tage keine Entwarnung — ein Schmerzmittel senkt den Morgenwert, und vier der sieben Regeln lesen ihn. Eine Warnung kommt trotzdem durch.",
      loadIncomplete: "Anstrengung und Minuten gehören zusammen — entweder beides ausfüllen oder beides leer lassen.",
      symptomIncomplete: "Ein Zeitpunkt allein sagt nichts — entweder auch einen Beschwerdewert eintragen oder den Zeitpunkt leer lassen.",
      futureDate: "Dieser Tag war noch nicht.",
      invalid: "Diese Werte kann ich nicht speichern. Bitte schau die Zahlen nochmal an.",
      symptom: "Beschwerden",
      timing: "Wann",
      timingDuring: "Während",
      timingAfter: "Danach",
      timingEvening: "Abends",
      note: "Notiz",
      noteHint: "Für dich. Keine Regel liest das, in keiner Sprache, zu keinem Zeitpunkt.",
      saved: "Gespeichert.",
      replacing: "Dieser Tag ist schon erfasst. Was hier steht, ist das Gespeicherte — Speichern ersetzt es.",
      daysRecordedOne: "Tag erfasst",
      daysRecordedMany: "Tage erfasst",
    },
    selfTest: {
      link: "Seitenvergleich",
      heading: "Seitenvergleich",
      intro:
        "Beide Seiten, am selben Tag auf dieselbe Weise gemessen. Die verletzte Seite allein ist eine Zahl ohne Massstab; gegen deine eigene andere Seite wird sie zu einer.",
      noneForProfile:
        "Dieses Profil führt keinen Selbsttest. Was es dafür an Messungen gibt, lässt sich nicht allein durchführen.",
      type: "Testart",
      calfRaise: "Einbeiniger Fersenheber",
      singleHop: "Einbeinsprung auf Weite",
      rom: "Sprunggelenk-Beweglichkeit",
      date: "Gemessen am",
      involved: "Verletzte Seite",
      involvedHint:
        "Null gehört hierher, wenn es null war. Das ist eine Messung, keine Lücke.",
      uninvolved: "Andere Seite",
      uninvolvedHint:
        "Der Bezugswert. Ohne ihn hat die verletzte Seite nichts, woran sie gemessen wird — die Paarung wird dann nicht gespeichert.",
      unitReps: "Wiederholungen",
      unitCm: "Zentimeter",
      unitDeg: "Grad",
      howHeading: "So wird gemessen",
      fixedHeading: "Das muss jedes Mal gleich bleiben",
      note: "Notiz",
      noteHint: "Für dich. Keine Regel liest das.",
      saved: "Gespeichert.",
      replacing:
        "Für diesen Tag ist dieser Test schon erfasst. Was hier steht, ist das Gespeicherte — Speichern ersetzt es.",
      historyHeading: "Bisher gemessen",
      historyEmpty: "Noch keine Messung.",
      halfPairing: "Es braucht beide Seiten. Eine einzelne Seite wird nicht gespeichert.",
      referenceSideZero:
        "Die andere Seite kann nicht null sein — an ihr wird die verletzte Seite gemessen.",
      outOfRange: "Diese Zahl liegt ausserhalb dessen, was dieser Test hergibt. Lohnt einen zweiten Blick.",
      notInProfile: "Dieser Test gehört nicht zum Profil dieser Episode.",
      futureDate: "Dieses Datum liegt nach heute.",
      invalid: "Etwas im Formular ist nicht angekommen. Bitte die Felder prüfen.",
      noEpisode: "Diese Episode wurde nicht gefunden.",
    },
    comparison: {
      heading: "Beide Seiten, über die Zeit",
      calfRaise: "Einbeiniger Fersenheber",
      singleHop: "Einbeinsprung auf Weite",
      rom: "Sprunggelenk-Beweglichkeit",
      tableCaption: "Beide Seiten, gemessen in",
      colDate: "Datum",
      colInvolved: "Verletzt",
      colUninvolved: "Andere",
      colIndex: "Verhältnis",
      noIndex: "—",
      unitReps: "Wiederholungen",
      unitCm: "Zentimeter",
      unitDeg: "Grad",
    },
    measure: {
      link: "Eigene Masse",
      heading: "Deine eigenen Masse",
      intro:
        "Eine Zahl ohne zweite Seite, gegen die sie sich messen liesse — fünfzehn Kniebeugen, acht Minuten Stehen. Du benennst das Mass; hier schlägt nichts vor, was sich zu messen lohnt.",
      name: "Mass",
      nameHint: "Deine Worte. Derselbe Name wieder verwendet, und die Werte reihen sich zu einem Verlauf.",
      unit: "Einheit",
      unitHint: "Wird beim ersten Mal festgelegt und bleibt dann. Dreissig Minuten gegen dreissig Sekunden verglichen ginge glatt auf und hiesse nichts.",
      unitFrozen: "Erfasst in",
      unitReps: "Wiederholungen",
      unitCm: "Zentimeter",
      unitDeg: "Grad",
      unitMin: "Minuten",
      unitSec: "Sekunden",
      unitScore: "0 bis 10",
      date: "Gemessen am",
      value: "Wert",
      valueHint: "Null gehört hierher, wenn es null war.",
      note: "Notiz",
      noteHint: "Für dich. Keine Regel liest das.",
      saved: "Gespeichert.",
      replacing:
        "Für diesen Tag ist dieses Mass schon erfasst. Was hier steht, ist das Gespeicherte — Speichern ersetzt es.",
      historyHeading: "Bisher erfasst",
      historyEmpty: "Noch kein Wert.",
      keyMissing: "Das Mass braucht einen Namen.",
      keyTooLong: "Dieser Name ist zu lang für eine Beschriftung.",
      unknownUnit: "Diese Einheit erfasst die App nicht.",
      unitConflict:
        "Dieses Mass ist schon in einer anderen Einheit erfasst. Zwei Einheiten unter einem Namen lassen sich nicht vergleichen — entweder die erste behalten oder das neue anders benennen.",
      valueMissing: "Der Wert fehlt.",
      outOfRange: "Diese Zahl liegt ausserhalb dessen, was diese Einheit hergibt. Lohnt einen zweiten Blick.",
      futureDate: "Dieses Datum liegt nach heute.",
      invalid: "Etwas im Formular ist nicht angekommen. Bitte die Felder prüfen.",
      noEpisode: "Diese Episode wurde nicht gefunden.",
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
    },
    main: {
      curveAria:
        "Verlauf über {days} Tage, {from} bis {to}. Obere Reihe: Morgenwert. Untere Reihe: Tagesbelastung.",
      curveMorningLabel: "Morgenwert",
      curveLoadLabel: "Tagesbelastung, gewebegewichtet",
      curveMarker: "markiert: {date}",
      mirrorMornings: "Morgenwerte:",
      mirrorHint:
        "Deine eigenen Einträge, zurückgegeben. Hineingelesen wird noch nichts — die Regeln bleiben still, bis sie genug haben.",
      mirrorDays: "{judged} von {expected} Tagen beurteilt",
      mirrorRules: "{reporting} von {total} Regeln haben gesprochen",
      behind: "Diese Auswertung kennt deinen neuesten Eintrag noch nicht.",
      behindHint: "Sie wird neu gerechnet, sobald du wieder einen Tag erfasst.",
      noRun: "Zu diesen Einträgen gibt es noch keine Auswertung.",
      noRunHint:
        "An deinem Tagebuch ist nichts angerührt. Der nächste Eintrag erzeugt eine — und wenn hier weiter dieser Satz steht, liegt es an uns.",
    },
    report: {
      link: "Vollständiger Bericht",
      heading: "Bericht",
      none: "Noch keine Auswertung.",
      noneHint: "Sie entsteht, sobald du einen Tag erfasst hast.",
      unreadableRun: "Diese Auswertung lässt sich nicht anzeigen.",
      unreadableRunHint:
        "Sie stammt aus einer früheren Fassung der Regeln. An deinem Tagebuch ist nichts angerührt, und der nächste Eintrag erzeugt eine neue.",
      overallHeading: "Gesamtbild",
      stateGreen: "Nichts Auffälliges",
      stateAmber: "Einen Blick wert",
      stateRed: "Sollte angeschaut werden",
      stateInsufficient: "Nicht genug beurteilt",
      stateNoData: "Noch keine Aussage möglich",
      coverage:
        "{judged} von {expected} erwarteten Tagen beurteilt, {reporting} von {total} Regeln haben gesprochen.",
      pendingHeading: "Noch nicht beurteilbar",
      pendingScope: "betrifft {days} von {expected} erwarteten Tagen",
      currentHeading: "Auffälligkeiten",
      currentNone: "Im Moment nichts Auffälliges.",
      earlierHeading: "Früher im Verlauf, inzwischen zurückliegend",
      earlierHint:
        "Diese Befunde sind nicht verschwunden. Sie beschreiben nur nicht mehr den Stand von heute.",
      unreadableOne:
        "Ein Befund stammt aus einer früheren Fassung der Regeln und wird hier nicht gezeigt.",
      unreadableMany:
        "{n} Befunde stammen aus einer früheren Fassung der Regeln und werden hier nicht gezeigt.",
      computedAt: "Gerechnet",
      redFlagsHeading: "Wann jemand draufschauen sollte",
      redFlagsHint:
        "Diese App zeichnet auf und ordnet. Nichts hiervon ist etwas, das ein Tagebuch beurteilen kann.",
      problemsHeading: "Einträge, die nicht gelesen werden konnten",
      problemsOne: "Ein Tag liess sich nicht auswerten.",
      problemsMany: "{n} Tage liessen sich nicht auswerten.",
      problemsHint: "Die Urteile oben stehen auf den übrigen Tagen.",
      rules: {
        response_24h: "24-Stunden-Reaktion",
        load_spike: "Belastungsverlauf",
        asymmetry: "Seitenvergleich",
        baseline_drift: "Ausgangswert",
        pain_pattern: "Schmerzmuster",
        stagnation: "Langzeitverlauf",
        load_spread: "Lastverteilung",
      },
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
      missingCode:
        "Dieser Link kam leer an. Beim Weiterleiten oder in der Vorschau mancher Mailprogramme geht der hintere Teil verloren, und genau der macht die Arbeit. Fordere unten einen neuen an und öffne ihn direkt.",
    },
    errors: {
      notSaved: "Das konnte nicht gespeichert werden. Nichts ist verloren — bitte noch einmal.",
      offline: "Gerade keine Verbindung.",
      notFound: "Hier ist nichts.",
      brokeHeading: "Das hat nicht geklappt.",
      brokeBody: "Auf unserer Seite ist etwas schiefgegangen. An dem, was du erfasst hast, ändert das nichts.",
      tryAgain: "Nochmal versuchen",
    },
  },
};

export const t = (locale: Locale): Strings => DICTIONARY[locale];
