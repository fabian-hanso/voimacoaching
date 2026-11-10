"use client";

import { Alert, Button, Card, Input } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { useState } from "react";

export function JoinTrainer({ onJoined }: { onJoined: () => void }) {
  // Vorausgefüllt, wenn ein angemeldeter Kunde einen Einladungslink geöffnet hat (/dashboard?code=…)
  const [code, setCode] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (
          new URLSearchParams(window.location.search).get("code") ?? ""
        ).toUpperCase(),
  );
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/me/trainer", { body: { inviteCode: code } });
      onJoined();
    } catch (err) {
      // Kein Einladungscode eines Coaches? Vielleicht der Mitglieds-Code eines Studios (QR an der Rezeption).
      if (err instanceof ApiClientError && err.status === 400) {
        try {
          await api("/me/studio", { body: { code } });
          onJoined();
          return;
        } catch {
          // ursprüngliche Fehlermeldung anzeigen
        }
      }
      setError(errorMessage(err));
    }
  }

  return (
    <Card className="bg-gradient-to-br from-brand/10 to-surface">
      <h2 className="font-semibold text-fg">
        Mit deinem Trainer oder Studio verbinden
      </h2>
      <p className="mt-1 text-sm text-fg-muted">
        Gib den Einladungscode deines Trainers ein – oder den Studio-Code von
        der Rezeption.
      </p>
      <form onSubmit={submit} className="mt-4 flex max-w-md gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
          placeholder="K7MX2QPA"
          className="font-mono tracking-widest uppercase"
          required
        />
        <Button type="submit">Verbinden</Button>
      </form>
      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
    </Card>
  );
}
