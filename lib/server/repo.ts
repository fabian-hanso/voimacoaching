import "server-only";
import { randomBytes } from "node:crypto";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseAdmin } from "../supabase/admin";
import { ApiError, badRequest, conflict, forbidden, notFound } from "./http";
import type {
  FeatureRequestInput,
  LoggedExercise,
  MeasurementInput,
  PlanDay,
  PlanInput,
  StaffInput,
  StudioUpdateInput,
  WorkoutInput,
} from "../schemas";
import type {
  AssignedPlan,
  CardioBest,
  ClientSummary,
  Conversation,
  Invitation,
  Message,
  Notice,
  OpeningHoursDay,
  StudioClient,
  StudioProfile,
  StudioStaffMember,
  StudioInfo,
  StudioOverview,
  StudioTrainer,
  NoticeKind,
  Measurement,
  PersonalBest,
  Plan,
  PlanWithAssignments,
  Progress,
  Role,
  MeResponse,
  Trainer,
  User,
  Workout,
} from "../types";

/**
 * Datenzugriff über Supabase (Postgres) mit dem Secret Key.
 * RLS ist für anon/authenticated komplett gesperrt – deshalb prüft JEDE Funktion hier
 * selbst, ob der anfragende Nutzer die Daten sehen/ändern darf.
 */

const sb = () => supabaseAdmin();

/* ------------------------------------------------------------------ */
/* Row-Typen, Mapper & Fehlerbehandlung                                */
/* ------------------------------------------------------------------ */

export interface ProfileRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  trainer_id: string | null;
  studio_id: string | null;
  avatar_path: string | null;
  phone: string | null;
  created_at: string;
}

export const AVATAR_BUCKET = "avatars";

/** Öffentliche URL eines Profilbilds (lokal berechnet, kein Netzwerkaufruf). */
export const avatarUrl = (path: string | null | undefined) =>
  path ? sb().storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl : null;

interface InvitationRow {
  code: string;
  trainer_id: string;
  email: string | null;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

interface PlanRow {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  days: PlanDay[];
  created_at: string;
  updated_at: string;
  plan_assignments?: { client_id: string }[];
}

interface WorkoutRow {
  id: string;
  client_id: string;
  plan_id: string | null;
  title: string;
  performed_at: string;
  duration_min: number | null;
  notes: string | null;
  exercises: LoggedExercise[];
  created_at: string;
}

interface MeasurementRow {
  id: string;
  client_id: string;
  measured_at: string;
  body_weight_kg: number | string | null;
  body_fat_pct: number | string | null;
  waist_cm: number | string | null;
  notes: string | null;
  created_at: string;
}

interface ClientSummaryRow {
  id: string;
  name: string;
  email: string;
  joined_at: string;
  last_workout_at: string | null;
  workouts_last_7_days: number;
  active_plans: number;
}

/** Postgres-Zeitstempel einheitlich als ISO-String (…Z) ausgeben. */
export const iso = (ts: string) => new Date(ts).toISOString();
const isoOrNull = (ts: string | null) => (ts ? iso(ts) : null);
const num = (v: number | string | null) => (v == null ? null : Number(v));

const INVITE_ERRORS: Record<string, string> = {
  INVITE_INVALID: "Einladungscode ist ungültig.",
  INVITE_USED: "Einladungscode wurde bereits verwendet.",
  INVITE_EXPIRED: "Einladungscode ist abgelaufen.",
  INVITE_EMAIL_MISMATCH: "Dieser Einladungscode gilt für eine andere E-Mail-Adresse.",
  INVITE_NOT_CLIENT: "Nur Kunden können Einladungscodes nutzen.",
  STUDIO_INVITE_NOT_TRAINER: "Nur Trainer können einem Studio beitreten.",
  TRAINER_IN_STUDIO: "Du bist bereits Mitglied eines Studios.",
  STUDIO_FULL: "Das Studio hat die maximale Anzahl an Trainern erreicht.",
  CLIENT_NOT_IN_STUDIO: "Dieser Kunde gehört nicht zu deinem Studio.",
  TRAINER_NOT_IN_STUDIO: "Dieser Trainer gehört nicht zu deinem Studio.",
  SAME_TRAINER: "Der Kunde wird bereits von diesem Trainer betreut.",
};
const CONFLICT_ERRORS: Record<string, string> = {
  TRAINER_HAS_CLIENTS: "Der Trainer betreut noch Kunden. Übertrage sie zuerst an einen anderen Trainer.",
};

export function dbError(error: PostgrestError): ApiError {
  if (INVITE_ERRORS[error.message]) return badRequest(INVITE_ERRORS[error.message]);
  if (CONFLICT_ERRORS[error.message]) return conflict(CONFLICT_ERRORS[error.message]);
  if (error.code === "23505") return conflict("Eintrag existiert bereits.");
  if (error.code === "23P01") return conflict("Dieser Zeitraum ist leider gerade vergeben worden. Bitte wähle eine andere Uhrzeit.");
  if (error.code === "23503") return badRequest("Verknüpfter Datensatz existiert nicht.");
  if (error.code === "22P02") return notFound(); // ungültige UUID in der URL
  if (error.code === "23514") return badRequest("Ungültige Daten.");
  if (!error.code && /fetch failed|network|ECONN|ETIMEDOUT|ENOTFOUND/i.test(error.message)) {
    console.error("[db] nicht erreichbar:", error.message);
    return new ApiError(503, "db_unavailable", "Die Datenbank ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.");
  }
  console.error("[db]", error);
  return new ApiError(500, "db_error", "Datenbankfehler.");
}

/** Wirft bei Fehlern, liefert sonst `data`. */
export function must<T>(res: { data: T | null; error: PostgrestError | null }): T {
  if (res.error) throw dbError(res.error);
  return res.data as T;
}

export const toUser = (r: ProfileRow): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  trainerId: r.trainer_id,
  avatarUrl: avatarUrl(r.avatar_path),
  phone: r.phone ?? null,
  createdAt: iso(r.created_at),
});

const toInvitation = (r: InvitationRow): Invitation => ({
  code: r.code,
  email: r.email,
  usedBy: r.used_by,
  usedAt: isoOrNull(r.used_at),
  expiresAt: iso(r.expires_at),
  createdAt: iso(r.created_at),
});

/** Ältere Daten ohne `type` gelten als Kraftübung. */
const normalizeDays = (days: PlanDay[]): PlanDay[] =>
  days.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e, type: e.type ?? "strength" })) }));

