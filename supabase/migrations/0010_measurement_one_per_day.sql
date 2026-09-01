-- Loadwise — eine Messung je Mass und Tag, und ein Mass je Schreibweise
--
-- ---------------------------------------------------------------------------
-- ZWEI STILLE FEHLER, UND EINER STAND SCHON IM SCHEMA.
--
-- 0001 hat den ersten gesehen und geschlossen: `one_unit_per_key` verhindert,
-- dass derselbe Name in zwei Einheiten ankommt. Der Kommentar dort sagt, warum
-- das zaehlt -- dreissig Minuten gegen dreissig Sekunden verglichen ist still,
-- plausibel und vollstaendig falsch.
--
-- Diese Datei schliesst die beiden Loecher daneben.
--
-- ---------------------------------------------------------------------------
-- ERSTENS: DIE SCHREIBWEISE. DERSELBE FEHLER IN ANDERER VERKLEIDUNG.
--
-- `unique (episode_id, key)` unterscheidet Gross- und Kleinschreibung.
-- »Kniebeugen« und »kniebeugen« sind damit zwei Masse, und der Unterschied
-- ist auf dem Bildschirm nicht zu sehen: zwei Reihen, jede fuer sich
-- plausibel, wo eine gemeint war. Ein Verlauf, der an einem Tippfehler
-- auseinanderfaellt, ist genau das, was 0001 fuer die Einheit verhindert hat
-- -- nur eine Spalte weiter links.
--
-- Ein fuehrendes oder haengendes Leerzeichen wirkt genauso. `btrim` deckt es
-- mit ab; beide Funktionen sind IMMUTABLE und duerfen deshalb in einem Index
-- stehen.
--
-- Bewusst NICHT die Speicherform veraendert. Der Nutzer hat das Mass benannt,
-- und es soll so dastehen, wie er es geschrieben hat. Verglichen wird
-- unempfindlich, angezeigt wird die erste Schreibweise -- dieselbe Regel wie
-- bei der Einheit: Was zuerst da war, gilt.
--
-- ---------------------------------------------------------------------------
-- ZWEITENS: ZWEI MESSUNGEN AM SELBEN TAG.
--
-- `progress.ts` sammelt in `seriesOf` jede Lesung eines Masses und sortiert
-- nach Datum. Zwei Zeilen mit demselben Datum ergeben zwei Punkte
-- uebereinander -- und die Frage, welcher gilt, muesste dann jede lesende
-- Stelle einzeln beantworten.
--
-- Dieselbe Regel wie in `entries` (ein Kalendertag, eine Zeile) und in 0009
-- fuer `self_tests`. Eine zweite Messung am selben Tag ist eine Korrektur
-- oder ein zweiter Versuch, nie ein zweiter Messpunkt.
--
-- Ausdruecklich verworfen: beide behalten und die spaetere gewinnen lassen.
-- Das ist die Einladung, den besseren von zwei Versuchen zu speichern -- eine
-- Auswahl, die den Verlauf nach oben verzerrt, ohne dass jemand gelogen
-- haette.
--
-- ---------------------------------------------------------------------------
-- LAEUFT AUF VOLLEN TABELLEN. Wo es Doubletten gaebe, nennt sie diese, statt
-- mit einer Meldung abzubrechen, die nicht sagt, wo das Problem liegt.
-- ---------------------------------------------------------------------------

do $$
declare
  doppelte_masse int;
  doppelte_tage  int;
begin
  select count(*) into doppelte_masse
  from (
    select episode_id, lower(btrim(key))
    from public.measure_keys
    group by episode_id, lower(btrim(key))
    having count(*) > 1
  ) d;

  if doppelte_masse > 0 then
    raise exception using message = format(
      $meldung$%s Mass(e) kommen je Episode in mehreren Schreibweisen vor. Welche gilt und ob die Werte zusammengehoeren, kann eine Migration nicht entscheiden. Zuerst ansehen: select episode_id, lower(btrim(key)), count(*), array_agg(key) from public.measure_keys group by 1,2 having count(*) > 1;$meldung$,
      doppelte_masse
    );
  end if;

  select count(*) into doppelte_tage
  from (
    select measure_key_id, measured_on
    from public.measurements
    group by measure_key_id, measured_on
    having count(*) > 1
  ) d;

  if doppelte_tage > 0 then
    raise exception using message = format(
      $meldung$%s Kombination(en) aus Mass und Tag kommen mehrfach vor. Welche Messung gilt, ist keine Entscheidung, die eine Migration treffen darf. Zuerst ansehen: select measure_key_id, measured_on, count(*) from public.measurements group by 1,2 having count(*) > 1;$meldung$,
      doppelte_tage
    );
  end if;
end $$;

-- Ein Mass je Episode, unabhaengig von Schreibweise und Randleerzeichen.
create unique index if not exists measure_keys_one_per_name
  on public.measure_keys (episode_id, lower(btrim(key)));

-- Ein leerer Name ist kein Name. Ohne das waere »   « ein gueltiges Mass --
-- und das zweite »   « traefe dann auf den Index oben, mit einer Fehlermeldung
-- ueber Eindeutigkeit statt ueber ein leeres Feld.
alter table public.measure_keys
  drop constraint if exists measure_key_not_blank;
alter table public.measure_keys
  add constraint measure_key_not_blank check (btrim(key) <> '');

-- Eine Messung je Mass und Tag.
create unique index if not exists measurements_one_per_day
  on public.measurements (measure_key_id, measured_on);

-- Der alte, nicht eindeutige Index aus 0001 wird damit ueberfluessig: Der neue
-- deckt dieselben Spalten in derselben Reihenfolge ab.
drop index if exists public.measurements_key_date_idx;

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    insert into public.schema_migrations (version)
      values ('0010_measurement_one_per_day')
      on conflict (version) do update set applied_at = now();
  else
    raise notice 'Kein Ledger vorhanden — 0003_ledger.sql ausfuehren, dann diese Datei erneut.';
  end if;
end $$;
