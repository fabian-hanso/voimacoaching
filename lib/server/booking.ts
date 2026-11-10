import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../supabase/admin";
import { ApiError, badRequest, conflict, forbidden, notFound } from "./http";
import { addNotice, avatarUrl, iso, must, ownStudio, studioOf, type ProfileRow } from "./repo";
import { addDays, computeSlots, DAY, MIN, TZ, toMin, weekday, zonedToUtc } from "../booking-time";
import { courseSessionsForWeek } from "./courses";
import type { AppointmentRequestInput, BookingSettingsInput, StudioAppointmentInput } from "../schemas";
import type {
  Appointment,
  AppointmentCategory,
  AppointmentComment,
  AppointmentStatus,
  BookingProvider,
  BookingService,
  BookingSettings,
  BookingSlotDay,
  BookingWindow,
  NoticeKind,
  Schedule,
} from "../types";

/**
 * Termine laufen immer über Trainer (eigene Angebote & Zeitfenster).
 * - Kunden fragen beim eigenen Coach an – Kunden eines Studios zusätzlich bei jedem Trainer des Studios.
 * - Trainer bestätigen/lehnen ab; Kunden und Trainer können absagen.
 * - Studios sehen alle Termine ihrer Trainer, tragen Termine ein (sofort bestätigt) und sagen ab.
 * Zeitfenster gelten in deutscher Ortszeit (Europe/Berlin); die API arbeitet mit ISO-Zeitpunkten.
 */

const sb = () => supabaseAdmin();
/** Offene Anfragen pro Kunde und Trainer (Schutz vor Spam) */
const MAX_OPEN_REQUESTS = 3;
const ACTIVE: AppointmentStatus[] = ["requested", "confirmed"];

const detailFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
/** „Personal Training · Di., 18. Nov., 17:00 Uhr“ */
const noticeDetail = (title: string, startsAt: string) => `${title} · ${detailFmt.format(new Date(startsAt))} Uhr`;

/* ------------------------------------------------------------------ */
/* Buchungsprofile (Angebote & Zeitfenster) – je Trainer               */
/* ------------------------------------------------------------------ */

interface BookingProfileRow {
  id: string;
  trainer_id: string;
  enabled: boolean;
  services: BookingService[];
  windows: BookingWindow[];
  min_notice_h: number;
  horizon_days: number;
}

const DEFAULT_SETTINGS: BookingSettings = { enabled: false, services: [], windows: [], minNoticeHours: 12, horizonDays: 28 };

const toSettings = (r: BookingProfileRow | null | undefined): BookingSettings =>
  r
    ? { enabled: r.enabled, services: r.services ?? [], windows: r.windows ?? [], minNoticeHours: r.min_notice_h, horizonDays: r.horizon_days }
    : DEFAULT_SETTINGS;

async function loadProfiles(trainerIds: string[]): Promise<Map<string, BookingSettings>> {
  if (!trainerIds.length) return new Map();
  const rows = must(await sb().from("booking_profiles").select("*").in("trainer_id", trainerIds)) as BookingProfileRow[];
  return new Map(rows.map((r) => [r.trainer_id, toSettings(r)]));
}

function requireTrainer(user: ProfileRow) {
  if (user.role !== "trainer") throw forbidden("Angebote und Zeitfenster pflegt jeder Trainer selbst.");
}

export async function getBookingSettings(user: ProfileRow): Promise<BookingSettings> {
  requireTrainer(user);
  return (await loadProfiles([user.id])).get(user.id) ?? DEFAULT_SETTINGS;
}

