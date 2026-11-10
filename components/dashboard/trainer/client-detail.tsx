"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { WishLink } from "@/components/dashboard/feature-wish";
import { useMessaging } from "@/components/dashboard/messaging/messaging-context";
import { ProgressView } from "@/components/dashboard/progress-view";
import { Icon } from "@/components/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  EmptyState,
  LoadError,
  Select,
  Spinner,
} from "@/components/ui";
import { api, fmtDate, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { ClientDetail, PlanWithAssignments } from "@/lib/types";
import { useState } from "react";
import { StatusBadge, clientStatus } from "./client-status";

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-tile bg-surface-2 py-2">
      <dt className="text-[10px] text-fg-muted">{label}</dt>
      <dd className="text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}

export function ClientDetailView({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const detail = useApi<ClientDetail>(`/clients/${id}`);
  const plans = useApi<{ plans: PlanWithAssignments[] }>("/plans");
  const [planId, setPlanId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messaging = useMessaging();
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (detail.loading) return <Spinner />;
  if (detail.error?.status === 404) {
    return (
      <EmptyState
        title="Dieser Kunde ist nicht mehr verfügbar"
        text="Das Konto wurde gelöscht oder die Verbindung zu dir wurde getrennt."
        action={<Button onClick={onBack}>Zurück zur Kundenliste</Button>}
      />
    );
  }
  if (detail.error || !detail.data) {
    return (
      <LoadError
        message={detail.error?.message ?? "Kunde konnte nicht geladen werden."}
        onRetry={detail.reload}
      />
    );
  }
  const { client, plans: assigned, progress } = detail.data;
  const assignable =
    plans.data?.plans.filter((p) => !assigned.some((a) => a.id === p.id)) ?? [];

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      detail.reload();
      plans.reload();
    } catch (err) {
      setError(errorMessage(err, "Aktion fehlgeschlagen."));
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm font-medium text-fg-muted hover:text-fg"
      >
        ← Alle Kunden
      </button>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={client.name} src={client.avatarUrl} size="2xl" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-fg">
                {client.name}
              </h2>
              <StatusBadge status={clientStatus(client)} />
            </div>
            <p className="text-sm text-fg-muted">
              {client.email} · Kunde seit {fmtDate(client.joinedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => messaging.open(id)}
          >
            <Icon name="chat" className="size-4" /> Nachricht
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmRemove(true)}
          >
            Kunde entfernen
          </Button>
        </div>
        {confirmRemove && (
          <ConfirmDialog
            title={`${client.name} entfernen?`}
            description={
              <>
                <p>
                  Die Verbindung zwischen dir und {client.name} wird getrennt:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Alle zugewiesenen Pläne werden aufgehoben.</li>
                  <li>Ihr könnt euch keine Nachrichten mehr schreiben.</li>
                  <li>Du siehst den Fortschritt nicht mehr.</li>
                  <li>{client.name} bekommt einen Hinweis darüber.</li>
                </ul>
                <p className="mt-2">
                  Das Konto und die Trainingsdaten von {client.name} bleiben
                  erhalten. Für eine neue Verbindung brauchst du eine neue
                  Einladung.
                </p>
              </>
            }
            confirmLabel="Kunde entfernen"
            onClose={() => setConfirmRemove(false)}
            onConfirm={async () => {
              await api(`/clients/${id}`, { method: "DELETE" });
              messaging.reload();
              onBack();
            }}
          />
        )}
      </div>
      {error && <Alert>{error}</Alert>}

      <Card>
        <h3 className="text-sm font-semibold text-fg">Zugewiesene Pläne</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {assigned.length === 0 && (
            <p className="text-sm text-fg-muted">Noch kein Plan zugewiesen.</p>
          )}
          {assigned.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-2 rounded-full bg-brand/30 py-1 pr-1 pl-3 text-sm text-brand-ink ring-1 ring-brand-ink/20"
            >
              {p.title}
              <button
                aria-label={`${p.title} entfernen`}
                onClick={() =>
                  run(() =>
                    api(`/plans/${p.id}/assignments/${id}`, {
                      method: "DELETE",
                    }),
                  )
                }
                className="grid size-5 place-items-center rounded-full hover:bg-brand/40"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {assignable.length > 0 && (
          <div className="mt-4 flex gap-2">
            <Select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="max-w-xs"
            >
              <option value="">Plan auswählen …</option>
              {assignable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
            <Button
              disabled={!planId}
              onClick={() =>
                run(async () => {
                  await api(`/plans/${planId}/assignments`, {
                    body: { clientId: id },
                  });
                  setPlanId("");
                })
              }
            >
              Zuweisen
            </Button>
          </div>
        )}
      </Card>

      <ProgressView progress={progress} />
      <div className="flex justify-center pt-2">
        <WishLink context="Kundendetail" />
      </div>
    </div>
  );
}