const normalizeLogged = (exercises: LoggedExercise[]): LoggedExercise[] =>
  exercises.map((e) => ({ ...e, type: e.type ?? "strength", sets: e.sets ?? [] }));

const toPlan = (r: PlanRow): Plan => ({
  id: r.id,
  trainerId: r.trainer_id,
  title: r.title,
  description: r.description,
  days: normalizeDays(r.days),
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round = (n: number, digits = 0) => Math.round(n * 10 ** digits) / 10 ** digits;

const toWorkout = (r: WorkoutRow): Workout => {
  const exercises = normalizeLogged(r.exercises);
  const strength = exercises.filter((e) => e.type === "strength");
  const cardio = exercises.filter((e) => e.type === "cardio");
  return {
    id: r.id,
    clientId: r.client_id,
    planId: r.plan_id,
    title: r.title,
    performedAt: iso(r.performed_at),
    durationMin: r.duration_min,
    notes: r.notes,
    exercises,
    volumeKg: Math.round(sum(strength.flatMap((e) => e.sets.map((s) => s.reps * (s.weightKg ?? 0))))),
    cardioMin: round(sum(cardio.map((e) => e.durationMin ?? 0))),
    distanceKm: round(sum(cardio.map((e) => e.distanceKm ?? 0)), 2),
    createdAt: iso(r.created_at),
  };
};

const toMeasurement = (r: MeasurementRow): Measurement => ({
  id: r.id,
  clientId: r.client_id,
  measuredAt: iso(r.measured_at),
  bodyWeightKg: num(r.body_weight_kg),
  bodyFatPct: num(r.body_fat_pct),
  waistCm: num(r.waist_cm),
  notes: r.notes,
  createdAt: iso(r.created_at),
});

const toClientSummary = (r: ClientSummaryRow, avatarPath: string | null = null): ClientSummary => ({
  id: r.id,
  name: r.name,
  email: r.email,
  avatarUrl: avatarUrl(avatarPath),
  joinedAt: iso(r.joined_at),
  lastWorkoutAt: isoOrNull(r.last_workout_at),
  workoutsLast7Days: r.workouts_last_7_days,
  activePlans: r.active_plans,
});

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export async function getProfile(id: string): Promise<ProfileRow | null> {
  return must(await sb().from("profiles").select("*").eq("id", id).maybeSingle<ProfileRow>());
}

export async function getTrainer(trainerId: string | null): Promise<Trainer | null> {
  if (!trainerId) return null;
  const row = must(
    await sb()
      .from("profiles")
      .select("id, name, email, avatar_path")
      .eq("id", trainerId)
      .eq("role", "trainer")
      .maybeSingle<Pick<ProfileRow, "id" | "name" | "email" | "avatar_path">>(),
  );
  return row ? { id: row.id, name: row.name, email: row.email, avatarUrl: avatarUrl(row.avatar_path) } : null;
}

export async function updateProfile(id: string, patch: { name?: string; phone?: string | null }): Promise<ProfileRow> {
  const update: Record<string, unknown> = {};
  if (patch.name) update.name = patch.name;
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (!Object.keys(update).length) return (await getProfile(id))!;
  return must(await sb().from("profiles").update(update).eq("id", id).select().single<ProfileRow>());
}

/** Kunde löst einen Einladungscode ein (atomar in Postgres, siehe redeem_invitation). */
export async function joinTrainer(client: ProfileRow, code: string): Promise<ProfileRow> {
  must(await sb().rpc("redeem_invitation", { p_code: code, p_client: client.id }));
  return (await getProfile(client.id))!;
}

/* ------------------------------------------------------------------ */
/* Einladungen                                                         */
/* ------------------------------------------------------------------ */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne 0/O/1/I

function generateCode(length = 8) {
  return Array.from(randomBytes(length), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export async function createInvitation(trainerId: string, email: string | undefined, validDays: number): Promise<Invitation> {
  const row = must(
    await sb()
      .from("invitations")
      .insert({
        code: generateCode(),
        trainer_id: trainerId,
        email: email ?? null,
        expires_at: new Date(Date.now() + validDays * 86_400_000).toISOString(),
      })
      .select()
      .single<InvitationRow>(),
  );
  return toInvitation(row);
}

export async function listInvitations(trainerId: string): Promise<Invitation[]> {
  const rows = must(
    await sb().from("invitations").select("*").eq("trainer_id", trainerId).order("created_at", { ascending: false }),
  ) as InvitationRow[];
  return rows.map(toInvitation);
}

export async function deleteInvitation(trainerId: string, code: string) {
  const rows = must(await sb().from("invitations").delete().eq("code", code).eq("trainer_id", trainerId).select("code"));
  if (!rows?.length) throw notFound("Einladung nicht gefunden.");
}

/** Öffentliche Prüfung eines Codes (für Registrierungs-Screens). */
export async function checkInvitation(code: string): Promise<{ valid: boolean; trainerName: string | null }> {
  const inv = must(
    await sb().from("invitations").select("trainer_id, used_by, expires_at").eq("code", code).maybeSingle<InvitationRow>(),
  );
  if (!inv || inv.used_by || new Date(inv.expires_at) < new Date()) return { valid: false, trainerName: null };
  const trainer = await getTrainer(inv.trainer_id);
  return { valid: !!trainer, trainerName: trainer?.name ?? null };
}

/* ------------------------------------------------------------------ */
/* Kunden (Trainer-Sicht)                                              */
/* ------------------------------------------------------------------ */

export async function listClients(trainerId: string): Promise<ClientSummary[]> {
  const [rows, avatars] = await Promise.all([
    sb().rpc("client_summaries", { p_trainer: trainerId }).then(must) as Promise<ClientSummaryRow[]>,
    sb().from("profiles").select("id, avatar_path").eq("trainer_id", trainerId).not("avatar_path", "is", null).then(must) as Promise<
      { id: string; avatar_path: string }[]
    >,
  ]);
  const avatarOf = new Map(avatars.map((a) => [a.id, a.avatar_path]));
  return rows.map((r) => toClientSummary(r, avatarOf.get(r.id) ?? null));
}

/** Lädt einen Kunden des Trainers oder wirft 404. */
export async function getClientOf(trainerId: string, clientId: string): Promise<ClientSummary> {
  const client = (await listClients(trainerId)).find((c) => c.id === clientId);
  if (!client) throw notFound("Kunde nicht gefunden.");
  return client;
}

/** Trennt Kunde und Trainer; entfernt dabei die Planzuweisungen dieses Trainers. */
export async function removeClient(trainerId: string, clientId: string) {
  await getClientOf(trainerId, clientId);
  const planIds = (must(await sb().from("plans").select("id").eq("trainer_id", trainerId)) as { id: string }[]).map(
    (p) => p.id,
  );
  if (planIds.length) {
    must(await sb().from("plan_assignments").delete().eq("client_id", clientId).in("plan_id", planIds));
  }
  // Kunde verlässt damit auch ein evtl. Studio des Trainers
  must(await sb().from("profiles").update({ trainer_id: null, studio_id: null }).eq("id", clientId).eq("trainer_id", trainerId));
}

/* ------------------------------------------------------------------ */
/* Pläne                                                               */
/* ------------------------------------------------------------------ */

const withAssignments = (r: PlanRow): PlanWithAssignments => ({
  ...toPlan(r),
  assignedClientIds: (r.plan_assignments ?? []).map((a) => a.client_id),
});

export async function listPlans(trainerId: string): Promise<PlanWithAssignments[]> {
  const rows = must(
    await sb()
      .from("plans")
      .select("*, plan_assignments(client_id)")
      .eq("trainer_id", trainerId)
      .order("updated_at", { ascending: false }),
  ) as PlanRow[];
  return rows.map(withAssignments);
}

/** Trainer: eigener Plan (inkl. Zuweisungen). Kunde: zugewiesener Plan. Sonst 404. */
export async function getPlanFor(user: ProfileRow, planId: string): Promise<PlanWithAssignments> {
  const row = must(
    await sb().from("plans").select("*, plan_assignments(client_id)").eq("id", planId).maybeSingle<PlanRow>(),
  );
  if (!row) throw notFound("Plan nicht gefunden.");
  const plan = withAssignments(row);
  if (user.role === "trainer") {
    if (row.trainer_id !== user.id) throw notFound("Plan nicht gefunden.");
    return plan;
  }
  if (!plan.assignedClientIds.includes(user.id)) throw notFound("Plan nicht gefunden.");
  return { ...plan, assignedClientIds: [] };
}

export async function createPlan(trainerId: string, input: PlanInput): Promise<Plan> {
  const row = must(
    await sb()
      .from("plans")
      .insert({ trainer_id: trainerId, title: input.title, description: input.description ?? null, days: input.days })
      .select()
      .single<PlanRow>(),
  );
  return toPlan(row);
}

async function assertOwnPlan(trainerId: string, planId: string) {
  const row = must(
    await sb().from("plans").select("id").eq("id", planId).eq("trainer_id", trainerId).maybeSingle(),
  );
  if (!row) throw notFound("Plan nicht gefunden.");
}

export async function updatePlan(trainerId: string, planId: string, input: PlanInput): Promise<Plan> {
  const row = must(
    await sb()
      .from("plans")
      .update({
        title: input.title,
        description: input.description ?? null,
        days: input.days,
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .eq("trainer_id", trainerId)
      .select()
      .maybeSingle<PlanRow>(),
  );
  if (!row) throw notFound("Plan nicht gefunden.");
  return toPlan(row);
}

export async function deletePlan(trainerId: string, planId: string) {
  const rows = must(await sb().from("plans").delete().eq("id", planId).eq("trainer_id", trainerId).select("id"));
  if (!rows?.length) throw notFound("Plan nicht gefunden.");
}

export async function assignPlan(trainerId: string, planId: string, clientId: string) {
  await assertOwnPlan(trainerId, planId);
  await getClientOf(trainerId, clientId);
  must(
    await sb()
      .from("plan_assignments")
      .upsert({ plan_id: planId, client_id: clientId }, { onConflict: "plan_id,client_id", ignoreDuplicates: true }),
  );
}

export async function unassignPlan(trainerId: string, planId: string, clientId: string) {
  await assertOwnPlan(trainerId, planId);
  const rows = must(
    await sb().from("plan_assignments").delete().eq("plan_id", planId).eq("client_id", clientId).select("plan_id"),
  );
  if (!rows?.length) throw notFound("Zuweisung nicht gefunden.");
}

export async function listAssignedPlans(clientId: string): Promise<AssignedPlan[]> {
  const rows = must(
    await sb()
      .from("plan_assignments")
      .select("assigned_at, plans(*)")
      .eq("client_id", clientId)
      .order("assigned_at", { ascending: false }),
  ) as unknown as { assigned_at: string; plans: PlanRow | null }[];
  return rows.filter((r) => r.plans).map((r) => ({ ...toPlan(r.plans!), assignedAt: iso(r.assigned_at) }));
}

/* ------------------------------------------------------------------ */
/* Workouts & Messungen                                                */
/* ------------------------------------------------------------------ */

/** Wessen Daten? Kunde → eigene; Trainer → `clientId` (muss eigener Kunde sein). */
export async function resolveClientId(user: ProfileRow, requestedClientId: string | null): Promise<string> {
  if (user.role === "client") {
    if (requestedClientId && requestedClientId !== user.id) throw forbidden();
    return user.id;
  }
  if (!requestedClientId) throw badRequest("Parameter clientId fehlt.");
  await getClientOf(user.id, requestedClientId);
  return requestedClientId;
}

export async function createWorkout(clientId: string, input: WorkoutInput): Promise<Workout> {
  if (input.planId) {
    const assigned = must(
      await sb()
        .from("plan_assignments")
        .select("plan_id")
        .eq("plan_id", input.planId)
        .eq("client_id", clientId)
        .maybeSingle(),
    );
    if (!assigned) throw badRequest("Dieser Plan ist dir nicht zugewiesen.");
  }
  const row = must(
    await sb()
      .from("workouts")
      .insert({
        client_id: clientId,
        plan_id: input.planId ?? null,
        title: input.title,
        performed_at: input.performedAt ?? new Date().toISOString(),
        duration_min: input.durationMin ?? null,
        notes: input.notes ?? null,
        exercises: input.exercises,
      })
      .select()
      .single<WorkoutRow>(),
  );
  return toWorkout(row);
}

/** Workout laden, wenn der Nutzer es sehen darf. */
export async function getWorkoutFor(user: ProfileRow, id: string): Promise<Workout> {
  const row = must(await sb().from("workouts").select("*").eq("id", id).maybeSingle<WorkoutRow>());
  if (!row) throw notFound("Workout nicht gefunden.");
  if (user.role === "client" && row.client_id !== user.id) throw notFound("Workout nicht gefunden.");
  if (user.role === "trainer") await resolveClientId(user, row.client_id);
  return toWorkout(row);
}

export async function deleteWorkout(client: ProfileRow, id: string) {
  const rows = must(await sb().from("workouts").delete().eq("id", id).eq("client_id", client.id).select("id"));
  if (!rows?.length) throw notFound("Workout nicht gefunden.");
}

export async function listWorkouts(clientId: string, limit = 50, before?: string | null): Promise<Workout[]> {
  let query = sb().from("workouts").select("*").eq("client_id", clientId);
  if (before) query = query.lt("performed_at", before);
  const rows = must(await query.order("performed_at", { ascending: false }).limit(limit)) as WorkoutRow[];
  return rows.map(toWorkout);
}

export async function createMeasurement(clientId: string, input: MeasurementInput): Promise<Measurement> {
  const row = must(
    await sb()
      .from("measurements")
      .insert({
        client_id: clientId,
        measured_at: input.measuredAt ?? new Date().toISOString(),
        body_weight_kg: input.bodyWeightKg ?? null,
        body_fat_pct: input.bodyFatPct ?? null,
        waist_cm: input.waistCm ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single<MeasurementRow>(),
  );
  return toMeasurement(row);
}

export async function listMeasurements(clientId: string, limit = 100): Promise<Measurement[]> {
  const rows = must(
    await sb()
      .from("measurements")
      .select("*")
      .eq("client_id", clientId)
      .order("measured_at", { ascending: false })
      .limit(limit),
  ) as MeasurementRow[];
  return rows.map(toMeasurement);
}

export async function deleteMeasurement(client: ProfileRow, id: string) {
  const rows = must(await sb().from("measurements").delete().eq("id", id).eq("client_id", client.id).select("id"));
  if (!rows?.length) throw notFound("Messung nicht gefunden.");
}

/* ------------------------------------------------------------------ */
/* Fortschritt                                                         */
/* ------------------------------------------------------------------ */

const DAY = 86_400_000;
const weekKey = (d: Date) => startOfIsoWeek(d).toISOString().slice(0, 10);

function startOfIsoWeek(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); // Montag
  return x;
}

/** Reine Berechnung – getrennt vom Datenzugriff, damit sie leicht testbar ist. */
export function computeProgress(all: Workout[], measurements: Measurement[], nowMs = Date.now()): Progress {
  const since7 = nowMs - 7 * DAY;
  const since30 = nowMs - 30 * DAY;
  const at = (w: Workout) => new Date(w.performedAt).getTime();

  // Wochenvolumen der letzten 8 Wochen (älteste zuerst)
  const thisWeek = startOfIsoWeek(new Date(nowMs));
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(thisWeek);
    start.setUTCDate(start.getUTCDate() - (7 - i) * 7);
    return { weekStart: start.toISOString().slice(0, 10), volumeKg: 0, cardioMin: 0, distanceKm: 0, workouts: 0 };
  });
  for (const w of all) {
    const bucket = weeks.find((b) => b.weekStart === weekKey(new Date(w.performedAt)));
    if (bucket) {
      bucket.volumeKg += w.volumeKg;
      bucket.cardioMin = round(bucket.cardioMin + w.cardioMin);
      bucket.distanceKm = round(bucket.distanceKm + w.distanceKm, 2);
      bucket.workouts += 1;
    }
  }

  // Ausdauer der letzten 30 Tage
  const recentCardio = all.filter((w) => at(w) >= since30).flatMap((w) => w.exercises.filter((e) => e.type === "cardio"));
  const cardioLast30Days = {
    sessions: recentCardio.length,
    minutes: round(sum(recentCardio.map((e) => e.durationMin ?? 0))),
    distanceKm: round(sum(recentCardio.map((e) => e.distanceKm ?? 0)), 2),
  };

  // Streak: aufeinanderfolgende Wochen mit Training (aktuelle Woche zählt, wenn schon trainiert)
  const trainedWeeks = new Set(all.map((w) => weekKey(new Date(w.performedAt))));
  let streak = 0;
  const cursor = new Date(thisWeek);
  if (!trainedWeeks.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 7);
  while (trainedWeeks.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }

  // Bestwerte: höchstes Gewicht je Übung (bei Gleichstand mehr Wiederholungen)
  const bests = new Map<string, PersonalBest>();
  const cardioBests = new Map<string, CardioBest>();
  for (const w of [...all].sort((a, b) => at(a) - at(b))) {
    for (const e of w.exercises) {
      if (e.type === "cardio") {
        const key = e.name.trim().toLowerCase();
        const cur = cardioBests.get(key);
        const longerDist = e.distanceKm != null && e.distanceKm > (cur?.longestDistanceKm ?? 0);
        const longerTime = e.durationMin != null && e.durationMin > (cur?.longestDurationMin ?? 0);
        if (!cur || longerDist || longerTime) {
          cardioBests.set(key, {
            exercise: e.name,
            longestDistanceKm: longerDist ? e.distanceKm! : (cur?.longestDistanceKm ?? null),
            longestDurationMin: longerTime ? e.durationMin! : (cur?.longestDurationMin ?? null),
            achievedAt: w.performedAt,
          });
        }
        continue;
      }
      for (const s of e.sets) {
        if (!s.weightKg || s.reps < 1) continue;
        const key = e.name.trim().toLowerCase();
        const cur = bests.get(key);
        if (!cur || s.weightKg > cur.weightKg || (s.weightKg === cur.weightKg && s.reps > cur.reps)) {
          bests.set(key, { exercise: e.name, weightKg: s.weightKg, reps: s.reps, achievedAt: w.performedAt });
        }
      }
    }
  }

  const sorted = [...all].sort((a, b) => at(b) - at(a));
  return {
    totalWorkouts: all.length,
    workoutsLast7Days: all.filter((w) => at(w) >= since7).length,
    workoutsLast30Days: all.filter((w) => at(w) >= since30).length,
    currentStreakWeeks: streak,
    lastWorkoutAt: sorted[0]?.performedAt ?? null,
    weeklyVolume: weeks,
    cardioLast30Days,
    personalBests: [...bests.values()].sort((a, b) => b.achievedAt.localeCompare(a.achievedAt)).slice(0, 10),
    cardioBests: [...cardioBests.values()].sort((a, b) => b.achievedAt.localeCompare(a.achievedAt)).slice(0, 10),
    latestMeasurement: measurements[0] ?? null,
    measurements,
    recentWorkouts: sorted.slice(0, 10),
  };
}

export async function getProgress(clientId: string): Promise<Progress> {
  const [workouts, measurements] = await Promise.all([listWorkouts(clientId, 1000), listMeasurements(clientId, 52)]);
  return computeProgress(workouts, measurements);
}

/* ------------------------------------------------------------------ */
/* Nachrichten (Coach ↔ Kunde)                                          */
/* ------------------------------------------------------------------ */

interface MessageRow {
  id: string;
  trainer_id: string;
  client_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export const toMessage = (r: MessageRow): Message => ({
  id: r.id,
  trainerId: r.trainer_id,
  clientId: r.client_id,
  senderId: r.sender_id,
  body: r.body,
  createdAt: iso(r.created_at),
  readAt: isoOrNull(r.read_at),
});

export interface ConversationPair {
  trainerId: string;
  clientId: string;
  partner: ProfileRow;
}

/**
 * Prüft, ob `user` mit `partnerId` schreiben darf (aktuelle Coach–Kunde-Beziehung)
 * und liefert das Paar. Kunde → nur eigener Coach; Trainer → nur eigene Kunden.
 */
export async function conversationWith(user: ProfileRow, partnerId: string): Promise<ConversationPair> {
  const partner = await getProfile(partnerId).catch(() => null);
  const ok =
    partner &&
    (user.role === "client"
      ? partner.role === "trainer" && user.trainer_id === partner.id
      : partner.role === "client" && partner.trainer_id === user.id);
  if (!ok) throw notFound("Unterhaltung nicht gefunden.");
  return user.role === "trainer"
    ? { trainerId: user.id, clientId: partner.id, partner }
    : { trainerId: partner.id, clientId: user.id, partner };
}

export async function listConversations(user: ProfileRow): Promise<Conversation[]> {
  const partners: ProfileRow[] =
    user.role === "trainer"
      ? (must(await sb().from("profiles").select("*").eq("trainer_id", user.id).eq("role", "client")) as ProfileRow[])
      : user.trainer_id
        ? [(await getProfile(user.trainer_id))!].filter(Boolean)
        : [];
  const summaries = must(await sb().rpc("conversation_summaries", { p_user: user.id })) as {
    partner_id: string;
    last_body: string;
    last_sender_id: string;
    last_at: string;
    unread: number;
  }[];
  const byPartner = new Map(summaries.map((s) => [s.partner_id, s]));
  return partners
    .map((p): Conversation => {
      const s = byPartner.get(p.id);
      return {
        partner: { id: p.id, name: p.name, email: p.email, role: p.role, avatarUrl: avatarUrl(p.avatar_path) },
        lastMessage: s ? { body: s.last_body, senderId: s.last_sender_id, createdAt: iso(s.last_at) } : null,
        unread: s?.unread ?? 0,
      };
    })
    .sort(
      (a, b) =>
        (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? "") ||
        a.partner.name.localeCompare(b.partner.name, "de"),
    );
}

/** Nachrichten einer Unterhaltung, älteste zuerst. Paging über `before` (ISO-Zeitpunkt). */
export async function listMessages(pair: ConversationPair, limit = 50, before?: string | null): Promise<Message[]> {
  let query = sb().from("messages").select("*").eq("trainer_id", pair.trainerId).eq("client_id", pair.clientId);
  if (before) query = query.lt("created_at", before);
  const rows = must(await query.order("created_at", { ascending: false }).limit(limit)) as MessageRow[];
  return rows.reverse().map(toMessage);
}

export async function sendMessage(user: ProfileRow, pair: ConversationPair, body: string): Promise<Message> {
  const row = must(
    await sb()
      .from("messages")
      .insert({ trainer_id: pair.trainerId, client_id: pair.clientId, sender_id: user.id, body })
      .select()
      .single<MessageRow>(),
  );
  return toMessage(row);
}

/** Markiert alle Nachrichten des Gegenübers als gelesen; liefert die Anzahl. */
export async function markConversationRead(user: ProfileRow, pair: ConversationPair): Promise<number> {
  const rows = must(
    await sb()
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("trainer_id", pair.trainerId)
      .eq("client_id", pair.clientId)
      .neq("sender_id", user.id)
      .is("read_at", null)
      .select("id"),
  );
  return rows?.length ?? 0;
}

/* ------------------------------------------------------------------ */
/* Profilbilder                                                        */
/* ------------------------------------------------------------------ */

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** Bildtyp anhand der ersten Bytes erkennen (nicht der Dateiendung/dem Header vertrauen). */
export function detectImageType(bytes: Uint8Array): { mime: string; ext: string } | null {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: "image/png", ext: "png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

/** Lädt ein neues Profilbild hoch, setzt es am Profil und löscht das alte. */
export async function setAvatar(user: ProfileRow, bytes: Uint8Array): Promise<ProfileRow> {
  if (bytes.byteLength > AVATAR_MAX_BYTES) throw badRequest("Bild ist zu groß (max. 5 MB).");
  const type = detectImageType(bytes);
  if (!type) throw badRequest("Nur JPEG, PNG oder WebP sind erlaubt.");

  const path = `${user.id}/${crypto.randomUUID()}.${type.ext}`;
  const { error } = await sb()
    .storage.from(AVATAR_BUCKET)
    // Max. 1 h Cache: Jedes Bild hat eine eigene URL (Austausch ist sofort sichtbar), und ein gelöschtes
    // Foto ist so höchstens noch 1 h über Supabases CDN unter der alten URL abrufbar.
    .upload(path, bytes, { contentType: type.mime, cacheControl: "3600", upsert: false });
  if (error) {
    console.error("[storage]", error);
    throw new ApiError(500, "storage_error", "Bild konnte nicht gespeichert werden.");
  }

  const updated = must(
    await sb().from("profiles").update({ avatar_path: path }).eq("id", user.id).select().single<ProfileRow>(),
  );
  if (user.avatar_path) await sb().storage.from(AVATAR_BUCKET).remove([user.avatar_path]);
  return updated;
}

export async function removeAvatar(user: ProfileRow): Promise<ProfileRow> {
  const updated = must(
    await sb().from("profiles").update({ avatar_path: null }).eq("id", user.id).select().single<ProfileRow>(),
  );
  if (user.avatar_path) await sb().storage.from(AVATAR_BUCKET).remove([user.avatar_path]);
  return updated;
}

/* ------------------------------------------------------------------ */
/* Konto                                                               */
/* ------------------------------------------------------------------ */

/** Kunde trennt sich von seinem Coach; Planzuweisungen dieses Coaches werden aufgehoben, der Coach wird informiert. */
export async function leaveTrainer(client: ProfileRow): Promise<ProfileRow> {
  if (!client.trainer_id) throw badRequest("Du bist mit keinem Coach verbunden.");
  await removeClient(client.trainer_id, client.id);
  await addNotice(client.trainer_id, "client_left", client.name);
  return (await getProfile(client.id))!;
}

/* ------------------------------------------------------------------ */
/* Hinweise (Verbindung beendet)                                       */
/* ------------------------------------------------------------------ */

const NOTICE_TTL_DAYS = 30;

export async function addNotice(userId: string, kind: NoticeKind, actorName: string, detail: string | null = null) {
  // Ein fehlender Hinweis darf die eigentliche Aktion nicht scheitern lassen
  const { error } = await sb().from("notices").insert({ user_id: userId, kind, actor_name: actorName, detail });
  if (error) console.error("[notices]", error);
}

/** Offene Hinweise der letzten 30 Tage; ältere werden dabei aufgeräumt. */
export async function listNotices(user: ProfileRow): Promise<Notice[]> {
  const cutoff = new Date(Date.now() - NOTICE_TTL_DAYS * 86_400_000).toISOString();
  await sb().from("notices").delete().eq("user_id", user.id).lt("created_at", cutoff);
  const rows = must(
    await sb()
      .from("notices")
      .select("id, kind, actor_name, detail, read_at, created_at")
      .eq("user_id", user.id)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false }),
  ) as { id: string; kind: NoticeKind; actor_name: string; detail: string | null; read_at: string | null; created_at: string }[];
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    actorName: r.actor_name,
    detail: r.detail,
    readAt: r.read_at ? iso(r.read_at) : null,
    createdAt: iso(r.created_at),
  }));
}

/** Alle offenen Hinweise als gelesen markieren (beim Öffnen der Glocke). */
export async function markNoticesRead(user: ProfileRow): Promise<number> {
  const rows = must(
    await sb().from("notices").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null).select("id"),
  ) as { id: string }[];
  return rows.length;
}

export async function dismissNotice(user: ProfileRow, id: string) {
  const rows = must(
    await sb().from("notices").update({ dismissed_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).select("id"),
  );
  if (!rows?.length) throw notFound("Hinweis nicht gefunden.");
}

/**
 * Löscht das Konto endgültig (Supabase Auth). Über die Fremdschlüssel werden Profil, Pläne,
 * Einladungen, Workouts, Messungen und Nachrichten mitgelöscht; Kunden eines gelöschten
 * Trainers verlieren nur die Verbindung.
 */
export async function deleteAccount(user: ProfileRow) {
  const { data: files } = await sb().storage.from(AVATAR_BUCKET).list(user.id);
  if (files?.length) await sb().storage.from(AVATAR_BUCKET).remove(files.map((f) => `${user.id}/${f.name}`));
  if (user.role === "studio") {
    const studio = await studioOf(user);
    if (studio) {
      for (const folder of [`studios/${studio.id}`, `studios/${studio.id}/staff`]) {
        const { data: files } = await sb().storage.from(AVATAR_BUCKET).list(folder);
        const real = (files ?? []).filter((f) => f.id); // Unterordner haben keine id
        if (real.length) await sb().storage.from(AVATAR_BUCKET).remove(real.map((f) => `${folder}/${f.name}`));
      }
    }
  }
  const { error } = await sb().auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[auth] deleteUser", error);
    throw new ApiError(500, "delete_failed", "Konto konnte nicht gelöscht werden.");
  }
}

/* ------------------------------------------------------------------ */
/* Feature-Wünsche (nur einreichen; lesen später im Admin-Dashboard)    */
/* ------------------------------------------------------------------ */

const FEATURE_REQUESTS_PER_DAY = 20;

export async function createFeatureRequest(user: ProfileRow, input: FeatureRequestInput): Promise<{ id: string; createdAt: string }> {
  const since = new Date(Date.now() - DAY).toISOString();
  const { count, error: countError } = await sb()
    .from("feature_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (countError) throw dbError(countError);
  if ((count ?? 0) >= FEATURE_REQUESTS_PER_DAY) {
    throw new ApiError(429, "rate_limited", "Danke für deinen Eifer! Für heute hast du genug Wünsche geschickt – morgen geht's weiter.");
  }
  const row = must(
    await sb()
      .from("feature_requests")
      .insert({
        user_id: user.id,
        role: user.role === "trainer" ? "trainer" : "studio",
        body: input.body,
        area: input.area ?? null,
        importance: input.importance ?? null,
        context: input.context ?? null,
      })
      .select("id, created_at")
      .single<{ id: string; created_at: string }>(),
  );
  return { id: row.id, createdAt: iso(row.created_at) };
}

/* ------------------------------------------------------------------ */
/* Studios                                                             */
/* ------------------------------------------------------------------ */

export interface StudioRow {
  id: string;
  owner_id: string;
  name: string;
  max_trainers: number;
  logo_path: string | null;
  description: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  opening_hours: OpeningHoursDay[];
  amenities: string[];
  created_at: string;
}

const toStudioInfo = (r: StudioRow): StudioInfo => ({ id: r.id, name: r.name, logoUrl: avatarUrl(r.logo_path) });

/** Studio des Nutzers: eigenes (Inhaber) bzw. das, zu dem Trainer/Kunde gehört. */
export async function studioOf(user: ProfileRow): Promise<StudioRow | null> {
  const query = sb().from("studios").select("*");
  if (user.role === "studio") return must(await query.eq("owner_id", user.id).maybeSingle<StudioRow>());
  if (!user.studio_id) return null;
  return must(await query.eq("id", user.studio_id).maybeSingle<StudioRow>());
}

export async function getStudioInfo(user: ProfileRow): Promise<StudioInfo | null> {
  const row = await studioOf(user);
  return row ? toStudioInfo(row) : null;
}

/** Eigenes Studio des Inhabers oder 404. */
export async function ownStudio(owner: ProfileRow): Promise<StudioRow> {
  const row = await studioOf(owner);
  if (!row || row.owner_id !== owner.id) throw notFound("Studio nicht gefunden.");
  return row;
}

export async function getStudioOverview(owner: ProfileRow): Promise<StudioOverview> {
  const studio = await ownStudio(owner);
  const [trainerRows, clientRows, inviteRows] = await Promise.all([
    sb().from("profiles").select("*").eq("studio_id", studio.id).eq("role", "trainer").order("name").then(must) as Promise<ProfileRow[]>,
    sb().rpc("studio_client_summaries", { p_studio: studio.id }).then(must) as Promise<
      {
        id: string;
        name: string;
        email: string;
        avatar_path: string | null;
        trainer_id: string | null;
        trainer_name: string | null;
        joined_at: string;
        last_workout_at: string | null;
        workouts_last_7_days: number;
      }[]
    >,
    sb()
      .from("studio_invitations")
      .select("*")
      .eq("studio_id", studio.id)
      .order("created_at", { ascending: false })
      .then(must) as Promise<InvitationRow[]>,
  ]);

  const clients: StudioClient[] = clientRows.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    avatarUrl: avatarUrl(c.avatar_path),
    trainerId: c.trainer_id,
    trainerName: c.trainer_name,
    joinedAt: iso(c.joined_at),
    lastWorkoutAt: isoOrNull(c.last_workout_at),
    workoutsLast7Days: c.workouts_last_7_days,
  }));
  const trainers: StudioTrainer[] = trainerRows.map((t) => {
    const own = clients.filter((c) => c.trainerId === t.id);
    return {
      id: t.id,
      name: t.name,
      email: t.email,
      avatarUrl: avatarUrl(t.avatar_path),
      clientCount: own.length,
      activeClients: own.filter((c) => c.workoutsLast7Days > 0).length,
    };
  });

  return {
    studio: { ...toStudioInfo(studio), maxTrainers: studio.max_trainers },
    trainers,
    clients,
    invitations: inviteRows.map(toInvitation),
    staff: await listStaff(studio.id),
  };
}

