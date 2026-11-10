-- Voima Coach – Kurse im Studio (z. B. Yoga, Spinning, Rücken-Fit)
--
-- * courses: vom Studio angelegt, mit Beschreibung, Bild, zugewiesenem Trainer, Kontingent (Plätze pro Termin)
--   und wöchentlichen Zeiten (schedule: [{ day: 0 (Mo) … 6 (So), start: "HH:MM" }], Ortszeit Europe/Berlin).
-- * course_bookings: Kunden des Studios melden sich für einzelne Kurstermine an (starts_at = Beginn des Termins).
--   Das Kontingent prüft book_course() unter Zeilensperre – auch bei gleichzeitigen Anmeldungen kein Überbuchen.
-- * Zugriff nur über die API (RLS an, keine Policies).

create table public.courses (
  id            uuid primary key default gen_random_uuid(),
  studio_id     uuid not null references public.studios (id) on delete cascade,
  trainer_id    uuid references public.profiles (id) on delete set null,
  title         text not null check (char_length(title) between 1 and 80),
  category      text check (char_length(category) <= 40),
  description   text check (char_length(description) <= 2000),
  image_path    text,
  location      text check (char_length(location) <= 80),
  capacity      integer not null check (capacity between 1 and 500),
  duration_min  integer not null check (duration_min between 15 and 240),
  schedule      jsonb not null default '[]'::jsonb,
  starts_on     date,
  ends_on       date,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index courses_studio_idx on public.courses (studio_id, title);
create index courses_trainer_idx on public.courses (trainer_id);
alter table public.courses enable row level security;

create table public.course_bookings (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  client_id   uuid not null references public.profiles (id) on delete cascade,
  starts_at   timestamptz not null,
  status      text not null default 'booked' check (status in ('booked', 'cancelled')),
  created_at  timestamptz not null default now(),
  cancelled_at timestamptz
);
create unique index course_bookings_once_idx on public.course_bookings (course_id, starts_at, client_id) where status = 'booked';
create index course_bookings_session_idx on public.course_bookings (course_id, starts_at) where status = 'booked';
create index course_bookings_client_idx on public.course_bookings (client_id, starts_at);
alter table public.course_bookings enable row level security;

-- Anmeldung mit Kontingent-Prüfung (Zeilensperre auf dem Kurs serialisiert gleichzeitige Anmeldungen)
create function public.book_course(p_course uuid, p_client uuid, p_starts timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.courses;
  v_count  integer;
  v_id     uuid;
begin
  select * into v_course from public.courses where id = p_course for update;
  if not found or not v_course.active then
    raise exception 'COURSE_NOT_FOUND';
  end if;
  if exists (
    select 1 from public.course_bookings
     where course_id = p_course and starts_at = p_starts and client_id = p_client and status = 'booked'
  ) then
    raise exception 'COURSE_ALREADY_BOOKED';
  end if;
  select count(*) into v_count
    from public.course_bookings
   where course_id = p_course and starts_at = p_starts and status = 'booked';
  if v_count >= v_course.capacity then
    raise exception 'COURSE_FULL';
  end if;
  insert into public.course_bookings (course_id, client_id, starts_at)
  values (p_course, p_client, p_starts)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.book_course(uuid, uuid, timestamptz) from public, anon, authenticated;

-- Verbindungen enden: Kunde verlässt das Studio → künftige Kursanmeldungen dort stornieren;
-- Trainer verlässt das Studio → er ist keinem Kurs des Studios mehr zugewiesen.
create function public.handle_course_links_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.studio_id is not null and old.studio_id is distinct from new.studio_id then
    if new.role = 'client' then
      update public.course_bookings b
         set status = 'cancelled', cancelled_at = now()
       where b.client_id = new.id and b.status = 'booked' and b.starts_at > now()
         and exists (select 1 from public.courses c where c.id = b.course_id and c.studio_id = old.studio_id);
    elsif new.role = 'trainer' then
      update public.courses set trainer_id = null, updated_at = now()
       where trainer_id = new.id and studio_id = old.studio_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_profile_course_links_changed
  after update of studio_id on public.profiles
  for each row execute function public.handle_course_links_changed();

revoke execute on function public.handle_course_links_changed() from public, anon, authenticated;

-- Hinweise: Trainer wurde einem Kurs zugewiesen · Kurs/Kurstermin fällt für angemeldete Kunden aus
alter table public.notices drop constraint notices_kind_check;
alter table public.notices add constraint notices_kind_check check (kind in (
  'client_deleted', 'trainer_deleted', 'client_left', 'client_removed',
  'coach_changed', 'client_transferred', 'client_reassigned',
  'trainer_joined', 'trainer_removed', 'studio_trainer_deleted', 'studio_deleted',
  'appointment_requested', 'appointment_confirmed', 'appointment_declined', 'appointment_cancelled',
  'appointment_booked', 'appointment_comment',
  'course_assigned', 'course_cancelled'
));
