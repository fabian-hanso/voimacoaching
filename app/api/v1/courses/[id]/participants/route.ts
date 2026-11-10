import { requireUser } from "@/lib/server/auth";
import { badRequest, handler } from "@/lib/server/http";
import { listParticipants } from "@/lib/server/courses";

type Ctx = RouteContext<"/api/v1/courses/[id]/participants">;

/** Teilnehmende eines Kurstermins (?startsAt=…) – nur für das Studio und den Kurstrainer. */
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const startsAt = req.nextUrl.searchParams.get("startsAt");
  if (!startsAt || Number.isNaN(Date.parse(startsAt))) throw badRequest("startsAt fehlt oder ist ungültig.");
  return Response.json({ participants: await listParticipants(user, (await ctx.params).id, startsAt) });
});
