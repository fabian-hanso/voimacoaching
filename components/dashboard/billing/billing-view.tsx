"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Card } from "@/components/ui";
import type { MeResponse } from "@/lib/types";
import { BillingStatusCard } from "./billing-status-card";
import { PlanPicker } from "./plan-picker";
import { SITE_NAME } from "@/lib/site";

/**
 * Abo-Ansicht für Trainer und Studios (ohne Shell-Abhängigkeit, damit die Shell sie als Sperrbildschirm nutzen kann). Nach erfolgreichem Checkout (?checkout=erfolg) wird der Status kurz
 * nachgeladen, bis der Stripe-Webhook das Abo eingetragen hat.
 */
export function BillingView({
  me,
  reload,
  locked,
}: {
  me: MeResponse;
  reload: () => void;
  locked?: boolean;
}) {
  const billing = me.billing;
  const [justPaid] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("checkout") === "erfolg",
  );
  const tries = useRef(0);

  useEffect(() => {
    if (!justPaid || billing?.source === "subscription" || tries.current >= 10)
      return;
    const t = setTimeout(() => {
      tries.current += 1;
      reload();
    }, 2000);
    return () => clearTimeout(t);
  }, [justPaid, billing?.source, reload]);

  if (!billing) {
    return (
      <p className="text-fg-muted">Als Kunde nutzt du {SITE_NAME} kostenlos.</p>
    );
  }

  if (billing.managedByStudio) {
    return (
      <Card>
        <p className="text-sm text-fg-muted">Dein Abo</p>
        <p className="mt-1 text-xl font-bold text-fg">
          Über dein Studio{me.studio ? `: ${me.studio.name}` : ""}
        </p>
        <p className="mt-2 text-sm text-fg-muted">
          {billing.access
            ? "Dein Studio übernimmt das Abo – du musst nichts abschließen."
            : "Das Abo deines Studios ist gerade nicht aktiv. Bitte wende dich an dein Studio, damit es das Abo erneuert."}
        </p>
      </Card>
    );
  }

  const showPicker = billing.source !== "subscription";
  const audience = me.user.role === "studio" ? "studio" : "trainer";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">
          {locked ? "Testphase abgelaufen" : "Abo & Rechnungen"}
        </h1>
        <p className="mt-1 text-fg-muted">
          {locked
            ? `Wähle ein Paket, um ${SITE_NAME} weiter zu nutzen. Deine Daten und Kunden bleiben erhalten – deine Kunden können weiter trainieren.`
            : "Dein Paket, die nächste Abbuchung und deine Rechnungen."}
        </p>
      </div>

      {justPaid && billing.source !== "subscription" && (
        <Alert tone="success">
          Danke! Deine Zahlung war erfolgreich – dein Abo wird gerade aktiviert
          …
        </Alert>
      )}

      <BillingStatusCard billing={billing} />

      {showPicker && (
        <Card>
          <PlanPicker
            audience={audience}
            checkoutAvailable={billing.checkoutAvailable}
          />
        </Card>
      )}
    </div>
  );
}
