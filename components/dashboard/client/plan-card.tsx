"use client";

import {
  describePlanExercise,
  TypeBadge,
} from "@/components/dashboard/exercise-fields";
import { ExplainButton } from "@/components/dashboard/exercise-guide";
import { Icon, IconTile } from "@/components/icons";
import { Badge, Button, Card, cx } from "@/components/ui";
import { fmtDate } from "@/lib/client/api";
import type { PlanDay } from "@/lib/schemas";
import type { AssignedPlan } from "@/lib/types";
import { estimateMinutes } from "./utils";

export function PlanCard({
  plan,
  wide,
  nextDay,
  onStart,
}: {
  plan: AssignedPlan;
  wide: boolean;
  nextDay: number;
  onStart: (day: PlanDay) => void;
}) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <IconTile name="dumbbell" tone="brand" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-fg">{plan.title}</h3>
          <p className="text-xs text-fg-muted">
            {plan.days.length} Trainingstage · zugewiesen am{" "}
            {fmtDate(plan.assignedAt)}
          </p>
          {plan.description && (
            <p className="mt-2 text-sm text-fg-muted">{plan.description}</p>
          )}
        </div>
      </div>

      <div
        className={cx(
          "mt-6 grid gap-4",
          wide ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {plan.days.map((day, i) => {
          const minutes = estimateMinutes(day);
          const isNext = i === nextDay;
          return (
            <div
              key={i}
              className={cx(
                "flex flex-col rounded-tile p-4 ring-1 ring-inset",
                isNext
                  ? "bg-brand/30 ring-brand-ink/30"
                  : "bg-surface-2 ring-line",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-fg">{day.name}</p>
                {isNext && <Badge tone="accent">Als Nächstes</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-fg-muted">
                {day.exercises.length} Übungen
                {minutes > 0 && ` · ca. ${minutes} min`}
              </p>

              {day.exercises.length === 0 ? (
                <p className="mt-4 flex-1 text-sm text-fg-subtle italic">
                  Noch keine Übungen eingetragen.
                </p>
              ) : (
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {day.exercises.slice(0, 4).map((e, j) => (
                    <li
                      key={j}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-fg">
                        <span className="truncate">{e.name}</span>{" "}
                        <TypeBadge type={e.type} />
                        <ExplainButton
                          name={e.name}
                          note={e.notes}
                          className="-my-1"
                        />
                      </span>
                      <span className="shrink-0 text-right font-mono text-xs text-fg-subtle">
                        {describePlanExercise(e)}
                      </span>
                    </li>
                  ))}
                  {day.exercises.length > 4 && (
                    <li className="text-xs text-fg-subtle">
                      +{day.exercises.length - 4} weitere
                    </li>
                  )}
                </ul>
              )}

              <Button
                variant={isNext ? "primary" : "secondary"}
                size="sm"
                className="mt-4 w-full"
                onClick={() => onStart(day)}
              >
                <Icon name="play" className="size-3.5" /> Starten
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
