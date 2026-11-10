"use client";

import { Icon } from "@/components/icons";
import { Button, cx, EmptyState, LoadError, Spinner } from "@/components/ui";
import { useApi } from "@/lib/client/api";
import type { CourseWithSessions, StudioTrainer } from "@/lib/types";
import { useState } from "react";
import { CourseEditor } from "./course-editor";
import { CourseImage } from "./course-image";
import { CourseMeta } from "./course-meta";
import { CourseSessionModal } from "./course-session-modal";
import { sessionLabel } from "./utils";

export function StudioCourses({ trainers }: { trainers: StudioTrainer[] }) {
  const courses = useApi<{ courses: CourseWithSessions[] }>("/studio/courses");
  const [editing, setEditing] = useState<CourseWithSessions | "new" | null>(
    null,
  );
  const [session, setSession] = useState<{
    course: CourseWithSessions;
    startsAt: string;
    endsAt: string;
    booked: number;
  } | null>(null);

  if (courses.loading && !courses.data) return <Spinner />;
  if (!courses.data)
    return (
      <LoadError
        message={
          courses.error?.message ?? "Kurse konnten nicht geladen werden."
        }
        onRetry={courses.reload}
      />
    );
  const list = courses.data.courses;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-fg">Kurse</h2>
          <p className="mt-0.5 text-sm text-fg-muted">
            Kunden deines Studios sehen aktive Kurse auf der Studio-Seite und
            melden sich für einzelne Termine an.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Icon name="plus" className="size-4" /> Kurs anlegen
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Noch keine Kurse"
          text="Lege z. B. Yoga, Spinning oder Rücken-Fit an – mit Trainer, Zeiten und Plätzen pro Termin."
          action={
            <Button onClick={() => setEditing("new")}>
              Ersten Kurs anlegen
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const next = c.sessions.slice(0, 4);
            const upcomingBookings = c.sessions.reduce(
              (n, s) => n + s.booked,
              0,
            );
            return (
              <li
                key={c.id}
                className={cx(
                  "flex flex-col overflow-hidden rounded-box bg-surface ring-1 ring-line",
                  !c.active && "opacity-70",
                )}
              >
                <div className="relative">
                  <CourseImage course={c} />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {c.category && (
                      <span className="rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-fg backdrop-blur">
                        {c.category}
                      </span>
                    )}
                    {!c.active && (
                      <span className="rounded-full bg-brand-fg px-2.5 py-1 text-xs font-semibold text-white">
                        Pausiert
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-fg">{c.title}</h3>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditing(c)}
                    >
                      Bearbeiten
                    </Button>
                  </div>
                  <CourseMeta course={c} />
                  <p className="mt-2 text-xs text-fg-subtle">
                    {c.capacity} Plätze pro Termin · {upcomingBookings}{" "}
                    {upcomingBookings === 1 ? "Anmeldung" : "Anmeldungen"} in
                    den nächsten 4 Wochen
                  </p>
                  {c.active && (
                    <div className="mt-4 border-t border-line pt-4">
                      <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                        Nächste Termine
                      </p>
                      {next.length === 0 ? (
                        <p className="mt-2 text-sm text-fg-muted">
                          Keine Termine in den nächsten 4 Wochen.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-1.5">
                          {next.map((s) => (
                            <li key={s.startsAt}>
                              <button
                                type="button"
                                onClick={() =>
                                  setSession({
                                    course: c,
                                    startsAt: s.startsAt,
                                    endsAt: s.endsAt,
                                    booked: s.booked,
                                  })
                                }
                                className="flex w-full items-center justify-between gap-3 rounded-inner px-2 py-1.5 text-left text-sm transition hover:bg-surface-2"
                              >
                                <span className="text-fg">
                                  {sessionLabel(s.startsAt)}
                                </span>
                                <span
                                  className={cx(
                                    "shrink-0 text-xs font-semibold tabular-nums",
                                    s.booked >= s.capacity
                                      ? "text-accent-soft"
                                      : "text-fg-muted",
                                  )}
                                >
                                  {s.booked}/{s.capacity}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <CourseEditor
          course={editing === "new" ? null : editing}
          trainers={trainers}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            courses.reload();
          }}
        />
      )}
      {session && (
        <CourseSessionModal
          session={{
            courseId: session.course.id,
            title: session.course.title,
            startsAt: session.startsAt,
            endsAt: session.endsAt,
            booked: session.booked,
            capacity: session.course.capacity,
            location: session.course.location,
          }}
          onClose={() => setSession(null)}
        />
      )}
    </div>
  );
}
