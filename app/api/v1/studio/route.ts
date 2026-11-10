import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { getStudioOverview, updateStudio } from "@/lib/server/repo";
import { studioUpdateSchema } from "@/lib/schemas";

/** Studio-Inhaber: Übersicht über Trainer, Kunden (inkl. „ohne Trainer“) und Trainer-Einladungen. */
export const GET = handler(async (req) => {
  const owner = await requireUser(req, "studio");
  return Response.json(await getStudioOverview(owner));
});

export const PATCH = handler(async (req) => {
  const owner = await requireUser(req, "studio");
  return Response.json(await updateStudio(owner, await parseBody(req, studioUpdateSchema)));
});
