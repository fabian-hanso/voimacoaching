"use client";

import { useMessaging } from "@/components/dashboard/messaging/messaging-context";
import { Icon } from "@/components/icons";
import { StudioLogo } from "@/components/studio-logo";
import { Avatar, Card } from "@/components/ui";
import type { MeResponse } from "@/lib/types";
import Link from "next/link";

export function CoachCard({
  trainer,
  studio,
}: {
  trainer: NonNullable<MeResponse["trainer"]>;
  studio: MeResponse["studio"];
}) {
  const { open, unreadTotal } = useMessaging();
  return (
    <Card>
      <div className="flex items-center gap-4">
        <Avatar name={trainer.name} src={trainer.avatarUrl} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-fg-muted">Dein Coach</p>
          <p className="truncate font-semibold text-fg">{trainer.name}</p>
          {studio && (
            <Link
              href="/dashboard/studio"
              title={`${studio.name} – Infos & Öffnungszeiten`}
              className="mt-1 flex items-center gap-1.5 text-xs text-fg-muted transition hover:text-brand-ink"
            >
              <StudioLogo
                name={studio.name}
                logoUrl={studio.logoUrl}
                size="sm"
                className="size-5"
              />
              <span className="truncate">{studio.name}</span>
              <Icon name="arrow" className="size-3 shrink-0" />
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => open(trainer.id)}
          aria-label={
            unreadTotal
              ? `Nachricht an ${trainer.name}, ${unreadTotal} ungelesen`
              : `Nachricht an ${trainer.name}`
          }
          title="Nachricht schreiben"
          className="relative grid size-9 shrink-0 place-items-center rounded-control text-fg-subtle ring-1 ring-line-strong transition hover:bg-surface-3 hover:text-fg"
        >
          <Icon name="chat" className="size-4" />
          {unreadTotal > 0 && (
            <span className="absolute -top-1.5 -right-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] leading-4 font-bold text-accent-fg ring-2 ring-surface">
              {unreadTotal > 9 ? "9+" : unreadTotal}
            </span>
          )}
        </button>
      </div>
    </Card>
  );
}
