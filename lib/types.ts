import type { LoggedExercise, PlanDay } from "./schemas";

/** Antwort-Typen der API v1 – identisch für Web und Apps. */

export type Role = "trainer" | "client" | "studio";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  trainerId: string | null;
  /** Öffentliche Bild-URL (512×512) oder null. */
  avatarUrl: string | null;
  /** Optionale Telefonnummer (sehen Trainer/Studio bei Terminen) */
  phone: string | null;
  /** Kunde ist selbst Mitglied seines Studios (per Mitglieds-Code) – unabhängig vom Coach */
  studioMember: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  expiresIn: number;
  user: User;
}

export interface Trainer {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

/** Studio, zu dem der Nutzer gehört (Trainer/Kunde) bzw. das ihm gehört (Inhaber). */
export interface StudioInfo {
  id: string;
  name: string;
  /** Öffentliche Logo-URL oder null */
  logoUrl: string | null;
}

export interface MeResponse {
  user: User;
  trainer: Trainer | null;
  studio: StudioInfo | null;
}

export interface OpeningHoursDay {
  /** 0 = Montag … 6 = Sonntag */
  day: number;
  closed: boolean;
  /** "HH:MM" */
  open: string;
  close: string;
}

export type StaffCategory = "management" | "service" | "other";

/** Weitere Mitarbeitende (ohne eigenes Konto), z. B. Leitung oder Rezeption. */
export interface StudioStaffMember {
  id: string;
  name: string;
  category: StaffCategory;
  position: string | null;
  bio: string | null;
  photoUrl: string | null;
}

/** Studio-Seite: für Inhaber, Trainer und Kunden des Studios sichtbar. */
export interface StudioProfile extends StudioInfo {
  description: string | null;
  address: { street: string | null; postalCode: string | null; city: string | null };
  contact: { phone: string | null; email: string | null; website: string | null; instagram: string | null };
  openingHours: OpeningHoursDay[];
  amenities: string[];
  trainers: { id: string; name: string; avatarUrl: string | null }[];
  staff: StudioStaffMember[];
}

export interface StudioTrainer {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  clientCount: number;
  activeClients: number;
}

export interface StudioClient {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  trainerId: string | null;
  trainerName: string | null;
  joinedAt: string;
  lastWorkoutAt: string | null;
  workoutsLast7Days: number;
  /** Per Mitglieds-Code beigetreten (braucht keinen festen Trainer) */
  studioMember: boolean;
}

export interface StudioOverview {
  /** joinCode: wiederverwendbarer Mitglieds-Code (QR an der Rezeption) */
  studio: StudioInfo & { maxTrainers: number; joinCode: string };
  trainers: StudioTrainer[];
  clients: StudioClient[];
  invitations: Invitation[];
  staff: StudioStaffMember[];
}

export interface Invitation {
  code: string;
  email: string | null;
  usedBy: string | null;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface Plan {
  id: string;
  trainerId: string;
  title: string;
  description: string | null;
  days: PlanDay[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanWithAssignments extends Plan {
  assignedClientIds: string[];
}

export interface AssignedPlan extends Plan {
  assignedAt: string;
}

export interface Workout {
  id: string;
  clientId: string;
  planId: string | null;
  title: string;
  performedAt: string;
  durationMin: number | null;
  notes: string | null;
  exercises: LoggedExercise[];
  /** Kraft: Σ Wiederholungen × kg */
  volumeKg: number;
  /** Ausdauer: Σ Minuten bzw. Kilometer */
  cardioMin: number;
  distanceKm: number;
  createdAt: string;
}

export interface Measurement {
  id: string;
  clientId: string;
  measuredAt: string;
  bodyWeightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  notes: string | null;
  createdAt: string;
}

export interface ClientSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
  lastWorkoutAt: string | null;
  workoutsLast7Days: number;
  activePlans: number;
}

export interface PersonalBest {
  exercise: string;
  weightKg: number;
  reps: number;
  achievedAt: string;
}

export interface CardioBest {
  exercise: string;
  longestDistanceKm: number | null;
  longestDurationMin: number | null;
  achievedAt: string;
}

export interface Progress {
  totalWorkouts: number;
  workoutsLast7Days: number;
  workoutsLast30Days: number;
  currentStreakWeeks: number;
  lastWorkoutAt: string | null;
  /** Pro Woche der letzten 8 Wochen (älteste zuerst): Kraftvolumen (Σ Wdh. × kg) und Ausdauer. */
  weeklyVolume: { weekStart: string; volumeKg: number; cardioMin: number; distanceKm: number; workouts: number }[];
  cardioLast30Days: { sessions: number; minutes: number; distanceKm: number };
  personalBests: PersonalBest[];
  cardioBests: CardioBest[];
  latestMeasurement: Measurement | null;
  measurements: Measurement[];
  recentWorkouts: Workout[];
}

export interface ClientDetail {
  client: ClientSummary;
  plans: AssignedPlan[];
  progress: Progress;
}

export interface Message {
  id: string;
  trainerId: string;
  clientId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface ConversationPartner {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
}

export interface Conversation {
  partner: ConversationPartner;
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  unread: number;
}

export type NoticeKind =
  | "client_deleted"
  | "trainer_deleted"
  | "client_left"
  | "client_removed"
  | "coach_changed"
  | "client_transferred"
  | "client_reassigned"
  | "trainer_joined"
  | "trainer_removed"
  | "studio_trainer_deleted"
  | "studio_deleted"
  | "appointment_requested"
  | "appointment_confirmed"
  | "appointment_declined"
  | "appointment_cancelled"
  | "appointment_booked"
  | "appointment_comment"
  | "course_assigned"
  | "course_cancelled"
  | "member_joined"
  | "member_left";

/** Hinweis, dass eine Coach–Kunde-Verbindung geendet hat (30 Tage sichtbar, wegklickbar). */
export interface Notice {
  id: string;
  kind: NoticeKind;
  /** Name der anderen Person (zum Zeitpunkt des Ereignisses). */
  actorName: string;
  /** Zusatzinfo, z. B. bei Terminen „Personal Training · Di., 18. Nov., 17:00 Uhr“. */
  detail: string | null;
  /** null = ungelesen (Zähler an der Glocke) */
  readAt: string | null;
  createdAt: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/* ------------------------------------------------------------------ */
/* Termine                                                             */
/* ------------------------------------------------------------------ */

export type AppointmentCategory = "personal_training" | "introduction" | "nutrition" | "trial" | "body_check" | "consultation" | "other";
export type AppointmentStatus = "requested" | "confirmed" | "declined" | "cancelled";
/** Ein buchbares Angebot, z. B. „Personal Training“, 60 Minuten. */
export interface BookingService {
  id: string;
  category: AppointmentCategory;
  title: string;
  durationMin: number;
  description: string | null;
}

/** Wöchentliches Zeitfenster (0 = Montag … 6 = Sonntag), Uhrzeiten in Europe/Berlin. */
export interface BookingWindow {
  day: number;
  start: string;
  end: string;
}

export interface BookingSettings {
  enabled: boolean;
  services: BookingService[];
  windows: BookingWindow[];
  /** Mindestvorlauf in Stunden */
  minNoticeHours: number;
  /** Wie viele Tage im Voraus angefragt werden kann */
  horizonDays: number;
}

/** Für Kunden: Trainer, bei denen Termine angefragt werden können (eigener Coach + Trainer des Studios). */
export interface BookingProvider {
  trainerId: string;
  name: string;
  avatarUrl: string | null;
  /** true = eigener Coach, false = anderer Trainer des Studios */
  ownCoach: boolean;
  services: BookingService[];
  horizonDays: number;
  /** Nächste freie Startzeit (kürzestes Angebot) oder null */
  nextFree: string | null;
}

export interface BookingSlotDay {
  /** YYYY-MM-DD (Europe/Berlin) */
  date: string;
  /** Startzeitpunkte als ISO-String */
  slots: string[];
}

export interface Appointment {
  id: string;
  trainer: { id: string; name: string; avatarUrl: string | null };
  /** null bei Gästen ohne Konto (vom Studio eingetragen) */
  client: { id: string; name: string; avatarUrl: string | null } | null;
  guestName: string | null;
  createdBy: "client" | "trainer" | "studio";
  category: AppointmentCategory;
  title: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  clientNote: string | null;
  responseNote: string | null;
  cancelledBy: "client" | "provider" | "studio" | "system" | null;
  /** Private Notiz – nur für den Trainer selbst, sonst null */
  trainerNote: string | null;
  commentCount: number;
  /**
   * Kontaktdaten des Kunden/Gastes – nur für Trainer und Studio, sonst null.
   * Beim Termin hinterlegte Werte haben Vorrang vor dem Profil.
   */
  contact: AppointmentContact | null;
  /** Darf der Nutzer die Kontaktdaten am Termin pflegen? (wer ihn eingetragen hat) */
  canEditContact: boolean;
  createdAt: string;
}

export interface AppointmentContact {
  email: string | null;
  phone: string | null;
  /** true = Wert stammt aus dem Profil des Kunden, false = beim Termin hinterlegt */
  emailFromProfile: boolean;
  phoneFromProfile: boolean;
  /** Beim Termin hinterlegte Werte (zum Bearbeiten) */
  overrideEmail: string | null;
  overridePhone: string | null;
}

export interface AppointmentComment {
  id: string;
  author: { id: string | null; name: string; role: "client" | "trainer" | "studio"; avatarUrl: string | null };
  body: string;
  createdAt: string;
  /** Eigener Kommentar (darf gelöscht werden) */
  mine: boolean;
}

/** Wochenkalender für Studios (alle Trainer) und Trainer (nur sich selbst). */
export interface Schedule {
  /** Montag der Woche, YYYY-MM-DD */
  weekStart: string;
  trainers: {
    id: string;
    name: string;
    avatarUrl: string | null;
    enabled: boolean;
    windows: BookingWindow[];
    services: BookingService[];
  }[];
  /** Kunden, für die der Nutzer Termine eintragen darf (inkl. Kontaktdaten aus dem Profil) */
  clients: { id: string; name: string; email: string; phone: string | null }[];
  appointments: Appointment[];
  /** Kurstermine der Woche (Studio: alle, Trainer: eigene) */
  courseSessions: (CourseSession & { title: string; trainerId: string | null; location: string | null })[];
}

/* ------------------------------------------------------------------ */
/* Kurse                                                               */
/* ------------------------------------------------------------------ */

/** Wöchentlicher Kurstermin (0 = Montag … 6 = Sonntag), Beginn in Ortszeit Europe/Berlin. */
export interface CourseSlot {
  day: number;
  start: string;
}

export interface Course {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  location: string | null;
  /** Plätze pro Termin */
  capacity: number;
  durationMin: number;
  schedule: CourseSlot[];
  /** Optionaler Zeitraum (YYYY-MM-DD) */
  startsOn: string | null;
  endsOn: string | null;
  active: boolean;
  trainer: { id: string; name: string; avatarUrl: string | null } | null;
}

export interface CourseSession {
  courseId: string;
  startsAt: string;
  endsAt: string;
  booked: number;
  capacity: number;
  /** Nur für Kunden: selbst angemeldet */
  bookedByMe: boolean;
}

/** Kurs inkl. der nächsten Termine (4 Wochen) */
export interface CourseWithSessions extends Course {
  sessions: CourseSession[];
}

export interface CourseParticipant {
  id: string;
  name: string;
  avatarUrl: string | null;
  bookedAt: string;
}

export interface MyCourseBooking {
  id: string;
  course: { id: string; title: string; imageUrl: string | null; location: string | null; trainerName: string | null };
  startsAt: string;
  endsAt: string;
}
