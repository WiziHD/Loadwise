-- Loadwise — Datenschema
--
-- Abgeleitet aus den Typen des Regelmoduls, nicht neu erfunden. Wo der Motor
-- eine Zusicherung macht, macht die Datenbank sie auch: Was in `episode.ts` an
-- der Tür verworfen wird, darf hier gar nicht erst hineinkommen.
--
-- Einspielen:  supabase db push   (oder im SQL-Editor ausführen)

-- ---------------------------------------------------------------------------
-- Aufzählungen — geschlossen, wie die Unions im Motor
-- ---------------------------------------------------------------------------

create type body_region as enum (
  'achilles', 'calf', 'patella', 'knee', 'hamstring', 'hip',
  'foot', 'shoulder', 'elbow', 'back', 'other'
);

create type body_side as enum ('left', 'right', 'both', 'n/a');

create type activity_kind as enum (
  'run', 'walk', 'hike', 'cycle', 'swim', 'row',
  'strength_lower', 'strength_upper', 'plyometric', 'court_sport', 'other'
);

create type symptom_timing as enum ('during', 'after', 'evening');

create type test_type as enum ('calf_raise', 'single_hop', 'rom');

create type measure_unit as enum ('reps', 'cm', 'deg', 'min', 'sec', 'score_0_10');

create type severity as enum ('green', 'amber', 'red');

create type milestone_origin as enum ('user');

-- ---------------------------------------------------------------------------
-- Episoden
-- ---------------------------------------------------------------------------

create table episodes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),

  body_region   body_region not null,

  -- Der Profilschlüssel, nicht nur die Region.
  --
  -- Patellofemorales Syndrom und Kreuzbandplastik liegen beide auf `knee`. Die
  -- Region allein sagt seit dem Registry-Umbau nicht mehr, was gemeint ist.
  -- Absichtlich `text` und keine Aufzählung: Profile kommen laufend dazu, und
  -- eine Migration je Profil wäre Reibung ohne Gegenwert. Der Motor fällt bei
  -- einem unbekannten Schlüssel auf das Standardprofil der Region zurück.
  profile_key   text,

  side          body_side not null default 'n/a',

  -- Nur für die Anzeige von „Tag N". KEINE Regel liest das — ein Test in
  -- test/episode-day.test.ts greppt src/rules/ danach ab. Der Grund: `stagnation`
  -- nimmt seinen Fensterursprung aus dem ersten Tagebucheintrag, und den auf ein
  -- aus dem Gedächtnis getipptes Datum zu verschieben würde still Urteile ändern.
  started_on    date,
  ended_on      date,

  label         text,

  constraint episode_starts_before_it_ends
    check (ended_on is null or started_on is null or started_on <= ended_on)
);

create index episodes_user_idx on episodes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Tageseinträge
-- ---------------------------------------------------------------------------

create table entries (
  id             uuid primary key default gen_random_uuid(),
  episode_id     uuid not null references episodes (id) on delete cascade,
  created_at     timestamptz not null default now(),

  entry_date     date not null,
  morning_score  smallint not null,

  activity_kind  activity_kind,
  duration_min   integer,
  rpe            smallint,

  symptom_score  smallint,
  symptom_timing symptom_timing,

  -- Freitext. Wird von KEINER Regel gelesen, in keiner Sprache, zu keinem
  -- Zeitpunkt. Er existiert für Menschen.
  note           text,

  -- Ein Kalendertag ist eine Zeile.
  --
  -- Jedes Zeitfenster im Motor misst seine Beweislage, indem es Einträge zählt.
  -- Ein Duplikat füllte diese Zähler auf und wurde doppelt verrechnet — deshalb
  -- verwirft `episode.ts` Duplikate. Die Datenbank muss dasselbe tun, sonst
  -- repariert der Motor stillschweigend, was hier hätte auffallen müssen.
  constraint one_row_per_calendar_day unique (episode_id, entry_date),

  constraint morning_score_in_range check (morning_score between 0 and 10),
  constraint symptom_score_in_range check (symptom_score is null or symptom_score between 0 and 10),
  constraint rpe_in_range           check (rpe is null or rpe between 1 and 10),
  constraint duration_positive      check (duration_min is null or duration_min > 0),

  -- Anstrengung und Minuten sind ein Paar. Eines allein ergibt keine Last, und
  -- der Motor meldet dafür `load-incomplete`.
  constraint load_is_complete
    check ((rpe is null) = (duration_min is null)),

  -- Ein Zeitpunkt ohne Beschwerdewert beschreibt nichts.
  constraint timing_needs_a_score
    check (symptom_timing is null or symptom_score is not null)
);

create index entries_episode_date_idx on entries (episode_id, entry_date);

-- ---------------------------------------------------------------------------
-- Selbsttests — beide Seiten, am selben Tag
-- ---------------------------------------------------------------------------

create table self_tests (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references episodes (id) on delete cascade,
  created_at  timestamptz not null default now(),

  test_type   test_type not null,
  test_date   date not null,

  involved    numeric not null,
  uninvolved  numeric not null,

  note        text,

  -- Die beiden Seiten sind NICHT symmetrisch, und sie gleich zu behandeln hat
  -- den aussagekräftigsten Messwert überhaupt als ungültige Eingabe abgewiesen.
  --
  -- `involved = 0` ist jemand, der auf der verletzten Seite keine einzige
  -- Wiederholung schafft — Tag eins einer Reha. Eine echte Messung mit einem
  -- echten Urteil dahinter (Index 0, deutliches Defizit).
  --
  -- `uninvolved = 0` ist unbrauchbar: Es ist der Divisor.
  constraint involved_not_negative   check (involved >= 0),
  constraint reference_side_positive check (uninvolved > 0)
);

