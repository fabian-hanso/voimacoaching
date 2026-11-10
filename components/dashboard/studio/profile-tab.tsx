"use client";

import { Icon } from "@/components/icons";
import { StudioLogo } from "@/components/studio-logo";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { toLogo } from "@/lib/client/image";
import type { StudioOverview } from "@/lib/types";
import { useRef, useState } from "react";
import { StudioDetailsForm } from "./studio-details-form";

export function ProfileTab({
  data,
  reload,
}: {
  data: StudioOverview;
  reload: () => void;
}) {
  const [name, setName] = useState(data.studio.name);
  const [msg, setMsg] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "success", text: success });
      reload();
    } catch (err) {
      setMsg({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="font-semibold text-fg">Logo</h3>
        <p className="mt-1 text-sm text-fg-muted">
          Dein Logo sehen deine Trainer und deren Kunden in der App. Am besten
          ein PNG mit transparentem Hintergrund.
        </p>
        <div className="mt-6 flex items-center gap-5">
          <StudioLogo
            name={data.studio.name}
            logoUrl={data.studio.logoUrl}
            size="xl"
          />
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => file.current?.click()}
            >
              <Icon name="camera" className="size-4" />{" "}
              {data.studio.logoUrl ? "Logo ändern" : "Logo hochladen"}
            </Button>
            {data.studio.logoUrl && (
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () => api("/studio/logo", { method: "DELETE" }),
                    "Logo entfernt.",
                  )
                }
              >
                Entfernen
              </Button>
            )}
          </div>
          <input
            ref={file}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              void run(async () => {
                const blob = await toLogo(f);
                const form = new FormData();
                form.append(
                  "file",
                  blob,
                  blob.type === "image/webp" ? "logo.webp" : "logo.png",
                );
                await api("/studio/logo", {
                  method: "POST",
                  body: form,
                  timeoutMs: 60_000,
                });
              }, "Logo gespeichert.");
            }}
          />
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-fg">Name</h3>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () => api("/studio", { method: "PATCH", body: { name } }),
              "Name gespeichert.",
            );
          }}
        >
          <Field label="Studioname">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </Field>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                busy || !name.trim() || name.trim() === data.studio.name
              }
            >
              Speichern
            </Button>
          </div>
        </form>
      </Card>

      {msg && (
        <div className="lg:col-span-2">
          <Alert tone={msg.tone}>{msg.text}</Alert>
        </div>
      )}

      <div className="border-t border-line pt-6 lg:col-span-2">
        <StudioDetailsForm onSaved={reload} />
      </div>
    </div>
  );
}
