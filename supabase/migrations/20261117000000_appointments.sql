-- Voima Coach – Termine: Kunden fragen Termine bei ihrem Coach oder ihrem Studio an
--
-- * Anbieter = Trainer (trainer_id) ODER Studio (studio_id) – genau eins von beiden.
-- * booking_profiles: pro Anbieter Angebote (z. B. Personal Training 60 min) und
--   wöchentliche Zeitfenster, in denen Kunden anfragen können.
-- * appointments: Anfrage → bestätigt / abgelehnt / storniert. Art, Titel und Dauer werden
--   beim Anfragen kopiert, damit spätere Änderungen am Angebot alte Termine nicht verändern.
-- * Doppelbuchungen verhindert eine Exclusion-Constraint (auch bei gleichzeitigen Anfragen).
-- * Zugriff nur über die API (RLS an, keine Policies).

create extension if not exists btree_gist with schema extensions;

create table public.booking_profiles (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid unique references public.profiles (id) on delete cascade,
  studio_id     uuid unique references public.studios (id) on delete cascade,
  enabled       boolean not null default false,
  -- [{ id, category, title, durationMin, description }]
  services      jsonb not null default '[]'::jsonb,
  -- [{ day: 0 (Mo) … 6 (So), start: "HH:MM", end: "HH:MM" }]
  windows       jsonb not null default '[]'::jsonb,
  min_notice_h  integer not null default 12 check (min_notice_h between 0 and 168),
  horizon_days  integer not null default 28 check (horizon_days between 1 and 90),
  updated_at    timestamptz not null default now(),
  check (num_nonnulls(trainer_id, studio_id) = 1)
);
alter table public.booking_profiles enable row level security;

create table public.appointments (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid references public.profiles (id) on delete cascade,
  studio_id     uuid references public.studios (id) on delete cascade,
  provider_id   uuid generated always as (coalesce(trainer_id, studio_id)) stored,
  client_id     uuid not null references public.profiles (id) on delete cascade,
  service_id    text,
  category      text not null check (category in ('personal_training', 'introduction', 'nutrition', 'trial', 'body_check', 'consultation', 'other')),
  title         text not null check (char_length(title) between 1 and 80),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  status        text not null default 'requested' check (status in ('requested', 'confirmed', 'declined', 'cancelled')),
  client_note   text check (char_length(client_note) <= 500),
  response_note text check (char_length(response_note) <= 500),
  cancelled_by  text check (cancelled_by in ('client', 'provider', 'system')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (num_nonnulls(trainer_id, studio_id) = 1),
  check (ends_at > starts_at),
  constraint appointments_no_overlap exclude using gist (
    provider_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('requested', 'confirmed'))
);
create index appointments_provider_idx on public.appointments (provider_id, starts_at);
create index appointments_client_idx on public.appointments (client_id, starts_at);
alter table public.appointments enable row level security;

-- Endet die Verbindung Kunde ↔ Coach bzw. Kunde ↔ Studio (Wechsel, Entfernen, Austritt, …),
-- werden offene und bestätigte künftige Termine dort automatisch storniert.
create function public.handle_appointment_links_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.trainer_id is not null and old.trainer_id is distinct from new.trainer_id then
    update public.appointments
       set status = 'cancelled', cancelled_by = 'system', updated_at = now(),
           response_note = coalesce(response_note, 'Die Verbindung zwischen Kunde und Coach wurde beendet.')
     where client_id = new.id and trainer_id = old.trainer_id
       and status in ('requested', 'confirmed') and ends_at > now();
  end if;
  if old.studio_id is not null and old.studio_id is distinct from new.studio_id and new.role = 'client' then
    update public.appointments
       set status = 'cancelled', cancelled_by = 'system', updated_at = now(),
           response_note = coalesce(response_note, 'Die Verbindung zum Studio wurde beendet.')
     where client_id = new.id and studio_id = old.studio_id
       and status in ('requested', 'confirmed') and ends_at > now();
  end if;
  return new;
end;
$$;

create trigger on_profile_links_changed
  after update of trainer_id, studio_id on public.profiles
  for each row execute function public.handle_appointment_links_changed();

revoke execute on function public.handle_appointment_links_changed() from public, anon, authenticated;

-- Hinweise zu Terminen (mit Detailtext, z. B. „Personal Training · Di., 18. Nov., 17:00 Uhr“)
alter table public.notices add column detail text check (char_length(detail) <= 200);
alter table public.notices drop constraint notices_kind_check;
alter table public.notices add constraint notices_kind_check check (kind in (
  'client_deleted', 'trainer_deleted', 'client_left', 'client_removed',
  'coach_changed', 'client_transferred', 'client_reassigned',
  'trainer_joined', 'trainer_removed', 'studio_trainer_deleted', 'studio_deleted',
  'appointment_requested', 'appointment_confirmed', 'appointment_declined', 'appointment_cancelled'
));
