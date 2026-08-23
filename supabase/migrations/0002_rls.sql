-- Loadwise — Zeilenbasierter Zugriffsschutz
--
-- ---------------------------------------------------------------------------
-- WIEDERHOLBAR AUSFÜHRBAR. Das ist keine Bequemlichkeit, es ist eine Lehre.
--
-- Die erste Fassung war es nicht, und sie ist genau einmal halb durchgelaufen:
-- `enable row level security` griff, die `create policy`-Anweisungen nicht.
-- Ergebnis: RLS an, keine einzige Regel — also alles verboten, auch dem
-- Besitzer. Die App zeigte weiter Seiten an, meldete den Nutzer an, und schlug
-- erst beim ersten Schreibversuch fehl, mit einer Meldung über eine
-- »row-level security policy«, die kein Mensch als »die Regeln fehlen ganz«
-- liest.
--
-- Die Richtung des Fehlers war richtig — verboten statt erlaubt. Aber ein
-- halber Durchlauf darf nicht möglich sein, und ein zweiter Versuch muss ohne
-- Aufräumen von Hand funktionieren. Deshalb steht vor jeder Regel ein
-- `drop policy if exists`, und am Ende ein Block, der laut scheitert, wenn eine
-- Tabelle ohne Regel dasteht.
-- ---------------------------------------------------------------------------
--
-- ---------------------------------------------------------------------------
-- Das hier sind Gesundheitsdaten nach Art. 9 DSGVO. Row Level Security kommt
-- VOR der ersten geschriebenen Zeile, nicht danach.
--
-- Eine Lücke im Zugriffsschutz ist lautlos: Nichts stürzt ab, nichts wird
-- langsamer, kein Test schlägt fehl. Man sieht sie erst, wenn jemand anderes
-- die Daten schon gesehen hat.
--
-- Grundregel: Eine Zeile gehört dem Nutzer, dem ihre Episode gehört. Alles
-- hängt über `episode_id` an genau einer Episode, und die Episode kennt ihren
-- Besitzer. Deshalb gibt es nur ein einziges Muster, das sich wiederholt.
-- ---------------------------------------------------------------------------

alter table episodes     enable row level security;
alter table entries      enable row level security;
alter table self_tests   enable row level security;
alter table measure_keys enable row level security;
alter table measurements enable row level security;
alter table milestones   enable row level security;
alter table flags        enable row level security;
alter table evaluations  enable row level security;

-- Auch für die Besitzer der Tabellen. Ohne das umgeht der Eigentümer der
-- Tabelle die eigenen Regeln, und genau darüber stolpert man später.
alter table episodes     force row level security;
alter table entries      force row level security;
alter table self_tests   force row level security;
alter table measure_keys force row level security;
alter table measurements force row level security;
alter table milestones   force row level security;
alter table flags        force row level security;
alter table evaluations  force row level security;

-- ---------------------------------------------------------------------------
-- Episoden: die Wurzel des Besitzverhältnisses
-- ---------------------------------------------------------------------------

drop policy if exists episodes_own on episodes;
create policy episodes_own on episodes
  for all
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Alles, was an einer Episode hängt
--
-- `using` regelt das Lesen und Ändern bestehender Zeilen, `with check` das
-- Schreiben neuer. Beide werden gebraucht: Ohne `with check` könnte jemand eine
-- Zeile in eine fremde Episode schreiben, sie danach nur nicht mehr lesen.
-- ---------------------------------------------------------------------------

drop policy if exists entries_own on entries;
create policy entries_own on entries
  for all
  using      (exists (select 1 from episodes e where e.id = entries.episode_id and e.user_id = (select auth.uid())))
  with check (exists (select 1 from episodes e where e.id = entries.episode_id and e.user_id = (select auth.uid())));

drop policy if exists self_tests_own on self_tests;
create policy self_tests_own on self_tests
  for all
  using      (exists (select 1 from episodes e where e.id = self_tests.episode_id and e.user_id = (select auth.uid())))
  with check (exists (select 1 from episodes e where e.id = self_tests.episode_id and e.user_id = (select auth.uid())));

