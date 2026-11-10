import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { deleteWorkout, getWorkoutFor } from "@/lib/server/repo";

type Ctx = RouteContext<"/api/v1/workouts/[id]">;

export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  return Response.json(await getWorkoutFor(user, id));
});

export const DELETE = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req, "client");
  const { id } = await ctx.params;
  await deleteWorkout(user, id);
  return new Response(null, { status: 204 });
});
