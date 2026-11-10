import Link from "next/link";
import { Icon } from "@/components/icons";
import type { BillingStatus } from "@/lib/types";
import { daysUntil, fmtDay, trialDaysLeft } from "./utils";

/** Schmale Leiste unter dem Header: Testphase läuft bzw. Zahlung fehlgeschlagen. */
export function BillingBanner({ billing }: { billing: BillingStatus | null }) {
  if (!billing?.access || billing.managedByStudio) return null;
  let text: string | null = null;
  let warn = false;
  if (billing.cancelAtPeriodEnd && billing.currentPeriodEnd) {
    const days = daysUntil(billing.currentPeriodEnd);
    text = `Dein Abo ist gekündigt und endet am ${fmtDay(billing.currentPeriodEnd)}. Danach ist dein Dashboard gesperrt.`;
    warn = days <= 7;
  } else if (billing.status === "past_due") {
    text =
      "Die letzte Zahlung ist fehlgeschlagen – bitte Zahlungsart aktualisieren.";
    warn = true;
  } else if (billing.source === "trial") {
    const days = trialDaysLeft(billing);
    text = `Testphase: noch ${days === 1 ? "1 Tag" : `${days} Tage`} kostenlos.`;
    warn = days <= 2;
  }
  if (!text) return null;
  return (
    <div className={warn ? "bg-warning/15" : "bg-brand/30"}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <p className="flex items-center gap-2 text-fg">
          <Icon name={warn ? "alert" : "clock"} className="size-4 shrink-0" />
          {text}
        </p>
        <Link
          href="/dashboard/abo"
          className="inline-flex items-center gap-1 font-semibold text-fg hover:underline"
        >
          {billing.cancelAtPeriodEnd
            ? "Abo fortsetzen"
            : billing.source === "trial"
              ? "Abo wählen"
              : "Abo verwalten"}{" "}
          <Icon name="arrow" className="size-4" />
        </Link>
      </div>
    </div>
  );
}
