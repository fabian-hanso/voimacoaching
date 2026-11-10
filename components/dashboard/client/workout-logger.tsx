"use client";

import {
  describePlanExercise,
  EXERCISE_DATALIST_ID,
  ExerciseDatalist,
  MiniField,
  numOrNull,
  TypeBadge,
  UnitInput,
} from "@/components/dashboard/exercise-fields";
import { ExplainButton } from "@/components/dashboard/exercise-guide";
import { Icon } from "@/components/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  cx,
  Field,
  Input,
  Textarea,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import {
  CARDIO_METRICS,
  cardioMetricsFor,
  findExercise,
  type CardioMetric,
} from "@/lib/exercises";
import type { LoggedExercise, PlanDay } from "@/lib/schemas";
import type { AssignedPlan } from "@/lib/types";
import { useEffect, useState } from "react";

type LogEntry = LoggedExercise & { target?: string; notes?: string | null };

function toLogEntry(e: PlanDay["exercises"][number]): LogEntry {
  if (e.type === "cardio") {
    return {
      name: e.name,
      type: "cardio",
      sets: [],
      durationMin: e.durationMin ?? null,
      distanceKm: e.distanceKm ?? null,
      target: describePlanExercise(e),
      notes: e.notes,
    };
  }
  return {
    name: e.name,
    type: "strength",
    sets: Array.from({ length: e.sets ?? 1 }, () => ({
      reps: parseInt(e.reps ?? "", 10) || 0,
      weightKg: e.weightKg ?? null,
    })),
    target: describePlanExercise(e),
    notes: e.notes,
  };
}

