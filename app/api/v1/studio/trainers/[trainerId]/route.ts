import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { removeStudioTrainer } from "@/lib/server/repo";

/** Trainer aus dem Studio entfernen (nur ohne Kunden – sonst 409). Das Trainer-Konto bleibt bestehen. */
export const DELETE = handler<RouteContext<"/api/v1/studio/trainers/[trainerId]">>(async (req, ctx) => {
  const owner = await requireUser(req, "studio");
  await removeStudioTrainer(owner, (await ctx.params).trainerId);
  return new Response(null, { status: 204 });
});
