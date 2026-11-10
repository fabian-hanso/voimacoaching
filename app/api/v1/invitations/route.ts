import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { createInvitation, listInvitations } from "@/lib/server/repo";
import { createInvitationSchema } from "@/lib/schemas";

export const GET = handler(async (req) => {
  const trainer = await requireUser(req, "trainer");
  return Response.json({ invitations: await listInvitations(trainer.id) });
});

export const POST = handler(async (req) => {
  const trainer = await requireUser(req, "trainer");
  const { email, validDays } = await parseBody(req, createInvitationSchema);
  return Response.json(await createInvitation(trainer.id, email, validDays), { status: 201 });
});
