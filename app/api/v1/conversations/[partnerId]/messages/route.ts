import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { conversationWith, listMessages, sendMessage } from "@/lib/server/repo";
import { sendMessageSchema } from "@/lib/schemas";

type Ctx = RouteContext<"/api/v1/conversations/[partnerId]/messages">;

/** Nachrichten (älteste zuerst). Paging: `?limit=50&before=<ISO-Zeitpunkt der ältesten geladenen Nachricht>` */
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const pair = await conversationWith(user, (await ctx.params).partnerId);
  const params = req.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 200);
  return Response.json({ messages: await listMessages(pair, limit, params.get("before")) });
});

export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const pair = await conversationWith(user, (await ctx.params).partnerId);
  const { body } = await parseBody(req, sendMessageSchema);
  return Response.json(await sendMessage(user, pair, body), { status: 201 });
});
