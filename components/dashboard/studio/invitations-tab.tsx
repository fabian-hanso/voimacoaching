"use client";

import { Alert, Badge, Button, Card, EmptyState, Input } from "@/components/ui";
import { api, ApiClientError, fmtDate } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { StudioOverview } from "@/lib/types";
import { useState } from "react";

export function InvitationsTab({
  data,
  reload,
}: {
  data: StudioOverview;
  reload: () => void;
}) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const full = data.trainers.length >= data.studio.maxTrainers;
  const link = (code: string) =>
    `${window.location.origin}/registrieren?rolle=trainer&studio=${code}`;
  const [now] = useState(() => Date.now());

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/studio/invitations", { body: email ? { email } : {} });
      setEmail("");
      reload();
    } catch (err) {
      setMsg(errorMessage(err, "Einladung konnte nicht erstellt werden."));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold text-fg">Trainer einladen</h3>
        <p className="mt-1 text-sm text-fg-muted">
          Neue Trainer registrieren sich über den Link. Bestehende Trainer geben
          den Code in ihren Einstellungen ein – ihre Kunden kommen mit ins
          Studio. {data.trainers.length}/{data.studio.maxTrainers} Plätze
          belegt.
        </p>
        {full ? (
          <div className="mt-4">
            <Alert tone="info">
              Dein Studio hat die maximale Anzahl an Trainern erreicht.
            </Alert>
          </div>
        ) : (
          <form
            onSubmit={create}
            className="mt-4 flex flex-col gap-2 sm:flex-row"
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail des Trainers (optional, bindet den Code an diese Adresse)"
            />
            <Button type="submit" className="shrink-0">
              Einladung erstellen
            </Button>
          </form>
        )}
        {msg && (
          <div className="mt-3">
            <Alert>{msg}</Alert>
          </div>
        )}
      </Card>

      {data.invitations.length === 0 ? (
        <EmptyState
          title="Keine Einladungen"
          text="Erstelle oben deine erste Trainer-Einladung."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-fg-muted">
              <tr>
                <th className="px-6 py-3 font-medium">Code</th>
                <th className="px-6 py-3 font-medium">E-Mail</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.invitations.map((inv) => {
                const expired = new Date(inv.expiresAt).getTime() < now;
                return (
                  <tr key={inv.code}>
                    <td className="px-6 py-3 font-mono font-semibold tracking-widest text-fg">
                      {inv.code}
                    </td>
                    <td className="px-6 py-3 text-fg-muted">
                      {inv.email ?? "–"}
                    </td>
                    <td className="px-6 py-3">
                      {inv.usedBy ? (
                        <Badge tone="success">
                          Angenommen {fmtDate(inv.usedAt)}
                        </Badge>
                      ) : expired ? (
                        <Badge>Abgelaufen</Badge>
                      ) : (
                        <Badge tone="brand">
                          Offen bis {fmtDate(inv.expiresAt)}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      {!inv.usedBy && !expired && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                link(inv.code),
                              );
                              setCopied(inv.code);
                            } catch {
                              setMsg(
                                `Kopieren nicht möglich. Bitte manuell kopieren: ${link(inv.code)}`,
                              );
                            }
                          }}
                        >
                          {copied === inv.code ? "Kopiert ✓" : "Link kopieren"}
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          try {
                            await api(`/studio/invitations/${inv.code}`, {
                              method: "DELETE",
                            });
                          } catch (err) {
                            if (!(
                              err instanceof ApiClientError &&
                              err.status === 404
                            ))
                              setMsg(errorMessage(err));
                          }
                          reload();
                        }}
                      >
                        Löschen
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
