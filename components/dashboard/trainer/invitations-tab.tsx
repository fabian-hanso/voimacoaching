"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadError,
  Spinner,
} from "@/components/ui";
import { api, fmtDate, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { Invitation } from "@/lib/types";
import { useState } from "react";

export function InvitationsTab() {
  const { data, loading, error, reload } = useApi<{
    invitations: Invitation[];
  }>("/invitations");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const link = (code: string) =>
    `${window.location.origin}/registrieren?rolle=kunde&code=${code}`;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await api("/invitations", { body: email ? { email } : {} });
      setEmail("");
      reload();
    } catch (err) {
      setFormError(
        errorMessage(err, "Einladung konnte nicht erstellt werden."),
      );
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold text-fg">Neuen Kunden einladen</h3>
        <p className="mt-1 text-sm text-fg-muted">
          Der Code ist 14 Tage gültig und kann im Web oder in der App eingegeben
          werden.
        </p>
        <form
          onSubmit={create}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail des Kunden (optional, bindet den Code an diese Adresse)"
          />
          <Button type="submit" className="shrink-0">
            Einladung erstellen
          </Button>
        </form>
        {formError && (
          <div className="mt-3">
            <Alert>{formError}</Alert>
          </div>
        )}
      </Card>

      {loading ? (
        <Spinner />
      ) : error && !data ? (
        <LoadError message={error.message} onRetry={reload} />
      ) : !data?.invitations.length ? (
        <EmptyState
          title="Keine Einladungen"
          text="Erstelle oben deine erste Einladung."
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
                const expired = new Date(inv.expiresAt) < new Date();
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
                              // z. B. ohne HTTPS oder ohne Berechtigung → Link zum manuellen Kopieren anzeigen
                              setFormError(
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
                          setFormError(null);
                          try {
                            await api(`/invitations/${inv.code}`, {
                              method: "DELETE",
                            });
                          } catch (err) {
                            // 404 = schon gelöscht → Liste trotzdem aktualisieren
                            if (!(
                              err instanceof Error &&
                              "status" in err &&
                              err.status === 404
                            )) {
                              setFormError(
                                errorMessage(
                                  err,
                                  "Einladung konnte nicht gelöscht werden.",
                                ),
                              );
                            }
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
