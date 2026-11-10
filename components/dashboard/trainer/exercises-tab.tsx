"use client";

import { ExerciseCatalog } from "@/components/dashboard/exercise-guide";
import { Card } from "@/components/ui";
import { EXERCISE_CATALOG } from "@/lib/exercises";

export function ExercisesTab() {
  return (
    <Card>
      <h2 className="font-semibold text-fg">Übungskatalog</h2>
      <p className="mt-1 text-sm text-fg-muted">
        {EXERCISE_CATALOG.length} Übungen mit Anleitung. Nimmst du sie in einen
        Plan auf, sehen deine Kunden die Erklärung direkt an der Übung –
        zusammen mit deinem persönlichen Hinweis.
      </p>
      <div className="mt-5">
        <ExerciseCatalog />
      </div>
    </Card>
  );
}