export async function updateStudio(owner: ProfileRow, patch: StudioUpdateInput): Promise<StudioInfo> {
  const studio = await ownStudio(owner);
  // Nur übergebene Felder ändern (undefined = unverändert, null = leeren)
  const map: Record<string, keyof StudioUpdateInput> = {
    name: "name",
    description: "description",
    street: "street",
    postal_code: "postalCode",
    city: "city",
    phone: "phone",
    email: "email",
    website: "website",
    instagram: "instagram",
    amenities: "amenities",
  };
  const update: Record<string, unknown> = {};
  for (const [col, key] of Object.entries(map)) if (patch[key] !== undefined) update[col] = patch[key];
  if (patch.openingHours !== undefined) update.opening_hours = [...patch.openingHours].sort((a, b) => a.day - b.day);
  if (patch.amenities !== undefined) update.amenities = [...new Set(patch.amenities)];
  if (!Object.keys(update).length) return toStudioInfo(studio);
  const row = must(await sb().from("studios").update(update).eq("id", studio.id).select().single<StudioRow>());
  return toStudioInfo(row);
}

/** Studio-Seite für Inhaber, Trainer und Kunden des Studios (404 ohne Studio). */
export async function getStudioProfile(user: ProfileRow): Promise<StudioProfile> {
  const studio = await studioOf(user);
  if (!studio) throw notFound("Du gehörst zu keinem Studio.");
  const trainers = must(
    await sb().from("profiles").select("id, name, avatar_path").eq("studio_id", studio.id).eq("role", "trainer").order("name"),
  ) as { id: string; name: string; avatar_path: string | null }[];
  return {
    ...toStudioInfo(studio),
    description: studio.description,
    address: { street: studio.street, postalCode: studio.postal_code, city: studio.city },
    contact: { phone: studio.phone, email: studio.email, website: studio.website, instagram: studio.instagram },
    openingHours: studio.opening_hours ?? [],
    amenities: studio.amenities ?? [],
    trainers: trainers.map((t) => ({ id: t.id, name: t.name, avatarUrl: avatarUrl(t.avatar_path) })),
    staff: await listStaff(studio.id),
  };
}

