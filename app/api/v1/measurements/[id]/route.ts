import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { deleteMeasurement } from "@/lib/server/repo";

export const DELETE = handler<RouteContext<"/api/v1/measurements/[id]">>(async (req, ctx) => {
  const user = await requireUser(req, "client");
  const { id } = await ctx.params;
  await deleteMeasurement(user, id);
  return new Response(null, { status: 204 });
});
