import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { listClients } from "@/lib/server/repo";

export const GET = handler(async (req) => {
  const trainer = await requireUser(req, "trainer");
  return Response.json({ clients: await listClients(trainer.id) });
});