create index self_tests_episode_idx on self_tests (episode_id, test_type, test_date);

-- ---------------------------------------------------------------------------
-- Eigene Masse
-- ---------------------------------------------------------------------------

-- Die Einheit wird beim ersten Mal eingefroren.
--
-- `measureKey` ist im Motor absichtlich ein offener String — der Motor gruppiert
-- danach und verzweigt nie. Genau eine Sache kann dabei schiefgehen: derselbe
-- Name in zwei Einheiten. Dreissig Minuten gegen dreissig Sekunden verglichen
-- ist still, plausibel und vollständig falsch.
--
-- Als eigene Tabelle statt als Trigger: eine Fremdschlüsselbeziehung ist
-- schwerer zu umgehen als eine Prüfung, die jemand später lockert.
create table measure_keys (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references episodes (id) on delete cascade,

  key         text not null,
  unit        measure_unit not null,

  constraint one_unit_per_key unique (episode_id, key)
);

create table measurements (
  id              uuid primary key default gen_random_uuid(),
  measure_key_id  uuid not null references measure_keys (id) on delete cascade,
  created_at      timestamptz not null default now(),

  measured_on     date not null,
  value           numeric not null,
  note            text
);

create index measurements_key_date_idx on measurements (measure_key_id, measured_on);

-- ---------------------------------------------------------------------------
-- Meilensteine — vom Nutzer verfasst, von niemandem sonst
-- ---------------------------------------------------------------------------

create table milestones (
  id                 uuid primary key default gen_random_uuid(),
  episode_id         uuid not null references episodes (id) on delete cascade,
  created_at         timestamptz not null default now(),

  -- Literal 'user'. Dieselbe Konstruktion wie `Protocol.enabled: false` im
  -- Motor: Ein publiziertes Kriterium kann strukturell nicht hierher gelangen.
  origin             milestone_origin not null default 'user',

  -- Die eigenen Worte des Nutzers. Läuft NICHT durch die Ban-Listen des Motors.
  -- Die regeln, was der MOTOR sagt. Auf dieses Feld angewandt verböten sie einem
  -- Menschen, im eigenen Tagebuch über das eigene Ziel zu sprechen.
  label_text         text not null,
  label_locale       text not null default 'de',

  created_on         date not null,

  -- Bedingungen als jsonb, Form von `Threshold[]` im Motor. Leer heisst: ein
  -- Ziel, das kein Tagebuch sehen kann — dann hakt der Nutzer selbst ab.
  thresholds         jsonb not null default '[]'::jsonb,

  on_distinct_days   smallint not null default 1,
  within_days        smallint,
  marked_reached_on  date,

  constraint distinct_days_at_least_one check (on_distinct_days >= 1),
  constraint window_at_least_one        check (within_days is null or within_days >= 1),
  constraint thresholds_is_array        check (jsonb_typeof(thresholds) = 'array'),

  -- Selbst abhaken ergibt nur ohne prüfbare Bedingung Sinn.
  constraint manual_tick_only_when_untracked
    check (marked_reached_on is null or jsonb_array_length(thresholds) = 0)
);

create index milestones_episode_idx on milestones (episode_id, created_at);

-- ---------------------------------------------------------------------------
-- Gespeicherte Urteile
-- ---------------------------------------------------------------------------

-- Warum speichern statt jedes Mal neu rechnen:
--
-- Ein Urteil ist nur reproduzierbar, wenn BEIDE Versionen festgehalten sind.
-- Wird ein Profil später verbessert, darf das nicht rückwirkend umschreiben,
-- was jemandem letzten Monat gesagt wurde.
create table flags (
  id              uuid primary key default gen_random_uuid(),
  episode_id      uuid not null references episodes (id) on delete cascade,
  computed_at     timestamptz not null default now(),

  kind            text not null,
  for_date        date not null,
  severity        severity not null,
  reason          text not null,
  detail          jsonb not null,

  rule_version    text not null,
  profile_version text not null
);

create index flags_episode_idx on flags (episode_id, for_date desc);

-- Der Stand einer Auswertung als Ganzes: Gesamtbild, Abdeckung, Blockaden.
-- Eine Zeile je Lauf, damit sichtbar bleibt, wie sich das Bild entwickelt hat.
create table evaluations (
  id             uuid primary key default gen_random_uuid(),
  episode_id     uuid not null references episodes (id) on delete cascade,
  computed_at    timestamptz not null default now(),

  -- 'judged' | 'insufficient' | 'no-data' — drei Zustände, nicht zwei.
  overall_status text not null,
  overall_severity severity,

  coverage       jsonb not null,
  pending        jsonb not null default '[]'::jsonb,
  problems       jsonb not null default '[]'::jsonb,

  profile_key    text not null,
  profile_version text not null,
  rule_version   text not null,

  -- Eine Schwere gibt es nur, wenn genug beurteilt wurde. Der Typ `Overall` im
  -- Motor erzwingt das; hier steht dieselbe Bedingung noch einmal.
  constraint severity_only_when_judged
    check ((overall_status = 'judged') = (overall_severity is not null))
);

create index evaluations_episode_idx on evaluations (episode_id, computed_at desc);
