"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Alert, Button, cx } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import {
  euro,
  PLANS,
  TRAINER_PLANS,
  yearlyPerMonth,
  type BillingInterval,
  type Plan,
  type PlanId,
} from "@/lib/billing-plans";

/** Paketwahl mit Monat/Jahr-Umschalter; „Abo abschließen“ leitet zu Stripe Checkout weiter. */
export function PlanPicker({
  audience,
  checkoutAvailable,
}: {
  audience: "trainer" | "studio";
  checkoutAvailable: boolean;
}) {
  const plans = audience === "studio" ? [PLANS.studio] : TRAINER_PLANS;
  const [interval, setBillingInterval] = useState<BillingInterval>("month");
  const [selected, setSelected] = useState<PlanId>(
    audience === "studio" ? "studio" : "trainer_20",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setPending(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/billing/checkout", {
        body: { plan: selected, interval },
      });
      window.location.assign(url);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-fg">
          {audience === "studio" ? "Studio-Abo" : "Paket wählen"}
        </h2>
        <IntervalToggle value={interval} onChange={setBillingInterval} />
      </div>

      <div
        className={cx("mt-4 grid gap-3", plans.length > 1 && "sm:grid-cols-3")}
      >
        {plans.map((p) => (
          <PlanOption
            key={p.id}
            plan={p}
            interval={interval}
            selected={selected === p.id}
            onSelect={() => setSelected(p.id)}
          />
        ))}
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-fg-muted">
          Sichere Zahlung über Stripe · monatlich bzw. jährlich kündbar · Gemäß
          § 19 UStG ohne Umsatzsteuer.
        </p>
        <Button
          onClick={checkout}
          disabled={pending || !checkoutAvailable}
          className="sm:shrink-0"
        >
          {pending ? "Weiterleiten …" : "Abo abschließen"}
          <Icon name="arrow" className="size-4" />
        </Button>
      </div>
      {!checkoutAvailable && (
        <p className="mt-3 text-sm text-fg-muted">
          Zahlungen sind noch nicht eingerichtet. Bitte versuche es später
          erneut.
        </p>
      )}
    </div>
  );
}

function IntervalToggle({
  value,
  onChange,
}: {
  value: BillingInterval;
  onChange: (v: BillingInterval) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Zahlweise"
      className="inline-flex rounded-control bg-surface-3 p-1 text-sm font-semibold"
    >
      {(
        [
          ["month", "Monatlich"],
          ["year", "Jährlich · 2 Monate gratis"],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cx(
            "rounded-inner px-3 py-1.5 transition",
            value === v
              ? "bg-surface text-fg shadow-sm"
              : "text-fg-muted hover:text-fg",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PlanOption({
  plan,
  interval,
  selected,
  onSelect,
}: {
  plan: Plan;
  interval: BillingInterval;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        "relative rounded-tile p-4 text-left ring-1 transition",
        selected
          ? "bg-brand/25 ring-2 ring-brand-fg"
          : "bg-surface ring-line-strong hover:bg-surface-2",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold text-fg">
          {plan.audience === "studio"
            ? "bis 10 Trainer · unbegrenzt Kunden"
            : plan.label}
        </span>
        {plan.popular && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg">
            Beliebt
          </span>
        )}
      </span>
      <span className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-extrabold tracking-tight text-fg tabular-nums">
          {euro(interval === "year" ? yearlyPerMonth(plan) : plan.monthly)}
        </span>
        <span className="text-sm text-fg-muted">/ Monat</span>
      </span>
      <span className="mt-0.5 block text-xs text-fg-muted">
        {interval === "year"
          ? `${euro(plan.yearly)} jährlich`
          : "monatlich kündbar"}
      </span>
    </button>
  );
}
