import { handler } from "@/lib/server/http";
import { checkStudioInvitation } from "@/lib/server/repo";

/** Öffentlich: prüft einen Studio-Code (Registrierung als Trainer). */
export const GET = handler<RouteContext<"/api/v1/studio-invitations/[code]">>(async (_req, ctx) => {
  const code = (await ctx.params).code.toUpperCase();
  return Response.json({ code, ...(await checkStudioInvitation(code)) });
});
