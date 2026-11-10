"use client";

import { TrainerAppointments } from "@/components/dashboard/appointments/trainer-appointments";
import { openRequests } from "@/components/dashboard/appointments/utils";
import { cx } from "@/components/ui";
import { useApi } from "@/lib/client/api";
import type { Appointment } from "@/lib/types";
import { useState } from "react";
import { ClientDetailView } from "./client-detail";
import { ClientsList } from "./clients-list";
import { ExercisesTab } from "./exercises-tab";
import { InvitationsTab } from "./invitations-tab";
import { PlansTab } from "./plans-tab";

type Tab = "clients" | "plans" | "exercises" | "appointments" | "invitations";

export function TrainerView() {
  const [tab, setTab] = useState<Tab>("clients");
  const [clientId, setClientId] = useState<string | null>(null);
  const appointments = useApi<{ appointments: Appointment[] }>("/appointments");
  const [now] = useState(() => Date.now());
  const pending = openRequests(appointments.data?.appointments, now);

  const tabs: [Tab, string, number | null][] = [
    ["clients", "Kunden", null],
    ["plans", "Trainingspläne", null],
    ["exercises", "Übungen", null],
    ["appointments", "Termine", pending || null],
    ["invitations", "Einladungen", null],
  ];

  return (
    <div>
      <nav className="tab-bar flex gap-6 overflow-x-auto overflow-y-hidden">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setClientId(null);
            }}
            className={cx(
              "flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition",
              tab === key
                ? "border-fg text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {label}
            {count != null && (
              <span className="rounded-full bg-accent px-1.5 text-xs text-accent-fg">
                {count}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="mt-8">
        {tab === "clients" &&
          (clientId ? (
            <ClientDetailView id={clientId} onBack={() => setClientId(null)} />
          ) : (
            <ClientsList
              onOpen={setClientId}
              onInvite={() => setTab("invitations")}
            />
          ))}
        {tab === "plans" && <PlansTab />}
        {tab === "exercises" && <ExercisesTab />}
        {tab === "appointments" && (
          <TrainerAppointments appointments={appointments} />
        )}
        {tab === "invitations" && <InvitationsTab />}
      </div>
    </div>
  );
}
