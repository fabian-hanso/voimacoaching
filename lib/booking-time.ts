import type { BookingSettings, BookingSlotDay } from "./types";

/** Zeitrechnung für Termine: Zeitfenster gelten in deutscher Ortszeit. Ohne Server-Abhängigkeiten (testbar). */

export const TZ = "Europe/Berlin";
export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/* ------------------------------------------------------------------ */
/* Zeitzone                                                            */
/* ------------------------------------------------------------------ */

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function zonedParts(ms: number) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute };
}

/** Abstand Ortszeit – UTC in Millisekunden zum Zeitpunkt `ms`. */
function offsetAt(ms: number) {
  const p = zonedParts(ms);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Math.floor(ms / MIN) * MIN;
}

/** Ortszeit (Datum + Minuten seit Mitternacht) → UTC-Millisekunden. */
export function zonedToUtc(date: string, minutes: number): number {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d) + minutes * MIN;
  let t = guess - offsetAt(guess);
  const second = guess - offsetAt(t); // Korrektur rund um die Zeitumstellung
  if (second !== t) t = second;
  return t;
}

/** Kalenderdatum (YYYY-MM-DD) in Ortszeit. */
export function zonedDate(ms: number): string {
  const p = zonedParts(ms);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
/** 0 = Montag … 6 = Sonntag */
export const weekday = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
export const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/* ------------------------------------------------------------------ */
/* Freie Zeiten berechnen                                              */
/* ------------------------------------------------------------------ */

/**
 * Freie Startzeiten für ein Angebot. Raster: 30 Minuten (15 bei Dauern wie 45 min).
 * Belegte Zeiten (`busy`, offene und bestätigte Termine) werden ausgespart.
 */
export function computeSlots(
  settings: Pick<BookingSettings, "windows" | "minNoticeHours" | "horizonDays">,
  durationMin: number,
  busy: [number, number][],
  nowMs: number,
): BookingSlotDay[] {
  const earliest = nowMs + settings.minNoticeHours * HOUR;
  const latest = nowMs + settings.horizonDays * DAY;
  const step = durationMin % 30 === 0 ? 30 : 15;
  const today = zonedDate(nowMs);
  const days: BookingSlotDay[] = [];
  for (let i = 0; i <= settings.horizonDays; i++) {
    const date = addDays(today, i);
    const slots: number[] = [];
    for (const w of settings.windows.filter((x) => x.day === weekday(date))) {
      for (let m = toMin(w.start); m + durationMin <= toMin(w.end); m += step) {
        const start = zonedToUtc(date, m);
        const end = start + durationMin * MIN;
        if (start < earliest || start > latest) continue;
        if (busy.some(([bs, be]) => start < be && end > bs)) continue;
        slots.push(start);
      }
    }
    days.push({ date, slots: [...new Set(slots)].sort((a, b) => a - b).map((ms) => new Date(ms).toISOString()) });
  }
  return days;
}

