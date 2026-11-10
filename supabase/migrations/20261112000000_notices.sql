-- FitnessCompanion – Hinweise, wenn eine Coach–Kunde-Verbindung endet
--
-- Fälle:
--   client_deleted   Kunde hat sein Konto gelöscht           → Hinweis an den Trainer
--   trainer_deleted  Trainer hat sein Konto gelöscht         → Hinweis an alle seine Kunden
--   client_left      Kunde hat die Verbindung getrennt       → Hinweis an den Trainer   (API)
--   client_removed   Trainer hat den Kunden entfernt         → Hinweis an den Kunden    (API)
--
-- Gespeichert wird nur der NAME der anderen Person (keine weiteren Daten).
-- Hinweise sind wegklickbar und werden nach 30 Tagen nicht mehr angezeigt/aufgeräumt.
-- Zugriff nur über die API (RLS an, keine Policies).

create table public.notices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('client_deleted', 'trainer_deleted', 'client_left', 'client_removed')),
  actor_name   text not null,
  created_at   timestamptz not null default now(),
  dismissed_at timestamptz
);
create index notices_user_idx on public.notices (user_id, created_at desc);

alter table public.notices enable row level security;

-- Kontolöschungen per Trigger erfassen – greift auch bei Löschung über das Supabase-Dashboard,
-- weil auth.users → profiles per ON DELETE CASCADE gelöscht wird.
create function public.handle_profile_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'client' and old.trainer_id is not null then
    insert into public.notices (user_id, kind, actor_name)
    select old.trainer_id, 'client_deleted', old.name
    where exists (select 1 from public.profiles where id = old.trainer_id);
  elsif old.role = 'trainer' then
    insert into public.notices (user_id, kind, actor_name)
    select p.id, 'trainer_deleted', old.name
    from public.profiles p
    where p.trainer_id = old.id and p.role = 'client';
  end if;
  return old;
end;
$$;

create trigger on_profile_deleted
  before delete on public.profiles
  for each row execute function public.handle_profile_deleted();

revoke execute on function public.handle_profile_deleted() from public, anon, authenticated;
