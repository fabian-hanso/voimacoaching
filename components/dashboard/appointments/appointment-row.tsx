"use client";

import { Icon } from "@/components/icons";
import { Avatar, Badge, Button, cx } from "@/components/ui";
import type { Appointment } from "@/lib/types";
import { type ReactNode } from "react";
import { STATUS, fmt, partyName, time } from "./utils";

function DateBlock({ iso, muted }: { iso: string; muted?: boolean }) {
  return (
    <div
      className={cx(
        "grid w-14 shrink-0 place-items-center rounded-control py-2 text-center",
        muted ? "bg-surface-3 text-fg-muted" : "bg-brand text-brand-fg",
      )}
    >
      <span className="text-[11px] font-semibold uppercase">
        {fmt(iso, { weekday: "short" }).replace(".", "")}
      </span>
      <span className="text-xl leading-6 font-extrabold">
        {fmt(iso, { day: "numeric" })}
      </span>
      <span className="text-[11px] font-medium">
        {fmt(iso, { month: "short" }).replace(".", "")}
      </span>
    </div>
  );
}

export function AppointmentRow({
  a,
  perspective,
  actions,
  now,
  onOpen,
}: {
  a: Appointment;
  perspective: "client" | "trainer";
  actions?: ReactNode;
  now: number;
  onOpen?: () => void;
}) {
  const past = Date.parse(a.endsAt) <= now;
  const inactive = past || a.status === "declined" || a.status === "cancelled";
  const person =
    perspective === "client"
      ? { name: a.trainer.name, src: a.trainer.avatarUrl }
      : { name: partyName(a), src: a.client?.avatarUrl ?? null };
  const answerFrom = {
    client: "Deine Nachricht",
    provider:
      perspective === "client"
        ? `Antwort von ${a.trainer.name}`
        : "Deine Antwort",
    studio: "Studio",
    system: "Hinweis",
  };
  return (
    <li className="flex flex-col gap-4 rounded-box bg-surface p-4 ring-1 ring-line sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <DateBlock iso={a.startsAt} muted={inactive} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cx(
                "font-semibold",
                inactive ? "text-fg-muted" : "text-fg",
              )}
            >
              {a.title}
            </p>
            <Badge tone={STATUS[a.status].tone}>
              {past && a.status === "confirmed"
                ? "Stattgefunden"
                : STATUS[a.status].label}
            </Badge>
            {a.createdBy === "studio" && <Badge>Vom Studio eingetragen</Badge>}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" className="size-3.5" /> {time(a.startsAt)} –{" "}
              {time(a.endsAt)} Uhr
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Avatar
                name={person.name}
                src={person.src}
                className="size-5 text-[9px] ring-1"
              />
              <span className="truncate">
                {person.name}
                {perspective === "trainer" && !a.client && " (Gast)"}
              </span>
            </span>
          </p>
          {a.clientNote && (
            <p className="mt-2 text-sm text-fg-muted">
              <span className="font-medium text-fg">
                {perspective === "client" && a.createdBy === "client"
                  ? "Deine Nachricht"
                  : "Notiz"}
                :
              </span>{" "}
              {a.clientNote}
            </p>
          )}
          {a.responseNote && (
            <p className="mt-1 text-sm text-fg-muted">
              <span className="font-medium text-fg">
                {a.cancelledBy
                  ? answerFrom[a.cancelledBy]
                  : answerFrom.provider}
                :
              </span>{" "}
              {a.responseNote}
            </p>
          )}
        </div>
      </div>
      {(onOpen || (actions && !past)) && (
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
          {!past && actions}
          {onOpen && (
            <Button size="sm" variant="ghost" onClick={onOpen}>
              <Icon name="chat" className="size-3.5" />{" "}
              {a.commentCount ? `Kommentare (${a.commentCount})` : "Details"}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

export function History({
  items,
  perspective,
  now,
  onOpen,
}: {
  items: Appointment[];
  perspective: "client" | "trainer";
  now: number;
  onOpen?: (a: Appointment) => void;
}) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-fg-muted hover:text-fg">
        <Icon
          name="chevronLeft"
          className="size-4 -rotate-90 transition group-open:rotate-90"
        />
        Frühere, abgelehnte & abgesagte Termine ({items.length})
      </summary>
      <ul className="mt-3 space-y-3">
        {items.map((a) => (
          <AppointmentRow
            key={a.id}
            a={a}
            perspective={perspective}
            now={now}
            onOpen={onOpen && (() => onOpen(a))}
          />
        ))}
      </ul>
    </details>
  );
}
