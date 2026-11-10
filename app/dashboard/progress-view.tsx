"use client";

import { useState, type ReactNode } from "react";
import { fmtDate, fmtNumber } from "@/lib/client/api";
import { Card, cx, EmptyState } from "@/components/ui";
import type { Progress } from "@/lib/types";
import { describeLoggedExercise } from "./exercise-fields";
import { IconTile, type IconName, type Tone } from "@/components/icons";

type ChartMode = "strength" | "cardio";

/**
 * Fortschrittsansicht – genutzt vom Kunden (eigene Daten) und vom Trainer (Kundendetail).
 * Einheitliches Kachel-Raster: `gap-6` zwischen allen Kacheln, `p-6` in allen Kacheln (Card).
 * `aside` wird als zusätzliche Kachel in der unteren Reihe angezeigt (z. B. Messwerte-Formular).
 */
export function ProgressView({ progress, aside }: { progress: Progress; aside?: ReactNode }) {
  const hasCardio = progress.weeklyVolume.some((w) => w.cardioMin > 0);
  const hasStrength = progress.weeklyVolume.some((w) => w.volumeKg > 0);
  const [mode, setMode] = useState<ChartMode>(hasStrength || !hasCardio ? "strength" : "cardio");
  const value = (w: Progress["weeklyVolume"][number]) => (mode === "strength" ? w.volumeKg : w.cardioMin);
  const maxVolume = Math.max(1, ...progress.weeklyVolume.map(value));
  const cardio = progress.cardioLast30Days;
  const m = progress.latestMeasurement;
  const weights = progress.measurements.filter((x) => x.bodyWeightKg != null).slice(0, 12).reverse();
  const minW = Math.min(...weights.map((x) => x.bodyWeightKg!));
  const maxW = Math.max(...weights.map((x) => x.bodyWeightKg!));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        <Stat icon="dumbbell" tone="brand" label="Workouts gesamt" value={fmtNumber(progress.totalWorkouts)} sub={`${progress.workoutsLast30Days} in 30 Tagen`} />
        <Stat icon="calendar" tone="neutral" label="Letzte 7 Tage" value={fmtNumber(progress.workoutsLast7Days)} sub={`zuletzt ${fmtDate(progress.lastWorkoutAt)}`} />
        <Stat icon="flame" tone="warning" label="Wochen-Streak" value={`${progress.currentStreakWeeks} Wo.`} sub="in Folge trainiert" />
        <Stat
          icon="heart"
          tone="accent"
          label="Ausdauer (30 Tage)"
          value={`${fmtNumber(cardio.minutes)} min`}
          sub={`${fmtNumber(cardio.distanceKm, 1)} km · ${cardio.sessions} Einheiten`}
        />
        <Stat
          icon="scale"
          tone="neutral"
          label="Körpergewicht"
          value={m?.bodyWeightKg != null ? `${fmtNumber(m.bodyWeightKg, 1)} kg` : "–"}
          sub={m?.bodyFatPct != null ? `${fmtNumber(m.bodyFatPct, 1)} % KFA` : m ? fmtDate(m.measuredAt) : "noch keine Messung"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-fg">
                {mode === "strength" ? "Kraftvolumen pro Woche" : "Ausdauer pro Woche"}
              </h3>
              <p className="text-xs text-fg-muted">
                {mode === "strength" ? "Summe aus Wiederholungen × Gewicht" : "Minuten Ausdauertraining (Laufband, Rad, …)"}
              </p>
            </div>
            <div className="flex gap-1 rounded-lg bg-surface-3 p-0.5 text-xs font-semibold">
              {(
                [
                  ["strength", "Kraft"],
                  ["cardio", "Ausdauer"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cx(
                    "rounded-md px-2.5 py-1 transition",
                    mode === m ? "bg-surface text-fg shadow-sm" : "text-fg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 flex h-40 items-end gap-2">
            {progress.weeklyVolume.map((w, i) => (
              <div key={w.weekStart} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] text-fg-subtle opacity-0 transition group-hover:opacity-100">
                  {fmtNumber(value(w))}
                </span>
                <div
                  title={
                    mode === "strength"
                      ? `${fmtNumber(w.volumeKg)} kg · ${w.workouts} Workouts`
                      : `${fmtNumber(w.cardioMin)} min · ${fmtNumber(w.distanceKm, 1)} km`
                  }
                  className={cx(
                    "w-full rounded-t",
                    mode === "strength"
                      ? i === progress.weeklyVolume.length - 1 ? "bg-brand-fg" : "bg-brand"
                      : i === progress.weeklyVolume.length - 1 ? "bg-accent" : "bg-accent/40",
                  )}
                  style={{ height: `${Math.max(2, (value(w) / maxVolume) * 100)}%` }}
                />
                <span className="text-[10px] text-fg-subtle">{fmtDate(w.weekStart, { day: "2-digit", month: "2-digit" })}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-fg">Bestwerte</h3>
          {progress.personalBests.length === 0 && progress.cardioBests.length === 0 ? (
            <p className="mt-4 text-sm text-fg-muted">Noch keine Bestwerte – logge Workouts mit Gewicht oder Ausdauer.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line text-sm">
              {progress.personalBests.map((pb) => (
                <li key={pb.exercise} className="flex items-center justify-between py-2">
                  <span className="text-fg">{pb.exercise}</span>
                  <span className="font-mono text-xs text-fg-muted">
                    {fmtNumber(pb.weightKg, 1)} kg × {pb.reps}
                  </span>
                </li>
              ))}
              {progress.cardioBests.map((cb) => (
                <li key={`cardio-${cb.exercise}`} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-fg">{cb.exercise}</span>
                  <span className="text-right font-mono text-xs text-accent-soft">
                    {[
                      cb.longestDistanceKm != null && `${fmtNumber(cb.longestDistanceKm, 2)} km`,
                      cb.longestDurationMin != null && `${fmtNumber(cb.longestDurationMin)} min`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className={cx("grid gap-6", aside ? "md:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-2")}>
        <Card>
          <h3 className="text-sm font-semibold text-fg">Letzte Workouts</h3>
          {progress.recentWorkouts.length === 0 ? (
            <p className="mt-4 text-sm text-fg-muted">Noch keine Workouts.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {progress.recentWorkouts.map((w) => (
                <li key={w.id} className="rounded-lg p-3 ring-1 ring-line">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-fg">{w.title}</span>
                    <span className="text-xs text-fg-muted">{fmtDate(w.performedAt, { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">
                    {w.exercises.map(describeLoggedExercise).join(" · ")}
                  </p>
                  <p className="mt-1 text-xs font-medium text-brand-ink">
                    {[
                      w.volumeKg > 0 && `${fmtNumber(w.volumeKg)} kg Volumen`,
                      w.cardioMin > 0 && `${fmtNumber(w.cardioMin)} min Ausdauer`,
                      w.distanceKm > 0 && `${fmtNumber(w.distanceKm, 1)} km`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {w.notes && <p className="mt-1 text-xs text-fg-muted italic">„{w.notes}“</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-fg">Körpergewicht</h3>
          {weights.length < 2 ? (
            <p className="mt-4 text-sm text-fg-muted">Mindestens zwei Messungen nötig für einen Verlauf.</p>
          ) : (
            <svg viewBox="0 0 300 100" className="mt-4 h-32 w-full overflow-visible" preserveAspectRatio="none">
              <polyline
                fill="none"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                className="stroke-brand-ink"
                points={weights
                  .map((x, i) => {
                    const y = maxW === minW ? 50 : 90 - ((x.bodyWeightKg! - minW) / (maxW - minW)) * 80;
                    return `${(i / (weights.length - 1)) * 300},${y}`;
                  })
                  .join(" ")}
              />
            </svg>
          )}
          {progress.measurements.length > 0 && (
            <table className="mt-4 w-full text-left text-xs">
              <thead className="text-fg-subtle">
                <tr>
                  <th className="py-1 font-medium">Datum</th>
                  <th className="py-1 font-medium">Gewicht</th>
                  <th className="py-1 font-medium">KFA</th>
                  <th className="py-1 font-medium">Taille</th>
                </tr>
              </thead>
              <tbody className="text-fg-muted">
                {progress.measurements.slice(0, 6).map((x) => (
                  <tr key={x.id} className="border-t border-line">
                    <td className="py-1.5">{fmtDate(x.measuredAt)}</td>
                    <td>{x.bodyWeightKg != null ? `${fmtNumber(x.bodyWeightKg, 1)} kg` : "–"}</td>
                    <td>{x.bodyFatPct != null ? `${fmtNumber(x.bodyFatPct, 1)} %` : "–"}</td>
                    <td>{x.waistCm != null ? `${fmtNumber(x.waistCm, 1)} cm` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        {aside}
      </div>
    </div>
  );
}

function Stat({ icon, tone, label, value, sub }: { icon: IconName; tone: Tone; label: string; value: string; sub: string }) {
  return (
    <Card className="flex min-w-0 flex-col">
      <IconTile name={icon} tone={tone} />
      <p className="mt-5 truncate text-sm font-medium text-fg-muted">{label}</p>
      <p className="mt-1 truncate text-3xl font-bold tracking-tight text-fg">{value}</p>
      <p className="mt-1 truncate text-xs text-fg-subtle">{sub}</p>
    </Card>
  );
}

export function ProgressEmpty() {
  return <EmptyState title="Noch keine Daten" text="Sobald Workouts geloggt werden, erscheint hier der Fortschritt." />;
}
