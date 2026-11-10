import type { OpeningHoursDay } from "@/lib/types";
import { useEffect, useState } from "react";

export const WEEKDAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

/** 0 = Montag … 6 = Sonntag */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

const minutes = (hhmm: string) =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** „Jetzt geöffnet bis 22:00“ bzw. „Öffnet morgen um 07:00“ – auf Basis der Gerätezeit. */
export function openingStatus(
  hours: OpeningHoursDay[],
  now: Date,
): { open: boolean; text: string } | null {
  if (!hours.length) return null;
  const byDay = new Map(hours.map((h) => [h.day, h]));
  const today = weekdayIndex(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const t = byDay.get(today);
  if (
    t &&
    !t.closed &&
    nowMin >= minutes(t.open) &&
    nowMin < minutes(t.close)
  ) {
    return { open: true, text: `Jetzt geöffnet · bis ${t.close} Uhr` };
  }
  if (t && !t.closed && nowMin < minutes(t.open))
    return { open: false, text: `Geschlossen · öffnet heute um ${t.open} Uhr` };
  for (let i = 1; i <= 7; i++) {
    const day = (today + i) % 7;
    const h = byDay.get(day);
    if (h && !h.closed) {
      const when = i === 1 ? "morgen" : WEEKDAYS[day];
      return {
        open: false,
        text: `Geschlossen · öffnet ${when} um ${h.open} Uhr`,
      };
    }
  }
  return { open: false, text: "Derzeit geschlossen" };
}

export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}
