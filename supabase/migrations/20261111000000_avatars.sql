-- FitnessCompanion – Profilbilder für Trainer und Kunden
--
-- * Bilder liegen im Storage-Bucket `avatars` unter <user-id>/<zufällige-uuid>.<ext>.
-- * Der Bucket ist öffentlich LESBAR (einfache, cachebare URLs für Web & Apps);
--   die Dateinamen sind zufällige UUIDs und damit nicht erratbar.
-- * Hochladen/Löschen ausschließlich über die API (/api/v1/me/avatar) mit dem Secret Key –
--   es gibt bewusst KEINE Storage-Policies für anon/authenticated.

alter table public.profiles add column avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
