import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { setTrainerNote } from "@/lib/server/booking";
import { trainerNoteSchema } from "@/lib/schemas";

type Ctx = RouteContext<"/api/v1/appointments/[id]/note">;

/** Private Notiz des Trainers setzen ({ note: string | null }) – sehen weder Kunde noch Studio. */
export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req, "trainer");
  const { note } = await parseBody(req, trainerNoteSchema);
  return Response.json(await setTrainerNote(user, (await ctx.params).id, note));
});
