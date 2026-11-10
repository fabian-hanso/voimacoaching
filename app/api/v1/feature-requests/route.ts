import { requireUser } from "@/lib/server/auth";
import { forbidden, handler, parseBody } from "@/lib/server/http";
import { createFeatureRequest } from "@/lib/server/repo";
import { featureRequestSchema } from "@/lib/schemas";

/**
 * Trainer (später auch Studios) reichen einen Feature-Wunsch ein.
 * Es gibt bewusst KEIN GET: Wünsche sind nur für Admins sichtbar (kommendes Admin-Dashboard).
 */
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  if (user.role === "client") throw forbidden("Nur für Trainer und Studios.");
  const input = await parseBody(req, featureRequestSchema);
  return Response.json(await createFeatureRequest(user, input), { status: 201 });
});
