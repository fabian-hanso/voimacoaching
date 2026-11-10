import { z } from "zod";

// Deutsche Standard-Fehlermeldungen (z. B. „Ungültige Eingabe: erwartet Array, erhalten undefined“)
z.config(z.locales.de());

/** Gemeinsame Validierungsschemas für die API (auch im Client nutzbar). */

export const roleSchema = z.enum(["trainer", "client", "studio"]);

export const registerSchema = z.object({
  email: z.email("Ungültige E-Mail-Adresse."),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben.").max(200),
  name: z.string().trim().min(1, "Name fehlt.").max(100),
  role: roleSchema,
  inviteCode: z.string().trim().toUpperCase().optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/** Telefonnummer: optional, leer → null */
export const phoneSchema = z
  .string()
  .trim()
  .max(40)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .refine((v) => v == null || /^[+0-9][0-9 /()-]{3,39}$/.test(v), "Ungültige Telefonnummer.");

/** E-Mail: optional, leer → null */
export const optEmailSchema = z
  .string()
  .trim()
  .max(254)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .refine((v) => v == null || z.email().safeParse(v).success, "Ungültige E-Mail-Adresse.");

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: phoneSchema,
});

export const joinTrainerSchema = z.object({
  inviteCode: z.string().trim().toUpperCase().min(1),
});

export const createInvitationSchema = z.object({
  email: z.email().optional(),
  validDays: z.number().int().min(1).max(90).default(14),
});

export const exerciseTypeSchema = z.enum(["strength", "cardio"]);

const optNum = (min: number, max: number, int = false) =>
  (int ? z.number().int() : z.number()).min(min).max(max).nullable().optional();

/**
 * Übung im Plan.
 *  - Kraft  (type "strength", Standard): sets + reps (+ weightKg, restSec)
 *  - Cardio (type "cardio"): durationMin und/oder distanceKm, optional intensity ("Zone 2", "Steigung 8 %")
 */
export const planExerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    type: exerciseTypeSchema.default("strength"),
    sets: z.number().int().min(1).max(20).nullable().optional(),
    reps: z.string().trim().max(30).nullable().optional(), // z. B. "8", "8-10", "AMRAP", "30s"
    weightKg: optNum(0, 1000),
    restSec: optNum(0, 1800, true),
    durationMin: optNum(1, 1440),
    distanceKm: optNum(0.01, 1000),
    intensity: z.string().trim().max(100).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine((e) => e.type !== "strength" || (e.sets != null && !!e.reps), {
    message: "Kraftübungen brauchen Sätze und Wiederholungen.",
    path: ["sets"],
  })
  .refine((e) => e.type !== "cardio" || e.durationMin != null || e.distanceKm != null, {
    message: "Ausdauerübungen brauchen eine Dauer oder Distanz.",
    path: ["durationMin"],
  });

export const planDaySchema = z.object({
  name: z.string().trim().min(1).max(80),
  exercises: z.array(planExerciseSchema).max(40),
});

export const planInputSchema = z.object({
  title: z.string().trim().min(1, "Titel fehlt.").max(120),
  description: z.string().max(2000).nullable().optional(),
  days: z.array(planDaySchema).min(1, "Mindestens ein Trainingstag.").max(14),
});

export const assignPlanSchema = z.object({
  clientId: z.string().min(1),
});

export const loggedSetSchema = z.object({
  reps: z.number().int().min(0).max(1000),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
});

/**
 * Geloggte Übung.
 *  - Kraft:  sets[] mit reps/weightKg
 *  - Cardio: Messwerte (mind. Dauer oder Distanz), sets bleibt leer
 */
export const loggedExerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    type: exerciseTypeSchema.default("strength"),
    sets: z.array(loggedSetSchema).max(30).default([]),
    durationMin: optNum(0, 1440),
    distanceKm: optNum(0, 1000),
    avgHeartRate: optNum(30, 250, true),
    calories: optNum(0, 10000, true),
    inclinePct: optNum(-10, 40),
    avgWatts: optNum(0, 2000),
    level: optNum(0, 50),
  })
  .refine((e) => e.type !== "cardio" || e.durationMin != null || e.distanceKm != null, {
    message: "Ausdauerübungen brauchen eine Dauer oder Distanz.",
    path: ["durationMin"],
  });

export const workoutInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  planId: z.string().nullable().optional(),
  performedAt: z.iso.datetime({ offset: true }).optional(),
  durationMin: z.number().int().min(0).max(600).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  exercises: z.array(loggedExerciseSchema).min(1).max(40),
});

