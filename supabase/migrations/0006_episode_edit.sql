-- Loadwise — eine Episode ist keine Einbahnstrasse mehr
--
-- ---------------------------------------------------------------------------
-- ANGELEGT WAR ANGELEGT.
--
-- Es gab keinen Weg, Profil, Seite, Beginn oder Bezeichnung zu korrigieren, und
-- keinen, eine Episode wieder loszuwerden. Wer beim Anlegen »Patellofemorales
-- Schmerzsyndrom« statt »Patellasehne« erwischte — die beiden stehen im Wähler
-- direkt untereinander und teilen sich ein Knie —, sass für immer auf der
-- falschen Auswertung. Der Wähler warnt an genau dieser Stelle selbst davor,
-- dass die Unterscheidung schwer ist.
--
-- Zwei Dinge kommen dazu:
--
-- 1. archived_at — verschwinden aus der Liste, ohne zu verschwinden
--
--    Zum Ausprobieren angelegte Episoden sammelten sich an und liessen sich
--    nicht wegräumen. Archivieren räumt sie weg; die Daten bleiben.
--
--    ENDGÜLTIGES LÖSCHEN STEHT HIER BEWUSST NICHT. Es gehört zu Karte 4.2
--    (Datenexport und Kontolöschung): Löschen darf nur, wer vorher exportieren
--    konnte. Ein Löschknopf ohne Ausgang wäre in einem Tagebuch, das jemand
--    über Monate führt, eine Falle.
--
-- 2. episode_profile_changes — ein Profilwechsel ändert VERGANGENE Urteile
--
--    Die Schwellen sind andere, die Selbsttests sind andere, der Gewebefaktor
--    ist ein anderer. Ein rotes Flag von letzter Woche kann grün werden, ohne
--    dass sich ein einziger Tagebucheintrag geändert hat.
--
--    Das ist kein Grund, den Wechsel zu verbieten. Es ist ein Grund, ihn
--    festzuhalten. Ohne diese Tabelle wäre die einzige Spur des Wechsels der
--    veränderte Bericht selbst — und dann sähe es so aus, als hätte sich der
--    Verlauf geändert, statt der Massstab. Der Grundsatz »der Bericht löscht
--    nichts« gilt hier eine Ebene höher weiter.
-- ---------------------------------------------------------------------------

-- Wiederholbar ausführbar, wie 0002 bis 0005. Ein halber Durchlauf darf nicht
-- möglich sein.

alter table episodes add column if not exists archived_at timestamptz;

-- Die Liste fragt fast immer nach den nicht archivierten. Teilindex, weil ein
-- Archiv naturgemäss der kleinere Teil bleibt und ein voller Index über eine
-- meist leere Spalte nichts bringt.
create index if not exists episodes_active_idx
  on episodes (user_id, created_at desc)
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- Die Profilwechsel
-- ---------------------------------------------------------------------------
create table if not exists episode_profile_changes (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references episodes (id) on delete cascade,
  changed_at  timestamptz not null default now(),

  -- `from_key` darf null sein: eine Episode aus der Zeit vor benannten
  -- Profilen, oder eine, deren Schlüssel auf nichts mehr zeigte. Beides ist
  -- ein echter Ausgangszustand und kein fehlender Wert.
  from_key    text,
  to_key      text not null,

  -- Ein »Wechsel« auf dasselbe Profil ist keiner. Ihn zuzulassen hiesse, die
  -- Liste mit Zeilen zu füllen, die nichts erklären.
  constraint profile_actually_changed check (from_key is distinct from to_key)
);

create index if not exists profile_changes_by_episode
  on episode_profile_changes (episode_id, changed_at desc);

