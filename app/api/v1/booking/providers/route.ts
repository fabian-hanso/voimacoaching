import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { listBookingProviders } from "@/lib/server/booking";

/** Für Kunden: eigener Coach + Trainer des Studios, sofern sie Termine anbieten – inkl. Angebote und nächster freier Zeit. */
export const GET = handler(async (req) => {
  const client = await requireUser(req, "client");
  return Response.json({ providers: await listBookingProviders(client) });
});
