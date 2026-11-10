import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { removeStudioClient } from "@/lib/server/repo";

type Ctx = RouteContext<"/api/v1/studio/clients/[clientId]">;

/**
 * Kunde/Mitglied aus dem Studio entfernen (z. B. nach Vertragsende). Ein Coach aus dem Studio wird getrennt,
 * künftige Kurs- und Terminbuchungen im Studio storniert. Kunde und ggf. Coach bekommen einen Hinweis.
 */
export const DELETE = handler<Ctx>(async (req, ctx) => {
  const owner = await requireUser(req, "studio");
  await removeStudioClient(owner, (await ctx.params).clientId);
  return new Response(null, { status: 204 });
});
