import type { BillingStatus } from "@/lib/types";

/** Verbleibende Testtage (aufgerundet, mind. 0). */
export const trialDaysLeft = (b: BillingStatus) =>
  b.trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(b.trialEndsAt).getTime() - Date.now()) / 86_400_000,
        ),
      )
    : 0;

export const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** Darf dieses Konto selbst ein Abo abschließen bzw. verwalten? (Studio-Trainer nicht) */
export const canManage = (b: BillingStatus) => !b.managedByStudio;

/** Tage bis zu einem Datum (aufgerundet, mind. 0). */
export const daysUntil = (iso: string) =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
