import type { Metadata } from "next";
import { BillingPage } from "@/components/dashboard/billing/billing-page";

export const metadata: Metadata = { title: "Abo & Rechnungen" };

/** Nutzerspezifisch (siehe Dashboard-Seiten) – keine statische Hülle. */
export const instant = false;

export default function Page() {
  return <BillingPage />;
}
