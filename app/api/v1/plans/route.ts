import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { createPlan, listAssignedPlans, listPlans } from "@/lib/server/repo";
import { planInputSchema } from "@/lib/schemas";

/** Trainer: eigene Pläne inkl. Zuweisungen. Kunde: zugewiesene Pläne. */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json({ plans: user.role === "trainer" ? await listPlans(user.id) : await listAssignedPlans(user.id) });
});

export const POST = handler(async (req) => {
  const trainer = await requireUser(req, "trainer");
  const input = await parseBody(req, planInputSchema);
  return Response.json(await createPlan(trainer.id, input), { status: 201 });
});
