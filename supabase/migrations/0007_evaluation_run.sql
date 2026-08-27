-- Loadwise — ein Urteil braucht seinen Massstab und seinen Lauf
--
-- ---------------------------------------------------------------------------
-- ZWEI FELDER, DIE DER MOTOR LIEFERT UND DIE HIER KEINE SPALTE HATTEN.
--
-- `Evaluation.config` sind die Schwellen, unter denen die Urteile TATSÄCHLICH
-- entstanden sind, und `Evaluation.lastDate` ist der Tag, von dem aus »aktuell«
-- zurückgerechnet wird. Der Bericht rendert ohne sie gegen `DEFAULT_CONFIG` und
-- gegen den heutigen Tag.
--
-- Heute wäre nichts falsch auf dem Bildschirm: Kein ausgeliefertes Profil
-- verschiebt bisher eine Lastspitzen-Schwelle. Das erste, das es tut, bekäme
-- seine Urteile mit Zahlen erklärt, nach denen sie nie gefällt wurden — und
-- niemand könnte es sehen, weil beides plausibel aussieht.
--
-- ---------------------------------------------------------------------------
-- UND DIE FRAGE, DIE VORHER NIEMAND GESTELLT HAT: WELCHE FLAGS GEHÖREN ZUSAMMEN?
--
-- `flags` trug nur `computed_at`. Ein zweiter Lauf schrieb die Flags des ersten
-- ein zweites Mal daneben, und »die aktuellen Flags« hiess »die mit dem grössten
-- Zeitstempel« — eine Aussage, die bei zwei Läufen in derselben Millisekunde
-- kippt und bei einem halben Schreibvorgang gar nichts mehr bedeutet.
--
-- Jede Flag gehört jetzt zu genau einem Lauf.
--
-- ---------------------------------------------------------------------------
-- KEIN FREMDSCHLÜSSEL AUF `evaluations`, UND DAS IST DIE EIGENTLICHE
-- ENTSCHEIDUNG DIESER MIGRATION.
--
-- supabase-js kennt keine Transaktion über mehrere Anweisungen. Ein Lauf
-- schreibt aber zwei Dinge: die Flags und die Auswertung. Bricht es dazwischen
-- ab, entsteht eine von zwei Halbheiten:
--
--   Auswertung ohne ihre Flags  →  liest sich als »keine Auffälligkeiten«.
--                                  EINE STILLE ENTWARNUNG. Das ist der
--                                  schlimmste Zustand, den diese Datenbank
--                                  annehmen kann.
--   Flags ohne ihre Auswertung  →  wird von niemandem gelesen.
--
-- Also ist die Reihenfolge die Sicherung: **Zuerst die Flags, dann die
-- Auswertung.** Die Auswertungszeile ist der Punkt, an dem ein Lauf gilt. Was
-- vorher abbricht, hinterlässt Zeilen, die kein Leser je findet, weil jeder
-- Leser über `evaluation_id` einer EXISTIERENDEN Auswertung geht.
--
-- Ein Fremdschlüssel würde genau diese Reihenfolge verbieten — Flags könnten
-- erst nach der Auswertung entstehen, also nach dem Punkt, an dem sie schon
-- gilt. Die Sicherung wäre umgedreht.
--
-- Was das kostet, ehrlich: verwaiste Flags nach einem abgebrochenen Lauf. Sie
-- sind unsichtbar, sie sind selten, und sie verschwinden mit ihrer Episode —
-- `episode_id` trägt weiterhin `on delete cascade`. Referentielle Integrität
-- gegen eine stille Entwarnung zu tauschen ist in diesem Produkt kein enger
-- Fall.
-- ---------------------------------------------------------------------------

-- Wiederholbar ausführbar, wie 0002 bis 0006. Ein halber Durchlauf darf nicht
-- möglich sein.

-- ---------------------------------------------------------------------------
-- Erst prüfen, dann anfassen
--
-- Die drei neuen Spalten sind `not null` ohne Standardwert. Das geht nur auf
-- leeren Tabellen — und leer sind sie, weil bis heute nichts sie beschreibt.
--
-- Der Ausweg wäre ein Standardwert, und genau den darf es nicht geben: Ein
-- `config` von `{}` hiesse »beurteilt gegen gar keine Schwellen«, und der
-- Bericht würde das anstandslos rendern. Lieber ein Abbruch mit einem Satz.
-- ---------------------------------------------------------------------------
do $$
declare
  n_flags bigint;
  n_evals bigint;
begin
  select count(*) into n_flags from flags;
  select count(*) into n_evals from evaluations;

  if n_flags > 0 or n_evals > 0 then
    raise exception
      'flags (%) und evaluations (%) sind nicht leer. Diese Migration setzt Spalten auf not null ohne Standardwert; ein Standardwert waere hier eine erfundene Schwellenmenge. Zeilen erst pruefen und entfernen.',
      n_flags, n_evals;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- evaluations: der Massstab und der Stichtag
-- ---------------------------------------------------------------------------

alter table evaluations add column if not exists config jsonb;
alter table evaluations add column if not exists last_date date;

-- Ohne `if not exists`-Kunstgriff und ohne Ausnahmebehandlung: `set not null`
-- ist auf einer Spalte, die es schon ist, ein Nichts und läuft durch. Hier stand
-- kurz ein `exception when others then null` — das hätte jeden Fehler
-- geschluckt, auch einen, der nichts mit Wiederholbarkeit zu tun hat.
alter table evaluations alter column config set not null;

comment on column evaluations.config is
  'Die Schwellen, unter denen diese Urteile entstanden sind. Der Bericht rendert dagegen, nicht gegen DEFAULT_CONFIG.';

