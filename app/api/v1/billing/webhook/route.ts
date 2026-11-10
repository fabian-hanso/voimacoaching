import { handleStripeEvent, verifyWebhook } from "@/lib/server/billing";
import { handler } from "@/lib/server/http";

/**
 * Stripe-Webhook (ohne Login, per Signatur geprüft). Rohdaten lesen – die Signatur gilt für den unveränderten Body.
 * Fehler beim Verarbeiten → 500, damit Stripe das Event erneut zustellt.
 */
export const POST = handler(async (req) => {
  const event = await verifyWebhook(
    await req.text(),
    req.headers.get("stripe-signature"),
  );
  await handleStripeEvent(event);
  return Response.json({ received: true });
});
