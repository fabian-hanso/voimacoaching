import { requireUser } from "@/lib/server/auth";
import { badRequest, handler } from "@/lib/server/http";
import { getSlots } from "@/lib/server/booking";

/** Freie Startzeiten eines Trainers für ein Angebot: ?trainerId=…&serviceId=… */
export const GET = handler(async (req) => {
  const client = await requireUser(req, "client");
  const trainerId = req.nextUrl.searchParams.get("trainerId");
  const serviceId = req.nextUrl.searchParams.get("serviceId");
  if (!trainerId || !serviceId) throw badRequest("trainerId und serviceId sind erforderlich.");
  return Response.json({ days: await getSlots(client, trainerId, serviceId) });
});
