"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiClientError, fmtDate, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { Alert, Avatar, Badge, Button, Card, cx, EmptyState, Field, Input, LoadError, Spinner, Textarea } from "@/components/ui";
import { Icon, IconTile, type IconName, type Tone } from "@/components/icons";
import type { AssignedPlan, BookingProvider, MeResponse, Progress } from "@/lib/types";
import type { LoggedExercise, PlanDay } from "@/lib/schemas";
import { ClientAppointments } from "./appointments";
import { ProgressView } from "./progress-view";
import { StudioLogo } from "@/components/studio-logo";
import { useMessaging } from "./messaging";
import { describePlanExercise, ExerciseDatalist, EXERCISE_DATALIST_ID, MiniField, numOrNull, TypeBadge, UnitInput } from "./exercise-fields";
import { CARDIO_METRICS, cardioMetricsFor, findExercise, type CardioMetric } from "@/lib/exercises";

type DayRef = { plan: AssignedPlan; day: PlanDay; index: number };

/** Grobe Dauer: Kraft ≈ 2,5 min pro Satz (inkl. Pause), Ausdauer = geplante Minuten (bzw. ~6 min/km). */
function estimateMinutes(day: PlanDay) {
  const min = day.exercises.reduce(
    (sum, e) => sum + (e.type === "cardio" ? (e.durationMin ?? (e.distanceKm ?? 0) * 6) : (e.sets ?? 0) * 2.5),
    0,
  );
  return Math.round(min / 5) * 5;
}

