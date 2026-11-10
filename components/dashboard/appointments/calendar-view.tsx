"use client";

import { CourseSessionModal } from "@/components/dashboard/courses/course-session-modal";
import { Icon } from "@/components/icons";
import {
  Avatar,
  Button,
  Card,
  cx,
  EmptyState,
  LoadError,
  Spinner,
} from "@/components/ui";
import { useApi } from "@/lib/client/api";
import type { Appointment, Schedule } from "@/lib/types";
import { useState, type ReactNode } from "react";
import { AppointmentDetail } from "./appointment-detail";
import { BookDialog } from "./book-dialog";
import {
  addDays,
  fmt,
  localDate,
  partyName,
  time,
  toMin,
  useNow,
  WEEKDAYS,
} from "./utils";

const HOUR_PX = 44;

/** Überlappende Termine eines Tages nebeneinander anordnen (Spuren). */
function layoutDay<T extends { startsAt: string; endsAt: string }>(items: T[]) {
  const sorted = [...items].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
  const lanes: number[] = []; // Ende je Spur
  const placed = sorted.map((item) => {
    const s = Date.parse(item.startsAt);
    let lane = lanes.findIndex((end) => end <= s);
    if (lane === -1) lane = lanes.push(0) - 1;
    lanes[lane] = Date.parse(item.endsAt);
    return { item, lane };
  });
  return { placed, lanes: Math.max(lanes.length, 1) };
}

type CourseBlock = Schedule["courseSessions"][number];

type CalendarItem =
  | { kind: "appointment"; a: Appointment; startsAt: string; endsAt: string }
  | { kind: "course"; c: CourseBlock; startsAt: string; endsAt: string };

const minutesOfDay = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

/**
 * Wochenkalender. Studio: alle Trainer (filterbar) · Trainer: eigene Termine und Zeiten.
 * Klick auf einen Termin öffnet Details mit Kommentaren, Klick auf einen Tag trägt einen Termin ein.
 */
