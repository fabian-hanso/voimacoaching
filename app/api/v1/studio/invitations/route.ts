import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { createStudioInvitation } from "@/lib/server/repo";
import { studioInvitationSchema } from "@/lib/schemas";

/** Trainer ins Studio einladen (Link/Code). */
export const POST = handler(async (req) => {
  const owner = await requireUser(req, "studio");
  const { email, validDays } = await parseBody(req, studioInvitationSchema);
  return Response.json(await createStudioInvitation(owner, email, validDays), { status: 201 });
});
