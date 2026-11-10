import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { deletePlan, getPlanFor, updatePlan } from "@/lib/server/repo";
import { planInputSchema } from "@/lib/schemas";

type Ctx = RouteContext<"/api/v1/plans/[id]">;

export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  return Response.json(await getPlanFor(user, id));
});

export const PUT = handler<Ctx>(async (req, ctx) => {
  const trainer = await requireUser(req, "trainer");
  const { id } = await ctx.params;
  const input = await parseBody(req, planInputSchema);
  return Response.json(await updatePlan(trainer.id, id, input));
});

export const DELETE = handler<Ctx>(async (req, ctx) => {
  const trainer = await requireUser(req, "trainer");
  const { id } = await ctx.params;
  await deletePlan(trainer.id, id);
  return new Response(null, { status: 204 });
});
