-- Loadwise — warum es keine Entwarnung gab, überlebt das Speichern
--
-- ---------------------------------------------------------------------------
-- `Overall` IST EINE UNION MIT DREI VARIANTEN, UND EINE DAVON TRÄGT EIN FELD,
-- DAS 0007 FALLEN LIESS.
--
--   { status: "judged";       severity: Severity }
--   { status: "insufficient"; blocking: BlockingReason[] }   <- diese
--   { status: "no-data" }
--
-- Gespeichert wurden `overall_status` und `overall_severity`. Für `judged` ist
-- das vollständig, für `no-data` auch — für `insufficient` fehlte genau das,
-- was den Zustand erklärt.
--
-- ---------------------------------------------------------------------------
-- DAS IST DERSELBE FEHLER WIE IN DER HÄRTUNGSWOCHE, EINE EBENE TIEFER.
--
-- Dort stand `overall.blocking` in der Auswertung und wurde von keiner Ansicht
-- gezeigt — »gesetzt und nie gezeigt«, einer der acht Funde. Der Kommentar in
-- `report.ts` hält fest, warum das schwer wiegt: *»Ein Grund, der den
-- Bildschirm nicht erreicht, ist für die lesende Person kein Grund, sondern ein
-- Urteil ohne Begründung.«*
--
-- Beim Ablegen ging er dann gar nicht erst mit. Aufgefallen ist das erst beim
-- Bau des Berichts (Karte 2.3), der ihn braucht.
--
-- Zu bedenken war, ihn wegzulassen und aus `pending` herzuleiten: `blocking`
-- ist die Menge der `pending`-Gründe plus `medication-in-window`. Verworfen —
-- das wäre eine zweite Stelle, an der die Regel steht, wann es keine Entwarnung
-- gibt, und sie liefe beim ersten Zusatzgrund auseinander. Der Motor gibt das
-- Feld aus; die Datenbank hält es.
--
-- ---------------------------------------------------------------------------
-- MIT STANDARDWERT, ANDERS ALS 0007 — UND DER UNTERSCHIED IST DER GRUND.
--
-- `config` durfte keinen haben: Ein leeres Objekt hiesse dort »beurteilt gegen
-- gar keine Schwellen«, also eine erfundene Angabe.
--
-- Eine leere Liste ist hier dagegen ein WAHRER Wert: Bei `judged` und
-- `no-data` gibt es keine Blockadegründe, und das sind die beiden häufigen
-- Fälle. Deshalb läuft diese Datei auch auf einer Datenbank mit Zeilen durch —
-- im Gegensatz zu 0007, was einen Nachmittag gekostet hat.
--
-- Was der Standardwert NICHT kann: eine `insufficient`-Zeile von vor dieser
-- Migration ehrlich füllen. Solche Zeilen gibt es heute nicht, und wenn sie
-- entstehen, ist eine leere Liste dort eine stille Falschaussage. Eine
-- CHECK-Bedingung dagegen — »insufficient heisst nicht-leer« — steht hier
-- bewusst NICHT: Ob `blocking` bei `insufficient` leer sein kann, ist im Motor
-- nicht ausgeschlossen (`enoughRules` kann fallen, ohne dass eine Regel einen
-- Grund meldet), und eine Bedingung, die man nicht belegen kann, gehört nicht
-- in ein Schema.
-- ---------------------------------------------------------------------------

alter table evaluations add column if not exists blocking jsonb not null default '[]'::jsonb;

comment on column evaluations.blocking is
  'Warum es keine Entwarnung gab. Nur bei overall_status = insufficient gefuellt. Kommt aus Overall.blocking und wird NICHT aus pending hergeleitet — das waere eine zweite Stelle fuer dieselbe Regel.';

-- ---------------------------------------------------------------------------
-- Selbstprüfung: der Sollzustand wird behauptet, nicht ein Fehler gesucht
-- ---------------------------------------------------------------------------
do $$
declare
  ist_typ text;
  ist_nullbar text;
begin
  select data_type, is_nullable into ist_typ, ist_nullbar
  from information_schema.columns
  where table_schema = 'public' and table_name = 'evaluations' and column_name = 'blocking';

  if ist_typ is null then
    raise exception 'evaluations.blocking fehlt.';
  end if;
  if ist_typ <> 'jsonb' then
    raise exception 'evaluations.blocking ist %, sollte jsonb sein.', ist_typ;
  end if;
  if ist_nullbar = 'YES' then
    raise exception 'evaluations.blocking ist nullbar. Keine Blockadegruende und "nicht erfasst" waeren dann dasselbe.';
  end if;

  raise notice 'Blockadegruende ueberleben das Speichern.';
end $$;

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    insert into public.schema_migrations (version)
      values ('0008_overall_blocking')
      on conflict (version) do update set applied_at = now();
  else
    raise notice 'Kein Ledger vorhanden — 0003_ledger.sql ausfuehren, dann diese Datei erneut.';
  end if;
end $$;
