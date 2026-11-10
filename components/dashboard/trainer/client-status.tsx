"use client";

import { Badge, type BadgeTone } from "@/components/ui";
import type { ClientSummary } from "@/lib/types";

export type ClientStatus = "active" | "inactive" | "new" | "invited";

export const STATUS: Record<
  ClientStatus,
  { label: string; tone: BadgeTone; hint: string }
> = {
  active: {
    label: "Aktiv",
    tone: "success",
    hint: "Hat in den letzten 7 Tagen trainiert.",
  },
  inactive: {
    label: "Inaktiv",
    tone: "warning",
    hint: "Hat seit über 7 Tagen nicht trainiert.",
  },
  new: {
    label: "Neu angemeldet",
    tone: "accent",
    hint: "Registriert, hat aber noch kein Training getrackt.",
  },
  invited: {
    label: "Eingeladen",
    tone: "neutral",
    hint: "Einladung verschickt, aber noch nicht angemeldet.",
  },
};

export const DAY_MS = 86_400_000;

export function clientStatus(c: ClientSummary): ClientStatus {
  if (!c.lastWorkoutAt) return "new";
  return c.workoutsLast7Days > 0 ? "active" : "inactive";
}

export function StatusBadge({
  status,
  detail,
}: {
  status: ClientStatus;
  detail?: string;
}) {
  const s = STATUS[status];
  return (
    <span
      title={detail ? `${s.hint} ${detail}` : s.hint}
      className="shrink-0 cursor-help"
    >
      <Badge tone={s.tone}>{s.label}</Badge>
    </span>
  );
}
