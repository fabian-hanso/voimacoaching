import type { CourseSlot } from "@/lib/types";

const DAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export const DAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

export const DURATIONS = [30, 45, 60, 75, 90, 120];

export const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("de-DE", opts).format(new Date(iso));

export const time = (iso: string) =>
  fmt(iso, { hour: "2-digit", minute: "2-digit" });

export const sessionLabel = (iso: string) =>
  `${fmt(iso, { weekday: "short", day: "numeric", month: "short" })}, ${time(iso)} Uhr`;

/** „Mo 18:00 · Do 19:30“ */
export const scheduleLabel = (schedule: CourseSlot[]) =>
  schedule.map((s) => `${DAYS_SHORT[s.day]} ${s.start}`).join(" · ");

export const spotsLabel = (free: number) =>
  free <= 0
    ? "Ausgebucht"
    : free === 1
      ? "1 Platz frei"
      : `${free} Plätze frei`;
