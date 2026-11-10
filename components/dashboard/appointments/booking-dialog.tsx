"use client";

import { Modal, ModalHeader } from "@/components/dashboard/modal";
import { Icon, IconTile } from "@/components/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  cx,
  EmptyState,
  Field,
  LoadError,
  Spinner,
  Textarea,
} from "@/components/ui";
import { api, ApiClientError, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type {
  Appointment,
  BookingProvider,
  BookingService,
  BookingSlotDay,
} from "@/lib/types";
import { useState } from "react";
import {
  CATEGORIES,
  durationLabel,
  fmt,
  longDate,
  nextFreeLabel,
  time,
} from "./utils";

export function BookingDialog({
  providers,
  initialTrainerId,
  onClose,
  onBooked,
}: {
  providers: BookingProvider[];
  initialTrainerId: string | null;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [trainerId, setTrainerId] = useState<string | null>(
    initialTrainerId ??
      (providers.length === 1 ? providers[0].trainerId : null),
  );
  const provider = providers.find((p) => p.trainerId === trainerId) ?? null;
  const [serviceId, setServiceId] = useState<string | null>(
    provider?.services.length === 1 ? provider.services[0].id : null,
  );
  const [done, setDone] = useState<Appointment | null>(null);
  const service = provider?.services.find((s) => s.id === serviceId) ?? null;

  if (done) {
    return (
      <Modal label="Anfrage gesendet" onClose={onClose}>
        <div className="space-y-4 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand text-brand-fg">
            <Icon name="check" className="size-7" />
          </span>
          <h2 className="text-lg font-bold text-fg">Anfrage gesendet!</h2>
          <p className="text-sm text-fg-muted">
            {done.title} bei {done.trainer.name} am {longDate(done.startsAt)} um{" "}
            {time(done.startsAt)} Uhr. Sobald der Termin bestätigt ist, bekommst
            du Bescheid – den Status siehst du unter „Meine Termine“.
          </p>
          <Button onClick={onClose} className="w-full">
            Fertig
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal label="Termin anfragen" onClose={onClose} wide>
      <ModalHeader
        title="Termin anfragen"
        subtitle="Wähle Trainer, Angebot, Tag und Uhrzeit. Der Termin gilt, sobald er bestätigt ist."
        onClose={onClose}
      />

      {providers.length > 1 && (
        <>
          <p className="mt-6 text-sm font-semibold text-fg">Trainer</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {providers.map((p) => (
              <button
                key={p.trainerId}
                type="button"
                onClick={() => {
                  setTrainerId(p.trainerId);
                  setServiceId(
                    p.services.length === 1 ? p.services[0].id : null,
                  );
                }}
                className={cx(
                  "flex items-center gap-3 rounded-tile p-3 text-left ring-1 transition",
                  p.trainerId === trainerId
                    ? "bg-brand/25 ring-brand-ink"
                    : "ring-line hover:bg-surface-2",
                )}
              >
                <Avatar name={p.name} src={p.avatarUrl} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-fg">
                      {p.name}
                    </span>
                    {p.ownCoach && <Badge tone="brand">Dein Coach</Badge>}
                  </span>
                  <span className="block truncate text-xs text-fg-muted">
                    {p.nextFree
                      ? `Frei ab ${nextFreeLabel(p.nextFree)}`
                      : "Gerade ausgebucht"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {provider && (
        <>
          <p className="mt-6 text-sm font-semibold text-fg">Angebot</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {provider.services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                className={cx(
                  "flex items-start gap-3 rounded-tile p-3 text-left ring-1 transition",
                  s.id === serviceId
                    ? "bg-brand/25 ring-brand-ink"
                    : "ring-line hover:bg-surface-2",
                )}
              >
                <IconTile
                  name={CATEGORIES[s.category].icon}
                  tone={s.id === serviceId ? "brand" : "neutral"}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fg">
                    {s.title}
                  </span>
                  <span className="block text-xs text-fg-muted">
                    {durationLabel(s.durationMin)}
                    {s.title !== CATEGORIES[s.category].label &&
                      ` · ${CATEGORIES[s.category].label}`}
                  </span>
                  {s.description && (
                    <span className="mt-1 block text-xs text-fg-subtle">
                      {s.description}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {provider && service && (
        <SlotPicker
          key={`${provider.trainerId}:${service.id}`}
          provider={provider}
          service={service}
          onBooked={(a) => (setDone(a), onBooked())}
        />
      )}
    </Modal>
  );
}

function SlotPicker({
  provider,
  service,
  onBooked,
}: {
  provider: BookingProvider;
  service: BookingService;
  onBooked: (a: Appointment) => void;
}) {
  const slots = useApi<{ days: BookingSlotDay[] }>(
    `/booking/slots?trainerId=${encodeURIComponent(provider.trainerId)}&serviceId=${encodeURIComponent(service.id)}`,
  );
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (slots.loading) return <Spinner />;
  if (!slots.data)
    return (
      <LoadError
        message={
          slots.error?.message ?? "Freie Zeiten konnten nicht geladen werden."
        }
        onRetry={slots.reload}
      />
    );

  const days = slots.data.days;
  const available = days.filter((d) => d.slots.length);
  const selectedDate =
    date && days.some((d) => d.date === date)
      ? date
      : (available[0]?.date ?? null);
  const day = days.find((d) => d.date === selectedDate);

  if (!available.length) {
    return (
      <div className="mt-6">
        <EmptyState
          title="Gerade keine freien Zeiten"
          text={`${provider.name} ist in den nächsten Wochen ausgebucht. Schau später noch einmal vorbei oder schreib eine Nachricht.`}
        />
      </div>
    );
  }

  async function submit() {
    if (!slot) return;
    setPending(true);
    setError(null);
    try {
      const a = await api<Appointment>("/appointments", {
        body: {
          trainerId: provider.trainerId,
          serviceId: service.id,
          startsAt: slot,
          note: note.trim() || undefined,
        },
      });
      onBooked(a);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
      if (err instanceof ApiClientError && err.status === 409) {
        setSlot(null);
        slots.reload();
      }
    }
  }

  return (
    <>
      <p className="mt-6 text-sm font-semibold text-fg">Tag</p>
      <div className="-mx-1 mt-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-2">
        {days.map((d) => {
          const dt = `${d.date}T12:00:00`;
          const active = d.date === selectedDate;
          return (
            <button
              key={d.date}
              type="button"
              disabled={!d.slots.length}
              onClick={() => {
                setDate(d.date);
                setSlot(null);
              }}
              className={cx(
                "grid w-16 shrink-0 place-items-center rounded-control py-2 text-center ring-1 transition disabled:opacity-35",
                active
                  ? "bg-brand text-brand-fg ring-brand-ink"
                  : "ring-line enabled:hover:bg-surface-2",
              )}
            >
              <span className="text-[11px] font-semibold uppercase">
                {fmt(dt, { weekday: "short" }).replace(".", "")}
              </span>
              <span className="text-lg leading-6 font-extrabold">
                {fmt(dt, { day: "numeric" })}
              </span>
              <span className="text-[11px]">
                {fmt(dt, { month: "short" }).replace(".", "")}
              </span>
            </button>
          );
        })}
      </div>

      {day && (
        <>
          <p className="mt-4 text-sm font-semibold text-fg">
            Uhrzeit ·{" "}
            {fmt(`${day.date}T12:00:00`, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {day.slots.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                className={cx(
                  "rounded-control py-2 text-sm font-semibold tabular-nums ring-1 transition",
                  s === slot
                    ? "bg-brand-fg text-white ring-brand-fg"
                    : "text-fg ring-line hover:bg-surface-2",
                )}
              >
                {time(s)}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-6">
        <Field label="Nachricht (optional)">
          <Textarea
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z. B. Ich möchte an meiner Kniebeuge-Technik arbeiten."
          />
        </Field>
      </div>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <Button
        className="mt-6 w-full"
        disabled={!slot || pending}
        onClick={submit}
      >
        {pending
          ? "Wird gesendet …"
          : slot
            ? `${service.title} am ${fmt(slot, { day: "numeric", month: "short" })} um ${time(slot)} Uhr anfragen`
            : "Uhrzeit wählen"}
      </Button>
    </>
  );
}