export async function setStudioLogo(owner: ProfileRow, bytes: Uint8Array): Promise<StudioInfo> {
  const studio = await ownStudio(owner);
  if (bytes.byteLength > AVATAR_MAX_BYTES) throw badRequest("Bild ist zu groß (max. 5 MB).");
  const type = detectImageType(bytes);
  if (!type) throw badRequest("Nur JPEG, PNG oder WebP sind erlaubt.");
  const path = `studios/${studio.id}/${crypto.randomUUID()}.${type.ext}`;
  const { error } = await sb()
    .storage.from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: type.mime, cacheControl: "3600", upsert: false });
  if (error) {
    console.error("[storage]", error);
    throw new ApiError(500, "storage_error", "Logo konnte nicht gespeichert werden.");
  }
  const row = must(await sb().from("studios").update({ logo_path: path }).eq("id", studio.id).select().single<StudioRow>());
  if (studio.logo_path) await sb().storage.from(AVATAR_BUCKET).remove([studio.logo_path]);
  return toStudioInfo(row);
}

export async function removeStudioLogo(owner: ProfileRow): Promise<StudioInfo> {
  const studio = await ownStudio(owner);
  const row = must(await sb().from("studios").update({ logo_path: null }).eq("id", studio.id).select().single<StudioRow>());
  if (studio.logo_path) await sb().storage.from(AVATAR_BUCKET).remove([studio.logo_path]);
  return toStudioInfo(row);
}

