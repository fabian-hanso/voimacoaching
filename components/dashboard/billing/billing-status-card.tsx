"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Alert, Badge, Button, Card } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { PLANS } from "@/lib/billing-plans";
import type { BillingStatus } from "@/lib/types";
import { fmtDay, trialDaysLeft } from "./utils";

/** Aktueller Stand: Testphase, aktives Abo (mit nächster Abbuchung/Kündigung) oder abgelaufen. */
export function BillingStatusCard({ billing }: { billing: BillingStatus }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setPending(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/billing/portal", {
        method: "POST",
      });
      window.location.assign(url);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  const plan = billing.plan ? PLANS[billing.plan] : null;
  const days = trialDaysLeft(billing);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-fg-muted">Dein Abo</p>
          {billing.source === "subscription" && plan ? (
            <>
              <p className="mt-1 text-xl font-bold text-fg">
                {plan.audience === "studio"
                  ? "Studio"
                  : `Trainer · ${plan.label}`}
                <span className="ml-2 align-middle text-sm font-medium text-fg-muted">
                  {billing.interval === "year" ? "jährlich" : "monatlich"}
                </span>
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                {billing.cancelAtPeriodEnd && billing.currentPeriodEnd
                  ? `Gekündigt – läuft bis ${fmtDay(billing.currentPeriodEnd)}${billing.status === "trialing" ? ", es wird nichts abgebucht" : ""}. Unter „Abo verwalten“ kannst du die Kündigung zurücknehmen.`
                  : billing.status === "trialing" && billing.trialEndsAt
                    ? `Kostenlos bis ${fmtDay(billing.trialEndsAt)}, danach automatische Abbuchung.`
                    : billing.currentPeriodEnd
                      ? `Nächste Abbuchung am ${fmtDay(billing.currentPeriodEnd)}.`
                      : null}
              </p>
            </>
          ) : billing.source === "trial" ? (
            <>
              <p className="mt-1 text-xl font-bold text-fg">
                Kostenlose Testphase
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                {days === 1 ? "Noch 1 Tag" : `Noch ${days} Tage`} – bis{" "}
                {billing.trialEndsAt && fmtDay(billing.trialEndsAt)}. Schließt
                du jetzt ab, bleibt die restliche Testphase kostenlos.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-xl font-bold text-fg">Kein aktives Abo</p>
              <p className="mt-1 text-sm text-fg-muted">
                Deine Testphase ist abgelaufen. Wähle ein Paket, um
                weiterzumachen.
              </p>
            </>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {billing.status === "past_due" ? (
            <Badge tone="danger">Zahlung fehlgeschlagen</Badge>
          ) : billing.cancelAtPeriodEnd ? (
            <Badge tone="warning">Gekündigt</Badge>
          ) : billing.source === "subscription" ? (
            <Badge tone="success">Aktiv</Badge>
          ) : billing.source === "trial" ? (
            <Badge tone="brand">Testphase</Badge>
          ) : (
            <Badge tone="warning">Abgelaufen</Badge>
          )}
          {billing.hasCustomer && billing.checkoutAvailable && (
            <Button variant="secondary" onClick={openPortal} disabled={pending}>
              <Icon name="settings" className="size-4" />
              {pending ? "Öffnen …" : "Abo verwalten"}
            </Button>
          )}
        </div>
      </div>

      {billing.clientLimit != null && billing.clientCount != null && (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-fg-muted">
            <span>Kunden</span>
            <span className="tabular-nums">
              {billing.clientCount} / {billing.clientLimit}
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-surface-3">
            <div
              className={`h-2 rounded-full ${billing.clientCount >= billing.clientLimit ? "bg-warning" : "bg-brand-fg"}`}
              style={{
                width: `${Math.min(100, (billing.clientCount / billing.clientLimit) * 100)}%`,
              }}
            />
          </div>
          {billing.clientCount >= billing.clientLimit && (
            <p className="mt-2 text-xs text-fg-muted">
              Limit erreicht – für weitere Kunden unter „Abo verwalten“ auf ein
              größeres Paket wechseln.
            </p>
          )}
        </div>
      )}

      {billing.status === "past_due" && (
        <p className="mt-4 text-sm text-fg-muted">
          Die letzte Abbuchung hat nicht geklappt. Stripe versucht es erneut –
          aktualisiere am besten jetzt deine Zahlungsart unter „Abo verwalten“.
        </p>
      )}
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {billing.hasCustomer && (
        <p className="mt-4 text-xs text-fg-subtle">
          Rechnungen, Zahlungsart, Paketwechsel und Kündigung findest du unter
          „Abo verwalten“.
        </p>
      )}
    </Card>
  );
}
