import { requireUser } from "@/lib/server/auth";
import { availableTrainers } from "@/lib/server/booking";
import { handler } from "@/lib/server/http";
import { availableTrainersQuerySchema } from "@/lib/schemas";

/**
 * Studio: Trainer, die zu ?startsAt=…&durationMin=… arbeiten und frei sind (kein Termin, kein Kurs)
 * → `{ trainers: [{ id, name, avatarUrl }] }`.
 */
export const GET = handler(async (req) => {
  const user = await requireUser(req, "studio");
  const { startsAt, durationMin } = availableTrainersQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return Response.json({ trainers: await availableTrainers(user, startsAt, durationMin) });
});
