import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { markNoticesRead } from "@/lib/server/repo";

/** Alle Benachrichtigungen als gelesen markieren (setzt den Zähler an der Glocke zurück). */
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json({ updated: await markNoticesRead(user) });
});