export async function createStudioInvitation(owner: ProfileRow, email: string | undefined, validDays: number): Promise<Invitation> {
  const studio = await ownStudio(owner);
  const row = must(
    await sb()
      .from("studio_invitations")
      .insert({
        code: generateCode(),
        studio_id: studio.id,
        email: email ?? null,
        expires_at: new Date(Date.now() + validDays * DAY).toISOString(),
      })
      .select()
      .single<InvitationRow>(),
  );
  return toInvitation(row);
}

export async function deleteStudioInvitation(owner: ProfileRow, code: string) {
  const studio = await ownStudio(owner);
  const rows = must(await sb().from("studio_invitations").delete().eq("code", code).eq("studio_id", studio.id).select("code"));
  if (!rows?.length) throw notFound("Einladung nicht gefunden.");
}

/** Öffentliche Prüfung eines Studio-Codes (Registrierung als Trainer). */
export async function checkStudioInvitation(code: string): Promise<{ valid: boolean; studioName: string | null }> {
  const inv = must(
    await sb().from("studio_invitations").select("studio_id, used_by, expires_at").eq("code", code).maybeSingle<InvitationRow & { studio_id: string }>(),
  );
  if (!inv || inv.used_by || new Date(inv.expires_at) < new Date()) return { valid: false, studioName: null };
  const studio = must(await sb().from("studios").select("name").eq("id", inv.studio_id).maybeSingle<{ name: string }>());
  return { valid: !!studio, studioName: studio?.name ?? null };
}