export async function saveBookingSettings(user: ProfileRow, input: BookingSettingsInput): Promise<BookingSettings> {
  requireTrainer(user);
  if (input.enabled && !input.services.length) throw badRequest("Lege mindestens ein Angebot an, bevor du Termine freischaltest.");
  if (input.enabled && !input.windows.length) throw badRequest("Lege mindestens ein Zeitfenster an, bevor du Termine freischaltest.");
  const services: BookingService[] = input.services.map((s) => ({
    id: s.id ?? randomUUID(),
    category: s.category,
    title: s.title,
    durationMin: s.durationMin,
    description: s.description ?? null,
  }));
  if (new Set(services.map((s) => s.id)).size !== services.length) throw badRequest("Angebote sind doppelt.");
  const windows = [...input.windows].sort((a, b) => a.day - b.day || toMin(a.start) - toMin(b.start));
  const row = must(
    await sb()
      .from("booking_profiles")
      .upsert(
        {
          trainer_id: user.id,
          enabled: input.enabled,
          services,
          windows,
          min_notice_h: input.minNoticeHours,
          horizon_days: input.horizonDays,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "trainer_id" },
      )
      .select()
      .single<BookingProfileRow>(),
  );
  return toSettings(row);
}

/* ------------------------------------------------------------------ */
/* Buchbare Trainer aus Sicht des Kunden                               */
/* ------------------------------------------------------------------ */

interface TrainerLite {
  id: string;
  name: string;
  avatar_path: string | null;
  studio_id: string | null;
}

/** Eigener Coach + (bei Studio-Kunden) alle Trainer des Studios. Eigener Coach zuerst. */
async function bookableTrainers(client: ProfileRow): Promise<TrainerLite[]> {
  if (client.role !== "client") throw forbidden("Nur Kunden können Termine anfragen.");
  const filters = [client.trainer_id ? `id.eq.${client.trainer_id}` : null, client.studio_id ? `studio_id.eq.${client.studio_id}` : null].filter(Boolean);
  if (!filters.length) return [];
  const rows = must(
    await sb().from("profiles").select("id, name, avatar_path, studio_id").eq("role", "trainer").or(filters.join(",")).order("name"),
  ) as TrainerLite[];
  return rows.sort((a, b) => Number(b.id === client.trainer_id) - Number(a.id === client.trainer_id));
}

async function busyRanges(trainerIds: string[], fromMs: number): Promise<Map<string, [number, number][]>> {
  const map = new Map<string, [number, number][]>(trainerIds.map((id) => [id, []]));
  if (!trainerIds.length) return map;
  const rows = must(
    await sb()
      .from("appointments")
      .select("trainer_id, starts_at, ends_at")
      .in("trainer_id", trainerIds)
      .in("status", ACTIVE)
      .gt("ends_at", new Date(fromMs).toISOString()),
  ) as { trainer_id: string; starts_at: string; ends_at: string }[];
  for (const r of rows) map.get(r.trainer_id)?.push([Date.parse(r.starts_at), Date.parse(r.ends_at)]);
  return map;
}

/** Trainer, bei denen der Kunde Termine anfragen kann – inkl. Angebote und nächster freier Zeit. */
export async function listBookingProviders(client: ProfileRow): Promise<BookingProvider[]> {
  const trainers = await bookableTrainers(client);
  const profiles = await loadProfiles(trainers.map((t) => t.id));
  const offering = trainers.filter((t) => profiles.get(t.id)?.enabled && profiles.get(t.id)!.services.length);
  const now = Date.now();
  const busy = await busyRanges(
    offering.map((t) => t.id),
    now,
  );
  return offering.map((t) => {
    const settings = profiles.get(t.id)!;
    const shortest = Math.min(...settings.services.map((s) => s.durationMin));
    const next = computeSlots(settings, shortest, busy.get(t.id) ?? [], now).find((d) => d.slots.length)?.slots[0] ?? null;
    return {
      trainerId: t.id,
      name: t.name,
      avatarUrl: avatarUrl(t.avatar_path),
      ownCoach: t.id === client.trainer_id,
      services: settings.services,
      horizonDays: settings.horizonDays,
      nextFree: next,
    };
  });
}

async function requireBookable(client: ProfileRow, trainerId: string) {
  const trainer = (await bookableTrainers(client)).find((t) => t.id === trainerId);
  if (!trainer) throw notFound("Bei diesem Trainer kannst du keine Termine anfragen.");
  const settings = (await loadProfiles([trainer.id])).get(trainer.id);
  if (!settings?.enabled) throw notFound(`${trainer.name} bietet aktuell keine Termine an.`);
  return { trainer, settings };
}

