-- Voima Coach – Termine laufen über Trainer statt über das Studio
--
-- * Anbieter ist immer ein Trainer (eigene Angebote & Zeitfenster). Mehrere Trainer eines Studios
--   können dadurch gleichzeitig Termine haben (z. B. 4 Personal Trainings parallel).
-- * Kunden eines Studios können bei JEDEM Trainer des Studios anfragen, sonst nur beim eigenen Coach.
-- * Studios sehen alle Termine ihrer Trainer, tragen Termine ein (sofort bestätigt) und sagen ab.
--   Eingetragen werden kann für Kunden des Studios oder für Gäste ohne Konto (z. B. Probetraining).
-- * Bisherige Studio-Angebote/-Termine lassen sich keinem Trainer zuordnen und werden entfernt.

delete from public.appointments where trainer_id is null;
delete from public.booking_profiles where trainer_id is null;

-- Termine: nur noch Trainer als Anbieter
alter table public.appointments drop constraint appointments_no_overlap;
alter table public.appointments drop column provider_id;
alter table public.appointments drop column studio_id;
alter table public.appointments alter column trainer_id set not null;
alter table public.appointments add constraint appointments_no_overlap exclude using gist (
  trainer_id with =,
  tstzrange(starts_at, ends_at) with &&
) where (status in ('requested', 'confirmed'));
create index appointments_trainer_idx on public.appointments (trainer_id, starts_at);

-- Gäste ohne Konto (nur vom Studio eingetragen) & Herkunft
alter table public.appointments alter column client_id drop not null;
alter table public.appointments add column guest_name text check (char_length(guest_name) between 1 and 100);
alter table public.appointments add constraint appointments_party check (client_id is not null or guest_name is not null);
alter table public.appointments add column created_by text not null default 'client' check (created_by in ('client', 'trainer', 'studio'));
alter table public.appointments drop constraint appointments_cancelled_by_check;
alter table public.appointments add constraint appointments_cancelled_by_check check (cancelled_by in ('client', 'provider', 'studio', 'system'));

-- Buchungsprofile: nur noch Trainer
alter table public.booking_profiles drop column studio_id;
alter table public.booking_profiles alter column trainer_id set not null;

-- Verbindungen enden → künftige Termine stornieren, die der Kunde so nicht mehr buchen dürfte
create or replace function public.handle_appointment_links_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'client' and (old.trainer_id is distinct from new.trainer_id or old.studio_id is distinct from new.studio_id) then
    -- erlaubt bleiben: eigener Coach und Trainer des (neuen) Studios
    update public.appointments a
       set status = 'cancelled', cancelled_by = 'system', updated_at = now(),
           response_note = coalesce(a.response_note, 'Die Verbindung zum Coach bzw. Studio wurde beendet.')
     where a.client_id = new.id
       and a.status in ('requested', 'confirmed') and a.ends_at > now()
       and a.trainer_id is distinct from new.trainer_id
       and not exists (
         select 1 from public.profiles t
          where t.id = a.trainer_id and new.studio_id is not null and t.studio_id = new.studio_id
       );
  elsif new.role = 'trainer' and old.studio_id is distinct from new.studio_id then
    -- Trainer verlässt das Studio: Termine mit Studio-Kunden (nicht eigene) und Studio-Gästen entfallen
    update public.appointments a
       set status = 'cancelled', cancelled_by = 'system', updated_at = now(),
           response_note = coalesce(a.response_note, 'Der Trainer gehört nicht mehr zum Studio.')
     where a.trainer_id = new.id
       and a.status in ('requested', 'confirmed') and a.ends_at > now()
       and (
         (a.client_id is null and a.created_by = 'studio')
         or (a.client_id is not null and not exists (
           select 1 from public.profiles c
            where c.id = a.client_id
              and (c.trainer_id = new.id or (new.studio_id is not null and c.studio_id = new.studio_id))
         ))
       );
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_appointment_links_changed() from public, anon, authenticated;

-- Benachrichtigungen: gelesen-Status für den Zähler an der Glocke
alter table public.notices add column read_at timestamptz;
create index notices_unread_idx on public.notices (user_id) where read_at is null and dismissed_at is null;

-- Neue Hinweisart: Studio hat einen Termin eingetragen
alter table public.notices drop constraint notices_kind_check;
alter table public.notices add constraint notices_kind_check check (kind in (
  'client_deleted', 'trainer_deleted', 'client_left', 'client_removed',
  'coach_changed', 'client_transferred', 'client_reassigned',
  'trainer_joined', 'trainer_removed', 'studio_trainer_deleted', 'studio_deleted',
  'appointment_requested', 'appointment_confirmed', 'appointment_declined', 'appointment_cancelled',
  'appointment_booked'
));
