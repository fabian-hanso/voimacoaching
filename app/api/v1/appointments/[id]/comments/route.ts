import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { addComment, listComments } from "@/lib/server/booking";
import { appointmentCommentSchema } from "@/lib/schemas";

type Ctx = RouteContext<"/api/v1/appointments/[id]/comments">;

/** Kommentare zum Termin – sichtbar für Kunde, Trainer und Studio des Trainers. */
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  return Response.json({ comments: await listComments(user, (await ctx.params).id) });
});

export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { body } = await parseBody(req, appointmentCommentSchema);
  return Response.json(await addComment(user, (await ctx.params).id, body), { status: 201 });
});
