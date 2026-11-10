import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { deleteStaff, updateStaff } from "@/lib/server/repo";
import { staffUpdateSchema } from "@/lib/schemas";

type Ctx = RouteContext<"/api/v1/studio/staff/[id]">;

export const PATCH = handler<Ctx>(async (req, ctx) => {
  const owner = await requireUser(req, "studio");
  return Response.json(await updateStaff(owner, (await ctx.params).id, await parseBody(req, staffUpdateSchema)));
});

export const DELETE = handler<Ctx>(async (req, ctx) => {
  const owner = await requireUser(req, "studio");
  await deleteStaff(owner, (await ctx.params).id);
  return new Response(null, { status: 204 });
});
