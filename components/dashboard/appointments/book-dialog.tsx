"use client";

import { Modal, ModalHeader } from "@/components/dashboard/modal";
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
import type { AppointmentCategory, Schedule } from "@/lib/types";
import { useState } from "react";
import { CATEGORIES, durationLabel, DURATIONS, toMin } from "./utils";

/** Termin direkt eintragen (sofort bestätigt). Studio wählt den Trainer, Trainer trägt bei sich ein. */
export function BookDialog({
  schedule,
  role,
  initialDate,
  onClose,
  onCreated,
}: {
  schedule: Schedule;
  role: "trainer" | "studio";
  initialDate: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const clients = schedule.clients;
  const [trainerId, setTrainerId] = useState(schedule.trainers[0]?.id ?? "");
  const trainer = schedule.trainers.find((t) => t.id === trainerId);
  const [party, setParty] = useState<"client" | "guest">(
    clients.length ? "client" : "guest",
  );
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [guestName, setGuestName] = useState("");
  const [serviceId, setServiceId] = useState<string>(
    trainer?.services[0]?.id ?? "custom",
  );
  const [custom, setCustom] = useState({
    category: "trial" as AppointmentCategory,
    title: CATEGORIES.trial.label,
    durationMin: CATEGORIES.trial.duration,
  });
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("10:00");
  const [note, setNote] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedClient = clients.find((c) => c.id === clientId);

  const service = trainer?.services.find((s) => s.id === serviceId);
  const details = service
    ? {
        category: service.category,
        title: service.title,
        durationMin: service.durationMin,
      }
    : custom;
  const dayIndex = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
  const windows = trainer?.enabled
    ? trainer.windows.filter((w) => w.day === dayIndex)
    : [];
  const startMin = toMin(startTime || "00:00");
  const outside = !windows.some(
    (w) =>
      startMin >= toMin(w.start) &&
      startMin + details.durationMin <= toMin(w.end),
  );
  const isStudio = role === "studio";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/schedule", {
        body: {
          trainerId: isStudio ? trainerId : undefined,
          clientId: party === "client" ? clientId : null,
          guestName: party === "guest" ? guestName : undefined,
          ...details,
          startsAt: new Date(`${date}T${startTime}:00`).toISOString(),
          note: note.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
        },
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err, "Termin konnte nicht eingetragen werden."));
      setPending(false);
    }
  }

  return (
    <Modal label="Termin eintragen" onClose={onClose} busy={pending} wide>
      <form onSubmit={submit} className="space-y-5">
        <ModalHeader
          title="Termin eintragen"
          subtitle={
            isStudio
              ? "Wird sofort bestätigt. Trainer und Kunde werden benachrichtigt."
              : "Wird sofort bestätigt. Der Kunde wird benachrichtigt."
          }
          onClose={onClose}
        />

        <div className={cx("grid gap-4", isStudio && "sm:grid-cols-2")}>
          {isStudio && (
            <Field label="Trainer">
              <Select
                value={trainerId}
                onChange={(e) => {
                  setTrainerId(e.target.value);
                  setServiceId(
                    schedule.trainers.find((t) => t.id === e.target.value)
                      ?.services[0]?.id ?? "custom",
                  );
                }}
              >
                {schedule.trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-fg">
              Für
            </span>
            <div className="grid grid-cols-2 gap-1 rounded-control bg-surface-3 p-1">
              {(
                [
                  ["client", "Kunde"],
                  ["guest", "Gast ohne Konto"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  disabled={key === "client" && !clients.length}
                  onClick={() => setParty(key)}
                  className={cx(
                    "rounded-inner py-1.5 text-sm font-semibold transition disabled:opacity-40",
                    party === key
                      ? "bg-surface text-fg shadow-sm"
                      : "text-fg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {party === "client" ? (
          <Field label="Kunde">
            <Select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field
            label="Name des Gastes"
            hint="z. B. für ein Probetraining von Interessenten."
          >
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              maxLength={100}
              required
              placeholder="Vor- und Nachname"
            />
          </Field>
        )}

        <Field label="Angebot">
          <Select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            {trainer?.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {durationLabel(s.durationMin)}
              </option>
            ))}
            <option value="custom">Eigener Termin …</option>
          </Select>
        </Field>
        {serviceId === "custom" && (
          <div className="grid gap-4 rounded-tile bg-surface-2 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_7rem]">
            <Field label="Kategorie">
              <Select
                value={custom.category}
                onChange={(e) => {
                  const category = e.target.value as AppointmentCategory;
                  setCustom({
                    category,
                    title: CATEGORIES[category].label,
                    durationMin: CATEGORIES[category].duration,
                  });
                }}
              >
                {Object.entries(CATEGORIES).map(([value, c]) => (
                  <option key={value} value={value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Titel">
              <Input
                value={custom.title}
                maxLength={80}
                required
                onChange={(e) =>
                  setCustom({ ...custom, title: e.target.value })
                }
              />
            </Field>
            <Field label="Dauer">
              <Select
                value={custom.durationMin}
                onChange={(e) =>
                  setCustom({ ...custom, durationMin: Number(e.target.value) })
                }
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {durationLabel(d)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
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
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </Field>
        </div>
        <p
          className={cx(
            "text-xs",
            outside ? "text-accent-soft" : "text-fg-muted",
          )}
        >
          {isStudio ? trainer?.name : "Du"}{" "}
          {windows.length
            ? `${isStudio ? "ist" : "bist"} an diesem Tag verfügbar: ${windows.map((w) => `${w.start}–${w.end}`).join(", ")} Uhr.`
            : `${isStudio ? "hat" : "hast"} an diesem Tag keine Zeiten hinterlegt.`}
          {outside && " Der Termin liegt außerhalb – eintragen geht trotzdem."}
        </p>

        <div>
          <p className="text-sm font-medium text-fg">Kontakt</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {party === "client"
              ? `Aus dem Profil: ${[selectedClient?.email, selectedClient?.phone ?? "keine Telefonnummer"].filter(Boolean).join(" · ")}. Nur ausfüllen, wenn für diesen Termin abweichend.`
              : "Damit ihr den Gast erreicht, z. B. bei Verspätung oder Absage."}
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              maxLength={254}
              aria-label="E-Mail"
              placeholder={
                party === "client"
                  ? (selectedClient?.email ?? "E-Mail")
                  : "E-Mail (optional)"
              }
            />
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              maxLength={40}
              aria-label="Telefon"
              placeholder={
                party === "client"
                  ? (selectedClient?.phone ?? "Telefon")
                  : "Telefon (optional)"
              }
            />
          </div>
        </div>

        <Field label="Notiz für den Kunden (optional)">
          <Textarea
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z. B. Bitte Handtuch mitbringen."
          />
        </Field>

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
          <Button type="submit" disabled={pending || !trainerId}>
            {pending ? "Wird eingetragen …" : "Termin eintragen"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