drop policy if exists measure_keys_own on measure_keys;
create policy measure_keys_own on measure_keys
  for all
  using      (exists (select 1 from episodes e where e.id = measure_keys.episode_id and e.user_id = (select auth.uid())))
  with check (exists (select 1 from episodes e where e.id = measure_keys.episode_id and e.user_id = (select auth.uid())));

drop policy if exists milestones_own on milestones;
create policy milestones_own on milestones
  for all
  using      (exists (select 1 from episodes e where e.id = milestones.episode_id and e.user_id = (select auth.uid())))
  with check (exists (select 1 from episodes e where e.id = milestones.episode_id and e.user_id = (select auth.uid())));

-- Messungen hängen eine Ebene tiefer, über den Massschlüssel.
drop policy if exists measurements_own on measurements;
create policy measurements_own on measurements
  for all
  using (exists (
    select 1 from measure_keys k
    join episodes e on e.id = k.episode_id
    where k.id = measurements.measure_key_id and e.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from measure_keys k
    join episodes e on e.id = k.episode_id
    where k.id = measurements.measure_key_id and e.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- Urteile: lesen ja, schreiben nein
--
-- Flags und Auswertungen entstehen serverseitig aus dem Regelmodul. Dürfte ein
-- Nutzerkonto sie schreiben, könnte ein manipulierter Client sich selbst ein
-- „alles in Ordnung" eintragen — und ein Physio-Bericht wäre wertlos, weil
-- niemand mehr wüsste, ob die Zeile aus dem Motor stammt.
--
-- Geschrieben wird ausschliesslich über den Service-Role-Key, und der umgeht
-- RLS von sich aus. Er gehört NIEMALS in den Browser.
-- ---------------------------------------------------------------------------

drop policy if exists flags_read_own on flags;
create policy flags_read_own on flags
  for select
  using (exists (select 1 from episodes e where e.id = flags.episode_id and e.user_id = (select auth.uid())));

drop policy if exists evaluations_read_own on evaluations;
create policy evaluations_read_own on evaluations
  for select
  using (exists (select 1 from episodes e where e.id = evaluations.episode_id and e.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Prüfen, bevor die Karte als erledigt gilt
--
-- Zwei Konten anlegen, mit Konto A eine Episode samt Einträgen erzeugen, dann
-- als Konto B:
--
--   select count(*) from entries;      -- muss 0 sein
--   select count(*) from episodes;     -- muss 0 sein
--   insert into entries (episode_id, entry_date, morning_score)
--     values ('<Episode von A>', '2026-09-01', 3);   -- muss scheitern
--
-- Ohne diesen Durchlauf gilt Karte 1.3 nicht als erledigt. Eine Lücke im
-- Zugriffsschutz macht keinen Lärm.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- Selbstprüfung: eine Tabelle mit RLS und ohne Regel ist ein Abbruch
--
-- Genau dieser Zustand ist einmal entstanden und blieb unbemerkt, bis ein
-- Schreibversuch in der App scheiterte. Er ist von aussen nicht zu erkennen:
-- Lesen liefert eine leere Liste, was von »noch keine Daten« nicht zu
-- unterscheiden ist. Also prüft die Migration sich selbst.
-- ---------------------------------------------------------------------------
do $$
declare
  offen text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into offen
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity
    and c.relname in ('episodes','entries','self_tests','measure_keys',
                      'measurements','milestones','flags','evaluations')
    and not exists (select 1 from pg_policy p where p.polrelid = c.oid);

  if offen is not null then
    raise exception
      'RLS ist an, aber diese Tabellen haben keine einzige Regel: %. Damit ist alles verboten. Diese Datei komplett erneut ausführen.', offen;
  end if;

  raise notice 'RLS in Ordnung: alle acht Tabellen haben Regeln.';
end $$;
