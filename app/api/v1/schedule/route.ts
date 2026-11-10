import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { createDirectAppointment, getSchedule } from "@/lib/server/booking";
import { studioAppointmentSchema } from "@/lib/schemas";

/**
 * Wochenkalender: ?week=YYYY-MM-DD (beliebiger Tag der Woche, Standard: aktuelle Woche).
 * Studio: alle Trainer des Studios · Trainer: nur sich selbst.
 */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json(await getSchedule(user, req.nextUrl.searchParams.get("week")));
});

/** Termin direkt eintragen (sofort bestätigt): Studio bei eigenen Trainern, Trainer bei sich – für Kunden oder Gäste. */
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json(await createDirectAppointment(user, await parseBody(req, studioAppointmentSchema)), { status: 201 });
});
