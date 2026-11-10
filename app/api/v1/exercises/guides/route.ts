import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { listAssignedPlans } from "@/lib/server/repo";
import { EXERCISE_GUIDES, findGuide, type ExerciseGuide } from "@/lib/exercise-guide";

/**
 * Übungsanleitungen (Schlüssel = Übungsname wie im Plan bzw. Katalog).
 * Trainer und Studios: alle. Kunden: nur Übungen, die in einem ihrer zugewiesenen Pläne stehen.
 */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  if (user.role !== "client") return Response.json({ guides: EXERCISE_GUIDES });

  const guides: Record<string, ExerciseGuide> = {};
  for (const plan of await listAssignedPlans(user.id)) {
    for (const day of plan.days) {
      for (const ex of day.exercises) {
        const guide = findGuide(ex.name);
        if (guide) guides[ex.name.trim()] = guide;
      }
    }
  }
  return Response.json({ guides });
});
