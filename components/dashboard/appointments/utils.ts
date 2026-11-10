import { type IconName } from "@/components/icons";
import { type BadgeTone } from "@/components/ui";
import { api } from "@/lib/client/api";
import type {
  Appointment,
  AppointmentCategory,
  AppointmentStatus,
} from "@/lib/types";
import { useEffect, useState } from "react";

export const CATEGORIES: Record<
  AppointmentCategory,
  { label: string; icon: IconName; duration: number }
> = {
  personal_training: {
    label: "Personal Training",
    icon: "dumbbell",
    duration: 60,
  },
  introduction: {
    label: "Einführung / Geräteeinweisung",
    icon: "sparkles",
    duration: 45,
  },
  nutrition: { label: "Ernährungsberatung", icon: "heart", duration: 45 },
  trial: { label: "Probetraining", icon: "star", duration: 60 },
  body_check: { label: "Körperanalyse", icon: "scale", duration: 30 },
  consultation: { label: "Beratungsgespräch", icon: "chat", duration: 30 },
  other: { label: "Sonstiges", icon: "calendar", duration: 30 },
};

export const STATUS: Record<
  AppointmentStatus,
  { label: string; tone: BadgeTone }
> = {
  requested: { label: "Angefragt", tone: "accent" },
  confirmed: { label: "Bestätigt", tone: "brand" },
  declined: { label: "Abgelehnt", tone: "neutral" },
  cancelled: { label: "Abgesagt", tone: "neutral" },
};

export const WEEKDAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

export const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240];

export const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("de-DE", opts).format(new Date(iso));

export const time = (iso: string) =>
  fmt(iso, { hour: "2-digit", minute: "2-digit" });

export const longDate = (iso: string) =>
  fmt(iso, { weekday: "long", day: "numeric", month: "long" });

export const durationLabel = (min: number) =>
  min < 60
    ? `${min} min`
    : min % 60
      ? `${Math.floor(min / 60)} h ${min % 60} min`
      : `${min / 60} h`;

/** Lokales Datum als YYYY-MM-DD */
export const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d);
};

export const toMin = (hhmm: string) =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export const partyName = (a: Appointment) =>
  a.client?.name ?? a.guestName ?? "Gast";

/** Aktuelle Zeit, minütlich aktualisiert (Render bleibt rein). */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function split(appointments: Appointment[], now: number) {
  const upcoming = appointments.filter(
    (a) =>
      (a.status === "requested" || a.status === "confirmed") &&
      Date.parse(a.endsAt) > now,
  );
  const rest = appointments
    .filter((a) => !upcoming.includes(a))
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  return { upcoming, rest };
}

/** Offene Anfragen (für den Zähler am Tab). */
export const openRequests = (list: Appointment[] | undefined, now = 0) =>
  (list ?? []).filter(
    (a) => a.status === "requested" && Date.parse(a.endsAt) > now,
  ).length;

export const cancelAppointment = (a: Appointment, message: string) =>
  api(`/appointments/${a.id}`, {
    method: "PATCH",
    body: { action: "cancel", message: message || undefined },
  });

/** „Mi., 18. Nov., 16:00 Uhr“ bzw. „Gerade ausgebucht“ */
export const nextFreeLabel = (iso: string | null) =>
  iso
    ? `${fmt(iso, { weekday: "short", day: "numeric", month: "short" })}, ${time(iso)} Uhr`
    : "Gerade ausgebucht";
