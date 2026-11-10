import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { getClientOf, getProgress } from "@/lib/server/repo";

export const GET = handler<RouteContext<"/api/v1/clients/[id]/progress">>(async (req, ctx) => {
  const trainer = await requireUser(req, "trainer");
  const { id } = await ctx.params;
  await getClientOf(trainer.id, id);
  return Response.json(await getProgress(id));
});