/** Trainer tritt per Code einem Studio bei (atomar in Postgres). */
export async function joinStudio(trainer: ProfileRow, code: string): Promise<ProfileRow> {
  must(await sb().rpc("redeem_studio_invitation", { p_code: code, p_trainer: trainer.id }));
  return (await getProfile(trainer.id))!;
}

/** Kunden einem Trainer des Studios zuweisen bzw. übertragen (Pläne werden kopiert). */
export async function assignStudioClient(owner: ProfileRow, clientId: string, trainerId: string) {
  const studio = await ownStudio(owner);
  must(await sb().rpc("studio_transfer_client", { p_studio: studio.id, p_client: clientId, p_to: trainerId }));
}

/** „Trainer fällt aus“: alle Kunden, Pläne und offenen Einladungen übertragen. */
export async function transferStudioTrainer(owner: ProfileRow, fromId: string, toId: string): Promise<number> {
  const studio = await ownStudio(owner);
  return must(await sb().rpc("studio_transfer_trainer", { p_studio: studio.id, p_from: fromId, p_to: toId })) as number;
}

export async function removeStudioTrainer(owner: ProfileRow, trainerId: string) {
  const studio = await ownStudio(owner);
  must(await sb().rpc("studio_remove_trainer", { p_studio: studio.id, p_trainer: trainerId }));
}

