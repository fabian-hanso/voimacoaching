import "server-only";
import { supabaseAdmin } from "../supabase/admin";
import { ApiError, badRequest, conflict, forbidden, notFound } from "./http";
import { addNotice, AVATAR_BUCKET, AVATAR_MAX_BYTES, avatarUrl, detectImageType, iso, must, ownStudio, studioOf, type ProfileRow } from "./repo";
import { courseOccurrences, DAY, TZ, zonedDate } from "../booking-time";
import type { CourseInput } from "../schemas";
import type { Course, CourseParticipant, CourseSession, CourseSlot, CourseWithSessions, MyCourseBooking } from "../types";

/**
 * Kurse eines Studios: Das Studio legt sie an (Trainer, Kontingent, Zeiten, Bild), Kunden des Studios melden sich
 * für einzelne Termine an. Das Kontingent prüft die Datenbank (book_course) – kein Überbuchen.
 */

const sb = () => supabaseAdmin();
/** Wie weit im Voraus Kurstermine angezeigt und gebucht werden können */
const HORIZON_DAYS = 28;
const MAX_COURSES = 100;

const detailFmt = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const when = (startsAt: string | number) => `${detailFmt.format(new Date(startsAt))} Uhr`;

interface CourseRow {
  id: string;
  studio_id: string;
  trainer_id: string | null;
  title: string;
  category: string | null;
  description: string | null;
  image_path: string | null;
  location: string | null;
  capacity: number;
  duration_min: number;
  schedule: CourseSlot[];
  starts_on: string | null;
  ends_on: string | null;
  active: boolean;
}

const occurrencesOf = (r: CourseRow, fromDate: string, days: number) =>
  courseOccurrences({ schedule: r.schedule ?? [], durationMin: r.duration_min, startsOn: r.starts_on, endsOn: r.ends_on }, fromDate, days);

async function trainersById(ids: string[]) {
  if (!ids.length) return new Map<string, { id: string; name: string; avatar_path: string | null }>();
  const rows = must(await sb().from("profiles").select("id, name, avatar_path").in("id", ids)) as { id: string; name: string; avatar_path: string | null }[];
  return new Map(rows.map((r) => [r.id, r]));
}

async function toCourses(rows: CourseRow[]): Promise<Course[]> {
  const trainers = await trainersById([...new Set(rows.map((r) => r.trainer_id).filter((x): x is string => !!x))]);
  return rows.map((r) => {
    const t = r.trainer_id ? trainers.get(r.trainer_id) : null;
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      description: r.description,
      imageUrl: avatarUrl(r.image_path),
      location: r.location,
      capacity: r.capacity,
      durationMin: r.duration_min,
      schedule: r.schedule ?? [],
      startsOn: r.starts_on,
      endsOn: r.ends_on,
      active: r.active,
      trainer: t ? { id: t.id, name: t.name, avatarUrl: avatarUrl(t.avatar_path) } : null,
    };
  });
}

