"use client";

import { Modal, ModalHeader } from "@/components/dashboard/modal";
import { Alert, Button, cx } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { CourseWithSessions } from "@/lib/types";
import { useState } from "react";
import { CourseImage } from "./course-image";
import { CourseMeta } from "./course-meta";
import { sessionLabel, spotsLabel } from "./utils";

export function CourseDetail({
  course,
  canBook,
  onClose,
  onChanged,
}: {
  course: CourseWithSessions;
  canBook: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [c, setC] = useState(course);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(startsAt: string, booked: boolean) {
    setPending(startsAt);
    setError(null);
    try {
      const updated = booked
        ? await api<CourseWithSessions>(
            `/courses/${c.id}/bookings?startsAt=${encodeURIComponent(startsAt)}`,
            { method: "DELETE" },
          )
        : await api<CourseWithSessions>(`/courses/${c.id}/bookings`, {
            body: { startsAt },
          });
      setC(updated);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiClientError && err.status === 409) onChanged();
    } finally {
      setPending(null);
    }
  }

  return (
    <Modal label={c.title} onClose={onClose} wide>
      <div className="-mx-6 -mt-6 mb-5 overflow-hidden rounded-t-box">
        <CourseImage course={c} />
      </div>
      <ModalHeader
        title={c.title}
        subtitle={c.category ?? undefined}
        onClose={onClose}
      />
      <CourseMeta course={c} />
      {c.description && (
        <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-fg">
          {c.description}
        </p>
      )}

      <div className="mt-6 border-t border-line pt-4">
        <p className="text-sm font-semibold text-fg">
          Termine der nächsten 4 Wochen
        </p>
        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}
        {c.sessions.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">
            Aktuell sind keine Termine geplant.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {c.sessions.map((s) => {
              const free = s.capacity - s.booked;
              return (
                <li
                  key={s.startsAt}
                  className="flex flex-wrap items-center gap-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">
                      {sessionLabel(s.startsAt)}
                    </p>
                    <p
                      className={cx(
                        "text-xs",
                        free <= 0 && !s.bookedByMe
                          ? "text-accent-soft"
                          : "text-fg-muted",
                      )}
                    >
                      {s.bookedByMe ? "Du bist angemeldet" : spotsLabel(free)}
                    </p>
                  </div>
                  {canBook &&
                    (s.bookedByMe ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={pending === s.startsAt}
                        onClick={() => toggle(s.startsAt, true)}
                      >
                        Abmelden
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={free <= 0 || pending === s.startsAt}
                        onClick={() => toggle(s.startsAt, false)}
                      >
                        {pending === s.startsAt
                          ? "…"
                          : free <= 0
                            ? "Ausgebucht"
                            : "Anmelden"}
                      </Button>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
