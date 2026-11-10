"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { newPlanExercise } from "@/components/dashboard/exercise-fields";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadError,
  Spinner,
} from "@/components/ui";
import { api, useApi } from "@/lib/client/api";
import type { PlanInput } from "@/lib/schemas";
import type { PlanWithAssignments } from "@/lib/types";
import { useState } from "react";
import { PlanEditor } from "./plan-editor";

const emptyPlan = (): PlanInput => ({
  title: "",
  description: "",
  days: [{ name: "Tag 1", exercises: [newPlanExercise()] }],
});

export function PlansTab() {
  const { data, loading, error, reload } = useApi<{
    plans: PlanWithAssignments[];
  }>("/plans");
  const [editing, setEditing] = useState<{
    id: string | null;
    plan: PlanInput;
  } | null>(null);
  const [deleting, setDeleting] = useState<PlanWithAssignments | null>(null);

  if (editing) {
    return (
      <PlanEditor
        id={editing.id}
        initial={editing.plan}
        onDone={() => {
          setEditing(null);
          reload();
        }}
      />
    );
  }
  if (loading) return <Spinner />;
  if (error && !data)
    return <LoadError message={error.message} onRetry={reload} />;

  return (
    <div className="space-y-6">
      {deleting && (
        <ConfirmDialog
          title={`Plan „${deleting.title}“ löschen?`}
          description={
            deleting.assignedClientIds.length > 0 ? (
              <p>
                Der Plan ist{" "}
                <strong>{deleting.assignedClientIds.length} Kunden</strong>{" "}
                zugewiesen und verschwindet auch bei ihnen. Bereits geloggte
                Workouts bleiben erhalten.
              </p>
            ) : (
              <p>Der Plan wird endgültig gelöscht.</p>
            )
          }
          confirmLabel="Plan löschen"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api(`/plans/${deleting.id}`, { method: "DELETE" });
            setDeleting(null);
            reload();
          }}
        />
      )}
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ id: null, plan: emptyPlan() })}>
          + Neuer Plan
        </Button>
      </div>
      {!data?.plans.length ? (
        <EmptyState
          title="Noch keine Pläne"
          text="Erstelle deinen ersten Trainingsplan und weise ihn Kunden zu."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.plans.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-fg">{p.title}</h3>
                  {p.description && (
                    <p className="mt-1 text-sm text-fg-muted">
                      {p.description}
                    </p>
                  )}
                </div>
                <Badge tone="brand">{p.assignedClientIds.length} Kunden</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.days.map((d, i) => (
                  <Badge key={i}>
                    {d.name} · {d.exercises.length} Übungen
                  </Badge>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      id: p.id,
                      plan: {
                        title: p.title,
                        description: p.description ?? "",
                        days: p.days,
                      },
                    })
                  }
                >
                  Bearbeiten
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleting(p)}
                >
                  Löschen
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
