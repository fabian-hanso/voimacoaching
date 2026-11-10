import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { createWorkout, listWorkouts, resolveClientId } from "@/lib/server/repo";
import { workoutInputSchema } from "@/lib/schemas";

/**
 * GET  Kunde: eigene Workouts · Trainer: `?clientId=<id>` · Paging: `?limit=50&before=<ISO-Datum>`
 * POST Kunde loggt ein Workout.
 */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  const params = req.nextUrl.searchParams;
  const clientId = await resolveClientId(user, params.get("clientId"));
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 200);
  return Response.json({ workouts: await listWorkouts(clientId, limit, params.get("before")) });
});

export const POST = handler(async (req) => {
  const client = await requireUser(req, "client");
  const input = await parseBody(req, workoutInputSchema);
  return Response.json(await createWorkout(client.id, input), { status: 201 });
});
