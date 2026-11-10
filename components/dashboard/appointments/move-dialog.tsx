"use client";

import { useState } from "react";
import { Modal, ModalHeader } from "@/components/dashboard/modal";
import { Icon } from "@/components/icons";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { Appointment } from "@/lib/types";
import {
  durationLabel,
  DURATIONS,
  fmt,
  localDate,
  partyName,
  time,
} from "./utils";

const MIN = 60_000;
const rangeLabel = (startIso: string, endIso: string) =>
  `${fmt(startIso, { weekday: "short", day: "numeric", month: "short" })} · ${time(startIso)}–${time(endIso)}`;

/**
 * Termin verschieben (Trainer/Studio). Aus dem Kalender kommt der neue Zeitraum vorbelegt (Ziehen),
 * aus dem Termin-Detail der bisherige. Zeigt vorher/nachher und wer benachrichtigt wird.
 */
export function MoveDialog({
  a,
  role,
  initial,
  onClose,
  onMoved,
}: {
  a: Appointment;
  role: "trainer" | "studio";
  /** neuer Zeitraum (z. B. aus dem Kalender gezogen) */
  initial?: { date: string; start: string; duration: number };
  onClose: () => void;
  onMoved: (updated: Appointment) => void;
}) {
  const currentDuration = Math.round(
    (Date.parse(a.endsAt) - Date.parse(a.startsAt)) / MIN,
  );
  const [date, setDate] = useState(
    initial?.date ?? localDate(new Date(a.startsAt)),
  );
  const [start, setStart] = useState(initial?.start ?? time(a.startsAt));
  const [duration, setDuration] = useState(
    initial?.duration ?? currentDuration,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newStart = date && start ? new Date(`${date}T${start}:00`) : null;
  const valid = !!newStart && !Number.isNaN(newStart.getTime());
  const newStartIso = valid ? newStart!.toISOString() : null;
  const newEndIso = valid
    ? new Date(newStart!.getTime() + duration * MIN).toISOString()
    : null;
  const unchanged =
    newStartIso === new Date(a.startsAt).toISOString() &&
    duration === currentDuration;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!newStartIso) return;
    setPending(true);
    setError(null);
    try {
      const updated = await api<Appointment>(`/appointments/${a.id}/time`, {
        method: "PATCH",
        body: { startsAt: newStartIso, durationMin: duration },
      });
      onMoved(updated);
    } catch (err) {
      setError(errorMessage(err, "Der Termin konnte nicht verschoben werden."));
      setPending(false);
    }
  }

  const notified = [
    a.client ? a.client.name : null,
    role === "studio" ? a.trainer.name : null,
  ].filter(Boolean);

  return (
    <Modal label="Termin verschieben" onClose={onClose} busy={pending}>
      <form onSubmit={submit} className="space-y-5">
        <ModalHeader
          title="Termin verschieben"
          subtitle={`${a.title} · ${partyName(a)}`}
          onClose={onClose}
        />

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-tile bg-surface-2 p-3 text-sm">
          <div>
            <p className="text-xs text-fg-subtle">Bisher</p>
            <p className="font-medium text-fg-muted line-through decoration-fg-subtle">
              {rangeLabel(a.startsAt, a.endsAt)}
            </p>
          </div>
          <Icon name="arrow" className="size-4 text-fg-subtle" />
          <div>
            <p className="text-xs text-fg-subtle">Neu</p>
            <p className="font-semibold text-fg">
              {newStartIso && newEndIso
                ? rangeLabel(newStartIso, newEndIso)
                : "–"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Datum">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Uhrzeit">
            <Input
              type="time"
              step={900}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </Field>
          <Field label="Dauer">
            <Select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {[...new Set([...DURATIONS, duration])]
                .sort((x, y) => x - y)
                .map((d) => (
                  <option key={d} value={d}>
                    {durationLabel(d)}
                  </option>
                ))}
            </Select>
          </Field>
        </div>

        <p className="flex items-start gap-2 text-sm text-fg-muted">
          <Icon name="bell" className="mt-0.5 size-4 shrink-0" />
          {notified.length
            ? `${notified.join(" und ")} ${notified.length > 1 ? "werden" : "wird"} über die neue Zeit benachrichtigt.`
            : "Gast ohne Konto – bitte selbst über die neue Zeit informieren (Kontaktdaten stehen im Termin)."}
        </p>

        {error && <Alert>{error}</Alert>}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={pending}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={pending || !valid || unchanged}>
            {pending ? "Verschieben …" : "Termin verschieben"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
