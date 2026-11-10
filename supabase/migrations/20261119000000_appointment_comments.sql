-- Voima Coach – Kommentare & private Trainer-Notizen an Terminen
--
-- * appointment_comments: Austausch zum Termin zwischen Kunde, Trainer und Studio (z. B. „Bitte Laufschuhe mitbringen“).
--   Der Name wird mitgespeichert, damit Kommentare gelöschter Konten lesbar bleiben.
-- * appointments.trainer_note: private Notiz, die nur der Trainer sieht (z. B. „Fokus Knie, Kniebeuge leichter“).
-- * Zugriff nur über die API (RLS an, keine Policies).

create table public.appointment_comments (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  author_id      uuid references public.profiles (id) on delete set null,
  author_name    text not null check (char_length(author_name) between 1 and 100),
  author_role    text not null check (author_role in ('client', 'trainer', 'studio')),
  body           text not null check (char_length(body) between 1 and 1000),
  created_at     timestamptz not null default now()
);
create index appointment_comments_appt_idx on public.appointment_comments (appointment_id, created_at);
alter table public.appointment_comments enable row level security;

alter table public.appointments add column trainer_note text check (char_length(trainer_note) <= 2000);

alter table public.notices drop constraint notices_kind_check;
alter table public.notices add constraint notices_kind_check check (kind in (
  'client_deleted', 'trainer_deleted', 'client_left', 'client_removed',
  'coach_changed', 'client_transferred', 'client_reassigned',
  'trainer_joined', 'trainer_removed', 'studio_trainer_deleted', 'studio_deleted',
  'appointment_requested', 'appointment_confirmed', 'appointment_declined', 'appointment_cancelled',
  'appointment_booked', 'appointment_comment'
));
