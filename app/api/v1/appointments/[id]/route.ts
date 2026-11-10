import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { actOnAppointment } from "@/lib/server/booking";
import { appointmentActionSchema } from "@/lib/schemas";

type Ctx = RouteContext<"/api/v1/appointments/[id]">;

/** { action: "confirm" | "decline" | "cancel", message? } – bestätigen/ablehnen nur der Trainer, absagen Kunde, Trainer und Studio. */
export const PATCH = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { action, message } = await parseBody(req, appointmentActionSchema);
  return Response.json(await actOnAppointment(user, (await ctx.params).id, action, message));
});
