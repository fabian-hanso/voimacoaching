import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { conversationWith, markConversationRead } from "@/lib/server/repo";

/** Markiert alle Nachrichten des Gegenübers in dieser Unterhaltung als gelesen. */
export const POST = handler<RouteContext<"/api/v1/conversations/[partnerId]/read">>(async (req, ctx) => {
  const user = await requireUser(req);
  const pair = await conversationWith(user, (await ctx.params).partnerId);
  return Response.json({ marked: await markConversationRead(user, pair) });
});
