import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { checkInvitation, deleteInvitation } from "@/lib/server/repo";

type Ctx = RouteContext<"/api/v1/invitations/[code]">;

/** Öffentlich: prüft einen Einladungscode (z. B. für den Registrierungs-Screen der App). */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const code = (await ctx.params).code.toUpperCase();
  return Response.json({ code, ...(await checkInvitation(code)) });
});

export const DELETE = handler<Ctx>(async (req, ctx) => {
  const trainer = await requireUser(req, "trainer");
  const { code } = await ctx.params;
  await deleteInvitation(trainer.id, code.toUpperCase());
  return new Response(null, { status: 204 });
});