/** Belegung je Kurstermin (Schlüssel `${courseId}|${startMs}`) und eigene Anmeldungen. */
async function bookingCounts(courseIds: string[], fromIso: string, toIso: string, clientId?: string) {
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  if (!courseIds.length) return { counts, mine };
  const rows = must(
    await sb()
      .from("course_bookings")
      .select("course_id, client_id, starts_at")
      .in("course_id", courseIds)
      .eq("status", "booked")
      .gte("starts_at", fromIso)
      .lt("starts_at", toIso),
  ) as { course_id: string; client_id: string; starts_at: string }[];
  for (const b of rows) {
    const key = `${b.course_id}|${Date.parse(b.starts_at)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (clientId && b.client_id === clientId) mine.add(key);
  }
  return { counts, mine };
}

/** Kurse inkl. der nächsten Termine (ab jetzt, 4 Wochen). */
async function withSessions(rows: CourseRow[], clientId?: string): Promise<CourseWithSessions[]> {
  const now = Date.now();
  const today = zonedDate(now);
  const { counts, mine } = await bookingCounts(
    rows.map((r) => r.id),
    new Date(now).toISOString(),
    new Date(now + (HORIZON_DAYS + 1) * DAY).toISOString(),
    clientId,
  );
  const courses = await toCourses(rows);
  return courses.map((c, i) => {
    const r = rows[i];
    const sessions: CourseSession[] = r.active
      ? occurrencesOf(r, today, HORIZON_DAYS)
          .filter((o) => o.start > now)
          .map((o) => {
            const key = `${r.id}|${o.start}`;
            return {
              courseId: r.id,
              startsAt: new Date(o.start).toISOString(),
              endsAt: new Date(o.end).toISOString(),
              booked: counts.get(key) ?? 0,
              capacity: r.capacity,
              bookedByMe: mine.has(key),
            };
          })
      : [];
    return { ...c, sessions };
  });
}

/* ------------------------------------------------------------------ */
/* Lesen                                                               */
/* ------------------------------------------------------------------ */

/**
 * Kurse des eigenen Studios. Studio: alle (auch inaktive) · Trainer & Kunden des Studios: aktive.
 * Kunden sehen zusätzlich, für welche Termine sie angemeldet sind.
 */
export async function listCourses(user: ProfileRow): Promise<CourseWithSessions[]> {
  const studio = await studioOf(user);
  if (!studio) return [];
  let query = sb().from("courses").select("*").eq("studio_id", studio.id).order("title");
  if (user.role !== "studio") query = query.eq("active", true);
  return withSessions(must(await query) as CourseRow[], user.role === "client" ? user.id : undefined);
}

async function courseFor(user: ProfileRow, courseId: string): Promise<CourseRow> {
  const studio = await studioOf(user);
  const row = studio ? (must(await sb().from("courses").select("*").eq("id", courseId).eq("studio_id", studio.id).maybeSingle()) as CourseRow | null) : null;
  if (!row) throw notFound("Kurs nicht gefunden.");
  return row;
}

/** Teilnehmende eines Kurstermins – für das Studio und den zugewiesenen Trainer. */
export async function listParticipants(user: ProfileRow, courseId: string, startsAt: string): Promise<CourseParticipant[]> {
  const course = await courseFor(user, courseId);
  const allowed = (user.role === "studio" && (await studioOf(user))?.owner_id === user.id) || (user.role === "trainer" && course.trainer_id === user.id);
  if (!allowed) throw forbidden("Teilnehmerlisten sehen das Studio und der Kurstrainer.");
  const rows = must(
    await sb()
      .from("course_bookings")
      .select("client_id, created_at")
      .eq("course_id", course.id)
      .eq("starts_at", new Date(startsAt).toISOString())
      .eq("status", "booked")
      .order("created_at"),
  ) as { client_id: string; created_at: string }[];
  const profiles = rows.length
    ? new Map(
        (must(await sb().from("profiles").select("id, name, avatar_path").in("id", rows.map((r) => r.client_id))) as {
          id: string;
          name: string;
          avatar_path: string | null;
        }[]).map((p) => [p.id, p]),
      )
    : new Map();
  return rows.map((r) => {
    const p = profiles.get(r.client_id);
    return { id: r.client_id, name: p?.name ?? "Kunde", avatarUrl: avatarUrl(p?.avatar_path), bookedAt: iso(r.created_at) };
  });
}

/** Kurstermine einer Woche für den Kalender (Studio: alle aktiven Kurse, Trainer: eigene). */
export async function courseSessionsForWeek(user: ProfileRow, weekStart: string) {
  const studio = await studioOf(user);
  if (!studio) return [];
  let query = sb().from("courses").select("*").eq("studio_id", studio.id).eq("active", true);
  if (user.role === "trainer") query = query.eq("trainer_id", user.id);
  else if (user.role !== "studio") return [];
  const rows = must(await query) as CourseRow[];
  const occ = rows.flatMap((r) => occurrencesOf(r, weekStart, 7).map((o) => ({ r, o })));
  if (!occ.length) return [];
  const from = Math.min(...occ.map((x) => x.o.start));
  const to = Math.max(...occ.map((x) => x.o.start)) + 1;
  const { counts } = await bookingCounts(
    rows.map((r) => r.id),
    new Date(from).toISOString(),
    new Date(to).toISOString(),
  );
  return occ.map(({ r, o }) => ({
    courseId: r.id,
    title: r.title,
    trainerId: r.trainer_id,
    location: r.location,
    startsAt: new Date(o.start).toISOString(),
    endsAt: new Date(o.end).toISOString(),
    booked: counts.get(`${r.id}|${o.start}`) ?? 0,
    capacity: r.capacity,
    bookedByMe: false,
  }));
}

/* ------------------------------------------------------------------ */
/* Studio: anlegen, bearbeiten, löschen, Bild                          */
/* ------------------------------------------------------------------ */

async function ownCourse(owner: ProfileRow, courseId: string) {
  const studio = await ownStudio(owner);
  const row = must(await sb().from("courses").select("*").eq("id", courseId).eq("studio_id", studio.id).maybeSingle()) as CourseRow | null;
  if (!row) throw notFound("Kurs nicht gefunden.");
  return { studio, row };
}

async function assertStudioTrainer(studioId: string, trainerId: string | null | undefined) {
  if (!trainerId) return;
  const t = must(await sb().from("profiles").select("id").eq("id", trainerId).eq("role", "trainer").eq("studio_id", studioId).maybeSingle());
  if (!t) throw badRequest("Dieser Trainer gehört nicht zu deinem Studio.");
}

const toRow = (input: CourseInput) => ({
  title: input.title,
  category: input.category ?? null,
  description: input.description ?? null,
  location: input.location ?? null,
  trainer_id: input.trainerId ?? null,
  capacity: input.capacity,
  duration_min: input.durationMin,
  schedule: [...input.schedule].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start)),
  starts_on: input.startsOn ?? null,
  ends_on: input.endsOn ?? null,
  active: input.active,
  updated_at: new Date().toISOString(),
});

export async function createCourse(owner: ProfileRow, input: CourseInput): Promise<CourseWithSessions> {
  const studio = await ownStudio(owner);
  const { count } = await sb().from("courses").select("id", { count: "exact", head: true }).eq("studio_id", studio.id);
  if ((count ?? 0) >= MAX_COURSES) throw badRequest(`Maximal ${MAX_COURSES} Kurse pro Studio.`);
  await assertStudioTrainer(studio.id, input.trainerId);
  const row = must(await sb().from("courses").insert({ studio_id: studio.id, ...toRow(input) }).select().single()) as CourseRow;
  if (row.trainer_id) await addNotice(row.trainer_id, "course_assigned", studio.name, row.title);
  return (await withSessions([row]))[0];
}

/**
 * Künftige Anmeldungen stornieren und die Kunden informieren – alle (Kurs gelöscht)
 * oder nur bestimmte Termine (`onlyStarts`, z. B. nach geänderten Zeiten oder Pausieren).
 */
async function cancelFutureBookings(row: CourseRow, studioName: string, onlyStarts?: Set<number>) {
  let query = sb()
    .from("course_bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("course_id", row.id)
    .eq("status", "booked")
    .gt("starts_at", new Date().toISOString());
  if (onlyStarts) query = query.in("starts_at", [...onlyStarts].map((ms) => new Date(ms).toISOString()));
  const rows = must(await query.select("client_id, starts_at")) as { client_id: string; starts_at: string }[];
  for (const b of rows) await addNotice(b.client_id, "course_cancelled", studioName, `${row.title} · ${when(b.starts_at)}`);
  return rows.length;
}

export async function updateCourse(owner: ProfileRow, courseId: string, input: CourseInput): Promise<CourseWithSessions> {
  const { studio, row } = await ownCourse(owner, courseId);
  await assertStudioTrainer(studio.id, input.trainerId);
  const updated = must(await sb().from("courses").update(toRow(input)).eq("id", row.id).select().single()) as CourseRow;

  // Angemeldete Termine, die es nach der Änderung nicht mehr gibt (pausiert, andere Zeiten, Zeitraum), entfallen
  const now = Date.now();
  const stillThere = new Set(updated.active ? occurrencesOf(updated, zonedDate(now), HORIZON_DAYS + 7).map((o) => o.start) : []);
  const booked = must(
    await sb().from("course_bookings").select("starts_at").eq("course_id", row.id).eq("status", "booked").gt("starts_at", new Date(now).toISOString()),
  ) as { starts_at: string }[];
  const gone = new Set(booked.map((b) => Date.parse(b.starts_at)).filter((s) => !stillThere.has(s)));
  if (gone.size) await cancelFutureBookings(updated, studio.name, gone);

  if (updated.trainer_id && updated.trainer_id !== row.trainer_id) await addNotice(updated.trainer_id, "course_assigned", studio.name, updated.title);
  return (await withSessions([updated]))[0];
}

export async function deleteCourse(owner: ProfileRow, courseId: string) {
  const { studio, row } = await ownCourse(owner, courseId);
  await cancelFutureBookings(row, studio.name);
  must(await sb().from("courses").delete().eq("id", row.id));
  if (row.image_path) await sb().storage.from(AVATAR_BUCKET).remove([row.image_path]);
}

export async function setCourseImage(owner: ProfileRow, courseId: string, bytes: Uint8Array): Promise<CourseWithSessions> {
  const { studio, row } = await ownCourse(owner, courseId);
  if (bytes.byteLength > AVATAR_MAX_BYTES) throw badRequest("Bild ist zu groß (max. 5 MB).");
  const type = detectImageType(bytes);
  if (!type) throw badRequest("Nur JPEG, PNG oder WebP sind erlaubt.");
  const path = `studios/${studio.id}/courses/${crypto.randomUUID()}.${type.ext}`;
  const { error } = await sb().storage.from(AVATAR_BUCKET).upload(path, bytes, { contentType: type.mime, cacheControl: "3600", upsert: false });
  if (error) {
    console.error("[storage]", error);
    throw new ApiError(500, "storage_error", "Bild konnte nicht gespeichert werden.");
  }
  const updated = must(await sb().from("courses").update({ image_path: path }).eq("id", row.id).select().single()) as CourseRow;
  if (row.image_path) await sb().storage.from(AVATAR_BUCKET).remove([row.image_path]);
  return (await withSessions([updated]))[0];
}

export async function removeCourseImage(owner: ProfileRow, courseId: string): Promise<CourseWithSessions> {
  const { row } = await ownCourse(owner, courseId);
  const updated = must(await sb().from("courses").update({ image_path: null }).eq("id", row.id).select().single()) as CourseRow;
  if (row.image_path) await sb().storage.from(AVATAR_BUCKET).remove([row.image_path]);
  return (await withSessions([updated]))[0];
}

/* ------------------------------------------------------------------ */
/* Kunden: an- und abmelden                                            */
/* ------------------------------------------------------------------ */

const BOOKING_ERRORS: Record<string, () => ApiError> = {
  COURSE_FULL: () => conflict("Dieser Kurstermin ist leider ausgebucht."),
  COURSE_ALREADY_BOOKED: () => conflict("Du bist für diesen Termin bereits angemeldet."),
  COURSE_NOT_FOUND: () => notFound("Kurs nicht gefunden."),
};

export async function bookCourse(client: ProfileRow, courseId: string, startsAt: string): Promise<CourseWithSessions> {
  if (client.role !== "client") throw forbidden("Nur Kunden können sich für Kurse anmelden.");
  const course = await courseFor(client, courseId);
  if (!course.active) throw notFound("Kurs nicht gefunden.");
  const start = Date.parse(startsAt);
  const now = Date.now();
  if (!(start > now) || !occurrencesOf(course, zonedDate(now), HORIZON_DAYS).some((o) => o.start === start)) {
    throw conflict("Diesen Kurstermin gibt es nicht (mehr). Bitte wähle einen anderen.");
  }
  const { error } = await sb().rpc("book_course", { p_course: course.id, p_client: client.id, p_starts: new Date(start).toISOString() });
  if (error) {
    const mapped = BOOKING_ERRORS[error.message];
    if (mapped) throw mapped();
    if (error.code === "23505") throw conflict("Du bist für diesen Termin bereits angemeldet.");
    must({ data: null, error });
  }
  return (await withSessions([course], client.id))[0];
}

export async function cancelCourseBooking(client: ProfileRow, courseId: string, startsAt: string): Promise<CourseWithSessions> {
  if (client.role !== "client") throw forbidden("Nur Kunden können sich abmelden.");
  const course = await courseFor(client, courseId);
  const start = new Date(startsAt);
  if (start.getTime() <= Date.now()) throw badRequest("Der Kurs hat bereits begonnen.");
  const rows = must(
    await sb()
      .from("course_bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("course_id", course.id)
      .eq("client_id", client.id)
      .eq("starts_at", start.toISOString())
      .eq("status", "booked")
      .select("id"),
  ) as { id: string }[];
  if (!rows.length) throw notFound("Du bist für diesen Termin nicht angemeldet.");
  return (await withSessions([course], client.id))[0];
}

/** Eigene kommende Kursanmeldungen (Kunde). */
export async function myCourseBookings(client: ProfileRow): Promise<MyCourseBooking[]> {
  if (client.role !== "client") return [];
  const rows = must(
    await sb()
      .from("course_bookings")
      .select("id, course_id, starts_at")
      .eq("client_id", client.id)
      .eq("status", "booked")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(100),
  ) as { id: string; course_id: string; starts_at: string }[];
  if (!rows.length) return [];
  const courses = must(await sb().from("courses").select("*").in("id", [...new Set(rows.map((r) => r.course_id))])) as CourseRow[];
  const byId = new Map(courses.map((c) => [c.id, c]));
  const trainers = await trainersById([...new Set(courses.map((c) => c.trainer_id).filter((x): x is string => !!x))]);
  return rows
    .filter((r) => byId.has(r.course_id))
    .map((r) => {
      const c = byId.get(r.course_id)!;
      const start = Date.parse(r.starts_at);
      return {
        id: r.id,
        course: { id: c.id, title: c.title, imageUrl: avatarUrl(c.image_path), location: c.location, trainerName: c.trainer_id ? (trainers.get(c.trainer_id)?.name ?? null) : null },
        startsAt: new Date(start).toISOString(),
        endsAt: new Date(start + c.duration_min * 60_000).toISOString(),
      };
    });
}
