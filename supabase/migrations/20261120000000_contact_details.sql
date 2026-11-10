-- Voima Coach – Kontaktdaten für Termine
--
-- * profiles.phone: optionale Telefonnummer, pflegt jeder selbst in den Einstellungen.
--   Sichtbar für Trainer und Studio bei Terminen (E-Mail kommt aus dem Konto).
-- * appointments.contact_email / contact_phone: beim Termin hinterlegte Kontaktdaten –
--   für Gäste ohne Konto oder abweichend vom Profil. Pflegt, wer den Termin eingetragen hat.

alter table public.profiles add column phone text check (phone ~ '^[+0-9][0-9 /()-]{3,39}$');

alter table public.appointments
  add column contact_email text check (char_length(contact_email) <= 254 and contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column contact_phone text check (contact_phone ~ '^[+0-9][0-9 /()-]{3,39}$');