comment on column evaluations.last_date is
  'Letzter Tag, den die Episode abdeckt. Alles Aktuelle wird von hier zurueckgerechnet. Null: leeres Tagebuch.';

-- ---------------------------------------------------------------------------
-- flags: zu welchem Lauf gehoere ich
-- ---------------------------------------------------------------------------

alter table flags add column if not exists evaluation_id uuid;
alter table flags alter column evaluation_id set not null;

comment on column flags.evaluation_id is
  'Der Lauf, aus dem diese Flag stammt. ABSICHTLICH KEIN Fremdschluessel: Die Flags werden VOR ihrer Auswertung geschrieben, damit ein Abbruch keine Auswertung ohne Flags hinterlaesst — die laese sich als Entwarnung.';

create index if not exists flags_evaluation_idx on flags (evaluation_id);

-- ---------------------------------------------------------------------------
-- Selbstprüfung: der Soll-Zustand wird behauptet, nicht ein Fehler gesucht
--
-- Dieselbe Richtung wie in 0002 und 0006. Eine Prüfung, die nach Abweichungen
-- sucht statt den Sollzustand zu verlangen, ist blind für den Fall, dass die
-- Änderung gar nicht angekommen ist.
-- ---------------------------------------------------------------------------
do $$
declare
  fehler text;
begin
  with soll (tabelle, spalte, typ, nullbar) as (
    values
      ('evaluations', 'config',        'jsonb', false),
      ('evaluations', 'last_date',     'date',  true),
      ('flags',       'evaluation_id', 'uuid',  false)
  ),
  ist as (
    select
      s.tabelle,
      s.spalte,
      s.typ                                            as soll_typ,
      s.nullbar                                        as soll_nullbar,
      c.data_type                                      as ist_typ,
      c.is_nullable = 'YES'                            as ist_nullbar,
      c.column_default                                 as ist_default
    from soll s
    left join information_schema.columns c
      on c.table_schema = 'public'
     and c.table_name = s.tabelle
     and c.column_name = s.spalte
  )
  select string_agg(
    format('  %s.%s: %s', tabelle, spalte,
      case
        when ist_typ is null then 'fehlt'
        when ist_typ <> soll_typ then format('Typ %s statt %s', ist_typ, soll_typ)
        when ist_nullbar <> soll_nullbar then
          case when ist_nullbar then 'ist nullbar, darf es nicht sein'
               else 'ist nicht nullbar, sollte es sein' end
        when ist_default is not null then format('hat einen Standardwert (%s)', ist_default)
      end),
    E'\n')
  into fehler
  from ist
  where ist_typ is null
     or ist_typ <> soll_typ
     or ist_nullbar <> soll_nullbar
     or ist_default is not null;

  if fehler is not null then
    raise exception E'Der Sollzustand ist nicht erreicht:\n%', fehler;
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'flags' and indexname = 'flags_evaluation_idx'
  ) then
    raise exception 'Der Index flags_evaluation_idx fehlt. Jeder Bericht liest ueber diese Spalte.';
  end if;

  -- Die Gegenrichtung, und sie ist der Grund für diese Datei: Ein
  -- Fremdschlüssel auf evaluations wäre die naheliegende »Verbesserung«, und er
  -- würde die Schreibreihenfolge unmöglich machen, die eine stille Entwarnung
  -- verhindert. Wer ihn anlegt, soll hier darüber stolpern.
  if exists (
    select 1
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'flags'::regclass
      and con.contype = 'f'
      and att.attname = 'evaluation_id'
  ) then
    raise exception 'flags.evaluation_id hat einen Fremdschluessel. Der verbietet, die Flags VOR ihrer Auswertung zu schreiben — und genau diese Reihenfolge verhindert, dass ein abgebrochener Lauf eine Auswertung ohne Flags hinterlaesst, die sich als Entwarnung liest. Siehe den Kopf dieser Datei.';
  end if;

  raise notice 'Ein Lauf ist jetzt identifizierbar: config, last_date und evaluation_id stehen.';
end $$;

-- ---------------------------------------------------------------------------
-- Prüfen, bevor Karte 2.2 als erledigt gilt
--
-- Dieselbe Disziplin wie bei 0002: Eine Lücke im Zugriffsschutz macht keinen
-- Lärm, und ein Schreibweg, den niemand gegen die echte Datenbank gelaufen ist,
-- ist eine Behauptung.
--
--   1. npm run check:migrations --workspace=web
--      Steht 0007_evaluation_run in der Buchführung?
--
--   2. npm run check:rls --workspace=web
--      DIESE MIGRATION BRICHT DIE PRÜFUNG, WENN SIE NICHT MITGEZOGEN WURDE:
--      Die Sondenzeilen für flags und evaluations brauchen seit hier
--      `evaluation_id` und `config`. Beides ist eingetragen — der Lauf muss
--      also weiter grün sein, und wenn nicht, ist das ein echter Fund und kein
--      Nebeneffekt.
--
--   3. Einen Tag im Tagebuch erfassen, dann in der Datenbank:
--        select count(*) from evaluations;   -- muss 1 sein
--        select count(*) from flags
--          where evaluation_id = (select id from evaluations
--                                 order by computed_at desc limit 1);
--      Erst das belegt, dass der Weg vom Formular bis zur Zeile durchgeht.
--      Die Bauteiltests prüfen die Reihenfolge, nicht die Verbindung.
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    insert into public.schema_migrations (version)
      values ('0007_evaluation_run')
      on conflict (version) do update set applied_at = now();
  else
    raise notice 'Kein Ledger vorhanden — 0003_ledger.sql ausfuehren, dann diese Datei erneut.';
  end if;
end $$;
