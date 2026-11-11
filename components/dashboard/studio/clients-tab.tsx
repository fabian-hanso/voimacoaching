"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icons";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  cx,
  EmptyState,
  Select,
  type BadgeTone,
} from "@/components/ui";
import { api, fmtDate } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { StudioClient, StudioOverview } from "@/lib/types";
import { useState } from "react";
import { AssignDialog } from "./assign-dialog";
import { MemberCodeCard } from "./member-code-card";

function clientStatus(c: StudioClient): { label: string; tone: BadgeTone } {
  if (!c.trainerId)
    return c.studioMember
      ? { label: "Mitglied", tone: "brand" }
      : { label: "Ohne Trainer", tone: "accent" };
  if (!c.lastWorkoutAt) return { label: "Neu", tone: "neutral" };
  return c.workoutsLast7Days > 0
    ? { label: "Aktiv", tone: "success" }
    : { label: "Inaktiv", tone: "warning" };
}

const needsCoach = (c: StudioClient) => !c.trainerId && !c.studioMember;

export function ClientsTab({
  data,
  reload,
}: {
  data: StudioOverview;
  reload: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "members" | "unassigned">(
    data.clients.some(needsCoach) ? "unassigned" : "all",
  );
  const [pending, setPending] = useState<{
    client: StudioClient;
    trainerId: string;
  } | null>(null);
  const [removing, setRemoving] = useState<StudioClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data.clients.length) {
    return (
      <div className="space-y-6">
        <MemberCodeCard
          code={data.studio.joinCode}
          studioName={data.studio.name}
          logoUrl={data.studio.logoUrl}
          onRenewed={reload}
        />
        <EmptyState
          title="Noch keine Kunden"
          text="Neue Mitglieder kommen über deinen Mitglieds-Code bzw. QR-Code – oder über die Einladungen deiner Trainer."
        />
      </div>
    );
  }

  const shown = data.clients.filter(
    (c) =>
      filter === "all" ||
      (filter === "members" ? c.studioMember : needsCoach(c)),
  );
  const unassigned = data.clients.filter(needsCoach).length;
  const members = data.clients.filter((c) => c.studioMember).length;

  async function assign(client: StudioClient, trainerId: string) {
    setError(null);
    try {
      await api(`/studio/clients/${client.id}/trainer`, {
        method: "PUT",
        body: { trainerId },
      });
      setPending(null);
      reload();
    } catch (err) {
      setError(errorMessage(err, "Zuweisung fehlgeschlagen."));
    }
  }

  return (
    <div className="space-y-4">
      <MemberCodeCard
        code={data.studio.joinCode}
        studioName={data.studio.name}
        logoUrl={data.studio.logoUrl}
        onRenewed={reload}
      />
      {!data.trainers.length && (
        <Alert tone="info">
          Lade Trainer ein, um Kunden einen festen Coach zuweisen zu können.
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", `Alle (${data.clients.length})`],
            ["members", `Mitglieder (${members})`],
            ["unassigned", `Coach fehlt (${unassigned})`],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={cx(
              "rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition",
              filter === v
                ? "bg-brand text-brand-fg ring-brand"
                : "bg-surface text-fg-muted ring-line-strong hover:bg-surface-3",
            )}
          >
            {l}
          </button>
        ))}
        <p className="ml-auto text-xs text-fg-subtle">
          Trainingsdaten und Chats sind nur für den jeweiligen Trainer sichtbar.
        </p>
      </div>
      {error && <Alert>{error}</Alert>}

      {shown.length === 0 ? (
        <EmptyState
          title={
            filter === "members"
              ? "Noch keine Mitglieder"
              : "Allen Kunden ist ein Coach zugeordnet 🎉"
          }
          text={
            filter === "members"
              ? "Teile deinen Mitglieds-Code oder hänge den QR-Code an der Rezeption aus."
              : "Mitglieder ohne festen Coach brauchen keinen – sie buchen Kurse und 1:1-Termine direkt."
          }
        />
      ) : (
        <Card className="divide-y divide-line p-0">
          {shown.map((c) => {
            const st = clientStatus(c);
            return (
              <div
                key={c.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={c.name} src={c.avatarUrl} size="lg" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-fg">
                      <span className="truncate">{c.name}</span>{" "}
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </p>
                    <p className="truncate text-xs text-fg-muted">
                      {c.email} · seit {fmtDate(c.joinedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:w-80">
                  {data.trainers.length > 0 && (
                    <Select
                      aria-label={`Trainer für ${c.name}`}
                      value={c.trainerId ?? ""}
                      onChange={(e) =>
                        e.target.value &&
                        setPending({ client: c, trainerId: e.target.value })
                      }
                    >
                      {!c.trainerId && (
                        <option value="">
                          {c.studioMember
                            ? "Kein fester Coach"
                            : "– Trainer wählen –"}
                        </option>
                      )}
                      {data.trainers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  )}
                  <button
                    type="button"
                    onClick={() => setRemoving(c)}
                    aria-label={`${c.name} aus dem Studio entfernen`}
                    title="Aus dem Studio entfernen"
                    className="grid size-9 shrink-0 place-items-center rounded-control text-fg-subtle ring-1 ring-line transition hover:bg-danger/10 hover:text-danger"
                  >
                    <Icon name="x" className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {removing && (
        <ConfirmDialog
          title={`${removing.name} aus dem Studio entfernen?`}
          description={
            <ul className="list-disc space-y-1 pl-5">
              {removing.trainerId && removing.trainerName && (
                <li>
                  Die Verbindung zu {removing.trainerName} endet,
                  Planzuweisungen werden aufgehoben.
                </li>
              )}
              <li>
                Künftige Kursanmeldungen und Termine bei euren Trainern werden
                storniert.
              </li>
              <li>
                Workouts und Messwerte bleiben bei {removing.name};{" "}
                {removing.name} bekommt einen Hinweis.
              </li>
              <li>
                Mit dem Mitglieds-Code kann {removing.name} später wieder
                beitreten – erneuere ihn bei Bedarf.
              </li>
            </ul>
          }
          confirmWord="entfernen"
          confirmLabel="Aus dem Studio entfernen"
          onConfirm={async () => {
            await api(`/studio/clients/${removing.id}`, { method: "DELETE" });
            setRemoving(null);
            reload();
          }}
          onClose={() => setRemoving(null)}
        />
      )}
      {pending && (
        <AssignDialog
          client={pending.client}
          trainer={data.trainers.find((t) => t.id === pending.trainerId)!}
          onClose={() => setPending(null)}
          onConfirm={() => assign(pending.client, pending.trainerId)}
        />
      )}
    </div>
  );
}
