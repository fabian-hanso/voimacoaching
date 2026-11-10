import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { renewJoinCode } from "@/lib/server/repo";

/** Neuen Mitglieds-Code erzeugen – der alte Code (und alte QR-Aushänge) funktionieren danach nicht mehr. */
export const POST = handler(async (req) => {
  const owner = await requireUser(req, "studio");
  return Response.json(await renewJoinCode(owner));
});
