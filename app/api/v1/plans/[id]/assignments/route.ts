import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { assignPlan, getPlanFor } from "@/lib/server/repo";
import { assignPlanSchema } from "@/lib/schemas";

export const POST = handler<RouteContext<"/api/v1/plans/[id]/assignments">>(async (req, ctx) => {
  const trainer = await requireUser(req, "trainer");
  const { id } = await ctx.params;
  const { clientId } = await parseBody(req, assignPlanSchema);
  await assignPlan(trainer.id, id, clientId);
  return Response.json(await getPlanFor(trainer, id), { status: 201 });
});
