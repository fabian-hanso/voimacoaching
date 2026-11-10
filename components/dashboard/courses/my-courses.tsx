"use client";

import { Alert, Badge, Button, Card } from "@/components/ui";
import { api, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { MyCourseBooking } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";
import { fmt, time } from "./utils";

/** „Meine Kurse“ im Kunden-Dashboard – nur sichtbar, wenn es Anmeldungen gibt. */
export function MyCourses() {
  const bookings = useApi<{ bookings: MyCourseBooking[] }>(
    "/me/course-bookings",
  );
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const list = bookings.data?.bookings ?? [];
  if (!list.length) return null;

  async function cancel(b: MyCourseBooking) {
    setPending(b.id);
    setError(null);
    try {
      await api(
        `/courses/${b.course.id}/bookings?startsAt=${encodeURIComponent(b.startsAt)}`,
        { method: "DELETE" },
      );
      bookings.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(null);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-fg">
            Meine Kurse
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Termine, für die du angemeldet bist.
          </p>
        </div>
        <Link
          href="/dashboard/studio#kurse"
          className="text-sm font-semibold text-brand-ink hover:underline"
        >
          Alle Kurse ansehen →
        </Link>
      </div>
      {error && (
        <div className="mb-3">
          <Alert>{error}</Alert>
        </div>
      )}
      <ul className="space-y-3">
        {list.map((b) => (
          <li key={b.id}>
            <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="grid w-14 shrink-0 place-items-center rounded-control bg-brand-fg py-2 text-center text-white">
                  <span className="text-[11px] font-semibold uppercase">
                    {fmt(b.startsAt, { weekday: "short" }).replace(".", "")}
                  </span>
                  <span className="text-xl leading-6 font-extrabold">
                    {fmt(b.startsAt, { day: "numeric" })}
                  </span>
                  <span className="text-[11px] font-medium">
                    {fmt(b.startsAt, { month: "short" }).replace(".", "")}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-fg">{b.course.title}</p>
                    <Badge>Kurs</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-fg-muted">
                    {time(b.startsAt)} – {time(b.endsAt)} Uhr
                    {b.course.location && ` · ${b.course.location}`}
                    {b.course.trainerName && ` · ${b.course.trainerName}`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={pending === b.id}
                onClick={() => cancel(b)}
              >
                Abmelden
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
