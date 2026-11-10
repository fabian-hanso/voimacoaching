import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { listConversations } from "@/lib/server/repo";

/** Trainer: Unterhaltungen mit allen Kunden. Kunde: Unterhaltung mit dem eigenen Coach. */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  const conversations = await listConversations(user);
  return Response.json({ conversations, unreadTotal: conversations.reduce((n, c) => n + c.unread, 0) });
});