export async function getSlots(client: ProfileRow, trainerId: string, serviceId: string): Promise<BookingSlotDay[]> {
  const { trainer, settings } = await requireBookable(client, trainerId);
  const service = settings.services.find((s) => s.id === serviceId);
  if (!service) throw notFound("Dieses Angebot gibt es nicht mehr.");
  const now = Date.now();
  return computeSlots(settings, service.durationMin, (await busyRanges([trainer.id], now)).get(trainer.id) ?? [], now);
}

/* ------------------------------------------------------------------ */
/* Termine                                                             */
/* ------------------------------------------------------------------ */

interface AppointmentRow {
  id: string;
  trainer_id: string;
  client_id: string | null;
  guest_name: string | null;
  created_by: Appointment["createdBy"];
  category: AppointmentCategory;
  title: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  client_note: string | null;
  response_note: string | null;
  cancelled_by: Appointment["cancelledBy"];
  trainer_note: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

/** Kontaktdaten sehen nur der Trainer des Termins und das Studio (Listen sind bereits aufs Studio beschränkt). */
const seesContact = (viewer: ProfileRow, r: AppointmentRow) => (viewer.role === "trainer" && viewer.id === r.trainer_id) || viewer.role === "studio";
/** Pflegen darf, wer den Termin eingetragen hat. */
const canEditContact = (viewer: ProfileRow, r: AppointmentRow) =>
  (r.created_by === "trainer" && viewer.role === "trainer" && viewer.id === r.trainer_id) || (r.created_by === "studio" && viewer.role === "studio");

/**
 * Ergänzt Namen/Bilder von Kunden und Trainern sowie die Anzahl der Kommentare (je eine Abfrage für alle).
 * Die private Trainer-Notiz bekommt nur der Trainer selbst.
 */
async function toAppointments(rows: AppointmentRow[], viewer: ProfileRow): Promise<Appointment[]> {
  const ids = [...new Set(rows.flatMap((r) => [r.client_id, r.trainer_id]).filter((x): x is string => !!x))];
  const apptIds = rows.map((r) => r.id);
  const [profiles, comments] = await Promise.all([
    ids.length
      ? (must(await sb().from("profiles").select("id, name, avatar_path, email, phone").in("id", ids)) as {
          id: string;
          name: string;
          avatar_path: string | null;
          email: string;
          phone: string | null;
        }[])
      : [],
    apptIds.length
      ? (must(await sb().from("appointment_comments").select("appointment_id").in("appointment_id", apptIds)) as { appointment_id: string }[])
      : [],
  ]);
  const p = new Map(profiles.map((x) => [x.id, x]));
  const counts = new Map<string, number>();
  for (const c of comments) counts.set(c.appointment_id, (counts.get(c.appointment_id) ?? 0) + 1);
  return rows.map((r) => {
    const client = r.client_id ? p.get(r.client_id) : null;
    const trainer = p.get(r.trainer_id);
    return {
      id: r.id,
      trainer: { id: r.trainer_id, name: trainer?.name ?? "Trainer", avatarUrl: avatarUrl(trainer?.avatar_path) },
      client: r.client_id ? { id: r.client_id, name: client?.name ?? "Kunde", avatarUrl: avatarUrl(client?.avatar_path) } : null,
      guestName: r.guest_name,
      createdBy: r.created_by,
      category: r.category,
      title: r.title,
      startsAt: iso(r.starts_at),
      endsAt: iso(r.ends_at),
      status: r.status,
      clientNote: r.client_note,
      responseNote: r.response_note,
      cancelledBy: r.cancelled_by,
      trainerNote: viewer.role === "trainer" && viewer.id === r.trainer_id ? r.trainer_note : null,
      contact: seesContact(viewer, r)
        ? {
            email: r.contact_email ?? client?.email ?? null,
            phone: r.contact_phone ?? client?.phone ?? null,
            emailFromProfile: !r.contact_email && !!client?.email,
            phoneFromProfile: !r.contact_phone && !!client?.phone,
            overrideEmail: r.contact_email,
            overridePhone: r.contact_phone,
          }
        : null,
      canEditContact: canEditContact(viewer, r),
      commentCount: counts.get(r.id) ?? 0,
      createdAt: iso(r.created_at),
    };
  });
}

async function studioTrainerIds(studioId: string): Promise<string[]> {
  const rows = must(await sb().from("profiles").select("id").eq("studio_id", studioId).eq("role", "trainer")) as { id: string }[];
  return rows.map((r) => r.id);
}

/** Kunden: eigene Termine · Trainer: bei sich · Studio: bei allen eigenen Trainern. Kommende + letzte 30 Tage. */
export async function listAppointments(user: ProfileRow): Promise<Appointment[]> {
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  let query = sb().from("appointments").select("*").gt("ends_at", since).order("starts_at").limit(500);
  if (user.role === "client") query = query.eq("client_id", user.id);
  else if (user.role === "trainer") query = query.eq("trainer_id", user.id);
  else {
    const ids = await studioTrainerIds((await ownStudio(user)).id);
    if (!ids.length) return [];
    query = query.in("trainer_id", ids);
  }
  return toAppointments(must(await query) as AppointmentRow[], user);
}

export async function requestAppointment(client: ProfileRow, input: AppointmentRequestInput): Promise<Appointment> {
  const { trainer, settings } = await requireBookable(client, input.trainerId);
  const service = settings.services.find((s) => s.id === input.serviceId);
  if (!service) throw notFound("Dieses Angebot gibt es nicht mehr.");

  const startMs = Date.parse(input.startsAt);
  const now = Date.now();
  const { count } = await sb()
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", client.id)
    .eq("trainer_id", trainer.id)
    .eq("status", "requested")
    .gt("starts_at", new Date(now).toISOString());
  if ((count ?? 0) >= MAX_OPEN_REQUESTS) {
    throw new ApiError(429, "too_many_requests", `Du hast schon ${MAX_OPEN_REQUESTS} offene Anfragen bei ${trainer.name}. Warte bitte auf eine Antwort.`);
  }
  // Nur Zeiten, die auch tatsächlich angeboten werden (Fenster, Vorlauf, frei)
  const days = computeSlots(settings, service.durationMin, (await busyRanges([trainer.id], now)).get(trainer.id) ?? [], now);
  if (!days.some((d) => d.slots.some((s) => Date.parse(s) === startMs))) {
    throw conflict("Diese Uhrzeit ist nicht (mehr) verfügbar. Bitte wähle eine andere.");
  }

  const row = must(
    await sb()
      .from("appointments")
      .insert({
        trainer_id: trainer.id,
        client_id: client.id,
        created_by: "client",
        service_id: service.id,
        category: service.category,
        title: service.title,
        starts_at: new Date(startMs).toISOString(),
        ends_at: new Date(startMs + service.durationMin * MIN).toISOString(),
        client_note: input.note ?? null,
      })
      .select()
      .single<AppointmentRow>(),
  );
  await addNotice(trainer.id, "appointment_requested", client.name, noticeDetail(row.title, row.starts_at));
  return (await toAppointments([row], client))[0];
}

/** Termin laden und prüfen, ob der Nutzer beteiligt ist (Kunde, Trainer oder Studio des Trainers) – sonst 404. */
async function accessAppointment(user: ProfileRow, id: string) {
  const row = must(await sb().from("appointments").select("*").eq("id", id).maybeSingle<AppointmentRow>());
  if (!row) throw notFound("Termin nicht gefunden.");
  const isClient = user.role === "client" && row.client_id === user.id;
  const isTrainer = user.role === "trainer" && row.trainer_id === user.id;
  let isStudio = false;
  let actorName = user.name;
  let studioOwnerId: string | null = null;
  if (user.role === "studio") {
    const studio = await studioOf(user);
    if (studio && studio.owner_id === user.id) {
      const t = must(await sb().from("profiles").select("studio_id").eq("id", row.trainer_id).maybeSingle()) as { studio_id: string | null } | null;
      isStudio = t?.studio_id === studio.id;
      actorName = studio.name;
      studioOwnerId = studio.owner_id;
    }
  }
  if (!isClient && !isTrainer && !isStudio) throw notFound("Termin nicht gefunden.");
  return { row, isClient, isTrainer, isStudio, actorName, studioOwnerId };
}

export async function actOnAppointment(
  user: ProfileRow,
  id: string,
  action: "confirm" | "decline" | "cancel",
  message: string | null | undefined,
): Promise<Appointment> {
  const { row, isClient, isTrainer, isStudio, actorName } = await accessAppointment(user, id);

  const now = Date.now();
  if (Date.parse(row.ends_at) <= now) throw badRequest("Der Termin liegt in der Vergangenheit.");
  let next: AppointmentStatus;
  if (action === "cancel") {
    if (!ACTIVE.includes(row.status)) throw conflict("Der Termin ist bereits abgesagt oder abgelehnt.");
    next = "cancelled";
  } else {
    if (!isTrainer) throw forbidden("Nur der Trainer kann Anfragen bestätigen oder ablehnen.");
    if (row.status !== "requested") throw conflict("Die Anfrage wurde bereits beantwortet oder zurückgezogen.");
    if (action === "confirm" && Date.parse(row.starts_at) <= now) throw badRequest("Der Termin hat bereits begonnen.");
    next = action === "confirm" ? "confirmed" : "declined";
  }

  const updated = must(
    await sb()
      .from("appointments")
      .update({
        status: next,
        updated_at: new Date().toISOString(),
        ...(!isClient && message !== undefined ? { response_note: message } : {}),
        ...(isClient && message ? { client_note: message } : {}),
        ...(next === "cancelled" ? { cancelled_by: isClient ? "client" : isStudio ? "studio" : "provider" } : {}),
      })
      .eq("id", row.id)
      .eq("status", row.status) // gleichzeitige Änderung erkennen
      .select(),
  ) as AppointmentRow[];
  if (!updated.length) throw conflict("Der Termin wurde gerade geändert. Bitte lade die Seite neu.");

  // Beteiligte informieren (außer der handelnden Person)
  const kinds = { confirmed: "appointment_confirmed", declined: "appointment_declined", cancelled: "appointment_cancelled" } as const;
  const kind: NoticeKind = kinds[next as keyof typeof kinds];
  const detail = noticeDetail(row.title, row.starts_at);
  if (!isTrainer) await addNotice(row.trainer_id, kind, actorName, detail);
  if (!isClient && row.client_id) await addNotice(row.client_id, kind, actorName, detail);
  return (await toAppointments(updated, user))[0];
}

/* ------------------------------------------------------------------ */
/* Wochenkalender (Studio: alle Trainer · Trainer: sich selbst)         */
/* ------------------------------------------------------------------ */

/** Montag (Europe/Berlin) der Woche, in der `date` liegt. */
const mondayOf = (date: string) => addDays(date, -weekday(date));

/** Trainer, deren Kalender der Nutzer sieht, und Kunden, für die er Termine eintragen darf. */
async function calendarScope(user: ProfileRow) {
  if (user.role === "studio") {
    const studio = await ownStudio(user);
    const [trainers, clients] = await Promise.all([
      sb().from("profiles").select("id, name, avatar_path").eq("studio_id", studio.id).eq("role", "trainer").order("name").then(must),
      sb().from("profiles").select("id, name, email, phone").eq("studio_id", studio.id).eq("role", "client").order("name").then(must),
    ]);
    return {
      studio,
      trainers: trainers as { id: string; name: string; avatar_path: string | null }[],
      clients: clients as Schedule["clients"],
    };
  }
  if (user.role === "trainer") {
    // eigene Kunden + (im Studio) alle Kunden des Studios
    const filter = [`trainer_id.eq.${user.id}`, user.studio_id ? `studio_id.eq.${user.studio_id}` : null].filter(Boolean).join(",");
    const clients = must(await sb().from("profiles").select("id, name, email, phone").eq("role", "client").or(filter).order("name")) as Schedule["clients"];
    return { studio: null, trainers: [{ id: user.id, name: user.name, avatar_path: user.avatar_path }], clients };
  }
  throw forbidden("Den Kalender gibt es für Trainer und Studios.");
}

export async function getSchedule(user: ProfileRow, weekOf: string | null): Promise<Schedule> {
  const { trainers, clients } = await calendarScope(user);
  const valid = !!weekOf && /^\d{4}-\d{2}-\d{2}$/.test(weekOf) && !Number.isNaN(Date.parse(weekOf));
  const weekStart = mondayOf(valid ? weekOf : new Date().toISOString().slice(0, 10));
  const ids = trainers.map((t) => t.id);
  const profiles = await loadProfiles(ids);
  const rows = ids.length
    ? (must(
        await sb()
          .from("appointments")
          .select("*")
          .in("trainer_id", ids)
          .gte("starts_at", new Date(zonedToUtc(weekStart, 0)).toISOString())
          .lt("starts_at", new Date(zonedToUtc(addDays(weekStart, 7), 0)).toISOString())
          .order("starts_at"),
      ) as AppointmentRow[])
    : [];
  return {
    weekStart,
    trainers: trainers.map((t) => {
      const s = profiles.get(t.id) ?? DEFAULT_SETTINGS;
      return { id: t.id, name: t.name, avatarUrl: avatarUrl(t.avatar_path), enabled: s.enabled, windows: s.windows, services: s.services };
    }),
    clients,
    appointments: await toAppointments(rows, user),
    courseSessions: await courseSessionsForWeek(user, weekStart),
  };
}

/**
 * Termin direkt eintragen (sofort bestätigt):
 * Studio bei einem seiner Trainer, Trainer bei sich selbst – für erlaubte Kunden oder Gäste ohne Konto.
 */
export async function createDirectAppointment(user: ProfileRow, input: StudioAppointmentInput): Promise<Appointment> {
  const { studio, trainers, clients } = await calendarScope(user);
  const trainerId = user.role === "trainer" ? user.id : input.trainerId;
  const trainer = trainers.find((t) => t.id === trainerId);
  if (!trainer) throw badRequest(user.role === "studio" ? "Dieser Trainer gehört nicht zu deinem Studio." : "Ungültiger Trainer.");
  const client = input.clientId ? clients.find((c) => c.id === input.clientId) : null;
  if (input.clientId && !client) throw badRequest(user.role === "studio" ? "Dieser Kunde gehört nicht zu deinem Studio." : "Dieser Kunde gehört nicht zu dir oder deinem Studio.");
  const startMs = Date.parse(input.startsAt);
  if (startMs <= Date.now()) throw badRequest("Der Termin muss in der Zukunft liegen.");

  const row = must(
    await sb()
      .from("appointments")
      .insert({
        trainer_id: trainer.id,
        client_id: client?.id ?? null,
        guest_name: client ? null : input.guestName,
        created_by: user.role === "studio" ? "studio" : "trainer",
        status: "confirmed",
        category: input.category,
        title: input.title,
        starts_at: new Date(startMs).toISOString(),
        ends_at: new Date(startMs + input.durationMin * MIN).toISOString(),
        client_note: input.note ?? null,
        contact_email: input.contactEmail ?? null,
        contact_phone: input.contactPhone ?? null,
      })
      .select()
      .single<AppointmentRow>(),
  );
  const detail = noticeDetail(row.title, row.starts_at);
  const actor = studio?.name ?? user.name;
  if (user.role === "studio") await addNotice(trainer.id, "appointment_booked", actor, `${detail} · ${client?.name ?? input.guestName}`);
  if (client) await addNotice(client.id, "appointment_booked", actor, user.role === "studio" ? `${detail} · bei ${trainer.name}` : detail);
  return (await toAppointments([row], user))[0];
}

/* ------------------------------------------------------------------ */
/* Kommentare & private Trainer-Notiz                                  */
/* ------------------------------------------------------------------ */

const MAX_COMMENTS = 100;

interface CommentRow {
  id: string;
  appointment_id: string;
  author_id: string | null;
  author_name: string;
  author_role: AppointmentComment["author"]["role"];
  body: string;
  created_at: string;
}

async function toComments(rows: CommentRow[], viewer: ProfileRow): Promise<AppointmentComment[]> {
  const ids = [...new Set(rows.map((r) => r.author_id).filter((x): x is string => !!x))];
  const avatars = ids.length
    ? new Map(
        (must(await sb().from("profiles").select("id, avatar_path").in("id", ids)) as { id: string; avatar_path: string | null }[]).map((p) => [
          p.id,
          p.avatar_path,
        ]),
      )
    : new Map<string, string | null>();
  return rows.map((r) => ({
    id: r.id,
    author: { id: r.author_id, name: r.author_name, role: r.author_role, avatarUrl: r.author_id ? avatarUrl(avatars.get(r.author_id)) : null },
    body: r.body,
    createdAt: iso(r.created_at),
    mine: r.author_id === viewer.id,
  }));
}

export async function listComments(user: ProfileRow, appointmentId: string): Promise<AppointmentComment[]> {
  const { row } = await accessAppointment(user, appointmentId);
  const rows = must(
    await sb().from("appointment_comments").select("*").eq("appointment_id", row.id).order("created_at").limit(MAX_COMMENTS),
  ) as CommentRow[];
  return toComments(rows, user);
}

export async function addComment(user: ProfileRow, appointmentId: string, body: string): Promise<AppointmentComment> {
  const { row, isClient, isTrainer, actorName } = await accessAppointment(user, appointmentId);
  const { count } = await sb().from("appointment_comments").select("id", { count: "exact", head: true }).eq("appointment_id", row.id);
  if ((count ?? 0) >= MAX_COMMENTS) throw badRequest(`Maximal ${MAX_COMMENTS} Kommentare pro Termin.`);
  const created = must(
    await sb()
      .from("appointment_comments")
      .insert({ appointment_id: row.id, author_id: user.id, author_name: actorName, author_role: user.role, body })
      .select()
      .single<CommentRow>(),
  );
  // Andere Beteiligte informieren (Kunde und Trainer; das Studio sieht Kommentare im Kalender)
  const snippet = body.length > 60 ? `${body.slice(0, 57)}…` : body;
  const detail = `${noticeDetail(row.title, row.starts_at)} · „${snippet}“`;
  if (!isTrainer) await addNotice(row.trainer_id, "appointment_comment", actorName, detail);
  if (!isClient && row.client_id) await addNotice(row.client_id, "appointment_comment", actorName, detail);
  return (await toComments([created], user))[0];
}

export async function deleteComment(user: ProfileRow, appointmentId: string, commentId: string) {
  await accessAppointment(user, appointmentId);
  const rows = must(
    await sb().from("appointment_comments").delete().eq("id", commentId).eq("appointment_id", appointmentId).eq("author_id", user.id).select("id"),
  ) as { id: string }[];
  if (!rows.length) throw notFound("Kommentar nicht gefunden.");
}

/** Kontaktdaten am Termin pflegen (nur wer den Termin eingetragen hat). null = aus dem Profil übernehmen. */
export async function setAppointmentContact(
  user: ProfileRow,
  appointmentId: string,
  contact: { email?: string | null; phone?: string | null },
): Promise<Appointment> {
  const { row } = await accessAppointment(user, appointmentId);
  if (!canEditContact(user, row)) throw forbidden("Kontaktdaten pflegt, wer den Termin eingetragen hat.");
  const update: Record<string, string | null> = {};
  if (contact.email !== undefined) update.contact_email = contact.email;
  if (contact.phone !== undefined) update.contact_phone = contact.phone;
  const updated = Object.keys(update).length
    ? must(await sb().from("appointments").update(update).eq("id", row.id).select().single<AppointmentRow>())
    : row;
  return (await toAppointments([updated], user))[0];
}

/** Private Notiz des Trainers zum Termin (sehen weder Kunde noch Studio). */
export async function setTrainerNote(user: ProfileRow, appointmentId: string, note: string | null): Promise<Appointment> {
  const { row, isTrainer } = await accessAppointment(user, appointmentId);
  if (!isTrainer) throw forbidden("Nur der Trainer kann private Notizen pflegen.");
  const updated = must(await sb().from("appointments").update({ trainer_note: note }).eq("id", row.id).select().single<AppointmentRow>());
  return (await toAppointments([updated], user))[0];
}
