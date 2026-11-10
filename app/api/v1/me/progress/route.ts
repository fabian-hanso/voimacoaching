import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { getProgress } from "@/lib/server/repo";

/** Kunde: eigene Fortschritts-Auswertung. */
export const GET = handler(async (req) => {
  const user = await requireUser(req, "client");
  return Response.json(await getProgress(user.id));
});
