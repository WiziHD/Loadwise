-- Loadwise — das eigene Konto loeschen, ohne Service-Role-Schluessel
--
-- ---------------------------------------------------------------------------
-- WARUM HIER EINE `security definer`-FUNKTION RICHTIG IST UND BEIM URTEIL NICHT.
--
-- Der Kopf von `verdict-write.ts` verwirft genau diese Bauform fuer das
-- Schreiben eines Urteils, und die Begruendung dort gilt weiter:
--
--   »Eine Funktion `record_evaluation(episode_id, status, severity, flags)` ist
--    das Gegenteil: DAS KONTO LIEFERT DAS URTEIL. Jeder Angemeldete koennte sie
--    mit `severity = 'green'` aufrufen.«
--
-- Diese Funktion hier ist der andere Fall, und der Unterschied ist der
-- Parameter, den es NICHT gibt:
--
--   * Sie nimmt kein einziges Argument entgegen.
--   * Sie handelt ausschliesslich auf `auth.uid()` -- und das kommt aus dem
--     geprueften Token, nicht aus dem Aufruf.
--
-- Ein Konto kann sich damit selbst loeschen und nichts anderes. Es kann die
-- Funktion nicht beluegen, weil es ihr nichts sagt. Dieselbe Eigenschaft, die
-- den Trigger in 0006 sicher macht.
--
-- Der Gewinn ist gross: `check:service-role` haelt fest, dass GENAU EINE Datei
-- den Schluessel anfasst. Eine zweite waere nicht bloss eine Zeile mehr in
-- einer Erlaubnisliste -- sie waere der Punkt, an dem aus »die eine Ausnahme«
-- eine Sammlung wird.
--
-- ---------------------------------------------------------------------------
-- WAS GELOESCHT WIRD: ALLES. UEBER EINE EINZIGE ZEILE.
--
-- `episodes.user_id references auth.users (id) on delete cascade` seit 0001,
-- und jede weitere Tabelle haengt mit `on delete cascade` an `episodes`.
-- Verschwindet die Zeile in `auth.users`, verschwinden Eintraege, Einheiten,
-- Selbsttests, eigene Masse, Messungen, Ziele, Flags und Auswertungen mit.
--
-- Das ist ausdruecklich gewollt und der Grund, warum E5 das Loeschen einer
-- Episode zurueckgestellt hat, bis es einen Export gibt: Loeschen darf nur,
-- wer vorher exportieren konnte.
--
-- ---------------------------------------------------------------------------
-- `search_path` IST FESTGENAGELT, UND DAS IST KEINE FORMSACHE.
--
-- Eine `security definer`-Funktion laeuft mit den Rechten ihres Eigentuemers.
-- Ohne festen Suchpfad koennte ein Aufrufer ein eigenes Schema voranstellen und
-- damit bestimmen, WELCHE Tabelle `auth.users` meint. Der leere Pfad zwingt
-- jeden Namen darin, vollstaendig qualifiziert zu sein.
-- ---------------------------------------------------------------------------

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  wer uuid := auth.uid();
begin
  -- Kein angemeldetes Konto, nichts zu loeschen. Ausdruecklich ein Fehler und
  -- kein stilles Nichts: Ein Aufruf ohne Sitzung ist ein Fehlerfall, und ein
  -- »fertig« darauf waere die Meldung, es sei etwas geloescht worden.
  if wer is null then
    raise exception 'Kein angemeldetes Konto.' using errcode = '28000';
  end if;

  delete from auth.users where id = wer;
end;
$$;

-- Niemand ausser einem angemeldeten Konto. `public` schliesst `anon` ein, und
-- ein anonymer Aufruf haette ohnehin keine `auth.uid()` -- aber die Funktion
-- gar nicht erst anzubieten ist die kuerzere Antwort.
revoke execute on function public.delete_own_account() from public;
revoke execute on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    insert into public.schema_migrations (version)
      values ('0012_delete_own_account')
      on conflict (version) do update set applied_at = now();
  else
    raise notice 'Kein Ledger vorhanden — 0003_ledger.sql ausfuehren, dann diese Datei erneut.';
  end if;
end $$;
