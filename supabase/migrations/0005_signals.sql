-- Loadwise — zwei Signale, die dem Motor bisher fehlten
--
-- ---------------------------------------------------------------------------
-- ANDERS ALS 0004: HIER GEHT ES NICHT UM LAST, SONDERN DARUM, OB DER MOTOR DIE
-- SCHMERZWERTE RICHTIG LIEST.
--
-- 1. morning_stiffness_min — die DAUER der Morgensteifigkeit
--
--    Erfasst war nur die Stärke der Beschwerden. Bei einer Sehne ist die Dauer
--    der klassische Verlaufsmarker: Sehnenschmerz bessert sich beim Einlaufen,
--    und wie lange die Steifigkeit anhält, bildet den Reizzustand oft besser ab
--    als eine Zahl auf einer Skala.
--
--    Beleg: Der VISA-A — das Standardinstrument für die Achillessehne — stellt
--    genau das als ERSTE seiner acht Fragen: »For how many minutes do you have
--    stiffness in the Achilles region on first getting up?«, mit 0 Minuten als
--    bestem und 100 Minuten als schlechtestem Wert.
--    Robinson et al., Br J Sports Med 2001. Evidenzgrad A.
--
--    GRENZE: Das gilt für die Achillessehne. Der VISA-P für die Patellasehne
--    fragt an erster Stelle nach etwas anderem. Das Feld steht allen Profilen
--    offen, seine klinische Verankerung aber nicht.
--
--    KEINE REGEL LIEST ES. Eine Regel bräuchte eine Schwelle — »ab wie vielen
--    Minuten Veränderung bedeutet das etwas« —, und dort steckt dasselbe
--    Problem, das dieses Projekt beim VISA-A schon dokumentiert hat: Der
--    kleinste MESSBARE Unterschied liegt über dem kleinsten BEDEUTSAMEN.
--
-- 2. pain_medication — und das ändert Urteile
--
--    Wer ein entzündungshemmendes Schmerzmittel nimmt, hat einen chemisch
--    gesenkten Morgenwert. VIER der sieben Regeln lesen diesen Wert. »Schmerz
--    sinkt« bei gleichzeitig steigender Medikation ist keine Besserung — und
--    die App sagte bisher das Gegenteil.
--
--    Der Motor DEUTET das nicht. »Deine Besserung könnte an den Tabletten
--    liegen« wäre eine klinische Aussage. Er verweigert nur die ENTWARNUNG und
--    nennt den Grund. Eine Warnung geht weiterhin durch: Abdeckung begrenzt die
--    Entwarnung, nie die Warnung.
--
--    Die Obergrenze von 1440 Minuten ist ein Tag. Der VISA-A sättigt schon bei
--    hundert; wer eine ganze Nacht steif ist, darf das trotzdem eintragen.
-- ---------------------------------------------------------------------------

alter table entries add column if not exists morning_stiffness_min integer;
alter table entries add column if not exists pain_medication boolean;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stiffness_in_range' and conrelid = 'entries'::regclass
  ) then
    alter table entries
      add constraint stiffness_in_range
      check (morning_stiffness_min is null or morning_stiffness_min between 0 and 1440);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Selbstprüfung
--
-- `pain_medication` bleibt absichtlich DREIWERTIG: ja, nein, keine Angabe. Wer
-- die App vor dieser Änderung benutzt hat, hat für jeden alten Tag keine
-- Angabe, und daraus ein »nein« zu machen wäre eine erfundene Auskunft —
-- ausgerechnet dort, wo es um eine Entwarnung geht. Ein `default false` wäre
-- genau dieser Fehler, deshalb steht hier keiner.
-- ---------------------------------------------------------------------------
do $$
declare
  fehlend text;
begin
  select string_agg(s.spalte, ', ' order by s.spalte)
    into fehlend
  from (values ('morning_stiffness_min'), ('pain_medication')) as s(spalte)
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'entries' and column_name = s.spalte
  );

  if fehlend is not null then
    raise exception 'Spalten fehlen auf entries: %. Diese Datei erneut ausführen.', fehlend;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'entries'
      and column_name = 'pain_medication' and column_default is not null
  ) then
    raise exception 'pain_medication hat einen Standardwert. Eine fehlende Angabe darf nicht zu einem Nein werden.';
  end if;

  raise notice 'Signale stehen: Steifigkeitsdauer und Schmerzmittel auf entries, ohne Standardwert.';
end $$;

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    insert into public.schema_migrations (version)
      values ('0005_signals')
      on conflict (version) do update set applied_at = now();
  else
    raise notice 'Kein Ledger vorhanden — 0003_ledger.sql ausführen, dann diese Datei erneut.';
  end if;
end $$;