/** Nächster Trainingstag: Tag nach dem zuletzt trainierten Tag desselben Plans, sonst erster Tag des neuesten Plans. */
function nextUp(plans: AssignedPlan[], progress?: Progress): DayRef | null {
  const withDays = plans.filter((p) => p.days.length > 0);
  if (!withDays.length) return null;
  const last = progress?.recentWorkouts.find((w) => w.planId && withDays.some((p) => p.id === w.planId));
  const plan = withDays.find((p) => p.id === last?.planId) ?? withDays[0];
  const lastIndex = last ? plan.days.findIndex((d) => d.name === last.title) : -1;
  const index = (lastIndex + 1) % plan.days.length;
  return { plan, day: plan.days[index], index };
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-fg">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ClientView({ me, onMeChange }: { me: MeResponse; onMeChange: () => void }) {
  const plans = useApi<{ plans: AssignedPlan[] }>("/me/plans");
  const progress = useApi<Progress>("/me/progress");
  const [active, setActive] = useState<{ plan: AssignedPlan | null; day: PlanDay } | null>(null);
  const booking = useApi<{ providers: BookingProvider[] }>("/booking/providers");
  const providers = booking.data?.providers ?? [];
  // ?termin=<Trainer-ID> bzw. ?termin=1 öffnet direkt die Terminanfrage
  const [bookingFor, setBookingFor] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const t = new URLSearchParams(window.location.search).get("termin");
    return t ? (t === "1" ? "any" : t) : null;
  });

  const refresh = () => {
    progress.reload();
    plans.reload();
  };
  const startFree = () => setActive({ plan: null, day: { name: "Freies Training", exercises: [] } });

  if (active) {
    return (
      <WorkoutLogger
        plan={active.plan}
        day={active.day}
        onDone={(saved) => {
          setActive(null);
          if (saved) refresh();
        }}
      />
    );
  }

  const next = plans.data ? nextUp(plans.data.plans, progress.data) : null;

  return (
    <div className="space-y-12">
      {!me.trainer && me.studio && (
        <Card className="flex items-center gap-4">
          <StudioLogo name={me.studio.name} logoUrl={me.studio.logoUrl} size="lg" />
          <p className="text-sm text-fg-muted">
            <span className="font-semibold text-fg">{me.studio.name}</span> weist dir gerade einen neuen Coach zu. Deine Workouts und
            Messwerte bleiben erhalten – du kannst in der Zwischenzeit frei weitertrainieren.
          </p>
        </Card>
      )}
      {!me.trainer && !me.studio && <JoinTrainer onJoined={onMeChange} />}

      {/* Heute */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {plans.loading ? (
            <Card className="grid h-full place-items-center">
              <Spinner />
            </Card>
          ) : next ? (
            <NextWorkoutHero next={next} onStart={() => setActive({ plan: next.plan, day: next.day })} />
          ) : (
            <Card className="flex h-full flex-col items-start justify-center gap-4">
              <IconTile name="calendar" tone="neutral" />
              <div>
                <p className="text-lg font-semibold text-fg">Noch kein Trainingsplan</p>
                <p className="mt-1 text-sm text-fg-muted">
                  {me.trainer
                    ? `${me.trainer.name} hat dir noch keinen Plan zugewiesen. Du kannst trotzdem schon frei trainieren.`
                    : "Verbinde dich mit deinem Trainer oder logge ein freies Training."}
                </p>
              </div>
              <Button onClick={startFree}>
                <Icon name="plus" className="size-4" /> Freies Training loggen
              </Button>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex-1">
            <p className="text-sm font-semibold text-fg">Schnellaktionen</p>
            <div className="mt-4 space-y-2">
              <QuickAction icon="activity" tone="accent" title="Freies Training" text="Laufen, Rad, Gym ohne Plan" onClick={startFree} />
              <QuickAction
                icon="scale"
                tone="neutral"
                title="Messwerte erfassen"
                text="Gewicht, Körperfett, Taille"
                onClick={() => document.getElementById("messwerte")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              />
              {providers.length > 0 && (
                <QuickAction
                  icon="calendar"
                  tone="brand"
                  title="Termin anfragen"
                  text={providers.length === 1 ? `bei ${providers[0].name}` : `${providers.length} Trainer verfügbar`}
                  onClick={() => setBookingFor("any")}
                />
              )}
            </div>
          </Card>
          {me.trainer && <CoachCard trainer={me.trainer} studio={me.studio} />}
        </div>
      </section>

      <ClientAppointments providers={providers} booking={bookingFor} setBooking={setBookingFor} />

      {/* Pläne */}
      <section>
        <SectionHeader title="Meine Trainingspläne" subtitle="Von deinem Coach für dich erstellt." />
        {plans.loading ? (
          <Spinner />
        ) : plans.error ? (
          <LoadError message={plans.error.message} onRetry={plans.reload} />
        ) : !plans.data?.plans.length ? (
          <EmptyState title="Noch kein Plan" text="Sobald dein Coach dir einen Plan zuweist, erscheint er hier." />
        ) : (
          <div className={plans.data.plans.length > 1 ? "grid gap-6 xl:grid-cols-2" : "grid gap-6"}>
            {plans.data.plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                wide={plans.data!.plans.length === 1}
                nextDay={next?.plan.id === plan.id ? next.index : -1}
                onStart={(day) => setActive({ plan, day })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Fortschritt */}
      <section>
        <SectionHeader title="Mein Fortschritt" subtitle="Deine Entwicklung der letzten Wochen." />
        {progress.loading ? (
          <Spinner />
        ) : progress.error ? (
          <LoadError message={progress.error.message} onRetry={progress.reload} />
        ) : (
          progress.data && <ProgressView progress={progress.data} aside={<MeasurementForm onSaved={progress.reload} />} />
        )}
      </section>
    </div>
  );
}

function CoachCard({ trainer, studio }: { trainer: NonNullable<MeResponse["trainer"]>; studio: MeResponse["studio"] }) {
  const { open, unreadTotal } = useMessaging();
  return (
    <Card>
      <div className="flex items-center gap-4">
        <Avatar name={trainer.name} src={trainer.avatarUrl} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-fg-muted">Dein Coach</p>
          <p className="truncate font-semibold text-fg">{trainer.name}</p>
          {studio && (
            <Link
              href="/dashboard/studio"
              title={`${studio.name} – Infos & Öffnungszeiten`}
              className="mt-1 flex items-center gap-1.5 text-xs text-fg-muted transition hover:text-brand-ink"
            >
              <StudioLogo name={studio.name} logoUrl={studio.logoUrl} size="sm" className="size-5" />
              <span className="truncate">{studio.name}</span>
              <Icon name="arrow" className="size-3 shrink-0" />
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => open(trainer.id)}
          aria-label={unreadTotal ? `Nachricht an ${trainer.name}, ${unreadTotal} ungelesen` : `Nachricht an ${trainer.name}`}
          title="Nachricht schreiben"
          className="relative grid size-9 shrink-0 place-items-center rounded-lg text-fg-subtle ring-1 ring-line-strong transition hover:text-brand-ink"
        >
          <Icon name="chat" className="size-4" />
          {unreadTotal > 0 && (
            <span className="absolute -top-1.5 -right-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] leading-4 font-bold text-accent-fg ring-2 ring-surface">
              {unreadTotal > 9 ? "9+" : unreadTotal}
            </span>
          )}
        </button>
      </div>
    </Card>
  );
}

function NextWorkoutHero({ next, onStart }: { next: DayRef; onStart: () => void }) {
  const { plan, day, index } = next;
  const minutes = estimateMinutes(day);
  const shown = day.exercises.slice(0, 5);
  return (
    <div className="relative isolate h-full overflow-hidden rounded-3xl bg-brand p-6 text-brand-fg shadow-[0_0_80px_-20px] shadow-brand/40 sm:p-8">
      {/* Dekor: geschwungene Linie wie in der Referenz */}
      <svg aria-hidden="true" viewBox="0 0 200 80" fill="none" className="absolute -right-2 -bottom-2 -z-10 w-56 text-brand-fg/25">
        <path d="M2 78c10-30 22-30 30-10s20 18 26-6 18-28 28-6 20 22 28-2 18-30 30-12 20 10 26-10 12-28 28-30" stroke="currentColor" strokeWidth="2" />
      </svg>

      <p className="text-sm font-medium text-brand-fg/70">Nächstes Training · {plan.title}</p>
      <h3 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{day.name}</h3>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-brand-fg/80">
        <span className="flex items-center gap-1.5">
          <Icon name="list" className="size-4" /> {day.exercises.length} Übungen
        </span>
        {minutes > 0 && (
          <span className="flex items-center gap-1.5">
            <Icon name="clock" className="size-4" /> ca. {minutes} min
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Icon name="calendar" className="size-4" /> Tag {index + 1} von {plan.days.length}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {shown.length === 0 ? (
          <span className="rounded-full bg-brand-fg/10 px-3 py-1 text-sm">Noch keine Übungen – du kannst beim Training welche hinzufügen</span>
        ) : (
          shown.map((e, i) => (
            <span key={i} className="rounded-full bg-brand-fg/10 px-3 py-1 text-sm font-medium ring-1 ring-brand-fg/15 ring-inset">
              {e.name}
            </span>
          ))
        )}
        {day.exercises.length > shown.length && (
          <span className="rounded-full px-3 py-1 text-sm text-brand-fg/70">+{day.exercises.length - shown.length} weitere</span>
        )}
      </div>

      <button
        onClick={onStart}
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-brand-fg px-6 py-3.5 font-semibold text-surface shadow-sm transition hover:bg-brand-fg/85 focus:ring-2 focus:ring-brand-fg/40 focus:ring-offset-2 focus:ring-offset-brand focus:outline-none"
      >
        <Icon name="play" className="size-4" /> Training starten
      </button>
    </div>
  );
}

function QuickAction({
  icon,
  tone,
  title,
  text,
  onClick,
}: {
  icon: IconName;
  tone: Tone;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface-2"
    >
      <IconTile name={icon} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="block truncate text-xs text-fg-muted">{text}</span>
      </span>
      <Icon name="arrow" className="size-4 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-brand-ink" />
    </button>
  );
}

function PlanCard({
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
            {plan.days.length} Trainingstage · zugewiesen am {fmtDate(plan.assignedAt)}
          </p>
          {plan.description && <p className="mt-2 text-sm text-fg-muted">{plan.description}</p>}
        </div>
      </div>

      <div className={cx("mt-6 grid gap-4", wide ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2")}>
        {plan.days.map((day, i) => {
          const minutes = estimateMinutes(day);
          const isNext = i === nextDay;
          return (
            <div
              key={i}
              className={cx(
                "flex flex-col rounded-xl p-4 ring-1 ring-inset",
                isNext ? "bg-brand/30 ring-brand-ink/30" : "bg-surface-2 ring-line",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-fg">{day.name}</p>
                {isNext && <Badge tone="accent">Als Nächstes</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-fg-muted">
                {day.exercises.length} Übungen{minutes > 0 && ` · ca. ${minutes} min`}
              </p>

              {day.exercises.length === 0 ? (
                <p className="mt-4 flex-1 text-sm text-fg-subtle italic">Noch keine Übungen eingetragen.</p>
              ) : (
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {day.exercises.slice(0, 4).map((e, j) => (
                    <li key={j} className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-1.5 text-fg">
                        <span className="truncate">{e.name}</span> <TypeBadge type={e.type} />
                      </span>
                      <span className="shrink-0 text-right font-mono text-xs text-fg-subtle">{describePlanExercise(e)}</span>
                    </li>
                  ))}
                  {day.exercises.length > 4 && <li className="text-xs text-fg-subtle">+{day.exercises.length - 4} weitere</li>}
                </ul>
              )}

              <Button variant={isNext ? "primary" : "secondary"} size="sm" className="mt-4 w-full" onClick={() => onStart(day)}>
                <Icon name="play" className="size-3.5" /> Starten
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function JoinTrainer({ onJoined }: { onJoined: () => void }) {
  // Vorausgefüllt, wenn ein angemeldeter Kunde einen Einladungslink geöffnet hat (/dashboard?code=…)
  const [code, setCode] = useState(() =>
    typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("code") ?? "").toUpperCase(),
  );
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/me/trainer", { body: { inviteCode: code } });
      onJoined();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card className="bg-gradient-to-br from-brand/10 to-surface">
      <h2 className="font-semibold text-fg">Mit deinem Trainer verbinden</h2>
      <p className="mt-1 text-sm text-fg-muted">Gib den Einladungscode ein, den du von deinem Trainer bekommen hast.</p>
      <form onSubmit={submit} className="mt-4 flex max-w-md gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
          placeholder="K7MX2QPA"
          className="font-mono tracking-widest uppercase"
          required
        />
        <Button type="submit">Verbinden</Button>
      </form>
      {error && <div className="mt-3"><Alert>{error}</Alert></div>}
    </Card>
  );
}

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
    sets: Array.from({ length: e.sets ?? 1 }, () => ({ reps: parseInt(e.reps ?? "", 10) || 0, weightKg: e.weightKg ?? null })),
    target: describePlanExercise(e),
    notes: e.notes,
  };
}

function WorkoutLogger({ plan, day, onDone }: { plan: AssignedPlan | null; day: PlanDay; onDone: (saved: boolean) => void }) {
  const [exercises, setExercises] = useState<LogEntry[]>(() => day.exercises.map(toLogEntry));
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
      if (!logged.length) throw new Error("Hake mindestens einen Satz oder eine Ausdauereinheit ab.");
      const missing = logged.find((e) => e.type === "cardio" && e.durationMin == null && e.distanceKm == null);
      if (missing) throw new Error(`Bitte Dauer oder Distanz für „${missing.name}“ eintragen.`);
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
        if (err instanceof ApiClientError && err.status === 400 && body.planId) {
          await api("/workouts", { body: { ...body, planId: null } });
        } else {
          throw err;
        }
      }
      onDone(true);
    } catch (err) {
      // Eingaben bleiben erhalten → erneut versuchen ist jederzeit möglich
      setError(errorMessage(err, "Speichern fehlgeschlagen. Deine Eingaben sind noch da – bitte erneut versuchen."));
      setPending(false);
    }
  }

  const total = exercises.reduce((n, e) => n + (e.type === "cardio" ? 1 : e.sets.length), 0);
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
          <h2 className="text-2xl font-bold tracking-tight text-fg">{day.name}</h2>
        </div>
        <Badge tone="brand">
          {checked}/{total} erledigt
        </Badge>
      </div>
      <div className="h-2 rounded-full bg-surface-3">
        <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${total ? (checked / total) * 100 : 0}%` }} />
      </div>
      {error && <Alert>{error}</Alert>}

      {exercises.map((ex, ei) => (
        <Card key={ei}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-fg">
                {ex.name} <TypeBadge type={ex.type} />
              </h3>
              {ex.target && <p className="mt-0.5 font-mono text-xs text-fg-subtle">Ziel: {ex.target}</p>}
              {ex.notes && <p className="mt-1 text-sm text-fg-muted">{ex.notes}</p>}
            </div>
            {ex.type === "cardio" && (
              <CheckButton done={!!done[`${ei}-cardio`]} onClick={() => toggle(`${ei}-cardio`)} label="Einheit erledigt" />
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
                      onChange={(e) => edit(ei, (x) => void (x[m] = numOrNull(e.target.value)))}
                    />
                  </MiniField>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {ex.sets.map((set, si) => (
                <div key={si} className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] items-center gap-2">
                  <span className="text-sm text-fg-subtle">#{si + 1}</span>
                  <UnitInput
                    aria-label={`Satz ${si + 1} Wiederholungen`}
                    unit="Wdh."
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={set.reps || ""}
                    onChange={(e) => edit(ei, (x) => void (x.sets[si].reps = Number(e.target.value) || 0))}
                  />
                  <UnitInput
                    aria-label={`Satz ${si + 1} Gewicht`}
                    unit="kg"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.5"
                    value={set.weightKg ?? ""}
                    onChange={(e) => edit(ei, (x) => void (x.sets[si].weightKg = numOrNull(e.target.value)))}
                  />
                  <CheckButton done={!!done[`${ei}-${si}`]} onClick={() => toggle(`${ei}-${si}`)} label="Satz erledigt" />
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => edit(ei, (x) => void x.sets.push({ ...(x.sets.at(-1) ?? { reps: 10, weightKg: null }) }))}
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
          placeholder={exercises.length ? "Weitere Übung, z. B. Laufband" : "Übung hinzufügen, z. B. Laufband oder Kniebeuge"}
        />
        <Button type="submit" variant="secondary" className="shrink-0">
          + Übung
        </Button>
      </form>

      <Field label="Notiz an deinen Trainer (optional)">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Wie lief's?" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            if (checked > 0 && !window.confirm("Training abbrechen? Deine Eingaben gehen verloren.")) return;
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

function CheckButton({ done, onClick, label }: { done: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={done}
      onClick={onClick}
      className={`grid size-10 shrink-0 place-items-center rounded-lg text-lg transition ${
        done ? "bg-brand text-brand-fg" : "ring-1 ring-line-strong hover:bg-surface-2"
      }`}
    >
      {done ? "✓" : ""}
    </button>
  );
}

function MeasurementForm({ onSaved }: { onSaved: () => void }) {
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const n = (k: string) => (form.get(k) ? Number(String(form.get(k)).replace(",", ".")) : null);
    setMsg(null);
    try {
      await api("/measurements", { body: { bodyWeightKg: n("weight"), bodyFatPct: n("fat"), waistCm: n("waist") } });
      formEl.reset();
      setMsg({ tone: "success", text: "Gespeichert." });
      onSaved();
    } catch (err) {
      setMsg({ tone: "error", text: errorMessage(err, "Messwerte konnten nicht gespeichert werden.") });
    }
  }

  return (
    <Card id="messwerte" className="scroll-mt-24">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">Messwerte erfassen</h3>
        <IconTile name="scale" tone="neutral" size="sm" />
      </div>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Field label="Körpergewicht (kg)">
          <Input name="weight" inputMode="decimal" placeholder="z. B. 72,4" />
        </Field>
        <Field label="Körperfett (%)">
          <Input name="fat" inputMode="decimal" placeholder="optional" />
        </Field>
        <Field label="Taillenumfang (cm)">
          <Input name="waist" inputMode="decimal" placeholder="optional" />
        </Field>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Button type="submit" variant="secondary" className="w-full">
          Speichern
        </Button>
      </form>
    </Card>
  );
}
