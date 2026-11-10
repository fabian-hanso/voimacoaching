"use client";

import { ErrorState } from "@/components/error-state";

/** Fängt Fehler in Dashboard-Seiten ab; Header & Chat (Layout) bleiben dabei bedienbar. */
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} homeHref="/dashboard" />;
}
