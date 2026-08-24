-- Loadwise — Buchführung über die Migrationen
--
-- ---------------------------------------------------------------------------
-- WARUM ES DAS BRAUCHT.
--
-- 0001 und 0002 wurden von Hand im SQL-Editor ausgeführt. Es gab nirgends eine
-- Antwort auf die Frage »welche Datei ist angewendet«. Dass 0002 nur zur Hälfte
-- durchlief — RLS an, keine einzige Regel, also alles verboten — blieb deshalb
-- tagelang unbemerkt: Lesen liefert dann eine leere Liste, und die ist von
-- »noch keine Daten« nicht zu unterscheiden.
--
-- Der Eintrag steht am ENDE jeder Migrationsdatei. Das ist der eigentliche
-- Trick: Ein Lauf, der vorher abbricht, erreicht ihn nicht. Die Buchführung
-- bildet damit nicht ab, was jemand ausführen WOLLTE, sondern was tatsächlich
-- bis zum Schluss lief.
--
-- Die Prüffrage »wurde die Datei nach dem Anwenden noch geändert« beantwortet
-- `sha256`. Sie kann hier nicht gesetzt werden — eine Datei kann ihre eigene
-- Prüfsumme nicht enthalten —, also trägt `npm run check:migrations` sie beim
-- ersten Sehen nach und vergleicht danach. Genau dieser Fall ist in diesem
-- Projekt schon eingetreten: 0002 wurde nach dem Anwenden zweimal überarbeitet.
-- ---------------------------------------------------------------------------

create table if not exists public.schema_migrations (
  version    text primary key,
  -- Wird vom Prüfskript nachgetragen, nicht von SQL. Bis dahin null: »lief
  -- durch, aber welcher Inhalt genau, ist noch nicht festgehalten«.
  sha256     text,
  applied_at timestamptz not null default now()
);

-- Das hier ist Betriebszustand, keine Nutzerdaten. Kein Konto hat etwas darin
-- zu suchen, also RLS an und KEINE Regel — womit für jedes Nutzerkonto alles
-- verboten ist. Der Service-Role-Key umgeht RLS von sich aus und ist der
-- einzige, der die Tabelle je zu sehen bekommt.
--
-- Das ist derselbe Zustand, der bei den acht Datentabellen ein schwerer Fehler
-- war. Der Unterschied ist, dass er hier gewollt ist — und deshalb steht er
-- hier ausdrücklich, statt als Auslassung dazustehen. Die Selbstprüfung in
-- 0002 zählt diese Tabelle nicht mit.
alter table public.schema_migrations enable row level security;
alter table public.schema_migrations force row level security;

-- Rückwirkend eintragen, was nachweislich schon läuft. 0001 gilt als
-- angewendet, weil die acht Tabellen existieren; 0002 trägt sich beim nächsten
-- Durchlauf selbst ein.
insert into public.schema_migrations (version)
  values ('0001_schema')
  on conflict (version) do nothing;

insert into public.schema_migrations (version)
  values ('0003_ledger')
  on conflict (version) do update set applied_at = now();

do $$
declare
  offen text;
begin
  select string_agg(v, ', ')
    into offen
  from (values ('0001_schema'), ('0002_rls'), ('0003_ledger')) as s(v)
  where not exists (select 1 from public.schema_migrations m where m.version = s.v);

  if offen is not null then
    raise notice 'Noch nicht eingetragen: %. Diese Dateien ausführen.', offen;
  else
    raise notice 'Buchführung steht: alle drei Migrationen eingetragen.';
  end if;
end $$;
