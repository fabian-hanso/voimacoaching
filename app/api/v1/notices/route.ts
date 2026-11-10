import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { listNotices } from "@/lib/server/repo";

/** Offene Hinweise, z. B. „Lena hat ihr Konto gelöscht“ (max. 30 Tage alt). */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json({ notices: await listNotices(user) });
});
