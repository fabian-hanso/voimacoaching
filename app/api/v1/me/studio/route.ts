import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { joinStudio, meResponse } from "@/lib/server/repo";
import { joinStudioSchema } from "@/lib/schemas";

/** Trainer tritt per Code einem Studio bei; seine Kunden kommen mit. */
export const POST = handler(async (req) => {
  const trainer = await requireUser(req, "trainer");
  const { code } = await parseBody(req, joinStudioSchema);
  return Response.json(await meResponse(await joinStudio(trainer, code)));
});
