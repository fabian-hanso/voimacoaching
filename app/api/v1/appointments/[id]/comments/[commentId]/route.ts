import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { deleteComment } from "@/lib/server/booking";

type Ctx = RouteContext<"/api/v1/appointments/[id]/comments/[commentId]">;

/** Eigenen Kommentar löschen. */
export const DELETE = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { id, commentId } = await ctx.params;
  await deleteComment(user, id, commentId);
  return new Response(null, { status: 204 });
});
