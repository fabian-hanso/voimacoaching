"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Modal, ModalHeader } from "@/components/dashboard/modal";
import { Icon } from "@/components/icons";
import {
  Alert,
  Button,
  cx,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { toCover } from "@/lib/client/image";
import { courseInputSchema } from "@/lib/schemas";
import type {
  CourseSlot,
  CourseWithSessions,
  StudioTrainer,
} from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { CourseImage } from "./course-image";
import { DAYS, DURATIONS } from "./utils";

export function CourseEditor({
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
  const [schedule, setSchedule] = useState<CourseSlot[]>(
    course?.schedule.length ? course.schedule : [{ day: 0, start: "18:00" }],
  );
  // Bild: undefined = unverändert, null = entfernen, Blob = neu
  const [image, setImage] = useState<Blob | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(
    course?.imageUrl ?? null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((x) => ({ ...x, [key]: value }));

  useEffect(
    () => () =>
      void (preview?.startsWith("blob:") && URL.revokeObjectURL(preview)),
    [preview],
  );

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
    if (!parsed.success)
      return setError(
        parsed.error.issues[0]?.message ?? "Bitte prüfe deine Eingaben.",
      );
    setPending(true);
    try {
      const saved = course
        ? await api<CourseWithSessions>(`/studio/courses/${course.id}`, {
            method: "PUT",
            body,
          })
        : await api<CourseWithSessions>("/studio/courses", { body });
      if (image instanceof Blob) {
        const form = new FormData();
        form.append(
          "file",
          image,
          image.type === "image/webp" ? "kurs.webp" : "kurs.jpg",
        );
        try {
          await api(`/studio/courses/${saved.id}/image`, {
            method: "POST",
            body: form,
            timeoutMs: 60_000,
          });
        } catch (err) {
          onSaved();
          window.alert(
            `Der Kurs wurde gespeichert, das Bild aber nicht: ${errorMessage(err)}`,
          );
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

  const upcomingBookings =
    course?.sessions.reduce((n, s) => n + s.booked, 0) ?? 0;

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
    <Modal
      label={course ? "Kurs bearbeiten" : "Kurs anlegen"}
      onClose={onClose}
      busy={pending}
      wide
    >
      <form onSubmit={save} className="space-y-5">
        <ModalHeader
          title={course ? "Kurs bearbeiten" : "Kurs anlegen"}
          subtitle="Kunden deines Studios sehen aktive Kurse auf der Studio-Seite."
          onClose={onClose}
        />

        {/* Bild */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-fg">Bild</span>
          <div className="relative overflow-hidden rounded-tile ring-1 ring-line">
            <CourseImage
              course={{
                imageUrl: preview,
                title: f.title,
                category: f.category || null,
              }}
            />
            <div className="absolute right-3 bottom-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => fileInput.current?.click()}
                className="bg-surface/90 backdrop-blur"
              >
                <Icon name="camera" className="size-3.5" />{" "}
                {preview ? "Ändern" : "Bild hochladen"}
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
          <p className="mt-1 text-xs text-fg-muted">
            Wird auf 16:9 zugeschnitten.
          </p>
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
            <Input
              value={f.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={80}
              required
              placeholder="z. B. Power Yoga"
            />
          </Field>
          <Field label="Kategorie (optional)">
            <Input
              value={f.category}
              onChange={(e) => set("category", e.target.value)}
              maxLength={40}
              placeholder="z. B. Yoga"
            />
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
            <Select
              value={f.trainerId}
              onChange={(e) => set("trainerId", e.target.value)}
            >
              <option value="">Noch offen</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Raum / Ort (optional)">
            <Input
              value={f.location}
              onChange={(e) => set("location", e.target.value)}
              maxLength={80}
              placeholder="z. B. Kursraum 1"
            />
          </Field>
          <Field
            label="Plätze pro Termin"
            hint="Kontingent – danach ist der Termin ausgebucht."
          >
            <Input
              type="number"
              min={1}
              max={500}
              value={f.capacity}
              onChange={(e) => set("capacity", Number(e.target.value))}
              required
            />
          </Field>
          <Field label="Dauer">
            <Select
              value={f.durationMin}
              onChange={(e) => set("durationMin", Number(e.target.value))}
            >
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
              onClick={() =>
                setSchedule((s) => [
                  ...s,
                  {
                    day: Math.min(6, (s.at(-1)?.day ?? -1) + 2),
                    start: s.at(-1)?.start ?? "18:00",
                  },
                ])
              }
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
                  onChange={(e) =>
                    setSchedule((s) =>
                      s.map((x, j) =>
                        j === i ? { ...x, day: Number(e.target.value) } : x,
                      ),
                    )
                  }
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
                  onChange={(e) =>
                    setSchedule((s) =>
                      s.map((x, j) =>
                        j === i ? { ...x, start: e.target.value } : x,
                      ),
                    )
                  }
                  className="w-32"
                  required
                />
                <button
                  type="button"
                  aria-label="Termin entfernen"
                  disabled={schedule.length === 1}
                  onClick={() =>
                    setSchedule((s) => s.filter((_, j) => j !== i))
                  }
                  className="grid size-9 shrink-0 place-items-center rounded-control text-fg-subtle hover:bg-surface-3 hover:text-fg disabled:opacity-30"
                >
                  <Icon name="x" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Läuft ab (optional)">
            <Input
              type="date"
              value={f.startsOn}
              onChange={(e) => set("startsOn", e.target.value)}
            />
          </Field>
          <Field label="Läuft bis (optional)" hint="Leer = fortlaufend">
            <Input
              type="date"
              value={f.endsOn}
              onChange={(e) => set("endsOn", e.target.value)}
            />
          </Field>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-tile bg-surface-2 p-3">
          <span>
            <span className="block text-sm font-medium text-fg">
              Kurs ist aktiv
            </span>
            <span className="block text-xs text-fg-muted">
              Pausierte Kurse sind für Kunden unsichtbar; bestehende Anmeldungen
              werden storniert.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={f.active}
            onClick={() => set("active", !f.active)}
            className={cx(
              "relative h-7 w-12 shrink-0 rounded-full transition",
              f.active ? "bg-brand-ink" : "bg-line-strong",
            )}
          >
            <span
              className={cx(
                "absolute top-1 size-5 rounded-full bg-white shadow transition-all",
                f.active ? "left-6" : "left-1",
              )}
            />
          </button>
        </label>

        {error && <Alert>{error}</Alert>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {course ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
            >
              Kurs löschen
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={pending}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Wird gespeichert …"
                : course
                  ? "Speichern"
                  : "Kurs anlegen"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
