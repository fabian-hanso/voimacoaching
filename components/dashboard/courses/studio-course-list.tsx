"use client";

import { Icon } from "@/components/icons";
import { useApi } from "@/lib/client/api";
import type { CourseWithSessions } from "@/lib/types";
import { useState } from "react";
import { CourseDetail } from "./course-detail";
import { CourseImage } from "./course-image";
import { CourseMeta } from "./course-meta";
import { sessionLabel } from "./utils";

/** Kursübersicht auf der Studio-Seite. Kunden können sich anmelden; Trainer und Studio sehen sie nur an. */
export function StudioCourseList({ canBook }: { canBook: boolean }) {
  const courses = useApi<{ courses: CourseWithSessions[] }>("/courses");
  const [open, setOpen] = useState<CourseWithSessions | null>(null);
  const list = courses.data?.courses ?? [];
  if (courses.loading || !list.length) return null;

  return (
    <section id="kurse" className="scroll-mt-24">
      <div className="mb-4">
        <h2 className="text-xl font-bold tracking-tight text-fg">Kurse</h2>
        <p className="mt-1 text-sm text-fg-muted">
          {canBook
            ? "Melde dich für einzelne Termine an – die Plätze sind begrenzt."
            : "So sehen deine Kunden die Kurse."}
        </p>
      </div>
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => {
          const next = c.sessions.find(
            (s) => s.booked < s.capacity || s.bookedByMe,
          );
          const mine = c.sessions.filter((s) => s.bookedByMe).length;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setOpen(c)}
                className="group flex h-full w-full flex-col overflow-hidden rounded-box bg-surface text-left ring-1 ring-line transition hover:ring-brand-ink"
              >
                <div className="relative w-full">
                  <CourseImage course={c} />
                  {c.category && (
                    <span className="absolute top-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-fg backdrop-blur">
                      {c.category}
                    </span>
                  )}
                  {mine > 0 && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-brand-fg">
                      <Icon name="check" className="size-3" /> {mine}×
                      angemeldet
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-bold text-fg">{c.title}</h3>
                  <CourseMeta course={c} />
                  <span className="mt-auto flex items-center justify-between gap-2 pt-4 text-sm">
                    <span className="text-fg-muted">
                      {next
                        ? `Nächster freier Termin: ${sessionLabel(next.startsAt)}`
                        : "Derzeit keine freien Termine"}
                    </span>
                    <Icon
                      name="arrow"
                      className="size-4 shrink-0 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-brand-ink"
                    />
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {open && (
        <CourseDetail
          course={list.find((c) => c.id === open.id) ?? open}
          canBook={canBook}
          onClose={() => setOpen(null)}
          onChanged={courses.reload}
        />
      )}
    </section>
  );
}
