"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar, Button, Card, EmptyState } from "@/components/ui";
import { api } from "@/lib/client/api";
import type { StudioOverview, StudioTrainer } from "@/lib/types";
import { useState } from "react";
import { SectionTitle } from "./section-title";
import { StaffSection } from "./staff-section";
import { TransferAllDialog } from "./transfer-all-dialog";

export function TeamTab({
  data,
  reload,
  onInvite,
}: {
  data: StudioOverview;
  reload: () => void;
  onInvite: () => void;
}) {
  const [transferFrom, setTransferFrom] = useState<StudioTrainer | null>(null);
  const [removing, setRemoving] = useState<StudioTrainer | null>(null);

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle
          title="Trainer"
          subtitle={`${data.trainers.length}/${data.studio.maxTrainers} Plätze · mit eigenem Konto – Foto & Name pflegen Trainer selbst in ihren Einstellungen`}
        />
        {!data.trainers.length ? (
          <EmptyState
            title="Noch keine Trainer"
            text="Lade deine Trainer per Link oder Code in dein Studio ein."
            action={<Button onClick={onInvite}>Trainer einladen</Button>}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.trainers.map((t) => (
              <Card key={t.id} className="flex flex-col">
                <div className="flex items-center gap-3">
                  <Avatar name={t.name} src={t.avatarUrl} size="xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fg">{t.name}</p>
                    <p className="truncate text-xs text-fg-muted">{t.email}</p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-tile bg-surface-2 py-2">
                    <dt className="text-[10px] text-fg-subtle">Kunden</dt>
                    <dd className="text-sm font-semibold text-fg">
                      {t.clientCount}
                    </dd>
                  </div>
                  <div className="rounded-tile bg-surface-2 py-2">
                    <dt className="text-[10px] text-fg-subtle">
                      Aktiv (7 Tage)
                    </dt>
                    <dd className="text-sm font-semibold text-fg">
                      {t.activeClients}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={data.trainers.length < 2}
                    title={
                      data.trainers.length < 2
                        ? "Es gibt keinen anderen Trainer im Studio."
                        : undefined
                    }
                    onClick={() => setTransferFrom(t)}
                  >
                    Vertretung / Übergabe
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={t.clientCount > 0}
                    title={
                      t.clientCount > 0
                        ? "Übertrage zuerst alle Kunden an einen anderen Trainer."
                        : undefined
                    }
                    onClick={() => setRemoving(t)}
                  >
                    Entfernen
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <StaffSection staff={data.staff} reload={reload} />

      {transferFrom && (
        <TransferAllDialog
          from={transferFrom}
          candidates={data.trainers.filter((t) => t.id !== transferFrom.id)}
          onClose={() => setTransferFrom(null)}
          onDone={() => {
            setTransferFrom(null);
            reload();
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title={`${removing.name} aus dem Studio entfernen?`}
          description={
            <p>
              {removing.name} gehört dann nicht mehr zu deinem Studio. Das
              Trainer-Konto bleibt bestehen, {removing.name} bekommt einen
              Hinweis.
            </p>
          }
          confirmWord="entfernen"
          confirmLabel="Trainer entfernen"
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await api(`/studio/trainers/${removing.id}`, { method: "DELETE" });
            setRemoving(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
