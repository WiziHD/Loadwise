-- Loadwise — der Fortschrittskanal ueberlebt das Speichern
--
-- ---------------------------------------------------------------------------
-- DERSELBE FUND WIE 0008, EIN FELD WEITER.
--
-- `Evaluation` hat vier Ausgaenge: `flags`, `overall`, `coverage` und
-- `progress`. Abgelegt wurden bisher drei. Der vierte -- der Stand der eigenen
-- Ziele -- wurde bei jedem Lauf berechnet und beim Schreiben fallen gelassen.
--
-- Aufgefallen ist das erst, als Karte 3.4 ihn anzeigen wollte: `StoredRun` hat
-- kein Feld dafuer, also konnte die Ansicht ihn nicht lesen. Bis dahin war das
-- unsichtbar, weil es keine Ziele gab und der Kanal deshalb immer leer war.
--
-- 0008 hat denselben Satz schon einmal gebraucht: »Ein Grund, der den
-- Bildschirm nicht erreicht, ist fuer die lesende Person kein Grund, sondern
-- ein Urteil ohne Begruendung.« Hier ist es kein Urteil, sondern der eigene
-- Massstab -- aber der Mechanismus des Verlusts ist derselbe.
--
-- ---------------------------------------------------------------------------
-- WARUM ABLEGEN UND NICHT BEIM ANZEIGEN NEU RECHNEN.
--
-- Neu rechnen waere weniger Arbeit und der falsche Weg, aus demselben Grund
-- wie bei den Urteilen (E12): Eine Ansicht, die selbst rechnet, kann sich bei
-- jedem Aufruf aendern, und niemand koennte spaeter sagen, was jemandem im
-- August angezeigt wurde.
--
-- Dazu ein Grund, den es bei den Urteilen nicht gibt: `progress` haengt an den
-- ZIELEN, und die aendert der Nutzer. Ein Stand, der live gerechnet wird,
-- schriebe die Vergangenheit um, sobald jemand ein Ziel loescht -- »drei von
-- fuenf« wuerde rueckwirkend zu »drei von vier«, ohne dass etwas passiert
-- waere.
--
-- ---------------------------------------------------------------------------
-- STANDARDWERT STATT NOT NULL OHNE.
--
-- Anders als 0007: Diese Migration laeuft auf vollen Tabellen. Der
-- Standardwert ist kein erfundener Schwellenwert, sondern die leere Form des
-- Kanals -- genau das, was ein Lauf ohne Ziele ohnehin erzeugt haette.
--
-- Fuer bestehende Zeilen ist er damit nicht bloss zulaessig, sondern richtig:
-- Es gab bis heute keine Ziele, also war der Kanal in jedem dieser Laeufe leer.
-- ---------------------------------------------------------------------------

alter table public.evaluations
  add column if not exists progress jsonb not null
    default '{"milestones":[],"records":[],"pending":[],"episodeDay":null}'::jsonb;

-- Ein Objekt, keine Liste und kein Skalar. Ohne die Bedingung koennte eine
-- Zeile `"[]"` tragen, und die Ansicht laese `progress.milestones` als
-- undefined -- also »keine Ziele«, wo »nicht lesbar« richtig waere.
alter table public.evaluations
  drop constraint if exists progress_is_object;
alter table public.evaluations
  add constraint progress_is_object check (jsonb_typeof(progress) = 'object');

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    insert into public.schema_migrations (version)
      values ('0011_evaluation_progress')
      on conflict (version) do update set applied_at = now();
  else
    raise notice 'Kein Ledger vorhanden — 0003_ledger.sql ausfuehren, dann diese Datei erneut.';
  end if;
end $$;
