"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, ApiClientError, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { toCover } from "@/lib/client/image";
import { Alert, Avatar, Badge, Button, Card, cx, EmptyState, Field, Input, LoadError, Select, Spinner, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { courseInputSchema } from "@/lib/schemas";
import type { CourseParticipant, CourseSlot, CourseWithSessions, MyCourseBooking, StudioTrainer } from "@/lib/types";
import { Modal, ModalHeader } from "./modal";

/* ------------------------------------------------------------------ */
/* Gemeinsames                                                         */
/* ------------------------------------------------------------------ */

const DAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const DURATIONS = [30, 45, 60, 75, 90, 120];

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("de-DE", opts).format(new Date(iso));
const time = (iso: string) => fmt(iso, { hour: "2-digit", minute: "2-digit" });
const sessionLabel = (iso: string) => `${fmt(iso, { weekday: "short", day: "numeric", month: "short" })}, ${time(iso)} Uhr`;
/** „Mo 18:00 · Do 19:30“ */
export const scheduleLabel = (schedule: CourseSlot[]) => schedule.map((s) => `${DAYS_SHORT[s.day]} ${s.start}`).join(" · ");
const spotsLabel = (free: number) => (free <= 0 ? "Ausgebucht" : free === 1 ? "1 Platz frei" : `${free} Plätze frei`);

function CourseImage({ course, className }: { course: Pick<CourseWithSessions, "imageUrl" | "title" | "category">; className?: string }) {
  return course.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- bereits serverseitig auf 1600×900 verkleinert
    <img src={course.imageUrl} alt="" className={cx("aspect-video w-full object-cover", className)} />
  ) : (
    <div className={cx("relative grid aspect-video w-full place-items-center overflow-hidden bg-brand-fg text-brand", className)}>
      <div aria-hidden="true" className="absolute -top-10 -right-10 size-40 rounded-full bg-brand opacity-25 blur-2xl" />
      <span className="relative text-center">
        <Icon name="users" className="mx-auto size-8" />
        {course.category && <span className="mt-1 block text-xs font-semibold tracking-wide uppercase">{course.category}</span>}
      </span>
    </div>
  );
}

function CourseMeta({ course }: { course: CourseWithSessions }) {
  return (
    <div className="mt-2 space-y-1 text-sm text-fg-muted">
      <p className="flex items-center gap-1.5">
        <Icon name="clock" className="size-3.5 shrink-0" /> {scheduleLabel(course.schedule)} · {course.durationMin} min
      </p>
      {course.location && (
        <p className="flex items-center gap-1.5">
          <Icon name="building" className="size-3.5 shrink-0" /> {course.location}
        </p>
      )}
      <p className="flex items-center gap-1.5">
        {course.trainer ? (
          <>
            <Avatar name={course.trainer.name} src={course.trainer.avatarUrl} className="size-4 text-[8px] ring-1" /> {course.trainer.name}
          </>
        ) : (
          <>
            <Icon name="user" className="size-3.5 shrink-0" /> Trainer folgt
          </>
        )}
      </p>
    </div>
  );
}

