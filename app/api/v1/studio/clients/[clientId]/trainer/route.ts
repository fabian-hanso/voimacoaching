import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { assignStudioClient } from "@/lib/server/repo";
import { assignTrainerSchema } from "@/lib/schemas";

/** Kunden einem Trainer des Studios zuweisen bzw. übertragen. Zugewiesene Pläne werden für den neuen Trainer kopiert. */
export const PUT = handler<RouteContext<"/api/v1/studio/clients/[clientId]/trainer">>(async (req, ctx) => {
  const owner = await requireUser(req, "studio");
  const { trainerId } = await parseBody(req, assignTrainerSchema);
  await assignStudioClient(owner, (await ctx.params).clientId, trainerId);
  return new Response(null, { status: 204 });
});
