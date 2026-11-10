"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field, Select } from "@/components/ui";
import { api } from "@/lib/client/api";
import type { StudioTrainer } from "@/lib/types";
import { useState } from "react";

/** „Trainer fällt aus“: alle Kunden, Pläne und offene Einladungen an einen anderen Trainer übergeben. */
export function TransferAllDialog({
  from,
  candidates,
  onClose,
  onDone,
}: {
  from: StudioTrainer;
  candidates: StudioTrainer[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [to, setTo] = useState(candidates[0]?.id ?? "");
  const target = candidates.find((c) => c.id === to);
  return (
    <ConfirmDialog
      title={`Kunden von ${from.name} übergeben`}
      description={
        <div className="space-y-3">
          <p>
            Fällt {from.name} aus, übernimmt ein anderer Trainer{" "}
            <strong>alle {from.clientCount} Kunden</strong>, alle Pläne und
            offene Kunden-Einladungen. Kunden und neuer Trainer bekommen einen
            Hinweis. Der bisherige Chat-Verlauf bleibt bei {from.name}.
          </p>
          <Field label="Übernehmender Trainer">
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.clientCount} Kunden
                </option>
              ))}
            </Select>
          </Field>
        </div>
      }
      confirmWord="übergeben"
      confirmLabel={target ? `An ${target.name} übergeben` : "Übergeben"}
      onClose={onClose}
      onConfirm={async () => {
        await api(`/studio/trainers/${from.id}/transfer`, {
          body: { toTrainerId: to },
        });
        onDone();
      }}
    />
  );
}
