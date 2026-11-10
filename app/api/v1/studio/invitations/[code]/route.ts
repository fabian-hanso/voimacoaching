import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { deleteStudioInvitation } from "@/lib/server/repo";

export const DELETE = handler<RouteContext<"/api/v1/studio/invitations/[code]">>(async (req, ctx) => {
  const owner = await requireUser(req, "studio");
  await deleteStudioInvitation(owner, (await ctx.params).code.toUpperCase());
  return new Response(null, { status: 204 });
});
