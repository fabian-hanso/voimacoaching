-- FitnessCompanion – private Nachrichten zwischen Coach und Kunde (Realtime)
--
-- Zugriffsmodell:
--   * Schreiben (senden, gelesen markieren) NUR über die API (/api/v1/conversations/…),
--     die prüft, ob Coach und Kunde zusammengehören.
--   * Lesen: eine SELECT-Policy erlaubt Teilnehmern, ihre eigenen Nachrichten zu sehen.
--     Das ist nötig, damit Web und Apps neue Nachrichten über Supabase Realtime
--     (postgres_changes) empfangen können – Realtime prüft diese Policy pro Abonnent.

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references public.profiles (id) on delete cascade,
  client_id   uuid not null references public.profiles (id) on delete cascade,
  sender_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  constraint sender_is_participant check (sender_id in (trainer_id, client_id))
);
create index messages_conversation_idx on public.messages (trainer_id, client_id, created_at desc);
create index messages_client_idx on public.messages (client_id, created_at desc);

alter table public.messages enable row level security;

create policy "Teilnehmer lesen eigene Nachrichten"
  on public.messages
  for select
  to authenticated
  using ((select auth.uid()) in (trainer_id, client_id));

grant select on public.messages to authenticated;
revoke insert, update, delete on public.messages from anon, authenticated;

-- Realtime für die Tabelle aktivieren (Publication existiert in jedem Supabase-Projekt).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- Übersicht aller Unterhaltungen eines Nutzers: letzte Nachricht + Anzahl ungelesener.
create function public.conversation_summaries(p_user uuid)
returns table (
  partner_id     uuid,
  last_body      text,
  last_sender_id uuid,
  last_at        timestamptz,
  unread         integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select
      case when m.trainer_id = p_user then m.client_id else m.trainer_id end as partner,
      m.body, m.sender_id, m.created_at, m.read_at
    from public.messages m
    where m.trainer_id = p_user or m.client_id = p_user
  )
  select distinct on (a.partner)
    a.partner,
    a.body,
    a.sender_id,
    a.created_at,
    (select count(*)::int from mine u
      where u.partner = a.partner and u.sender_id <> p_user and u.read_at is null)
  from mine a
  order by a.partner, a.created_at desc;
$$;

revoke execute on function public.conversation_summaries(uuid) from public, anon, authenticated;
