-- Voima Coach – Weitere Mitarbeitende eines Studios (Leitung, Service & Empfang, …)
--
-- * Reine Auflistung ohne eigenes Konto/Login (Konten mit Rechten ggf. später).
-- * Sichtbar für Inhaber, Trainer und Kunden des Studios (Studio-Seite „Unser Team“).
-- * Bewusst KEINE privaten Kontaktdaten – die Liste ist für alle Kunden sichtbar.
-- * Foto im Bucket „avatars“ unter studios/<studio-id>/staff/<uuid>.<ext>.

create table public.studio_staff (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 100),
  category    text not null check (category in ('management', 'service', 'other')),
  position    text check (char_length(position) <= 80), -- z. B. „Studioleitung“, „Rezeption“
  bio         text check (char_length(bio) <= 300),
  photo_path  text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index studio_staff_studio_idx on public.studio_staff (studio_id, category, sort_order, name);

alter table public.studio_staff enable row level security;