-- ---------------------------------------------------------------------------
-- Der Eintrag entsteht im Trigger, nicht in der App
--
-- ---------------------------------------------------------------------------
-- WEIL ZWEI SCHREIBVORGÄNGE EINER ZU VIEL SIND.
--
-- Schriebe die App erst die Änderung und dann die Zeile, gäbe ein Fehlschlag
-- dazwischen einen Profilwechsel ohne Erklärung — genau den Zustand, gegen den
-- diese Tabelle gebaut ist. Andersherum gäbe es eine Erklärung für einen
-- Wechsel, der nie stattgefunden hat. Über die REST-Schnittstelle gibt es keine
-- Transaktion, die beides klammert.
--
-- Im Trigger ist es EINE Transaktion mit dem UPDATE, und es gibt keinen Weg an
-- ihm vorbei: nicht über eine zweite Stelle in der App, nicht über den
-- SQL-Editor, nicht über ein späteres Skript. Dieselbe Überlegung wie bei
-- `measure_keys` — eine Zusicherung, die in der Datenbank steht, ist schwerer
-- zu lockern als eine, die jemand im Code findet.
--
-- SECURITY DEFINER, und ausnahmsweise ist das hier das Engere statt des
-- Weiteren: Die Regel unten erlaubt dem Konto nur zu LESEN. Ein Trigger als
-- Aufrufer käme damit selbst nicht durch — also schreibt er als Eigentümer,
-- und niemand sonst schreibt überhaupt.
--
-- Der Preis ist eine Funktion, die RLS umgeht, und der wird klein gehalten:
-- Sie nimmt keine Argumente, liest ausschliesslich `old` und `new` aus dem
-- Triggerkontext und hat einen festgenagelten `search_path`. Ausserhalb eines
-- Triggers auf `episodes` kann sie nichts tun.
--
-- Was das kauft: Der Verlauf ist genau das, was tatsächlich passiert ist.
-- Dürfte das Konto selbst schreiben, könnte es Wechsel erfinden, die es nie
-- gab — und ein Verlauf, den man frisieren kann, erklärt einen veränderten
-- Bericht nicht mehr, sondern behauptet nur etwas darüber.
-- ---------------------------------------------------------------------------
create or replace function record_profile_change() returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into episode_profile_changes (episode_id, from_key, to_key)
    values (new.id, old.profile_key, new.profile_key);
  return new;
end;
$$;

drop trigger if exists episodes_profile_changed on episodes;
create trigger episodes_profile_changed
  after update of profile_key on episodes
  for each row
  when (old.profile_key is distinct from new.profile_key and new.profile_key is not null)
  execute function record_profile_change();

-- ---------------------------------------------------------------------------
-- Zugriffsschutz — LESEN, und sonst nichts
--
-- Die einzige Tabelle im Schema, auf der ein Konto nicht schreiben darf, neben
-- den Urteilen. Aus demselben Grund: Eine Zeile, die man selbst hineinlegen
-- kann, belegt nichts mehr. Geschrieben wird ausschliesslich vom Trigger oben.
--
-- `npm run check:rls` liest AUS DIESER DATEI, dass es die Tabelle gibt, und
-- schlägt fehl, solange das Skript sie nicht selbst prüft.
-- ---------------------------------------------------------------------------
alter table episode_profile_changes enable row level security;
alter table episode_profile_changes force row level security;

drop policy if exists episode_profile_changes_own on episode_profile_changes;
create policy episode_profile_changes_own on episode_profile_changes
  for select
  using (exists (
    select 1 from episodes ep
    where ep.id = episode_profile_changes.episode_id and ep.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- Selbstprüfung
--
-- Eine Anweisung, kein CTE über zwei — genau daran ist 0002 einmal
-- gescheitert: `relation "ist" does not exist`, weil ein `with`-Block nur für
-- die eine Anweisung gilt, an der er hängt.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'episodes' and column_name = 'archived_at'
  ) then
    raise exception 'episodes.archived_at fehlt. Diese Datei erneut ausführen.';
  end if;

  if not exists (
    select 1 from pg_class c
    where c.relname = 'episode_profile_changes'
      and c.relnamespace = 'public'::regnamespace
      and c.relrowsecurity
      and c.relforcerowsecurity
      and exists (
        select 1 from pg_policy p
        where p.polrelid = c.oid and p.polname = 'episode_profile_changes_own'
      )
  ) then
    raise exception
      'episode_profile_changes hat nicht Tabelle, RLS, force und die Regel episode_profile_changes_own. Diese Datei erneut ausführen.';
  end if;

  -- Ein Standardwert auf archived_at wäre ein Archiv, das sich selbst füllt.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'episodes'
      and column_name = 'archived_at' and column_default is not null
  ) then
    raise exception 'archived_at hat einen Standardwert. Keine Episode darf von selbst im Archiv landen.';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'episodes_profile_changed' and tgrelid = 'episodes'::regclass and not tgisinternal
  ) then
    raise exception 'Der Trigger episodes_profile_changed fehlt. Ohne ihn wäre ein Profilwechsel spurlos.';
  end if;

  raise notice 'Episoden sind korrigierbar: archived_at steht, Profilwechsel werden festgehalten.';
end $$;

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    insert into public.schema_migrations (version)
      values ('0006_episode_edit')
      on conflict (version) do update set applied_at = now();
  else
    raise notice 'Kein Ledger vorhanden — 0003_ledger.sql ausführen, dann diese Datei erneut.';
  end if;
end $$;
