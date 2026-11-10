import { requireUser } from "@/lib/server/auth";
import { createCheckout } from "@/lib/server/billing";
import { handler, parseBody } from "@/lib/server/http";
import { checkoutSchema } from "@/lib/schemas";

/** Startet Stripe Checkout für ein Paket → `{ url }` der Bezahlseite. */
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  const { plan, interval } = await parseBody(req, checkoutSchema);
  return Response.json(
    await createCheckout(user, plan, interval, req.nextUrl.origin),
  );
});
