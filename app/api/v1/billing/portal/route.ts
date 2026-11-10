import { requireUser } from "@/lib/server/auth";
import { createPortal } from "@/lib/server/billing";
import { handler } from "@/lib/server/http";

/** Öffnet das Stripe-Kundenportal (Paket wechseln, kündigen, Zahlungsart, Rechnungen) → `{ url }`. */
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json(await createPortal(user, req.nextUrl.origin));
});
