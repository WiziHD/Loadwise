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
   * Eigene Ziele.
   *
   * ---------------------------------------------------------------------------
   * HIER STEHT KEIN EINZIGES KRITERIUM, UND DAS IST DIE KARTE.
   *
   * Kein Katalog, kein Vorschlag, kein vorbelegter Schwellenwert. Was zu
   * erreichen sich lohnt, entscheidet der Nutzer; die App liefert die
   * Beschriftungen für ein leeres Formular.
   *
   * Die Zustandssätze — »im Tagebuch steht ein Tag, der das erfüllt« — kommen
   * über `milestoneText` aus dem Motor und stehen deshalb nicht hier. Sie sind
   * Aussagen über das, was aufgezeichnet ist, und unterliegen den Ban-Listen.
   *
   * Der ZIELTEXT des Nutzers unterliegt ihnen ausdrücklich nicht. Siehe
   * `milestone-validation.ts`.
   */
  goal: {
    link: string;
    heading: string;
    intro: string;
    label: string;
    labelHint: string;
    /** Die Bedingung ist optional. Ohne sie hakt der Nutzer selbst ab. */
    conditionHeading: string;
    conditionHint: string;
    addCondition: string;
    removeCondition: string;
    measure: string;
    measureMorning: string;
    measureSymptom: string;
    measureSessionMinutes: string;
    /** »Fersenheber, verletzte Seite« — zusammengesetzt aus Testname und Seite. */
    sideInvolved: string;
    sideUninvolved: string;
    calfRaise: string;
    singleHop: string;
    rom: string;
    direction: string;
    atLeast: string;
    atMost: string;
    value: string;
    unit: string;
    onDistinctDays: string;
    onDistinctDaysHint: string;
    withinDays: string;
    withinDaysHint: string;
    withinDaysNone: string;
    create: string;
    saved: string;
    listHeading: string;
    listEmpty: string;
    /** »3 von 5 erreicht« — Fortschritt gegen den selbst erklärten Massstab. */
    reachedCount: string;
    markReached: string;
    unmarkReached: string;
    remove: string;
    removeConfirm: string;
    createdOn: string;
    daysFound: string;
    labelMissing: string;
    labelTooLong: string;
    unknownMeasure: string;
    measureNotInProfile: string;
    unitMismatch: string;
    unknownMeasureKey: string;
    valueMissing: string;
    daysOutOfRange: string;
    windowTooShort: string;
    tooManyThresholds: string;
    invalid: string;
    noEpisode: string;
  };
  /**
   * Die ersten Tage — der heikelste Moment des ganzen Produkts.
   *
   * Nach dem ersten Eintrag hat der Motor **nichts** zu sagen: Die
   * 24-Stunden-Regel braucht zehn Einträge in vierzehn Tagen für ihren
   * Vergleichswert. Was hier steht, sagt das — statt einen Ladebalken zu
   * zeigen oder eine Auswertung zu erfinden.
   *
   * Die Gründe, WAS genau fehlt, kommen über `blockedText` aus dem Motor.
   * Hier stehen nur die Rahmensätze.
   */
  firstDays: {
    heading: string;
    /** Was die App ist -- und was sie nicht ist. Zwei Saetze, keine Broschuere. */
    whatThisIs: string;
    whatThisIsNot: string;
    recordedHeading: string;
    /** »1 von 10 Tagen erfasst« -- die Zahl aus der Config, nicht erfunden. */
    recordedCount: string;
    missingHeading: string;
    /** Wenn der Motor noch gar keinen Grund nennen kann. */
    missingNothingYet: string;
    tomorrowHeading: string;
    /** Eine FRAGE, keine Anweisung. Siehe den Kopf des Bauteils. */
    tomorrowQuestion: string;
    limitsHeading: string;
  };
  /**
   * Konto: Export und Loeschung.
   *
   * Gesundheitsdaten nach Art. 9 DSGVO. Ohne diese beiden Wege darf niemand
   * ausser dem Entwickler die App benutzen -- das ist keine Vorsichts-
   * massnahme, sondern die Bedingung dafuer, sie ueberhaupt anzubieten.
   */
  account: {
    link: string;
    heading: string;
    exportHeading: string;
    exportIntro: string;
    exportBackup: string;
    exportBackupHint: string;
    exportDiary: string;
    exportTests: string;
    exportPerEpisodeHint: string;
    deleteHeading: string;
    deleteIntro: string;
    /** Das Wort, das getippt werden muss. Auch die Aktion prueft dagegen. */
    deleteConfirmWord: string;
    deleteConfirmLabel: string;
    deleteButton: string;
    deleteNotConfirmed: string;
    deleteFailed: string;
    privacyLink: string;
  };
  privacy: {
    heading: string;
    storedHeading: string;
    storedBody: string;
    whereHeading: string;
    whereBody: string;
    howLongHeading: string;
    howLongBody: string;
    rightsHeading: string;
    rightsBody: string;
    noTrackingHeading: string;
    noTrackingBody: string;
  };
  /**
   * Der Physio-Bericht als Druckansicht.
   *
   * ---------------------------------------------------------------------------
   * FÜR JEMANDEN GESCHRIEBEN, DER DAS PRODUKT NICHT KENNT.
   *
   * Der Kern des Konzepts: nicht die dreissig Minuten beim Physio, sondern die
   * anderen 167 Stunden. Ein Ausdruck muss ohne Erklärung verständlich sein
   * — also stehen hier Beschriftungen, die sagen, WAS eine Zahl ist, nicht
   * Abkürzungen, die jemand nachschlagen müsste.
   *
   * Die Urteilssätze selbst kommen über `verdictText` und `evidenceText` aus
   * dem Motor. Hier steht kein einziger.
   */
  print: {
    link: string;
    heading: string;
    intro: string;
    /** Der Zeitraum. Am Bildschirm wählbar, im Ausdruck eine Zeile. */
    period: string;
    periodAll: string;
    periodDays: string;
    periodFrom: string;
    periodTo: string;
    printButton: string;
    /** Wonach beurteilt wurde — der Grund, warum die Karte es ausdrücklich fordert. */
    basisHeading: string;
    profileLabel: string;
    profileVersion: string;
    ruleVersion: string;
    computedAt: string;
    /** Das Gesamturteil gilt für den GANZEN Verlauf, nicht für den Zeitraum. */
    overallHeading: string;
    overallScope: string;
    curveHeading: string;
    findingsHeading: string;
    findingsEmpty: string;
    testsHeading: string;
    testsEmpty: string;
    daysInPeriod: string;
    noRun: string;
  };
  /**
   * Die Fortschritts-Ansicht — aufgezeichnet, nie »verbessert«.
   *
   * ---------------------------------------------------------------------------
   * HIER STEHT KEIN VERB DER VERÄNDERUNG, UND DAS IST KEINE STILFRAGE.
   *
   * Nicht »besser«, nicht »+7«, nicht »Bestwert«. Für keinen Test dieser neun
   * Profile ist belegt, wie weit zwei Messungen allein durch Zufall
   * auseinanderliegen — ohne diese Zahl lässt sich »acht, dann fünfzehn« nicht
   * von Messrauschen trennen.
   *
   * Der Satz dazu kommt über `claimText` aus dem Motor und steht deshalb nicht
   * hier. Was hier liegt, sind Überschriften und die Wörter »erste« und
   * »jüngste« — beides Angaben über die POSITION in einer Reihe, nicht über
   * ihren Wert.
   */
  progress: {
    heading: string;
    intro: string;
    empty: string;
    /** Positionen in der Reihe. Nicht »schlechteste« und »beste«. */
    firstReading: string;
    latestReading: string;
    seriesHeading: string;
    /** Wie viele Messungen die Reihe trägt. */
    readingCount: string;
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
    /** Die eigenen Worte zu einer Messung. Ohne diese Spalte waere das
     *  Notizfeld im Formular ein Eingang ohne Ausgang. */
    colNote: string;
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
    goal: {
      link: "Own goals",
      heading: "Your own goals",
      intro:
        "Written by you. Nothing here suggests what to aim for — a list of what is worth reaching would be a clinical criterion, and this app does not carry one.",
      label: "The goal, in your words",
      labelHint: "Nobody reads this but you. Write it however it makes sense to you.",
      conditionHeading: "A condition the diary can check (optional)",
      conditionHint:
        "Without one, the goal stays yours to tick off. With one, the diary answers it from what you have recorded.",
      addCondition: "Add a condition",
      removeCondition: "Remove",
      measure: "Measure",
      measureMorning: "Morning score",
      measureSymptom: "Symptom score",
      measureSessionMinutes: "Minutes of activity",
      sideInvolved: "injured side",
      sideUninvolved: "other side",
      calfRaise: "Single-leg heel raise",
      singleHop: "Single hop for distance",
      rom: "Ankle dorsiflexion",
      direction: "Direction",
      atLeast: "at least",
      atMost: "at most",
      value: "Value",
      unit: "Unit",
      onDistinctDays: "On how many separate days",
      onDistinctDaysHint: "All conditions have to hold on the same day for it to count.",
      withinDays: "Within a window of",
      withinDaysHint: "Days. Leave empty for no window.",
      withinDaysNone: "no window",
      create: "Add goal",
      saved: "Stored.",
      listHeading: "Your goals",
      listEmpty: "No goal yet.",
      reachedCount: "{done} of {total} recorded",
      markReached: "Mark as reached",
      unmarkReached: "Undo",
      remove: "Remove",
      removeConfirm: "Remove this goal?",
      createdOn: "set on",
      daysFound: "{found} of {needed} days",
      labelMissing: "The goal needs its words.",
      labelTooLong: "That is longer than this field holds.",
      unknownMeasure: "That measure is not one this app records.",
      measureNotInProfile: "That test does not belong to this episode's profile.",
      unitMismatch: "That unit does not match the measure.",
      unknownMeasureKey: "You have not recorded that measure yet. Record it once, then set the goal.",
      valueMissing: "The value is missing.",
      daysOutOfRange: "The number of days has to be between 1 and 30.",
      windowTooShort: "The window is shorter than the number of days asked for — it could never be met.",
      tooManyThresholds: "That is more conditions than one goal holds.",
      invalid: "Something in the form did not come through. Please check the fields.",
      noEpisode: "This episode could not be found.",
    },
    firstDays: {
      heading: "The first two weeks",
      whatThisIs:
        "This is a diary that watches the other 167 hours — what you did, and how the next morning felt.",
      whatThisIsNot:
        "It does not treat, does not diagnose, and gives no instructions. It says what is in the record, and says so when there is not enough of it.",
      recordedHeading: "What is in the record",
      recordedCount: "{done} of {needed} days",
      missingHeading: "What is still missing",
      missingNothingYet:
        "Nothing has been evaluated yet. The rules compare one day against the days before it, so the first of them has nothing to compare against.",
      tomorrowHeading: "The question for tomorrow morning",
      tomorrowQuestion:
        "How does it feel before you get up — on the same scale, before the day has had a chance to change it?",
      limitsHeading: "What this profile cannot tell apart",
    },
    account: {
      link: "Your data",
      heading: "Your data",
      exportHeading: "Take everything with you",
      exportIntro:
        "Your diary belongs to you. Two ways out: a complete backup, and files another tool can read.",
      exportBackup: "Download complete backup (JSON)",
      exportBackupHint:
        "Everything, every field, every record. This is the file to keep if you delete your account.",
      exportDiary: "Diary as CSV",
      exportTests: "Measurements as CSV",
      exportPerEpisodeHint:
        "Per record, on its own page. CSV has no column for which record a day belongs to, so two records in one file would run together.",
      deleteHeading: "Delete your account",
      deleteIntro:
        "Your account and everything in it: entries, sessions, measurements, goals, evaluations. This cannot be undone, and no copy stays behind. Download your backup first.",
      deleteConfirmWord: "DELETE",
      deleteConfirmLabel: "Type DELETE to confirm",
      deleteButton: "Delete account and all data",
      deleteNotConfirmed: "The word does not match. Nothing was deleted.",
      deleteFailed: "That did not go through. Nothing was deleted.",
      privacyLink: "What is stored, and where",
    },
    privacy: {
      heading: "What is stored, and where",
      storedHeading: "What is stored",
      storedBody:
        "Your email address, and what you enter: daily entries with sessions, side-by-side measurements, your own measures, your own goals, and the evaluations calculated from them. Nothing else. No device data, no location, no contacts.",
      whereHeading: "Where",
      whereBody:
        "In a Supabase project in the EU (Frankfurt). The application itself runs on Vercel. Neither holds a copy beyond what the database contains.",
      howLongHeading: "How long",
      howLongBody:
        "Until you delete it. There is no retention period and no archive that outlives your account: deleting removes the rows, not a flag on them.",
      rightsHeading: "What you can do",
      rightsBody:
        "Download everything at any time, and delete everything at any time — both from this page, without asking anyone.",
      noTrackingHeading: "What does not happen",
      noTrackingBody:
        "No analytics, no third-party scripts, no advertising, no sign-in through another provider. With health data, even belonging somewhere is information.",
    },
    print: {
      link: "Printable report",
      heading: "Report for a practitioner",
      intro:
        "What the diary holds, in the period you choose. Written to be read without this app open.",
      period: "Period",
      periodAll: "Whole record",
      periodDays: "Last {days} days",
      periodFrom: "from",
      periodTo: "to",
      printButton: "Print",
      basisHeading: "What this was judged against",
      profileLabel: "Profile",
      profileVersion: "Profile version",
      ruleVersion: "Rule version",
      computedAt: "Calculated",
      overallHeading: "Overall",
      overallScope: "Covers the whole record up to the calculation, not the period below.",
      curveHeading: "Morning rating and load",
      findingsHeading: "Findings in this period",
      findingsEmpty: "No finding falls in this period.",
      testsHeading: "Side-by-side measurements in this period",
      testsEmpty: "No measurement falls in this period.",
      daysInPeriod: "{count} days recorded in this period",
      noRun: "No evaluation has been stored for this record yet.",
    },
    progress: {
      heading: "Your own numbers, over time",
      intro:
        "What the record holds, in the order it was written. Nothing here says whether the distance between two numbers means anything — see the note under each series.",
      empty: "No series yet. A series appears once a goal names a measure you have recorded.",
      firstReading: "first",
      latestReading: "most recent",
      seriesHeading: "Every reading",
      readingCount: "{count} readings",
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
      colNote: "Note",
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
    goal: {
      link: "Eigene Ziele",
      heading: "Deine eigenen Ziele",
      intro:
        "Von dir geschrieben. Hier schlägt nichts vor, was du erreichen sollst — eine Liste dessen, was sich zu erreichen lohnt, wäre ein klinisches Kriterium, und dieses Produkt führt keines.",
      label: "Das Ziel, in deinen Worten",
      labelHint: "Das liest niemand ausser dir. Schreib es so, wie es für dich Sinn ergibt.",
      conditionHeading: "Eine Bedingung, die das Tagebuch prüfen kann (freiwillig)",
      conditionHint:
        "Ohne Bedingung bleibt das Abhaken bei dir. Mit Bedingung beantwortet das Tagebuch es aus dem, was du erfasst hast.",
      addCondition: "Bedingung hinzufügen",
      removeCondition: "Entfernen",
      measure: "Mass",
      measureMorning: "Morgenwert",
      measureSymptom: "Beschwerdewert",
      measureSessionMinutes: "Minuten Aktivität",
      sideInvolved: "verletzte Seite",
      sideUninvolved: "andere Seite",
      calfRaise: "Einbeiniger Fersenheber",
      singleHop: "Einbeinsprung auf Weite",
      rom: "Sprunggelenk-Beweglichkeit",
      direction: "Richtung",
      atLeast: "mindestens",
      atMost: "höchstens",
      value: "Wert",
      unit: "Einheit",
      onDistinctDays: "An wie vielen verschiedenen Tagen",
      onDistinctDaysHint: "Alle Bedingungen müssen am selben Tag zutreffen, damit er zählt.",
      withinDays: "Innerhalb von",
      withinDaysHint: "Tagen. Leer lassen für kein Fenster.",
      withinDaysNone: "kein Fenster",
      create: "Ziel anlegen",
      saved: "Gespeichert.",
      listHeading: "Deine Ziele",
      listEmpty: "Noch kein Ziel.",
      reachedCount: "{done} von {total} im Tagebuch belegt",
      markReached: "Als erreicht eintragen",
      unmarkReached: "Zurücknehmen",
      remove: "Entfernen",
      removeConfirm: "Dieses Ziel entfernen?",
      createdOn: "gesetzt am",
      daysFound: "{found} von {needed} Tagen",
      labelMissing: "Das Ziel braucht seine Worte.",
      labelTooLong: "Das ist länger, als dieses Feld fasst.",
      unknownMeasure: "Dieses Mass erfasst die App nicht.",
      measureNotInProfile: "Dieser Test gehört nicht zum Profil dieser Episode.",
      unitMismatch: "Diese Einheit passt nicht zu diesem Mass.",
      unknownMeasureKey: "Dieses Mass hast du noch nicht erfasst. Einmal erfassen, dann das Ziel setzen.",
      valueMissing: "Der Wert fehlt.",
      daysOutOfRange: "Die Zahl der Tage muss zwischen 1 und 30 liegen.",
      windowTooShort: "Das Fenster ist kürzer als die verlangte Zahl von Tagen — so wäre es nie erfüllbar.",
      tooManyThresholds: "Das sind mehr Bedingungen, als ein Ziel fasst.",
      invalid: "Etwas im Formular ist nicht angekommen. Bitte die Felder prüfen.",
      noEpisode: "Diese Episode wurde nicht gefunden.",
    },
    firstDays: {
      heading: "Die ersten zwei Wochen",
      whatThisIs:
        "Das hier ist ein Tagebuch für die anderen 167 Stunden — was du gemacht hast, und wie sich der Morgen danach angefühlt hat.",
      whatThisIsNot:
        "Es behandelt nicht, stellt keine Diagnose und gibt keine Anweisungen. Es sagt, was im Tagebuch steht — und sagt es, wenn davon noch zu wenig da ist.",
      recordedHeading: "Was im Tagebuch steht",
      recordedCount: "{done} von {needed} Tagen",
      missingHeading: "Was noch fehlt",
      missingNothingYet:
        "Es wurde noch nichts ausgewertet. Die Regeln vergleichen einen Tag mit den Tagen davor — der erste hat nichts, womit er sich vergleichen liesse.",
      tomorrowHeading: "Die Frage für morgen früh",
      tomorrowQuestion:
        "Wie fühlt es sich an, bevor du aufstehst — auf derselben Skala, bevor der Tag etwas daran ändern konnte?",
      limitsHeading: "Was dieses Profil nicht unterscheiden kann",
    },
    account: {
      link: "Deine Daten",
      heading: "Deine Daten",
      exportHeading: "Alles mitnehmen",
      exportIntro:
        "Dein Tagebuch gehört dir. Zwei Wege hinaus: eine vollständige Sicherung, und Dateien, die ein anderes Werkzeug lesen kann.",
      exportBackup: "Vollständige Sicherung herunterladen (JSON)",
      exportBackupHint:
        "Alles, jedes Feld, jeder Verlauf. Das ist die Datei, die du behältst, wenn du dein Konto löschst.",
      exportDiary: "Tagebuch als CSV",
      exportTests: "Messungen als CSV",
      exportPerEpisodeHint:
        "Je Verlauf, auf dessen eigener Seite. CSV hat keine Spalte dafür, zu welchem Verlauf ein Tag gehört — zwei Verläufe in einer Datei liefen ineinander.",
      deleteHeading: "Konto löschen",
      deleteIntro:
        "Dein Konto und alles darin: Einträge, Einheiten, Messungen, Ziele, Auswertungen. Das lässt sich nicht rückgängig machen, und es bleibt keine Kopie zurück. Lade vorher deine Sicherung herunter.",
      deleteConfirmWord: "LÖSCHEN",
      deleteConfirmLabel: "Zum Bestätigen LÖSCHEN eintippen",
      deleteButton: "Konto und alle Daten löschen",
      deleteNotConfirmed: "Das Wort stimmt nicht. Es wurde nichts gelöscht.",
      deleteFailed: "Das ist nicht durchgegangen. Es wurde nichts gelöscht.",
      privacyLink: "Was gespeichert wird, und wo",
    },
    privacy: {
      heading: "Was gespeichert wird, und wo",
      storedHeading: "Was gespeichert wird",
      storedBody:
        "Deine E-Mail-Adresse, und was du einträgst: Tageseinträge mit Einheiten, Seitenvergleiche, eigene Masse, eigene Ziele und die daraus gerechneten Auswertungen. Sonst nichts. Keine Gerätedaten, kein Standort, keine Kontakte.",
      whereHeading: "Wo",
      whereBody:
        "In einem Supabase-Projekt in der EU (Frankfurt). Die Anwendung selbst läuft auf Vercel. Keiner von beiden hält eine Kopie über das hinaus, was in der Datenbank steht.",
      howLongHeading: "Wie lange",
      howLongBody:
        "Bis du es löschst. Es gibt keine Aufbewahrungsfrist und kein Archiv, das dein Konto überlebt: Löschen entfernt die Zeilen, nicht eine Markierung darauf.",
      rightsHeading: "Was du tun kannst",
      rightsBody:
        "Jederzeit alles herunterladen und jederzeit alles löschen — beides von dieser Seite aus, ohne jemanden zu fragen.",
      noTrackingHeading: "Was nicht passiert",
      noTrackingBody:
        "Keine Analysewerkzeuge, keine fremden Skripte, keine Werbung, keine Anmeldung über einen anderen Anbieter. Bei Gesundheitsdaten ist schon die Zugehörigkeit eine Auskunft.",
    },
    print: {
      link: "Bericht zum Ausdrucken",
      heading: "Bericht für eine behandelnde Person",
      intro:
        "Was im Tagebuch steht, im Zeitraum deiner Wahl. Geschrieben, um ohne diese App gelesen zu werden.",
      period: "Zeitraum",
      periodAll: "Ganzer Verlauf",
      periodDays: "Letzte {days} Tage",
      periodFrom: "von",
      periodTo: "bis",
      printButton: "Drucken",
      basisHeading: "Wonach beurteilt wurde",
      profileLabel: "Profil",
      profileVersion: "Profilversion",
      ruleVersion: "Regelversion",
      computedAt: "Berechnet",
      overallHeading: "Gesamtstand",
      overallScope: "Gilt für den ganzen Verlauf bis zur Berechnung, nicht für den Zeitraum darunter.",
      curveHeading: "Morgenwert und Last",
      findingsHeading: "Auffälligkeiten in diesem Zeitraum",
      findingsEmpty: "In diesen Zeitraum fällt keine Auffälligkeit.",
      testsHeading: "Seitenvergleich in diesem Zeitraum",
      testsEmpty: "In diesen Zeitraum fällt keine Messung.",
      daysInPeriod: "{count} Tage in diesem Zeitraum erfasst",
      noRun: "Für diesen Verlauf ist noch keine Auswertung gespeichert.",
    },
    progress: {
      heading: "Deine eigenen Zahlen, über die Zeit",
      intro:
        "Was im Tagebuch steht, in der Reihenfolge, in der es geschrieben wurde. Nichts hier sagt, ob der Abstand zwischen zwei Zahlen etwas bedeutet — siehe den Hinweis unter jeder Reihe.",
      empty: "Noch keine Reihe. Eine entsteht, sobald ein Ziel ein Mass nennt, zu dem du etwas erfasst hast.",
      firstReading: "erste",
      latestReading: "jüngste",
      seriesHeading: "Alle Messungen",
      readingCount: "{count} Messungen",
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
      colNote: "Notiz",
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
