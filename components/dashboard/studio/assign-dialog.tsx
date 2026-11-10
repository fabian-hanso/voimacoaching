"use client";

import { Button } from "@/components/ui";
import type { StudioClient, StudioTrainer } from "@/lib/types";
import { useState } from "react";

export function AssignDialog({
  client,
  trainer,
  onClose,
  onConfirm,
}: {
  client: StudioClient;
  trainer: StudioTrainer;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const isTransfer = !!client.trainerId;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Abbrechen"
        tabIndex={-1}
        onClick={() => !pending && onClose()}
        className="absolute inset-0 bg-fg/30 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-md rounded-box bg-surface p-6 shadow-2xl ring-1 ring-line-strong">
        <h2 className="text-lg font-semibold text-fg">
          {isTransfer
            ? `${client.name} an ${trainer.name} übertragen?`
            : `${client.name} an ${trainer.name} zuweisen?`}
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-fg-muted">
          {isTransfer && (
            <li>
              {trainer.name} bekommt Kopien der Pläne, die {client.name}{" "}
              zugewiesen sind.
            </li>
          )}
          <li>
            Workouts, Messwerte und Fortschritt bleiben vollständig erhalten.
          </li>
          {isTransfer && (
            <li>Der bisherige Chat-Verlauf bleibt bei {client.trainerName}.</li>
          )}
          <li>
            {client.name} und {trainer.name} bekommen einen Hinweis.
          </li>
        </ul>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await onConfirm();
              setPending(false);
            }}
          >
            {pending
              ? "Wird übertragen …"
              : isTransfer
                ? "Übertragen"
                : "Zuweisen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
