-- Voima Coach – Benachrichtigungen in Echtzeit (Glocke im Header)
--
-- * Eine SELECT-Policy erlaubt jedem Nutzer, nur seine eigenen Hinweise zu sehen. Das braucht Supabase
--   Realtime (postgres_changes), um neue Hinweise sofort zuzustellen – geprüft wird pro Abonnent.
-- * Schreiben bleibt ausschließlich der API vorbehalten (Secret Key).

create policy "Nutzer lesen eigene Hinweise"
  on public.notices
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.notices to authenticated;
revoke insert, update, delete on public.notices from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notices;
  end if;
end;
$$;
