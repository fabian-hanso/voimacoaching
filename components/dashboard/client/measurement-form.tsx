"use client";

import { IconTile } from "@/components/icons";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { useState } from "react";

export function MeasurementForm({ onSaved }: { onSaved: () => void }) {
  const [msg, setMsg] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const n = (k: string) =>
      form.get(k) ? Number(String(form.get(k)).replace(",", ".")) : null;
    setMsg(null);
    try {
      await api("/measurements", {
        body: {
          bodyWeightKg: n("weight"),
          bodyFatPct: n("fat"),
          waistCm: n("waist"),
        },
      });
      formEl.reset();
      setMsg({ tone: "success", text: "Gespeichert." });
      onSaved();
    } catch (err) {
      setMsg({
        tone: "error",
        text: errorMessage(err, "Messwerte konnten nicht gespeichert werden."),
      });
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
