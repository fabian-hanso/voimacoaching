-- Voima Coach – Studio-Profil: Infos, Adresse, Kontakt, Öffnungszeiten, Ausstattung
-- Sichtbar für Inhaber, Trainer und Kunden des Studios (über GET /api/v1/studio/profile).

alter table public.studios
  add column description   text check (char_length(description) <= 1000),
  add column street        text check (char_length(street) <= 120),
  add column postal_code   text check (char_length(postal_code) <= 12),
  add column city          text check (char_length(city) <= 80),
  add column phone         text check (char_length(phone) <= 40),
  add column email         text check (char_length(email) <= 254),
  add column website       text check (website ~ '^https?://' and char_length(website) <= 300),
  add column instagram     text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  -- 7 Einträge (0 = Montag … 6 = Sonntag): { day, closed, open: "HH:MM", close: "HH:MM" }
  add column opening_hours jsonb not null default '[]'::jsonb,
  add column amenities     text[] not null default '{}' check (cardinality(amenities) <= 20);