/** Einheitliche Antwort für /me & Co.: Nutzer, Coach (bei Kunden) und Studio. */
export async function meResponse(user: ProfileRow): Promise<MeResponse> {
  const [trainer, studio] = await Promise.all([getTrainer(user.trainer_id), getStudioInfo(user)]);
  return { user: toUser(user), trainer, studio };
}

/* ------------------------------------------------------------------ */
/* Studio: weitere Mitarbeitende (ohne Konto)                          */
/* ------------------------------------------------------------------ */

const MAX_STAFF = 50;

interface StaffRow {
  id: string;
  studio_id: string;
  name: string;
  category: StudioStaffMember["category"];
  position: string | null;
  bio: string | null;
  photo_path: string | null;
}

const toStaff = (r: StaffRow): StudioStaffMember => ({
  id: r.id,
  name: r.name,
  category: r.category,
  position: r.position,
  bio: r.bio,
  photoUrl: avatarUrl(r.photo_path),
});

async function listStaff(studioId: string): Promise<StudioStaffMember[]> {
  const rows = must(
    await sb().from("studio_staff").select("*").eq("studio_id", studioId).order("sort_order").order("name"),
  ) as StaffRow[];
  return rows.map(toStaff);
}

/** Mitarbeitende:r des eigenen Studios oder 404. */
async function ownStaff(owner: ProfileRow, id: string): Promise<{ studio: StudioRow; row: StaffRow }> {
  const studio = await ownStudio(owner);
  const row = must(await sb().from("studio_staff").select("*").eq("id", id).eq("studio_id", studio.id).maybeSingle<StaffRow>());
  if (!row) throw notFound("Mitarbeitende:r nicht gefunden.");
  return { studio, row };
}

