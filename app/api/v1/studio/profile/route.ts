import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { getStudioProfile } from "@/lib/server/repo";

/** Studio-Seite (Infos, Öffnungszeiten, Kontakt, Ausstattung, Team) – für Inhaber, Trainer und Kunden des Studios. */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json(await getStudioProfile(user));
});