export function CalendarView({
  role,
  onChanged,
}: {
  role: "trainer" | "studio";
  onChanged: () => void;
}) {
  const [week, setWeek] = useState(() => localDate(new Date()));
  const schedule = useApi<Schedule>(`/schedule?week=${week}`);
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [course, setCourse] = useState<CourseBlock | null>(null);
  const [create, setCreate] = useState<{ date: string } | null>(null);
  const now = useNow();
  const today = localDate(new Date(now));

  if (schedule.loading && !schedule.data) return <Spinner />;
  if (!schedule.data)
    return (
      <LoadError
        message={
          schedule.error?.message ?? "Termine konnten nicht geladen werden."
        }
        onRetry={schedule.reload}
      />
    );

  const data = schedule.data;
  const reload = () => {
    schedule.reload();
    onChanged();
  };
  const multi = role === "studio";
  const days = Array.from({ length: 7 }, (_, i) => addDays(data.weekStart, i));
  const trainers = data.trainers.filter((t) => !filter || t.id === filter);
  const visible = data.appointments.filter(
    (a) =>
      (a.status === "requested" || a.status === "confirmed") &&
      (!filter || a.trainer.id === filter),
  );
  const cancelledCount = data.appointments.filter(
    (a) =>
      (a.status === "cancelled" || a.status === "declined") &&
      (!filter || a.trainer.id === filter),
  ).length;
  const courses = (data.courseSessions ?? []).filter(
    (c) => !filter || c.trainerId === filter,
  );
  const items: CalendarItem[] = [
    ...visible.map((a) => ({
      kind: "appointment" as const,
      a,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
    })),
    ...courses.map((c) => ({
      kind: "course" as const,
      c,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
    })),
  ];

  // Sichtbarer Zeitraum: mindestens 7–21 Uhr, erweitert um Zeitfenster und Termine
  const mins = [
    7 * 60,
    ...trainers.flatMap((t) => t.windows.map((w) => toMin(w.start))),
    ...items.map((x) => minutesOfDay(x.startsAt)),
  ];
  const maxs = [
    21 * 60,
    ...trainers.flatMap((t) => t.windows.map((w) => toMin(w.end))),
    ...items.map((x) => minutesOfDay(x.endsAt) || 24 * 60),
  ];
  const startH = Math.floor(Math.min(...mins) / 60);
  const endH = Math.min(24, Math.ceil(Math.max(...maxs) / 60));
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);
  const top = (min: number) => ((min - startH * 60) / 60) * HOUR_PX;
  const rangeLabel = `${fmt(`${days[0]}T12:00:00`, { day: "numeric", month: "short" })} – ${fmt(`${days[6]}T12:00:00`, { day: "numeric", month: "short", year: "numeric" })}`;
  const requested = visible.filter((a) => a.status === "requested").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Vorherige Woche"
            onClick={() => setWeek(addDays(data.weekStart, -7))}
            className="grid size-9 place-items-center rounded-control ring-1 ring-line hover:bg-surface-2"
          >
            <Icon name="chevronLeft" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Nächste Woche"
            onClick={() => setWeek(addDays(data.weekStart, 7))}
            className="grid size-9 place-items-center rounded-control ring-1 ring-line hover:bg-surface-2"
          >
            <Icon name="chevronLeft" className="size-4 rotate-180" />
          </button>
          <p className="ml-1 font-semibold text-fg">{rangeLabel}</p>
          {!days.includes(today) && (
            <Button size="sm" variant="ghost" onClick={() => setWeek(today)}>
              Heute
            </Button>
          )}
          {schedule.loading && (
            <span
              className="size-4 animate-spin rounded-full border-2 border-line border-t-brand-ink"
              aria-label="Lädt"
            />
          )}
        </div>
        <Button
          onClick={() =>
            setCreate({ date: days.includes(today) ? today : days[0] })
          }
          disabled={!data.trainers.length}
        >
          <Icon name="plus" className="size-4" /> Termin eintragen
        </Button>
      </div>

      {data.trainers.length === 0 ? (
        <EmptyState
          title="Noch keine Trainer"
          text="Lade Trainer ein – sie pflegen ihre Zeiten selbst und erscheinen dann hier."
        />
      ) : (
        <>
          {multi && (
            <div className="flex flex-wrap gap-2">
              <FilterChip active={!filter} onClick={() => setFilter(null)}>
                Alle Trainer
              </FilterChip>
              {data.trainers.map((t) => (
                <FilterChip
                  key={t.id}
                  active={filter === t.id}
                  onClick={() => setFilter(filter === t.id ? null : t.id)}
                >
                  <Avatar
                    name={t.name}
                    src={t.avatarUrl}
                    className="size-5 text-[9px] ring-1"
                  />
                  {t.name}
                  {!t.enabled && (
                    <span className="text-xs font-normal opacity-70">
                      · keine Zeiten
                    </span>
                  )}
                </FilterChip>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-brand" /> Bestätigt
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-surface ring-1 ring-accent" />{" "}
              Angefragt{requested ? ` (${requested})` : ""}
            </span>
            {courses.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded bg-brand-fg" /> Kurs
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-brand/25" />{" "}
              {multi
                ? "Verfügbar – je kräftiger, desto mehr Trainer"
                : "Deine Verfügbarkeit"}
            </span>
            {cancelledCount > 0 && (
              <span>{cancelledCount} abgesagt/abgelehnt (ausgeblendet)</span>
            )}
          </div>

          <Card className="overflow-x-auto p-0">
            <div className="min-w-[760px]">
              {/* Kopfzeile: Wochentage mit Anzahl Termine (und verfügbarer Trainer) */}
              <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-line">
                <div />
                {days.map((d, i) => {
                  const count = items.filter(
                    (x) => localDate(new Date(x.startsAt)) === d,
                  ).length;
                  const available = trainers.filter(
                    (t) => t.enabled && t.windows.some((w) => w.day === i),
                  ).length;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCreate({ date: d })}
                      title="Termin an diesem Tag eintragen"
                      className={cx(
                        "border-l border-line px-2 py-3 text-left transition hover:bg-surface-2",
                        d === today && "bg-brand/20",
                      )}
                    >
                      <span className="block text-xs font-semibold text-fg-muted uppercase">
                        {WEEKDAYS[i].slice(0, 2)}
                      </span>
                      <span className="block text-lg leading-6 font-extrabold text-fg">
                        {fmt(`${d}T12:00:00`, {
                          day: "numeric",
                          month: "numeric",
                        })}
                      </span>
                      <span className="block truncate text-[11px] text-fg-subtle">
                        {count} {count === 1 ? "Termin" : "Termine"}
                        {multi && ` · ${available} Trainer`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Zeitraster */}
              <div
                className="relative grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]"
                style={{ height: hours.length * HOUR_PX }}
              >
                <div className="relative">
                  {hours.map((h) => (
                    <span
                      key={h}
                      className="absolute right-2 -translate-y-1/2 text-[11px] text-fg-subtle tabular-nums"
                      style={{ top: top(h * 60) }}
                    >
                      {h > startH ? `${String(h).padStart(2, "0")}:00` : ""}
                    </span>
                  ))}
                </div>
                {days.map((d, i) => {
                  const { placed, lanes } = layoutDay(
                    items.filter((x) => localDate(new Date(x.startsAt)) === d),
                  );
                  const nowLine =
                    d === today
                      ? minutesOfDay(new Date(now).toISOString())
                      : null;
                  return (
                    <div
                      key={d}
                      className={cx(
                        "relative border-l border-line",
                        d === today && "bg-brand/5",
                      )}
                    >
                      {hours.map((h) => (
                        <div
                          key={h}
                          className="absolute inset-x-0 border-t border-line/70"
                          style={{ top: top(h * 60) }}
                        />
                      ))}
                      {/* Verfügbarkeit: übereinanderliegende Fenster werden kräftiger */}
                      {trainers
                        .filter((t) => t.enabled)
                        .flatMap((t) =>
                          t.windows
                            .filter((w) => w.day === i)
                            .map((w, k) => ({ t, w, k })),
                        )
                        .map(({ t, w, k }) => (
                          <div
                            key={`${t.id}-${k}`}
                            title={`${t.name}: ${w.start}–${w.end}`}
                            className="pointer-events-none absolute inset-x-0 bg-brand/15"
                            style={{
                              top: top(toMin(w.start)),
                              height:
                                ((toMin(w.end) - toMin(w.start)) / 60) *
                                HOUR_PX,
                            }}
                          />
                        ))}
                      {nowLine != null &&
                        nowLine >= startH * 60 &&
                        nowLine <= endH * 60 && (
                          <div
                            className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-accent"
                            style={{ top: top(nowLine) }}
                          >
                            <span className="absolute -top-1 -left-1 size-2 rounded-full bg-accent" />
                          </div>
                        )}
                      {placed.map(({ item, lane }) => {
                        const start = minutesOfDay(item.startsAt);
                        const duration = Math.max(
                          15,
                          Math.round(
                            (Date.parse(item.endsAt) -
                              Date.parse(item.startsAt)) /
                              60000,
                          ),
                        );
                        const height = (duration / 60) * HOUR_PX;
                        const position = {
                          top: top(start) + 1,
                          height: height - 2,
                          left: `calc(${(lane / lanes) * 100}% + 2px)`,
                          width: `calc(${100 / lanes}% - 4px)`,
                        };
                        if (item.kind === "course") {
                          const c = item.c;
                          const trainerName = data.trainers.find(
                            (t) => t.id === c.trainerId,
                          )?.name;
                          return (
                            <button
                              key={`course-${c.courseId}-${c.startsAt}`}
                              type="button"
                              onClick={() => setCourse(c)}
                              title={`${time(c.startsAt)}–${time(c.endsAt)} ${c.title} · ${c.booked}/${c.capacity} Plätze${trainerName ? ` · ${trainerName}` : ""}`}
                              className="absolute overflow-hidden rounded-inner bg-brand-fg px-1.5 py-1 text-left text-[11px] leading-tight text-white shadow-sm transition hover:z-10 hover:shadow-md"
                              style={position}
                            >
                              <span className="flex items-center gap-1 truncate font-semibold">
                                {time(c.startsAt)} {c.title}
                                <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-brand">
                                  <Icon name="users" className="size-2.5" />
                                  {c.booked}/{c.capacity}
                                </span>
                              </span>
                              {height > 34 && (
                                <span className="block truncate opacity-75">
                                  {[
                                    multi && trainerName
                                      ? trainerName.split(" ")[0]
                                      : null,
                                    c.location,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ") || "Kurs"}
                                </span>
                              )}
                            </button>
                          );
                        }
                        const a = item.a;
                        const who = multi
                          ? `${a.trainer.name.split(" ")[0]} · ${partyName(a)}`
                          : partyName(a);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setSelected(a)}
                            title={`${time(a.startsAt)}–${time(a.endsAt)} ${a.title} · ${multi ? `${a.trainer.name} · ` : ""}${partyName(a)}`}
                            className={cx(
                              "absolute overflow-hidden rounded-inner px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:z-10 hover:shadow-md",
                              a.status === "confirmed"
                                ? "bg-brand text-brand-fg"
                                : "bg-surface text-fg ring-1 ring-accent ring-inset",
                            )}
                            style={position}
                          >
                            <span className="flex items-center gap-1 truncate font-semibold">
                              {time(a.startsAt)} {a.title}
                              {a.commentCount > 0 && (
                                <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 opacity-80">
                                  <Icon name="chat" className="size-2.5" />
                                  {a.commentCount}
                                </span>
                              )}
                            </span>
                            {height > 34 && (
                              <span className="block truncate opacity-80">
                                {who}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      )}

      {selected && (
        <AppointmentDetail
          a={selected}
          role={role}
          now={now}
          onClose={() => setSelected(null)}
          onChanged={reload}
        />
      )}
      {course && (
        <CourseSessionModal
          session={{
            courseId: course.courseId,
            title: course.title,
            startsAt: course.startsAt,
            endsAt: course.endsAt,
            booked: course.booked,
            capacity: course.capacity,
            location: course.location,
          }}
          onClose={() => setCourse(null)}
        />
      )}
      {create && (
        <BookDialog
          schedule={data}
          role={role}
          initialDate={create.date}
          onClose={() => setCreate(null)}
          onCreated={() => {
            setCreate(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition",
        active
          ? "bg-brand-fg text-white ring-brand-fg"
          : "text-fg ring-line hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