export async function createStaff(owner: ProfileRow, input: StaffInput): Promise<StudioStaffMember> {
  const studio = await ownStudio(owner);
  const { count } = await sb().from("studio_staff").select("id", { count: "exact", head: true }).eq("studio_id", studio.id);
  if ((count ?? 0) >= MAX_STAFF) throw badRequest(`Maximal ${MAX_STAFF} Mitarbeitende pro Studio.`);
  const row = must(
    await sb()
      .from("studio_staff")
      .insert({ studio_id: studio.id, name: input.name, category: input.category, position: input.position ?? null, bio: input.bio ?? null })
      .select()
      .single<StaffRow>(),
  );
  return toStaff(row);
}

export async function updateStaff(owner: ProfileRow, id: string, patch: Partial<StaffInput>): Promise<StudioStaffMember> {
  const { row } = await ownStaff(owner, id);
  const update = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  if (!Object.keys(update).length) return toStaff(row);
  return toStaff(must(await sb().from("studio_staff").update(update).eq("id", row.id).select().single<StaffRow>()));
}

export async function deleteStaff(owner: ProfileRow, id: string) {
  const { row } = await ownStaff(owner, id);
  must(await sb().from("studio_staff").delete().eq("id", row.id));
  if (row.photo_path) await sb().storage.from(AVATAR_BUCKET).remove([row.photo_path]);
}

export async function setStaffPhoto(owner: ProfileRow, id: string, bytes: Uint8Array): Promise<StudioStaffMember> {
  const { studio, row } = await ownStaff(owner, id);
  if (bytes.byteLength > AVATAR_MAX_BYTES) throw badRequest("Bild ist zu groß (max. 5 MB).");
  const type = detectImageType(bytes);
  if (!type) throw badRequest("Nur JPEG, PNG oder WebP sind erlaubt.");
  const path = `studios/${studio.id}/staff/${crypto.randomUUID()}.${type.ext}`;
  const { error } = await sb().storage.from(AVATAR_BUCKET).upload(path, bytes, { contentType: type.mime, cacheControl: "3600", upsert: false });
  if (error) {
    console.error("[storage]", error);
    throw new ApiError(500, "storage_error", "Foto konnte nicht gespeichert werden.");
  }
  const updated = must(await sb().from("studio_staff").update({ photo_path: path }).eq("id", row.id).select().single<StaffRow>());
  if (row.photo_path) await sb().storage.from(AVATAR_BUCKET).remove([row.photo_path]);
  return toStaff(updated);
}

export async function removeStaffPhoto(owner: ProfileRow, id: string): Promise<StudioStaffMember> {
  const { row } = await ownStaff(owner, id);
  const updated = must(await sb().from("studio_staff").update({ photo_path: null }).eq("id", row.id).select().single<StaffRow>());
  if (row.photo_path) await sb().storage.from(AVATAR_BUCKET).remove([row.photo_path]);
  return toStaff(updated);
}
