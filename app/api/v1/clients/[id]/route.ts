import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { addNotice, getClientOf, getProgress, listAssignedPlans, removeClient } from "@/lib/server/repo";
import type { ClientDetail } from "@/lib/types";

type Ctx = RouteContext<"/api/v1/clients/[id]">;

export const GET = handler<Ctx>(async (req, ctx) => {
  const trainer = await requireUser(req, "trainer");
  const { id } = await ctx.params;
  const client = await getClientOf(trainer.id, id);
  const [plans, progress] = await Promise.all([listAssignedPlans(id), getProgress(id)]);
  return Response.json({
    client,
    plans: plans.filter((p) => p.trainerId === trainer.id),
    progress,
  } satisfies ClientDetail);
});

/** Trennt den Kunden vom Trainer (Konto des Kunden bleibt bestehen; der Kunde wird informiert). */
export const DELETE = handler<Ctx>(async (req, ctx) => {
  const trainer = await requireUser(req, "trainer");
  const { id } = await ctx.params;
  await removeClient(trainer.id, id);
  await addNotice(id, "client_removed", trainer.name);
  return new Response(null, { status: 204 });
});
