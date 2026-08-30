-- Loadwise — eine Messung je Testart und Tag
--
-- ---------------------------------------------------------------------------
-- WARUM DAS AUFFIEL, BEVOR DIE ERSTE MESSUNG EXISTIERTE.
--
-- `self_tests` hat seit 0001 einen Index auf (episode_id, test_type, test_date),
-- aber keine Eindeutigkeit. Zwei Messungen derselben Art am selben Tag waren
-- also erlaubt — und niemand hat das je bemerkt, weil bis Karte 3.1 kein Weg in
-- die Tabelle führte.
--
-- Der Motor sortiert in `rules/asymmetry.ts` nach Datum und nimmt die letzte:
--
--     .sort((a, b) => compareDates(a.date, b.date));
--     const newest = usable[usable.length - 1]!;
--
-- `Array.prototype.sort` ist stabil. Bei zwei Zeilen mit demselben Datum
-- entscheidet damit die Reihenfolge, in der die Abfrage sie geliefert hat —
-- und die Abfrage in `verdicts.ts` sortiert nicht. Das Ergebnis wäre nicht
-- falsch, sondern schlimmer: unbestimmt. Zweimal dasselbe Tagebuch, zweimal
-- dasselbe Urteil? Nicht zwingend.
--
-- ---------------------------------------------------------------------------
-- DIE REGEL IST SCHON DA, EINE TABELLE WEITER.
--
-- `entries` hat sie seit 0001: ein Kalendertag ist eine Zeile, und `saveEntry`
-- ersetzt über (episode_id, entry_date). Für eine Messung gilt dasselbe
-- Argument, und es gilt sogar deutlicher — eine zweite Messung am selben Tag
-- ist eine Korrektur oder ein zweiter Versuch, nie ein zweiter Messpunkt. Ein
-- Verlauf mit zwei Punkten über demselben Tag ist kein Verlauf.
--
-- Bewusst NICHT gewählt: beide behalten und die spätere gewinnen lassen. Das
-- verlangt an jeder lesenden Stelle dieselbe Entscheidung noch einmal — im
-- Motor, im Bericht, in der Verlaufskurve, im Export — und eine davon würde sie
-- irgendwann anders treffen.
--
-- ---------------------------------------------------------------------------
-- LÄUFT AUF VOLLEN TABELLEN, ANDERS ALS 0007.
--
-- `create unique index` schlaegt fehl, wenn es bereits Doubletten gibt. Deshalb
-- prueft der erste Block danach und nennt sie, statt mit einer Meldung
-- abzubrechen, die nicht sagt, wo das Problem liegt. Heute kann es keine geben
-- (nichts schreibt in diese Tabelle), aber diese Datei laeuft auch spaeter noch
-- und auf anderen Datenbanken.
-- ---------------------------------------------------------------------------

do $$
declare
  doubletten int;
begin
  select count(*) into doubletten
  from (
    select episode_id, test_type, test_date
    from public.self_tests
    group by episode_id, test_type, test_date
    having count(*) > 1
  ) d;

  if doubletten > 0 then
    raise exception using message = format(
      $meldung$%s Kombination(en) aus Episode, Testart und Tag kommen mehrfach vor. Die Eindeutigkeit laesst sich nicht herstellen, ohne zu entscheiden, welche Messung gilt -- und das ist keine Entscheidung, die eine Migration treffen darf. Die betroffenen Zeilen zuerst pruefen: select episode_id, test_type, test_date, count(*) from public.self_tests group by 1,2,3 having count(*) > 1;$meldung$,
      doubletten
    );
  end if;
end $$;

create unique index if not exists self_tests_one_per_day
  on public.self_tests (episode_id, test_type, test_date);

-- Der alte, nicht eindeutige Index aus 0001 wird damit ueberfluessig: Der neue
-- deckt dieselben Spalten in derselben Reihenfolge ab und kann jede Abfrage
-- bedienen, die jener bedient hat.
drop index if exists public.self_tests_episode_idx;

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    insert into public.schema_migrations (version)
      values ('0009_selftest_one_per_day')
      on conflict (version) do update set applied_at = now();
  else
    raise notice 'Kein Ledger vorhanden — 0003_ledger.sql ausfuehren, dann diese Datei erneut.';
  end if;
end $$;