export const measurementInputSchema = z
  .object({
    measuredAt: z.iso.datetime({ offset: true }).optional(),
    bodyWeightKg: z.number().min(20).max(400).nullable().optional(),
    bodyFatPct: z.number().min(2).max(70).nullable().optional(),
    waistCm: z.number().min(30).max(250).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((m) => m.bodyWeightKg != null || m.bodyFatPct != null || m.waistCm != null, {
    message: "Mindestens ein Messwert wird benötigt.",
  });

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, "Nachricht ist leer.").max(4000, "Nachricht ist zu lang (max. 4000 Zeichen)."),
});

export const featureRequestSchema = z.object({
  body: z.string().trim().min(3, "Beschreibe deinen Wunsch in ein paar Worten.").max(2000, "Bitte maximal 2000 Zeichen."),
  area: z.enum(["plans", "clients", "tracking", "chat", "billing", "other"]).nullable().optional(),
  importance: z.enum(["nice", "important", "essential"]).nullable().optional(),
  /** Herkunft im UI, z. B. „Plan-Editor“ – wird automatisch mitgeschickt */
  context: z.string().trim().max(200).nullable().optional(),
});

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit im Format HH:MM.");
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const openingHoursDaySchema = z
  .object({ day: z.number().int().min(0).max(6), closed: z.boolean(), open: hhmm, close: hhmm })
  .refine((d) => d.closed || d.open < d.close, { message: "„Bis“ muss nach „Von“ liegen.", path: ["close"] });

/** Studio bearbeiten (Inhaber). Alle Felder optional; leere Texte werden zu null. */
export const studioUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt.").max(100).optional(),
  description: optText(1000),
  street: optText(120),
  postalCode: optText(12),
  city: optText(80),
  phone: optText(40).refine((v) => v == null || /^[+\d][\d\s/()-]{3,}$/.test(v), "Ungültige Telefonnummer."),
  email: optText(254).refine((v) => v == null || z.email().safeParse(v).success, "Ungültige E-Mail-Adresse."),
  website: optText(300).refine((v) => v == null || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), "Website muss mit http:// oder https:// beginnen."),
  instagram: optText(31)
    .transform((v) => (v == null ? v : v.replace(/^@/, "")))
    .refine((v) => v == null || /^[A-Za-z0-9._]{1,30}$/.test(v), "Ungültiger Instagram-Name."),
  openingHours: z
    .array(openingHoursDaySchema)
    .max(7)
    .refine((a) => new Set(a.map((d) => d.day)).size === a.length, "Jeder Wochentag darf nur einmal vorkommen.")
    .optional(),
  amenities: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const staffInputSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt.").max(100),
  category: z.enum(["management", "service", "other"]),
  position: optText(80),
  bio: optText(300),
});
export const staffUpdateSchema = staffInputSchema.partial();
export type StaffInput = z.infer<typeof staffInputSchema>;

export type StudioUpdateInput = z.infer<typeof studioUpdateSchema>;

export const studioInvitationSchema = z.object({
  email: z.email().optional(),
  validDays: z.number().int().min(1).max(90).default(14),
});

export const assignTrainerSchema = z.object({ trainerId: z.string().min(1) });
export const transferTrainerSchema = z.object({ toTrainerId: z.string().min(1) });
export const joinStudioSchema = z.object({ code: z.string().trim().toUpperCase().min(1) });

export type FeatureRequestInput = z.infer<typeof featureRequestSchema>;

export type PlanInput = z.infer<typeof planInputSchema>;
export type PlanDay = z.infer<typeof planDaySchema>;
export type PlanExercise = z.infer<typeof planExerciseSchema>;
export type WorkoutInput = z.infer<typeof workoutInputSchema>;
export type LoggedExercise = z.infer<typeof loggedExerciseSchema>;
export type ExerciseType = z.infer<typeof exerciseTypeSchema>;
export type MeasurementInput = z.infer<typeof measurementInputSchema>;

/* ------------------------------------------------------------------ */
/* Termine                                                             */
/* ------------------------------------------------------------------ */

export const appointmentCategorySchema = z.enum(["personal_training", "introduction", "nutrition", "trial", "body_check", "consultation", "other"]);

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export const bookingServiceSchema = z.object({
  id: z.string().trim().min(1).max(40).optional(),
  category: appointmentCategorySchema,
  title: z.string().trim().min(1, "Titel fehlt.").max(80),
  durationMin: z.number().int().min(15, "Mindestens 15 Minuten.").max(240, "Höchstens 4 Stunden.").multipleOf(15, "In 15-Minuten-Schritten."),
  description: optText(300),
});

export const bookingWindowSchema = z
  .object({ day: z.number().int().min(0).max(6), start: hhmm, end: hhmm })
  .refine((w) => w.start < w.end, { message: "„Bis“ muss nach „Von“ liegen.", path: ["end"] });

