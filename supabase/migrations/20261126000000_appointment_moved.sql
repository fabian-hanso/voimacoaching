-- Termine verschieben: neue Hinweisart
--   appointment_moved   an Kunde (und bei Studio-Änderung an den Trainer):
--                       „Iron Gym hat einen Termin verschoben: Personal Training · Do., 20. Nov., 18:00 Uhr (statt …)“
-- Das Verschieben selbst läuft über die API; Überschneidungen verhindert weiterhin appointments_no_overlap.

alter table public.notices drop constraint notices_kind_check;
alter table public.notices add constraint notices_kind_check check (kind in (
  'client_deleted', 'trainer_deleted', 'client_left', 'client_removed',
  'coach_changed', 'client_transferred', 'client_reassigned',
  'trainer_joined', 'trainer_removed', 'studio_trainer_deleted', 'studio_deleted',
  'appointment_requested', 'appointment_confirmed', 'appointment_declined', 'appointment_cancelled',
  'appointment_booked', 'appointment_comment', 'appointment_moved',
  'course_assigned', 'course_cancelled',
  'member_joined', 'member_left',
  'member_removed', 'studio_client_removed'
));
