import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { listAppointments, requestAppointment } from "@/lib/server/booking";
import { appointmentRequestSchema } from "@/lib/schemas";

/** Kunden: eigene Termine · Trainer: bei sich · Studios: bei allen eigenen Trainern (kommende + letzte 30 Tage). */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json({ appointments: await listAppointments(user) });
});

/** Kunde fragt einen Termin bei seinem Coach oder einem Trainer seines Studios an. */
export const POST = handler(async (req) => {
  const client = await requireUser(req, "client");
  return Response.json(await requestAppointment(client, await parseBody(req, appointmentRequestSchema)), { status: 201 });
});
