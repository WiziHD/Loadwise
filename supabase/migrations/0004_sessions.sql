-- Loadwise — mehrere Einheiten je Tag, und die Alltagsbelastung
--
-- ---------------------------------------------------------------------------
-- ZWEI LÖCHER IM LASTMODELL, UND DAS ZWEITE VERZERRT JEDES URTEIL.
--
-- 1. Bisher trug `entries` je eine Spalte für Aktivität, Minuten und
--    Anstrengung. Wer morgens läuft und abends Kraft macht, konnte nur eines
--    eintragen — die Last des Tages fiel zu niedrig aus, und zwar ausgerechnet
--    an den Tagen mit der höchsten. Genau die Tage, für die die
--    Lastspitzen-Regel existiert.
--
-- 2. Der Untertitel des Produkts ist »die anderen 167 Stunden«. Gemessen wurden
--    davon nur die Trainingsstunden. Ein Ruhetag mit 18 000 Schritten auf
--    Asphalt war für den Motor dasselbe wie ein Tag im Bett.
--
--    Das ist keine Ungenauigkeit, sondern eine Richtung: Die chronische Last
--    ist Summe geteilt durch abgedeckte Tage, nicht erfasste Alltagslast senkt
--    also den Nenner. Bei wahrer Alltagslast E pro Tag ist das echte Verhältnis
--    (A+7E)/(C+7E), gemessen wird A/C — und das liegt bei jedem Wert über 1
--    HÖHER als die Wahrheit. Der Motor meldet zu oft eine Spitze, am stärksten
--    bei Leuten, die viel auf den Beinen sind.
--
-- `everyday_load` wird deshalb erfasst und vom Motor bewusst NICHT verrechnet:
-- Der Umrechnungsfaktor ist nicht belegt, und ein geschätzter landet im Zähler
-- UND im Nenner. Ein zu grosser zieht jedes Verhältnis gegen 1 und macht die
-- Regel still stumm. Erfassen kann man nicht nachholen, rechnen schon.
-- ---------------------------------------------------------------------------

-- Wiederholbar ausführbar, wie 0002 und 0003. Ein halber Durchlauf darf nicht
-- möglich sein.

-- Wiederholbar: ein zweiter Lauf darf nicht am Typ scheitern.
do $$
begin
  if to_regtype('everyday_load') is null then
    create type everyday_load as enum ('sitting', 'normal', 'on-feet', 'very-active');
  end if;
end $$;

alter table entries add column if not exists everyday_load everyday_load;

-- ---------------------------------------------------------------------------
-- Die Einheiten
--
-- Eigene Tabelle statt weiterer Spalten: Ein Tag hat null bis mehrere, und eine
-- feste Zahl Spaltengruppen wäre dieselbe Grenze eine Stufe höher.
--
-- Alle drei Angaben sind PFLICHT. Das ist der Punkt: Eine halbe Einheit —
-- Anstrengung ohne Minuten — hat in diesem Projekt echten Schaden angerichtet,
-- und gegen sie kämpften vier Stellen gleichzeitig an. Hier ist sie nicht mehr
-- darstellbar, genau wie im Typ `Session` des Motors.
-- ---------------------------------------------------------------------------
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references entries (id) on delete cascade,
  created_at  timestamptz not null default now(),

  -- Die Reihenfolge innerhalb des Tages. Morgens vor abends, damit ein Bericht
  -- sie so zeigen kann, wie sie stattgefunden haben.
  position    smallint not null default 0,

  activity_kind activity_kind not null,
  duration_min  integer not null,
  rpe           integer not null,

  constraint duration_positive check (duration_min > 0),
  constraint rpe_in_range      check (rpe between 1 and 10),
  constraint one_position_per_entry unique (entry_id, position)
);

create index if not exists sessions_by_entry on sessions (entry_id);

-- ---------------------------------------------------------------------------
-- Zugriffsschutz — dieselbe Form wie alles andere
--
-- Hängt eine Ebene tiefer als die übrigen: über `entries` an der Episode. Das
-- ist derselbe Bau wie bei `measurements`, und dort ist er der riskanteste
-- Teil, weil ein falsch gesetzter Join in einer leeren Datenbank genauso liest
-- wie ein richtiger. `npm run check:rls` prüft ihn deshalb, indem es zuerst
-- etwas hineinlegt und dann liest.
--
-- Die Prüfung liest ausserdem AUS DIESER DATEI, welche Tabellen es gibt. Eine
-- Regel hier ohne Gegenstück dort ist ab sofort ein Fehlschlag.
-- ---------------------------------------------------------------------------
alter table sessions enable row level security;
alter table sessions force row level security;

drop policy if exists sessions_own on sessions;
create policy sessions_own on sessions
  for all
  using (exists (
    select 1 from entries e
    join episodes ep on ep.id = e.episode_id
    where e.id = sessions.entry_id and ep.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from entries e
    join episodes ep on ep.id = e.episode_id
    where e.id = sessions.entry_id and ep.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- Die vorhandenen Einträge übernehmen
--
-- Jeder Tag, der bisher eine Einheit trug, bekommt sie als Zeile. Nichts geht
-- verloren, und der Lauf ist wiederholbar: Was schon übernommen ist, wird nicht
-- doppelt angelegt.
-- ---------------------------------------------------------------------------
insert into sessions (entry_id, position, activity_kind, duration_min, rpe)
select e.id, 0, e.activity_kind, e.duration_min, e.rpe
from entries e
where e.activity_kind is not null
  and e.duration_min is not null
  and e.rpe is not null
  and not exists (select 1 from sessions s where s.entry_id = e.id)
on conflict (entry_id, position) do nothing;

-- Die alten Spalten bleiben vorerst stehen. Sie werden von nichts mehr
-- gelesen, aber sie zu löschen ist unumkehrbar — und solange die Übernahme
-- oben nicht an echten Daten bestätigt ist, wäre das ein Verlust ohne Rückweg.
-- Eigene Migration, wenn `npm run check:migrations` und der erste echte Verlauf
-- durch sind.

-- ---------------------------------------------------------------------------
-- Selbstprüfung
-- ---------------------------------------------------------------------------
do $$
declare
  fehlend integer;
begin
  select count(*) into fehlend
  from entries e
  where e.activity_kind is not null
    and e.duration_min is not null
    and e.rpe is not null
    and not exists (select 1 from sessions s where s.entry_id = e.id);

  if fehlend > 0 then
    raise exception 'Übernahme unvollständig: % Einträge mit Einheit ohne Zeile in sessions.', fehlend;
  end if;

  if not exists (
    select 1 from pg_class c
    where c.relname = 'sessions'
      and c.relnamespace = 'public'::regnamespace
      and c.relrowsecurity
      and c.relforcerowsecurity
      and exists (select 1 from pg_policy p where p.polrelid = c.oid and p.polname = 'sessions_own')
  ) then
    raise exception 'sessions hat nicht RLS, force und die Regel sessions_own. Diese Datei erneut ausführen.';
  end if;

  raise notice 'sessions steht: Tabelle, Zugriffsschutz und Übernahme in Ordnung.';
end $$;

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    insert into public.schema_migrations (version)
      values ('0004_sessions')
      on conflict (version) do update set applied_at = now();
  else
    raise notice 'Kein Ledger vorhanden — 0003_ledger.sql ausführen, dann diese Datei erneut.';
  end if;
end $$;
