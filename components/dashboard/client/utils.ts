import type { PlanDay } from "@/lib/schemas";
import type { AssignedPlan, Progress } from "@/lib/types";

export type DayRef = { plan: AssignedPlan; day: PlanDay; index: number };

/** Grobe Dauer: Kraft ≈ 2,5 min pro Satz (inkl. Pause), Ausdauer = geplante Minuten (bzw. ~6 min/km). */
export function estimateMinutes(day: PlanDay) {
  const min = day.exercises.reduce(
    (sum, e) =>
      sum +
      (e.type === "cardio"
        ? (e.durationMin ?? (e.distanceKm ?? 0) * 6)
        : (e.sets ?? 0) * 2.5),
    0,
  );
  return Math.round(min / 5) * 5;
}

/** Nächster Trainingstag: Tag nach dem zuletzt trainierten Tag desselben Plans, sonst erster Tag des neuesten Plans. */
export function nextUp(
  plans: AssignedPlan[],
  progress?: Progress,
): DayRef | null {
  const withDays = plans.filter((p) => p.days.length > 0);
  if (!withDays.length) return null;
  const last = progress?.recentWorkouts.find(
    (w) => w.planId && withDays.some((p) => p.id === w.planId),
  );
  const plan = withDays.find((p) => p.id === last?.planId) ?? withDays[0];
  const lastIndex = last
    ? plan.days.findIndex((d) => d.name === last.title)
    : -1;
  const index = (lastIndex + 1) % plan.days.length;
  return { plan, day: plan.days[index], index };
}
