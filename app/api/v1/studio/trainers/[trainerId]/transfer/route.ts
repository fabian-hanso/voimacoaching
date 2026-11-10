import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { transferStudioTrainer } from "@/lib/server/repo";
import { transferTrainerSchema } from "@/lib/schemas";

/** „Trainer fällt aus“: alle Kunden, Pläne und offenen Kunden-Einladungen an einen anderen Trainer übertragen. */
export const POST = handler<RouteContext<"/api/v1/studio/trainers/[trainerId]/transfer">>(async (req, ctx) => {
  const owner = await requireUser(req, "studio");
  const { toTrainerId } = await parseBody(req, transferTrainerSchema);
  const transferred = await transferStudioTrainer(owner, (await ctx.params).trainerId, toTrainerId);
  return Response.json({ transferred });
});
