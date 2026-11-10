"use client";

import { Modal, ModalHeader } from "@/components/dashboard/modal";
import { Avatar, LoadError, Spinner } from "@/components/ui";
import { useApi } from "@/lib/client/api";
import type { CourseParticipant } from "@/lib/types";
import { fmt, time } from "./utils";

/** Teilnehmende eines Kurstermins (Studio & Kurstrainer) – auch aus dem Kalender aufrufbar. */
export function CourseSessionModal({
  session,
  onClose,
}: {
  session: {
    courseId: string;
    title: string;
    startsAt: string;
    endsAt: string;
    booked: number;
    capacity: number;
    location?: string | null;
  };
  onClose: () => void;
}) {
  const list = useApi<{ participants: CourseParticipant[] }>(
    `/courses/${session.courseId}/participants?startsAt=${encodeURIComponent(session.startsAt)}`,
  );
  const participants = list.data?.participants ?? [];
  return (
    <Modal label={session.title} onClose={onClose}>
      <ModalHeader
        title={session.title}
        subtitle={`${fmt(session.startsAt, { weekday: "long", day: "numeric", month: "long" })} · ${time(session.startsAt)} – ${time(session.endsAt)} Uhr${session.location ? ` · ${session.location}` : ""}`}
        onClose={onClose}
      />
      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-fg">Teilnehmende</span>
          <span className="text-fg-muted">
            {list.data ? participants.length : session.booked} /{" "}
            {session.capacity} Plätze
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-brand"
            style={{
              width: `${Math.min(100, ((list.data ? participants.length : session.booked) / session.capacity) * 100)}%`,
            }}
          />
        </div>
        {list.loading ? (
          <Spinner />
        ) : list.error && !list.data ? (
          <div className="mt-4">
            <LoadError message={list.error.message} onRetry={list.reload} />
          </div>
        ) : participants.length === 0 ? (
          <p className="mt-4 rounded-tile border border-dashed border-line-strong px-4 py-6 text-center text-sm text-fg-muted">
            Noch keine Anmeldungen.
          </p>
        ) : (
          <ul className="mt-4 max-h-80 divide-y divide-line overflow-y-auto">
            {participants.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="w-5 text-right text-xs text-fg-subtle tabular-nums">
                  {i + 1}.
                </span>
                <Avatar name={p.name} src={p.avatarUrl} />
                <span className="flex-1 truncate text-sm font-medium text-fg">
                  {p.name}
                </span>
                <span className="text-xs text-fg-subtle">
                  angemeldet{" "}
                  {fmt(p.bookedAt, { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
