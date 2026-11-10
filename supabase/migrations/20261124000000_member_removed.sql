-- Voima Coach – Studio entfernt einen Kunden bzw. ein Mitglied (z. B. nach Vertragsende)
--
-- Das Entfernen selbst läuft über die API (studio_id/studio_member zurücksetzen). Künftige Kursanmeldungen und
-- Termine bei Trainern des Studios storniert die Datenbank über die bestehenden Trigger.
-- Hier nur die neuen Hinweisarten:
--   member_removed          an den Kunden:  „Iron Gym hat deine Mitgliedschaft beendet“
--   studio_client_removed   an den Coach:   „Iron Gym hat Lena aus dem Studio entfernt“

alter table public.notices drop constraint notices_kind_check;
alter table public.notices add constraint notices_kind_check check (kind in (
  'client_deleted', 'trainer_deleted', 'client_left', 'client_removed',
  'coach_changed', 'client_transferred', 'client_reassigned',
  'trainer_joined', 'trainer_removed', 'studio_trainer_deleted', 'studio_deleted',
  'appointment_requested', 'appointment_confirmed', 'appointment_declined', 'appointment_cancelled',
  'appointment_booked', 'appointment_comment',
  'course_assigned', 'course_cancelled',
  'member_joined', 'member_left',
  'member_removed', 'studio_client_removed'
));
