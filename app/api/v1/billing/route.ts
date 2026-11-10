import { requireUser } from "@/lib/server/auth";
import { getBillingStatus } from "@/lib/server/billing";
import { handler } from "@/lib/server/http";

/** Abo-Status des angemeldeten Trainers/Studios (Kunden: `billing: null`). */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json({ billing: await getBillingStatus(user) });
});
