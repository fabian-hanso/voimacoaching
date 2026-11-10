import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { joinTrainer, leaveTrainer, meResponse } from "@/lib/server/repo";
import { joinTrainerSchema } from "@/lib/schemas";

/** Kunde verbindet sich per Einladungscode mit einem Trainer. */
export const POST = handler(async (req) => {
  const user = await requireUser(req, "client");
  const { inviteCode } = await parseBody(req, joinTrainerSchema);
  const updated = await joinTrainer(user, inviteCode);
  return Response.json(await meResponse(updated));
});

/** Kunde trennt die Verbindung zu seinem Coach (Planzuweisungen werden aufgehoben). */
export const DELETE = handler(async (req) => {
  const user = await requireUser(req, "client");
  const updated = await leaveTrainer(user);
  return Response.json(await meResponse(updated));
});
