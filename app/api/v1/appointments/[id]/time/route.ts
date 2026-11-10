import { requireUser } from "@/lib/server/auth";
import { moveAppointment } from "@/lib/server/booking";
import { handler, parseBody } from "@/lib/server/http";
import { appointmentMoveSchema } from "@/lib/schemas";

type Ctx = RouteContext<"/api/v1/appointments/[id]/time">;

/** Termin verschieben: { startsAt, durationMin? } – nur Trainer (eigene) und Studio (seiner Trainer). */
export const PATCH = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  return Response.json(await moveAppointment(user, (await ctx.params).id, await parseBody(req, appointmentMoveSchema)));
});