export function WorkoutLogger({
  plan,
  day,
  onDone,
}: {
  plan: AssignedPlan | null;
  day: PlanDay;
  onDone: (saved: boolean) => void;
}) {
  const [exercises, setExercises] = useState<LogEntry[]>(() =>
    day.exercises.map(toLogEntry),
  );
  // Erledigt-Status: Kraft je Satz (`ei-si`), Ausdauer je Übung (`ei-cardio`)
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [extraName, setExtraName] = useState("");
  const [startedAt] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const edit = (ei: number, fn: (e: LogEntry) => void) =>
    setExercises((prev) => {
      const next = structuredClone(prev);
      fn(next[ei]);
      return next;
    });
  const toggle = (key: string) => setDone((d) => ({ ...d, [key]: !d[key] }));

  function addExtra(e: React.FormEvent) {
    e.preventDefault();
    const name = extraName.trim();
    if (!name) return;
    const type = findExercise(name)?.type ?? "strength";
    setExercises((prev) => [
      ...prev,
      type === "cardio"
        ? { name, type, sets: [], durationMin: null, distanceKm: null }
        : { name, type, sets: [{ reps: 10, weightKg: null }] },
    ]);
    setExtraName("");
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const logged: LoggedExercise[] = exercises.flatMap((entry, ei) => {
        const e: LogEntry = { ...entry };
        delete e.target; // nur Anzeige, nicht an die API
        delete e.notes;
        if (e.type === "cardio") return done[`${ei}-cardio`] ? [e] : [];
        const sets = e.sets.filter((_, si) => done[`${ei}-${si}`]);
        return sets.length ? [{ ...e, sets }] : [];
      });
      if (!logged.length)
        throw new Error(
          "Hake mindestens einen Satz oder eine Ausdauereinheit ab.",
        );
      const missing = logged.find(
        (e) =>
          e.type === "cardio" && e.durationMin == null && e.distanceKm == null,
      );
      if (missing)
        throw new Error(
          `Bitte Dauer oder Distanz für „${missing.name}“ eintragen.`,
        );
      const body = {
        title: day.name,
        planId: plan?.id ?? null,
        durationMin: Math.round((Date.now() - startedAt) / 60_000),
        notes: notes || null,
        exercises: logged,
      };
      try {
        await api("/workouts", { body });
      } catch (err) {
        // Plan wurde während des Trainings entzogen (oder Coach-Verbindung beendet):
        // Training nicht verlieren, sondern als freies Training speichern.
        if (
          err instanceof ApiClientError &&
          err.status === 400 &&
          body.planId
        ) {
          await api("/workouts", { body: { ...body, planId: null } });
        } else {
          throw err;
        }
      }
      onDone(true);
    } catch (err) {
      // Eingaben bleiben erhalten → erneut versuchen ist jederzeit möglich
      setError(
        errorMessage(
          err,
          "Speichern fehlgeschlagen. Deine Eingaben sind noch da – bitte erneut versuchen.",
        ),
      );
      setPending(false);
    }
  }

  const total = exercises.reduce(
    (n, e) => n + (e.type === "cardio" ? 1 : e.sets.length),
    0,
  );
  const checked = Object.values(done).filter(Boolean).length;

  // Warnung, bevor ein angefangenes Training durch Schließen/Neuladen verloren geht
  useEffect(() => {
    if (checked === 0 || pending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [checked, pending]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ExerciseDatalist />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-fg-muted">{plan?.title ?? "Ohne Plan"}</p>
          <h2 className="text-2xl font-bold tracking-tight text-fg">
            {day.name}
          </h2>
        </div>
        <Badge tone="brand">
          {checked}/{total} erledigt
        </Badge>
      </div>
      <div className="h-2 rounded-full bg-surface-3">
        <div
          className="h-2 rounded-full bg-brand transition-all"
          style={{ width: `${total ? (checked / total) * 100 : 0}%` }}
        />
      </div>
      {error && <Alert>{error}</Alert>}

      {exercises.map((ex, ei) => (
        <Card key={ei}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex flex-wrap items-center gap-2 font-semibold text-fg">
                {ex.name} <TypeBadge type={ex.type} />
                <ExplainButton name={ex.name} note={ex.notes} label />
              </h3>
              {ex.target && (
                <p className="mt-0.5 font-mono text-xs text-fg-subtle">
                  Ziel: {ex.target}
                </p>
              )}
              {ex.notes && (
                <p className="mt-1 text-sm text-fg-muted">{ex.notes}</p>
              )}
            </div>
            {ex.type === "cardio" && (
              <CheckButton
                done={!!done[`${ei}-cardio`]}
                onClick={() => toggle(`${ei}-cardio`)}
                label="Einheit erledigt"
              />
            )}
          </div>

          {ex.type === "cardio" ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {cardioMetricsFor(ex.name).map((m: CardioMetric) => {
                const meta = CARDIO_METRICS[m];
                return (
                  <MiniField key={m} label={meta.label}>
                    <UnitInput
                      unit={meta.unit}
                      type="number"
                      inputMode="decimal"
                      min={m === "inclinePct" ? -10 : 0}
                      max={meta.max}
                      step={meta.step}
                      value={ex[m] ?? ""}
                      onChange={(e) =>
                        edit(ei, (x) => void (x[m] = numOrNull(e.target.value)))
                      }
                    />
                  </MiniField>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {ex.sets.map((set, si) => (
                <div
                  key={si}
                  className="grid grid-cols-[2.5rem_1fr_1fr_2.25rem] items-center gap-2"
                >
                  <span className="text-sm text-fg-subtle">#{si + 1}</span>
                  <UnitInput
                    aria-label={`Satz ${si + 1} Wiederholungen`}
                    unit="Wdh."
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={set.reps || ""}
                    onChange={(e) =>
                      edit(
                        ei,
                        (x) =>
                          void (x.sets[si].reps = Number(e.target.value) || 0),
                      )
                    }
                  />
                  <UnitInput
                    aria-label={`Satz ${si + 1} Gewicht`}
                    unit="kg"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.5"
                    value={set.weightKg ?? ""}
                    onChange={(e) =>
                      edit(
                        ei,
                        (x) =>
                          void (x.sets[si].weightKg = numOrNull(
                            e.target.value,
                          )),
                      )
                    }
                  />
                  <CheckButton
                    done={!!done[`${ei}-${si}`]}
                    onClick={() => toggle(`${ei}-${si}`)}
                    label="Satz erledigt"
                  />
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  edit(
                    ei,
                    (x) =>
                      void x.sets.push({
                        ...(x.sets.at(-1) ?? { reps: 10, weightKg: null }),
                      }),
                  )
                }
              >
                + Satz
              </Button>
            </div>
          )}
        </Card>
      ))}

      <form onSubmit={addExtra} className="flex gap-2">
        <Input
          value={extraName}
          list={EXERCISE_DATALIST_ID}
          onChange={(e) => setExtraName(e.target.value)}
          placeholder={
            exercises.length
              ? "Weitere Übung, z. B. Laufband"
              : "Übung hinzufügen, z. B. Laufband oder Kniebeuge"
          }
        />
        <Button type="submit" variant="secondary" className="shrink-0">
          + Übung
        </Button>
      </form>

      <Field label="Notiz an deinen Trainer (optional)">
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Wie lief's?"
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            if (
              checked > 0 &&
              !window.confirm(
                "Training abbrechen? Deine Eingaben gehen verloren.",
              )
            )
              return;
            onDone(false);
          }}
        >
          Abbrechen
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending ? "Speichern …" : "Workout abschließen"}
        </Button>
      </div>
    </div>
  );
}

function CheckButton({
  done,
  onClick,
  label,
}: {
  done: boolean;
  onClick: () => void;
  label: string;
}) {
  // Sichtbar 28 px, Klickfläche 36 px. Auch unerledigt mit grauem Haken, damit klar ist: hier abhaken.
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={done}
      title={
        done ? `${label} – zum Zurücksetzen tippen` : `Als erledigt abhaken`
      }
      onClick={onClick}
      className="group grid size-9 shrink-0 place-items-center justify-self-end"
    >
      <span
        className={cx(
          "grid size-7 place-items-center rounded-inner transition",
          done
            ? "bg-brand text-brand-fg motion-safe:animate-pop"
            : "bg-surface-3 text-fg-subtle group-hover:bg-line-strong group-hover:text-fg",
        )}
      >
        <Icon name="check" className="size-4" />
      </span>
    </button>
  );
}