/** Teilnehmende eines Kurstermins (Studio & Kurstrainer) – auch aus dem Kalender aufrufbar. */
export function CourseSessionModal({
  session,
  onClose,
}: {
  session: { courseId: string; title: string; startsAt: string; endsAt: string; booked: number; capacity: number; location?: string | null };
  onClose: () => void;
}) {
  const list = useApi<{ participants: CourseParticipant[] }>(`/courses/${session.courseId}/participants?startsAt=${encodeURIComponent(session.startsAt)}`);
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
            {list.data ? participants.length : session.booked} / {session.capacity} Plätze
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, ((list.data ? participants.length : session.booked) / session.capacity) * 100)}%` }} />
        </div>
        {list.loading ? (
          <Spinner />
        ) : list.error && !list.data ? (
          <div className="mt-4">
            <LoadError message={list.error.message} onRetry={list.reload} />
          </div>
        ) : participants.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-fg-muted">Noch keine Anmeldungen.</p>
        ) : (
          <ul className="mt-4 max-h-80 divide-y divide-line overflow-y-auto">
            {participants.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="w-5 text-right text-xs text-fg-subtle tabular-nums">{i + 1}.</span>
                <Avatar name={p.name} src={p.avatarUrl} />
                <span className="flex-1 truncate text-sm font-medium text-fg">{p.name}</span>
                <span className="text-xs text-fg-subtle">angemeldet {fmt(p.bookedAt, { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Studio: Kurse verwalten                                             */
/* ------------------------------------------------------------------ */

export function StudioCourses({ trainers }: { trainers: StudioTrainer[] }) {
  const courses = useApi<{ courses: CourseWithSessions[] }>("/studio/courses");
  const [editing, setEditing] = useState<CourseWithSessions | "new" | null>(null);
  const [session, setSession] = useState<{ course: CourseWithSessions; startsAt: string; endsAt: string; booked: number } | null>(null);

  if (courses.loading && !courses.data) return <Spinner />;
  if (!courses.data) return <LoadError message={courses.error?.message ?? "Kurse konnten nicht geladen werden."} onRetry={courses.reload} />;
  const list = courses.data.courses;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-fg">Kurse</h2>
          <p className="mt-0.5 text-sm text-fg-muted">Kunden deines Studios sehen aktive Kurse auf der Studio-Seite und melden sich für einzelne Termine an.</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Icon name="plus" className="size-4" /> Kurs anlegen
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Noch keine Kurse"
          text="Lege z. B. Yoga, Spinning oder Rücken-Fit an – mit Trainer, Zeiten und Plätzen pro Termin."
          action={<Button onClick={() => setEditing("new")}>Ersten Kurs anlegen</Button>}
        />
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const next = c.sessions.slice(0, 4);
            const upcomingBookings = c.sessions.reduce((n, s) => n + s.booked, 0);
            return (
              <li key={c.id} className={cx("flex flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line", !c.active && "opacity-70")}>
                <div className="relative">
                  <CourseImage course={c} />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {c.category && <span className="rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-fg backdrop-blur">{c.category}</span>}
                    {!c.active && <span className="rounded-full bg-brand-fg px-2.5 py-1 text-xs font-semibold text-white">Pausiert</span>}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-fg">{c.title}</h3>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>
                      Bearbeiten
                    </Button>
                  </div>
                  <CourseMeta course={c} />
                  <p className="mt-2 text-xs text-fg-subtle">
                    {c.capacity} Plätze pro Termin · {upcomingBookings} {upcomingBookings === 1 ? "Anmeldung" : "Anmeldungen"} in den nächsten 4 Wochen
                  </p>
                  {c.active && (
                    <div className="mt-4 border-t border-line pt-4">
                      <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Nächste Termine</p>
                      {next.length === 0 ? (
                        <p className="mt-2 text-sm text-fg-muted">Keine Termine in den nächsten 4 Wochen.</p>
                      ) : (
                        <ul className="mt-2 space-y-1.5">
                          {next.map((s) => (
                            <li key={s.startsAt}>
                              <button
                                type="button"
                                onClick={() => setSession({ course: c, startsAt: s.startsAt, endsAt: s.endsAt, booked: s.booked })}
                                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-surface-2"
                              >
                                <span className="text-fg">{sessionLabel(s.startsAt)}</span>
                                <span className={cx("shrink-0 text-xs font-semibold tabular-nums", s.booked >= s.capacity ? "text-accent-soft" : "text-fg-muted")}>
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
          session={{ courseId: session.course.id, title: session.course.title, startsAt: session.startsAt, endsAt: session.endsAt, booked: session.booked, capacity: session.course.capacity, location: session.course.location }}
          onClose={() => setSession(null)}
        />
      )}
    </div>
  );
}

function CourseEditor({
  course,
  trainers,
  onClose,
  onSaved,
}: {
  course: CourseWithSessions | null;
  trainers: StudioTrainer[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    title: course?.title ?? "",
    category: course?.category ?? "",
    description: course?.description ?? "",
    location: course?.location ?? "",
    trainerId: course?.trainer?.id ?? "",
    capacity: course?.capacity ?? 12,
    durationMin: course?.durationMin ?? 60,
    startsOn: course?.startsOn ?? "",
    endsOn: course?.endsOn ?? "",
    active: course?.active ?? true,
  });
  const [schedule, setSchedule] = useState<CourseSlot[]>(course?.schedule.length ? course.schedule : [{ day: 0, start: "18:00" }]);
  // Bild: undefined = unverändert, null = entfernen, Blob = neu
  const [image, setImage] = useState<Blob | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(course?.imageUrl ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((x) => ({ ...x, [key]: value }));

  useEffect(() => () => void (preview?.startsWith("blob:") && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const blob = await toCover(file);
      setImage(blob);
      setPreview(URL.createObjectURL(blob));
    } catch (err) {
      setError(errorMessage(err, "Bild konnte nicht geladen werden."));
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body = {
      ...f,
      trainerId: f.trainerId || null,
      startsOn: f.startsOn || null,
      endsOn: f.endsOn || null,
      schedule,
    };
    const parsed = courseInputSchema.safeParse(body);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Bitte prüfe deine Eingaben.");
    setPending(true);
    try {
      const saved = course
        ? await api<CourseWithSessions>(`/studio/courses/${course.id}`, { method: "PUT", body })
        : await api<CourseWithSessions>("/studio/courses", { body });
      if (image instanceof Blob) {
        const form = new FormData();
        form.append("file", image, image.type === "image/webp" ? "kurs.webp" : "kurs.jpg");
        try {
          await api(`/studio/courses/${saved.id}/image`, { method: "POST", body: form, timeoutMs: 60_000 });
        } catch (err) {
          onSaved();
          window.alert(`Der Kurs wurde gespeichert, das Bild aber nicht: ${errorMessage(err)}`);
          return;
        }
      } else if (image === null && course?.imageUrl) {
        await api(`/studio/courses/${saved.id}/image`, { method: "DELETE" });
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Speichern fehlgeschlagen."));
      setPending(false);
    }
  }

  const upcomingBookings = course?.sessions.reduce((n, s) => n + s.booked, 0) ?? 0;

  if (confirmDelete && course) {
    return (
      <ConfirmDialog
        title={`Kurs „${course.title}“ löschen?`}
        description={
          upcomingBookings
            ? `${upcomingBookings} ${upcomingBookings === 1 ? "Anmeldung wird" : "Anmeldungen werden"} storniert; die Kunden bekommen einen Hinweis.`
            : "Der Kurs und seine Termine werden entfernt."
        }
        onConfirm={async () => {
          await api(`/studio/courses/${course.id}`, { method: "DELETE" });
          onSaved();
        }}
        onClose={() => setConfirmDelete(false)}
      />
    );
  }

  return (
    <Modal label={course ? "Kurs bearbeiten" : "Kurs anlegen"} onClose={onClose} busy={pending} wide>
      <form onSubmit={save} className="space-y-5">
        <ModalHeader
          title={course ? "Kurs bearbeiten" : "Kurs anlegen"}
          subtitle="Kunden deines Studios sehen aktive Kurse auf der Studio-Seite."
          onClose={onClose}
        />

        {/* Bild */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-fg">Bild</span>
          <div className="relative overflow-hidden rounded-xl ring-1 ring-line">
            <CourseImage course={{ imageUrl: preview, title: f.title, category: f.category || null }} />
            <div className="absolute right-3 bottom-3 flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => fileInput.current?.click()} className="bg-surface/90 backdrop-blur">
                <Icon name="camera" className="size-3.5" /> {preview ? "Ändern" : "Bild hochladen"}
              </Button>
              {preview && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setImage(null);
                    setPreview(null);
                  }}
                  className="bg-surface/90 backdrop-blur"
                >
                  Entfernen
                </Button>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-fg-muted">Wird auf 16:9 zugeschnitten.</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Field label="Titel">
            <Input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={80} required placeholder="z. B. Power Yoga" />
          </Field>
          <Field label="Kategorie (optional)">
            <Input value={f.category} onChange={(e) => set("category", e.target.value)} maxLength={40} placeholder="z. B. Yoga" />
          </Field>
        </div>
        <Field label="Beschreibung (optional)">
          <Textarea
            rows={3}
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={2000}
            placeholder="Für wen ist der Kurs? Was erwartet die Teilnehmenden? Was sollten sie mitbringen?"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Trainer">
            <Select value={f.trainerId} onChange={(e) => set("trainerId", e.target.value)}>
              <option value="">Noch offen</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Raum / Ort (optional)">
            <Input value={f.location} onChange={(e) => set("location", e.target.value)} maxLength={80} placeholder="z. B. Kursraum 1" />
          </Field>
          <Field label="Plätze pro Termin" hint="Kontingent – danach ist der Termin ausgebucht.">
            <Input type="number" min={1} max={500} value={f.capacity} onChange={(e) => set("capacity", Number(e.target.value))} required />
          </Field>
          <Field label="Dauer">
            <Select value={f.durationMin} onChange={(e) => set("durationMin", Number(e.target.value))}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Zeiten */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-fg">Tag & Uhrzeit</span>
            <button
              type="button"
              onClick={() => setSchedule((s) => [...s, { day: Math.min(6, (s.at(-1)?.day ?? -1) + 2), start: s.at(-1)?.start ?? "18:00" }])}
              disabled={schedule.length >= 21}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-ink hover:underline disabled:opacity-40"
            >
              <Icon name="plus" className="size-3.5" /> Weiterer Termin
            </button>
          </div>
          <ul className="mt-2 space-y-2">
            {schedule.map((slot, i) => (
              <li key={i} className="flex items-center gap-2">
                <Select
                  value={slot.day}
                  aria-label="Wochentag"
                  onChange={(e) => setSchedule((s) => s.map((x, j) => (j === i ? { ...x, day: Number(e.target.value) } : x)))}
                  className="flex-1"
                >
                  {DAYS.map((d, day) => (
                    <option key={day} value={day}>
                      jeden {d}
                    </option>
                  ))}
                </Select>
                <Input
                  type="time"
                  step={900}
                  value={slot.start}
                  aria-label="Beginn"
                  onChange={(e) => setSchedule((s) => s.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                  className="w-32"
                  required
                />
                <button
                  type="button"
                  aria-label="Termin entfernen"
                  disabled={schedule.length === 1}
                  onClick={() => setSchedule((s) => s.filter((_, j) => j !== i))}
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-fg-subtle hover:bg-surface-3 hover:text-fg disabled:opacity-30"
                >
                  <Icon name="x" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Läuft ab (optional)">
            <Input type="date" value={f.startsOn} onChange={(e) => set("startsOn", e.target.value)} />
          </Field>
          <Field label="Läuft bis (optional)" hint="Leer = fortlaufend">
            <Input type="date" value={f.endsOn} onChange={(e) => set("endsOn", e.target.value)} />
          </Field>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-xl bg-surface-2 p-3">
          <span>
            <span className="block text-sm font-medium text-fg">Kurs ist aktiv</span>
            <span className="block text-xs text-fg-muted">Pausierte Kurse sind für Kunden unsichtbar; bestehende Anmeldungen werden storniert.</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={f.active}
            onClick={() => set("active", !f.active)}
            className={cx("relative h-7 w-12 shrink-0 rounded-full transition", f.active ? "bg-brand-ink" : "bg-line-strong")}
          >
            <span className={cx("absolute top-1 size-5 rounded-full bg-white shadow transition-all", f.active ? "left-6" : "left-1")} />
          </button>
        </label>

        {error && <Alert>{error}</Alert>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {course ? (
            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} disabled={pending}>
              Kurs löschen
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Wird gespeichert …" : course ? "Speichern" : "Kurs anlegen"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Kunden: Kurse ansehen & buchen                                       */
/* ------------------------------------------------------------------ */

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
        <p className="mt-1 text-sm text-fg-muted">{canBook ? "Melde dich für einzelne Termine an – die Plätze sind begrenzt." : "So sehen deine Kunden die Kurse."}</p>
      </div>
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => {
          const next = c.sessions.find((s) => s.booked < s.capacity || s.bookedByMe);
          const mine = c.sessions.filter((s) => s.bookedByMe).length;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setOpen(c)}
                className="group flex h-full w-full flex-col overflow-hidden rounded-2xl bg-surface text-left ring-1 ring-line transition hover:ring-brand-ink"
              >
                <div className="relative w-full">
                  <CourseImage course={c} />
                  {c.category && <span className="absolute top-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-fg backdrop-blur">{c.category}</span>}
                  {mine > 0 && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-brand-fg">
                      <Icon name="check" className="size-3" /> {mine}× angemeldet
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-bold text-fg">{c.title}</h3>
                  <CourseMeta course={c} />
                  <span className="mt-auto flex items-center justify-between gap-2 pt-4 text-sm">
                    <span className="text-fg-muted">{next ? `Nächster freier Termin: ${sessionLabel(next.startsAt)}` : "Derzeit keine freien Termine"}</span>
                    <Icon name="arrow" className="size-4 shrink-0 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-brand-ink" />
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

function CourseDetail({ course, canBook, onClose, onChanged }: { course: CourseWithSessions; canBook: boolean; onClose: () => void; onChanged: () => void }) {
  const [c, setC] = useState(course);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(startsAt: string, booked: boolean) {
    setPending(startsAt);
    setError(null);
    try {
      const updated = booked
        ? await api<CourseWithSessions>(`/courses/${c.id}/bookings?startsAt=${encodeURIComponent(startsAt)}`, { method: "DELETE" })
        : await api<CourseWithSessions>(`/courses/${c.id}/bookings`, { body: { startsAt } });
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
      <div className="-mx-6 -mt-6 mb-5 overflow-hidden rounded-t-2xl">
        <CourseImage course={c} />
      </div>
      <ModalHeader title={c.title} subtitle={c.category ?? undefined} onClose={onClose} />
      <CourseMeta course={c} />
      {c.description && <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-fg">{c.description}</p>}

      <div className="mt-6 border-t border-line pt-4">
        <p className="text-sm font-semibold text-fg">Termine der nächsten 4 Wochen</p>
        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}
        {c.sessions.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">Aktuell sind keine Termine geplant.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {c.sessions.map((s) => {
              const free = s.capacity - s.booked;
              return (
                <li key={s.startsAt} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">{sessionLabel(s.startsAt)}</p>
                    <p className={cx("text-xs", free <= 0 && !s.bookedByMe ? "text-accent-soft" : "text-fg-muted")}>
                      {s.bookedByMe ? "Du bist angemeldet" : spotsLabel(free)}
                    </p>
                  </div>
                  {canBook &&
                    (s.bookedByMe ? (
                      <Button size="sm" variant="secondary" disabled={pending === s.startsAt} onClick={() => toggle(s.startsAt, true)}>
                        Abmelden
                      </Button>
                    ) : (
                      <Button size="sm" disabled={free <= 0 || pending === s.startsAt} onClick={() => toggle(s.startsAt, false)}>
                        {pending === s.startsAt ? "…" : free <= 0 ? "Ausgebucht" : "Anmelden"}
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

/** „Meine Kurse“ im Kunden-Dashboard – nur sichtbar, wenn es Anmeldungen gibt. */
export function MyCourses() {
  const bookings = useApi<{ bookings: MyCourseBooking[] }>("/me/course-bookings");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const list = bookings.data?.bookings ?? [];
  if (!list.length) return null;

  async function cancel(b: MyCourseBooking) {
    setPending(b.id);
    setError(null);
    try {
      await api(`/courses/${b.course.id}/bookings?startsAt=${encodeURIComponent(b.startsAt)}`, { method: "DELETE" });
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
          <h2 className="text-xl font-bold tracking-tight text-fg">Meine Kurse</h2>
          <p className="mt-1 text-sm text-fg-muted">Termine, für die du angemeldet bist.</p>
        </div>
        <Link href="/dashboard/studio#kurse" className="text-sm font-semibold text-brand-ink hover:underline">
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
                <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-brand-fg py-2 text-center text-white">
                  <span className="text-[11px] font-semibold uppercase">{fmt(b.startsAt, { weekday: "short" }).replace(".", "")}</span>
                  <span className="text-xl leading-6 font-extrabold">{fmt(b.startsAt, { day: "numeric" })}</span>
                  <span className="text-[11px] font-medium">{fmt(b.startsAt, { month: "short" }).replace(".", "")}</span>
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
              <Button size="sm" variant="secondary" disabled={pending === b.id} onClick={() => cancel(b)}>
                Abmelden
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
