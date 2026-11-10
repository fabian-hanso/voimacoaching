import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { setAppointmentContact } from "@/lib/server/booking";
import { appointmentContactSchema } from "@/lib/schemas";

type Ctx = RouteContext<"/api/v1/appointments/[id]/contact">;

/** Kontaktdaten am Termin pflegen ({ email?, phone? }; leer/null = aus dem Profil übernehmen). Nur wer den Termin eingetragen hat. */
export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  return Response.json(await setAppointmentContact(user, (await ctx.params).id, await parseBody(req, appointmentContactSchema)));
});
