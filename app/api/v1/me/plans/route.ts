import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { listAssignedPlans } from "@/lib/server/repo";

/** Kunde: alle zugewiesenen Trainingspläne. */
export const GET = handler(async (req) => {
  const user = await requireUser(req, "client");
  return Response.json({ plans: await listAssignedPlans(user.id) });
});
