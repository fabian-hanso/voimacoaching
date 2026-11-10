import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { unassignPlan } from "@/lib/server/repo";

export const DELETE = handler<RouteContext<"/api/v1/plans/[id]/assignments/[clientId]">>(async (req, ctx) => {
  const trainer = await requireUser(req, "trainer");
  const { id, clientId } = await ctx.params;
  await unassignPlan(trainer.id, id, clientId);
  return new Response(null, { status: 204 });
});
