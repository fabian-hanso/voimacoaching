"use client";

import { CalendarView } from "@/components/dashboard/appointments/calendar-view";
import { openRequests } from "@/components/dashboard/appointments/utils";
import { StudioCourses } from "@/components/dashboard/courses/studio-courses";
import { ExerciseCatalog } from "@/components/dashboard/exercise-guide";
import { WishLink } from "@/components/dashboard/feature-wish";
import { Icon, IconTile } from "@/components/icons";
import { StudioLogo } from "@/components/studio-logo";
import { Card, cx, LoadError, Spinner } from "@/components/ui";
import { useApi } from "@/lib/client/api";
import { EXERCISE_CATALOG } from "@/lib/exercises";
import type { Appointment, StudioOverview } from "@/lib/types";
import { useState } from "react";
import { ClientsTab } from "./clients-tab";
import { InvitationsTab } from "./invitations-tab";
import { ProfileTab } from "./profile-tab";
import { TeamTab } from "./team-tab";

type Tab =
  | "team"
  | "clients"
  | "appointments"
  | "courses"
  | "exercises"
  | "invitations"
  | "profile";

/**
 * Dashboard für Studio-Inhaber: Trainer verwalten, Kunden zuweisen/übertragen,
 * Trainer einladen, Studio-Profil (Name & Logo). Trainingsdaten und Chats sieht das Studio NICHT.
 */
export function StudioView() {
  const overview = useApi<StudioOverview>("/studio");
  const appointments = useApi<{ appointments: Appointment[] }>("/appointments");
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" && window.location.hash === "#studio-profil"
      ? "profile"
      : "team",
  );

  if (overview.loading) return <Spinner />;
  if (!overview.data)
    return (
      <LoadError
        message={
          overview.error?.message ?? "Studio konnte nicht geladen werden."
        }
        onRetry={overview.reload}
      />
    );
  const data = overview.data;
  // Nur Kunden, deren Coach weggefallen ist – Mitglieder (per Code) brauchen keinen festen Trainer
  const unassigned = data.clients.filter(
    (c) => !c.trainerId && !c.studioMember,
  ).length;

  const tabs: [Tab, string, number | null][] = [
    ["team", "Team", data.trainers.length],
    ["clients", "Kunden", data.clients.length],
    [
      "appointments",
      "Termine",
      openRequests(appointments.data?.appointments, now) || null,
    ],
    ["courses", "Kurse", null],
    ["exercises", "Übungen", null],
    ["invitations", "Einladungen", null],
    ["profile", "Studio-Profil", null],
  ];

  return (
    <div className="space-y-8">
      {/* Kopf mit Logo & Kennzahlen */}
      <div className="flex flex-wrap items-center gap-4">
        <StudioLogo
          name={data.studio.name}
          logoUrl={data.studio.logoUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-fg-subtle">Dein Studio</p>
          <p className="truncate text-xl font-bold text-fg">
            {data.studio.name}
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <Kpi
            label="Trainer"
            value={`${data.trainers.length}/${data.studio.maxTrainers}`}
          />
          <Kpi label="Kunden" value={String(data.clients.length)} />
          <Kpi
            label="Aktiv (7 Tage)"
            value={String(
              data.clients.filter((c) => c.workoutsLast7Days > 0).length,
            )}
          />
        </div>
      </div>

      {unassigned > 0 && (
        <button
          onClick={() => setTab("clients")}
          className="flex w-full items-center gap-3 rounded-box bg-accent/10 p-4 text-left ring-1 ring-accent/30 transition hover:bg-accent/15"
        >
          <IconTile name="alert" tone="accent" />
          <span className="flex-1 text-sm">
            <span className="font-semibold text-fg">
              {unassigned} {unassigned === 1 ? "Kunde ist" : "Kunden sind"} ohne
              Trainer.
            </span>{" "}
            <span className="text-fg-muted">
              Weise sie einem Trainer zu, damit sie weiter betreut werden.
            </span>
          </span>
          <Icon name="arrow" className="size-4 text-fg-muted" />
        </button>
      )}

      <nav className="tab-bar flex gap-6 overflow-x-auto overflow-y-hidden">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cx(
              "flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition",
              tab === key
                ? "border-fg text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {label}
            {count != null && (
              <span className="rounded-full bg-surface-3 px-1.5 text-xs text-fg-muted">
                {count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === "team" && (
        <TeamTab
          data={data}
          reload={overview.reload}
          onInvite={() => setTab("invitations")}
        />
      )}
      {tab === "clients" && <ClientsTab data={data} reload={overview.reload} />}
      {tab === "appointments" && (
        <CalendarView role="studio" onChanged={appointments.reload} />
      )}
      {tab === "courses" && <StudioCourses trainers={data.trainers} />}
      {tab === "exercises" && (
        <Card>
          <h2 className="font-semibold text-fg">Übungskatalog</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {EXERCISE_CATALOG.length} Übungen mit Anleitung. Nehmen eure Trainer
            sie in einen Plan auf, sehen die Kunden die Erklärung direkt an der
            Übung.
          </p>
          <div className="mt-5">
            <ExerciseCatalog />
          </div>
        </Card>
      )}
      {tab === "invitations" && (
        <InvitationsTab data={data} reload={overview.reload} />
      )}
      {tab === "profile" && <ProfileTab data={data} reload={overview.reload} />}

      <div className="flex justify-center pt-2">
        <WishLink context="Studio-Dashboard" />
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-extrabold text-fg tabular-nums">{value}</p>
      <p className="text-xs text-fg-subtle">{label}</p>
    </div>
  );
}
