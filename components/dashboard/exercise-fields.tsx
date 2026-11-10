"use client";

import { Input, cx } from "@/components/ui";
import { fmtNumber } from "@/lib/client/api";
import { EXERCISE_CATALOG, findExercise } from "@/lib/exercises";
import type { ExerciseType, LoggedExercise, PlanExercise } from "@/lib/schemas";
import type { InputHTMLAttributes, ReactNode } from "react";

export const EXERCISE_DATALIST_ID = "exercise-catalog";

/** Vorschlagsliste für Übungsnamen (einmal pro Seite rendern, Inputs verweisen per `list`). */
export function ExerciseDatalist() {
  return (
    <datalist id={EXERCISE_DATALIST_ID}>
      {EXERCISE_CATALOG.map((e) => (
        <option key={e.name} value={e.name}>
          {e.type === "cardio" ? "Ausdauer" : e.category}
        </option>
      ))}
    </datalist>
  );
}

/** Kleines Feld mit Beschriftung darüber (für dichte Formulare wie den Plan-Editor). */
export function MiniField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block min-w-0", className)}>
      <span className="mb-1 block truncate text-xs font-medium text-fg-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

/** Zahlenfeld mit Einheit rechts im Feld. */
export function UnitInput({
  unit,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { unit: string }) {
  return (
    <span className={cx("relative block min-w-0", className)}>
      <Input {...props} className={unit ? "pr-11" : undefined} />
      {unit && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-fg-subtle">
          {unit}
        </span>
      )}
    </span>
  );
}

export const numOrNull = (v: string) =>
  v.trim() === "" ? null : Number(v.replace(",", "."));

export const newPlanExercise = (
  type: ExerciseType = "strength",
  name = "",
): PlanExercise =>
  type === "cardio"
    ? { name, type, durationMin: 20, distanceKm: null, intensity: "" }
    : { name, type, sets: 3, reps: "10", weightKg: null };

/** Wechselt den Typ einer Planübung und setzt sinnvolle Standardwerte. */
export function withType(e: PlanExercise, type: ExerciseType): PlanExercise {
  if (e.type === type) return e;
  return { ...newPlanExercise(type, e.name), notes: e.notes };
}

/** Übungsname geändert → bei bekannter Übung automatisch Kraft/Cardio wählen. */
export function withName(e: PlanExercise, name: string): PlanExercise {
  const known = findExercise(name);
  return { ...(known ? withType(e, known.type) : e), name };
}

/** Nur die zum Typ passenden Felder an die API schicken. */
export function cleanPlanExercise(e: PlanExercise): PlanExercise {
  return e.type === "cardio"
    ? {
        name: e.name,
        type: "cardio",
        durationMin: e.durationMin ?? null,
        distanceKm: e.distanceKm ?? null,
        intensity: e.intensity || null,
        notes: e.notes?.trim() || null,
      }
    : {
        name: e.name,
        type: "strength",
        sets: e.sets,
        reps: e.reps,
        weightKg: e.weightKg ?? null,
        restSec: e.restSec ?? null,
        notes: e.notes?.trim() || null,
      };
}

/** Kurzbeschreibung einer Planübung, z. B. „4 × 6 @ 80 kg“ oder „30 min · 5 km · Zone 2“. */
export function describePlanExercise(e: PlanExercise): string {
  if (e.type === "cardio") {
    return [
      e.durationMin != null && `${fmtNumber(e.durationMin)} min`,
      e.distanceKm != null && `${fmtNumber(e.distanceKm, 2)} km`,
      e.intensity,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return `${e.sets} × ${e.reps}${e.weightKg ? ` @ ${fmtNumber(e.weightKg, 1)} kg` : ""}`;
}

/** Kurzbeschreibung einer geloggten Übung. */
export function describeLoggedExercise(e: LoggedExercise): string {
  if (e.type === "cardio") {
    const parts = [
      e.durationMin != null && `${fmtNumber(e.durationMin)} min`,
      e.distanceKm != null && `${fmtNumber(e.distanceKm, 2)} km`,
    ].filter(Boolean);
    return `${e.name} (${parts.join(", ")})`;
  }
  return `${e.name} (${e.sets.length})`;
}

export function TypeBadge({ type }: { type: ExerciseType }) {
  return type === "cardio" ? (
    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent-soft">
      Cardio
    </span>
  ) : null;
}
