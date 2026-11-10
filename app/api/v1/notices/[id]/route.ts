import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { dismissNotice } from "@/lib/server/repo";

/** Hinweis wegklicken. */
export const DELETE = handler<RouteContext<"/api/v1/notices/[id]">>(async (req, ctx) => {
  const user = await requireUser(req);
  await dismissNotice(user, (await ctx.params).id);
  return new Response(null, { status: 204 });
});
