import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { createDirectAppointment, getSchedule } from "@/lib/server/booking";
import { studioAppointmentSchema } from "@/lib/schemas";

/** Wie /schedule, nur für Studios (bestehende Integrationen). */
export const GET = handler(async (req) => {
  const owner = await requireUser(req, "studio");
  return Response.json(await getSchedule(owner, req.nextUrl.searchParams.get("week")));
});

export const POST = handler(async (req) => {
  const owner = await requireUser(req, "studio");
  return Response.json(await createDirectAppointment(owner, await parseBody(req, studioAppointmentSchema)), { status: 201 });
});