export const bookingSettingsSchema = z.object({
  enabled: z.boolean(),
  services: z.array(bookingServiceSchema).max(12, "Höchstens 12 Angebote."),
  windows: z
    .array(bookingWindowSchema)
    .max(35, "Höchstens 35 Zeitfenster.")
    .refine((ws) => {
      const sorted = [...ws].sort((a, b) => a.day - b.day || toMin(a.start) - toMin(b.start));
      return sorted.every((w, i) => i === 0 || sorted[i - 1].day !== w.day || toMin(sorted[i - 1].end) <= toMin(w.start));
    }, "Zeitfenster am selben Tag dürfen sich nicht überschneiden."),
  minNoticeHours: z.number().int().min(0).max(168),
  horizonDays: z.number().int().min(1).max(90),
});
export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>;

export const appointmentRequestSchema = z.object({
  trainerId: z.string().min(1),
  serviceId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }),
  note: optText(500),
});
export type AppointmentRequestInput = z.infer<typeof appointmentRequestSchema>;

/** Studio (bei einem seiner Trainer) oder Trainer (bei sich) trägt einen Termin ein – sofort bestätigt. */
export const studioAppointmentSchema = z
  .object({
    /** Für Studios Pflicht; Trainer tragen immer bei sich selbst ein */
    trainerId: z.string().min(1).optional(),
    clientId: z.string().min(1).nullable().optional(),
    guestName: optText(100),
    category: appointmentCategorySchema,
    title: z.string().trim().min(1, "Titel fehlt.").max(80),
    durationMin: z.number().int().min(15).max(240).multipleOf(15, "In 15-Minuten-Schritten."),
    startsAt: z.iso.datetime({ offset: true }),
    note: optText(500),
    /** Abweichend vom Profil bzw. für Gäste */
    contactEmail: optEmailSchema,
    contactPhone: phoneSchema,
  })
  .refine((v) => !!v.clientId !== !!v.guestName, { message: "Wähle einen Kunden oder gib den Namen eines Gastes an.", path: ["clientId"] });
export type StudioAppointmentInput = z.infer<typeof studioAppointmentSchema>;

/** Termin verschieben (Trainer/Studio): neuer Start, optional neue Dauer */
export const appointmentMoveSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  durationMin: z.number().int().min(15).max(240).multipleOf(15, "In 15-Minuten-Schritten.").optional(),
});

/** Kontaktdaten am Termin (null/leer = aus dem Profil übernehmen) */
export const appointmentContactSchema = z.object({ email: optEmailSchema, phone: phoneSchema });

/* ------------------------------------------------------------------ */
/* Kurse                                                               */
/* ------------------------------------------------------------------ */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format JJJJ-MM-TT.");

export const courseSlotSchema = z.object({ day: z.number().int().min(0).max(6), start: hhmm });

export const courseInputSchema = z
  .object({
    title: z.string().trim().min(1, "Titel fehlt.").max(80),
    category: optText(40),
    description: optText(2000),
    location: optText(80),
    trainerId: z.string().min(1).nullable().optional(),
    capacity: z.number().int().min(1, "Mindestens 1 Platz.").max(500, "Höchstens 500 Plätze."),
    durationMin: z.number().int().min(15).max(240).multipleOf(15, "In 15-Minuten-Schritten."),
    schedule: z
      .array(courseSlotSchema)
      .min(1, "Lege mindestens einen Kurstermin (Tag & Uhrzeit) fest.")
      .max(21)
      .refine((s) => new Set(s.map((x) => `${x.day}-${x.start}`)).size === s.length, "Ein Kurstermin ist doppelt."),
    startsOn: isoDate.nullable().optional(),
    endsOn: isoDate.nullable().optional(),
    active: z.boolean().default(true),
  })
  .refine((c) => !c.startsOn || !c.endsOn || c.endsOn >= c.startsOn, { message: "„Bis“ muss nach „Ab“ liegen.", path: ["endsOn"] });
export type CourseInput = z.infer<typeof courseInputSchema>;

export const courseBookingSchema = z.object({ startsAt: z.iso.datetime({ offset: true }) });

export const appointmentCommentSchema = z.object({ body: z.string().trim().min(1, "Kommentar ist leer.").max(1000) });
export const trainerNoteSchema = z.object({ note: z.string().trim().max(2000).transform((v) => v || null).nullable() });

export const appointmentActionSchema = z.object({
  action: z.enum(["confirm", "decline", "cancel"]),
  message: optText(500),
});

/* Abrechnung */
export const checkoutSchema = z.object({
  plan: z.enum(["trainer_10", "trainer_20", "trainer_unlimited", "studio"]),
  interval: z.enum(["month", "year"]),
});
