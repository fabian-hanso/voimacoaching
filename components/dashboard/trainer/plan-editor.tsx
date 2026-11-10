"use client";

import {
  cleanPlanExercise,
  EXERCISE_DATALIST_ID,
  ExerciseDatalist,
  MiniField,
  newPlanExercise,
  numOrNull,
  UnitInput,
  withName,
  withType,
} from "@/components/dashboard/exercise-fields";
import {
  ExerciseCatalogModal,
  ExplainButton,
} from "@/components/dashboard/exercise-guide";
import { WishLink } from "@/components/dashboard/feature-wish";
import { Icon } from "@/components/icons";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { PlanInput } from "@/lib/schemas";
import { useState } from "react";

export function PlanEditor({
  id,
  initial,
  onDone,
}: {
  id: string | null;
  initial: PlanInput;
  onDone: () => void;
}) {
  const [plan, setPlan] = useState<PlanInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pickFor, setPickFor] = useState<number | null>(null);

  const update = (fn: (draft: PlanInput) => void) =>
    setPlan((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  async function save() {
    setPending(true);
    setError(null);
    try {
      const body = {
        ...plan,
        days: plan.days.map((d) => ({
          ...d,
          exercises: d.exercises
            .filter((e) => e.name.trim())
            .map(cleanPlanExercise),
        })),
      };
      await api(id ? `/plans/${id}` : "/plans", {
        method: id ? "PUT" : "POST",
        body,
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err, "Speichern fehlgeschlagen."));
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-fg">
          {id ? "Plan bearbeiten" : "Neuer Plan"}
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDone}>
            Abbrechen
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Speichern …" : "Speichern"}
          </Button>
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      <ExerciseDatalist />
      {pickFor !== null && plan.days[pickFor] && (
        <ExerciseCatalogModal
          dayName={plan.days[pickFor].name}
          onClose={() => setPickFor(null)}
          onPick={(e) =>
            update((p) => {
              const list = p.days[pickFor].exercises;
              // Leere Platzhalter-Übung (z. B. bei neuem Tag) durch die gewählte ersetzen
              if (list.length === 1 && !list[0].name.trim()) list.pop();
              list.push(newPlanExercise(e.type, e.name));
            })
          }
        />
      )}

      <Card className="grid gap-4 md:grid-cols-2">
        <Field label="Titel">
          <Input
            value={plan.title}
            onChange={(e) => update((p) => void (p.title = e.target.value))}
            placeholder="z. B. Kraftaufbau Phase 1"
          />
        </Field>
        <Field label="Beschreibung (optional)">
          <Textarea
            rows={1}
            value={plan.description ?? ""}
            onChange={(e) =>
              update((p) => void (p.description = e.target.value))
            }
            placeholder="Ziel, Hinweise, Dauer …"
          />
        </Field>
      </Card>

      {plan.days.map((day, di) => (
        <Card key={di}>
          <div className="flex items-center gap-3">
            <Input
              value={day.name}
              onChange={(e) =>
                update((p) => void (p.days[di].name = e.target.value))
              }
              className="max-w-xs font-semibold"
            />
            {plan.days.length > 1 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => update((p) => void p.days.splice(di, 1))}
              >
                Tag entfernen
              </Button>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {day.exercises.map((ex, ei) => {
              const set = (fn: (e: typeof ex) => typeof ex) =>
                update(
                  (p) =>
                    void (p.days[di].exercises[ei] = fn(
                      p.days[di].exercises[ei],
                    )),
                );
              const remove = (
                <button
                  type="button"
                  aria-label="Übung entfernen"
                  title="Übung entfernen"
                  onClick={() =>
                    update((p) => void p.days[di].exercises.splice(ei, 1))
                  }
                  className="grid size-9 shrink-0 place-items-center rounded-control text-lg text-fg-subtle hover:bg-danger/10 hover:text-danger"
                >
                  ×
                </button>
              );
              return (
                <div
                  key={ei}
                  className="space-y-3 rounded-tile bg-surface-2 p-3 ring-1 ring-line"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    {/* Art + Name */}
                    <div className="flex min-w-0 items-end gap-2 lg:w-[42%] lg:shrink-0">
                      <MiniField label="Art" className="w-28 shrink-0">
                        <Select
                          value={ex.type}
                          onChange={(e) =>
                            set((x) =>
                              withType(x, e.target.value as typeof ex.type),
                            )
                          }
                        >
                          <option value="strength">Kraft</option>
                          <option value="cardio">Ausdauer</option>
                        </Select>
                      </MiniField>
                      <MiniField label="Übung" className="flex-1">
                        <span className="relative block">
                          <Input
                            value={ex.name}
                            list={EXERCISE_DATALIST_ID}
                            placeholder={
                              ex.type === "cardio"
                                ? "z. B. Laufband"
                                : "z. B. Kniebeuge"
                            }
                            onChange={(e) =>
                              set((x) => withName(x, e.target.value))
                            }
                            className="pr-10"
                          />
                          <ExplainButton
                            name={ex.name}
                            className="absolute top-1/2 right-1.5 -translate-y-1/2"
                          />
                        </span>
                      </MiniField>
                      <div className="lg:hidden">{remove}</div>
                    </div>

                    {/* Werte je nach Art */}
                    {ex.type === "strength" ? (
                      <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
                        <MiniField label="Sätze">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={20}
                            value={ex.sets ?? ""}
                            onChange={(e) =>
                              set((x) => ({
                                ...x,
                                sets: Number(e.target.value) || 1,
                              }))
                            }
                          />
                        </MiniField>
                        <MiniField label="Wiederholungen">
                          <Input
                            value={ex.reps ?? ""}
                            placeholder="8-10"
                            onChange={(e) =>
                              set((x) => ({ ...x, reps: e.target.value }))
                            }
                          />
                        </MiniField>
                        <MiniField label="Gewicht">
                          <UnitInput
                            unit="kg"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.5"
                            placeholder="–"
                            value={ex.weightKg ?? ""}
                            onChange={(e) =>
                              set((x) => ({
                                ...x,
                                weightKg: numOrNull(e.target.value),
                              }))
                            }
                          />
                        </MiniField>
                      </div>
                    ) : (
                      <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_2fr]">
                        <MiniField label="Dauer">
                          <UnitInput
                            unit="min"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={ex.durationMin ?? ""}
                            onChange={(e) =>
                              set((x) => ({
                                ...x,
                                durationMin: numOrNull(e.target.value),
                              }))
                            }
                          />
                        </MiniField>
                        <MiniField label="Distanz">
                          <UnitInput
                            unit="km"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.1"
                            placeholder="–"
                            value={ex.distanceKm ?? ""}
                            onChange={(e) =>
                              set((x) => ({
                                ...x,
                                distanceKm: numOrNull(e.target.value),
                              }))
                            }
                          />
                        </MiniField>
                        <MiniField
                          label="Intensität"
                          className="col-span-2 sm:col-span-1"
                        >
                          <Input
                            value={ex.intensity ?? ""}
                            placeholder="z. B. Zone 2, Steigung 8 %"
                            title="z. B. Zone 2, 130–140 bpm, Steigung 8 %, 150 W, Intervalle 6 × 1 min"
                            onChange={(e) =>
                              set((x) => ({ ...x, intensity: e.target.value }))
                            }
                          />
                        </MiniField>
                      </div>
                    )}
                    <div className="hidden lg:block">{remove}</div>
                  </div>
                  <MiniField label="Hinweis für den Kunden (optional)">
                    <Input
                      value={ex.notes ?? ""}
                      maxLength={500}
                      placeholder="z. B. Langsam absenken, Sitzhöhe Stufe 4, Knie nicht nach innen"
                      onChange={(e) =>
                        set((x) => ({ ...x, notes: e.target.value }))
                      }
                    />
                  </MiniField>
                </div>
              );
            })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() =>
              update((p) => void p.days[di].exercises.push(newPlanExercise()))
            }
          >
            + Kraftübung
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() =>
              update(
                (p) =>
                  void p.days[di].exercises.push(newPlanExercise("cardio")),
              )
            }
          >
            + Ausdauer (Laufband, Rad …)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setPickFor(di)}
          >
            <Icon name="book" className="size-3.5" /> Aus Katalog wählen
          </Button>
        </Card>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          update(
            (p) =>
              void p.days.push({
                name: `Tag ${p.days.length + 1}`,
                exercises: [newPlanExercise()],
              }),
          )
        }
      >
        + Trainingstag hinzufügen
      </Button>
      <div className="flex justify-center pt-4">
        <WishLink context="Plan-Editor" />
      </div>
    </div>
  );
}
