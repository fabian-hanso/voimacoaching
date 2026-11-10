"use client";

import { ClientAppointments } from "@/components/dashboard/appointments/client-appointments";
import { MyCourses } from "@/components/dashboard/courses/my-courses";
import { ProgressView } from "@/components/dashboard/progress-view";
import { Icon, IconTile } from "@/components/icons";
import { StudioLogo } from "@/components/studio-logo";
import { Button, Card, EmptyState, LoadError, Spinner } from "@/components/ui";
import { useApi } from "@/lib/client/api";
import type { PlanDay } from "@/lib/schemas";
import type {
  AssignedPlan,
  BookingProvider,
  MeResponse,
  Progress,
} from "@/lib/types";
import Link from "next/link";
import { useState } from "react";
import { CoachCard } from "./coach-card";
import { JoinTrainer } from "./join-trainer";
import { MeasurementForm } from "./measurement-form";
import { NextWorkoutHero } from "./next-workout-hero";
import { PlanCard } from "./plan-card";
import { QuickAction } from "./quick-action";
import { SectionHeader } from "./section-header";
import { nextUp } from "./utils";
import { WorkoutLogger } from "./workout-logger";

export function ClientView({
  me,
  onMeChange,
}: {
  me: MeResponse;
  onMeChange: () => void;
}) {
  const plans = useApi<{ plans: AssignedPlan[] }>("/me/plans");
  const progress = useApi<Progress>("/me/progress");
  const [active, setActive] = useState<{
    plan: AssignedPlan | null;
    day: PlanDay;
  } | null>(null);
  const booking = useApi<{ providers: BookingProvider[] }>(
    "/booking/providers",
  );
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
  const startFree = () =>
    setActive({ plan: null, day: { name: "Freies Training", exercises: [] } });

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
      {!me.trainer && me.studio && me.user.studioMember && (
        <Card className="flex flex-col gap-4 bg-gradient-to-br from-brand/15 to-surface sm:flex-row sm:items-center">
          <StudioLogo
            name={me.studio.name}
            logoUrl={me.studio.logoUrl}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-fg">
              Willkommen bei {me.studio.name}!
            </p>
            <p className="mt-0.5 text-sm text-fg-muted">
              Als Mitglied meldest du dich für Kurse an und buchst 1:1-Termine
              bei allen Trainern – einen festen Coach brauchst du dafür nicht.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/studio#kurse"
              className="inline-flex items-center gap-2 rounded-control bg-surface px-3 py-2 text-sm font-semibold text-fg ring-1 ring-line-strong transition hover:bg-surface-3"
            >
              <Icon name="users" className="size-4" /> Kurse
            </Link>
            {providers.length > 0 && (
              <Button onClick={() => setBookingFor("any")}>
                <Icon name="calendar" className="size-4" /> 1:1-Termin buchen
              </Button>
            )}
          </div>
        </Card>
      )}
      {!me.trainer && me.studio && !me.user.studioMember && (
        <Card className="flex items-center gap-4">
          <StudioLogo
            name={me.studio.name}
            logoUrl={me.studio.logoUrl}
            size="lg"
          />
          <p className="text-sm text-fg-muted">
            <span className="font-semibold text-fg">{me.studio.name}</span>{" "}
            weist dir gerade einen neuen Coach zu. Deine Workouts und Messwerte
            bleiben erhalten – du kannst in der Zwischenzeit frei
            weitertrainieren.
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
            <NextWorkoutHero
              next={next}
              onStart={() => setActive({ plan: next.plan, day: next.day })}
            />
          ) : (
            <Card className="flex h-full flex-col items-start justify-center gap-4">
              <IconTile name="calendar" tone="neutral" />
              <div>
                <p className="text-lg font-semibold text-fg">
                  Noch kein Trainingsplan
                </p>
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
              <QuickAction
                icon="activity"
                tone="accent"
                title="Freies Training"
                text="Laufen, Rad, Gym ohne Plan"
                onClick={startFree}
              />
              <QuickAction
                icon="scale"
                tone="neutral"
                title="Messwerte erfassen"
                text="Gewicht, Körperfett, Taille"
                onClick={() =>
                  document
                    .getElementById("messwerte")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              />
              {providers.length > 0 && (
                <QuickAction
                  icon="calendar"
                  tone="brand"
                  title="Termin anfragen"
                  text={
                    providers.length === 1
                      ? `bei ${providers[0].name}`
                      : `${providers.length} Trainer verfügbar`
                  }
                  onClick={() => setBookingFor("any")}
                />
              )}
            </div>
          </Card>
          {me.trainer && <CoachCard trainer={me.trainer} studio={me.studio} />}
        </div>
      </section>

      <ClientAppointments
        providers={providers}
        booking={bookingFor}
        setBooking={setBookingFor}
      />
      <MyCourses />

      {/* Pläne */}
      <section>
        <SectionHeader
          title="Meine Trainingspläne"
          subtitle="Von deinem Coach für dich erstellt."
        />
        {plans.loading ? (
          <Spinner />
        ) : plans.error ? (
          <LoadError message={plans.error.message} onRetry={plans.reload} />
        ) : !plans.data?.plans.length ? (
          <EmptyState
            title="Noch kein Plan"
            text="Sobald dein Coach dir einen Plan zuweist, erscheint er hier."
          />
        ) : (
          <div
            className={
              plans.data.plans.length > 1
                ? "grid gap-6 xl:grid-cols-2"
                : "grid gap-6"
            }
          >
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
        <SectionHeader
          title="Mein Fortschritt"
          subtitle="Deine Entwicklung der letzten Wochen."
        />
        {progress.loading ? (
          <Spinner />
        ) : progress.error ? (
          <LoadError
            message={progress.error.message}
            onRetry={progress.reload}
          />
        ) : (
          progress.data && (
            <ProgressView
              progress={progress.data}
              aside={<MeasurementForm onSaved={progress.reload} />}
            />
          )
        )}
      </section>
    </div>
  );
}
