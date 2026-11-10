import { requireUser } from "@/lib/server/auth";
import { forbidden, handler, parseBody } from "@/lib/server/http";
import { joinStudio, joinStudioAsClient, leaveStudio, meResponse } from "@/lib/server/repo";
import { joinStudioSchema } from "@/lib/schemas";

/**
 * Studio beitreten per Code:
 * - Trainer: Einladungscode des Studios (einmalig) – seine Kunden kommen mit.
 * - Kunde: Mitglieds-Code des Studios (wiederverwendbar, z. B. QR an der Rezeption) – ohne festen Coach.
 */
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  const { code } = await parseBody(req, joinStudioSchema);
  if (user.role === "trainer") return Response.json(await meResponse(await joinStudio(user, code)));
  if (user.role === "client") return Response.json(await meResponse(await joinStudioAsClient(user, code)));
  throw forbidden("Studios können keinem anderen Studio beitreten.");
});

/** Kunde verlässt sein Studio (ein Coach aus diesem Studio wird dabei ebenfalls getrennt). */
export const DELETE = handler(async (req) => {
  const client = await requireUser(req, "client");
  return Response.json(await meResponse(await leaveStudio(client)));
});
