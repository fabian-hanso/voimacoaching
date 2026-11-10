import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { createMeasurement, listMeasurements, resolveClientId } from "@/lib/server/repo";
import { measurementInputSchema } from "@/lib/schemas";

/** GET Kunde: eigene Messungen · Trainer: `?clientId=<id>`. POST: Kunde erfasst Messwerte. */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  const clientId = await resolveClientId(user, req.nextUrl.searchParams.get("clientId"));
  return Response.json({ measurements: await listMeasurements(clientId) });
});

export const POST = handler(async (req) => {
  const client = await requireUser(req, "client");
  const input = await parseBody(req, measurementInputSchema);
  return Response.json(await createMeasurement(client.id, input), { status: 201 });
});
