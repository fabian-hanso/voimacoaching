import { useRef, useState, type PointerEvent } from "react";

const STEP = 15; // Minuten-Raster
const MAX_DURATION = 240; // wie die API (studioAppointmentSchema)
const CLICK_DURATION = 60; // Klick ohne Ziehen → 1 Stunde
const DRAG_THRESHOLD_PX = 4;

export interface DragRange {
  /** Tag als JJJJ-MM-TT */
  day: string;
  /** Minuten seit Mitternacht */
  start: number;
  end: number;
}

/** Minuten → "HH:MM" */
export const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * Zeitraum im Wochenkalender aufziehen, um einen Termin anzulegen.
 * Maus: ziehen (15-Minuten-Raster, max. 4 h) · Klick bzw. Tippen: 1 Stunde ab der Stelle.
 * Auf Touch-Geräten bleibt Scrollen möglich – beginnt der Browser zu scrollen, wird das Aufziehen abgebrochen.
 */
export function useDragCreate({
  bounds,
  pxPerHour,
  onCreate,
}: {
  /** erste/letzte sichtbare Minute des Rasters – erst beim Ziehen abgefragt (steht beim Hook-Aufruf noch nicht fest) */
  bounds: () => { startMin: number; endMin: number };
  pxPerHour: number;
  onCreate: (range: DragRange) => void;
}) {
  const [range, setRange] = useState<DragRange | null>(null);
  const anchor = useRef<{ min: number; y: number; moved: boolean } | null>(
    null,
  );

  const minuteAt = (e: PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return bounds().startMin + ((e.clientY - rect.top) / pxPerHour) * 60;
  };
  const clamp = (start: number, end: number) => {
    const { startMin, endMin } = bounds();
    const s = Math.max(startMin, start);
    return { start: s, end: Math.min(endMin, end, s + MAX_DURATION) };
  };

  function bind(day: string) {
    return {
      onPointerDown(e: PointerEvent<HTMLElement>) {
        // Nur linke Maustaste bzw. Finger, und nicht auf bestehenden Terminen/Kursen
        if (e.button !== 0 || (e.target as HTMLElement).closest("button"))
          return;
        const min = Math.floor(minuteAt(e) / STEP) * STEP;
        anchor.current = { min, y: e.clientY, moved: false };
        if (e.pointerType === "mouse")
          e.currentTarget.setPointerCapture(e.pointerId);
        setRange({ day, ...clamp(min, min + STEP) });
      },
      onPointerMove(e: PointerEvent<HTMLElement>) {
        const a = anchor.current;
        if (!a || e.pointerType !== "mouse") return;
        if (Math.abs(e.clientY - a.y) > DRAG_THRESHOLD_PX) a.moved = true;
        if (!a.moved) return;
        const cur = minuteAt(e);
        // In beide Richtungen ziehbar; der Startpunkt bleibt fest
        const next =
          cur >= a.min
            ? clamp(a.min, Math.max(a.min + STEP, Math.ceil(cur / STEP) * STEP))
            : clamp(
                Math.max(
                  Math.floor(cur / STEP) * STEP,
                  a.min + STEP - MAX_DURATION,
                ),
                a.min + STEP,
              );
        setRange({ day, ...next });
      },
      onPointerUp() {
        const a = anchor.current;
        anchor.current = null;
        if (!a || !range) return setRange(null);
        const final = a.moved
          ? range
          : { day, ...clamp(a.min, a.min + CLICK_DURATION) };
        setRange(null);
        if (final.end - final.start >= STEP) onCreate(final);
      },
      onPointerCancel() {
        anchor.current = null;
        setRange(null);
      },
    };
  }

  return { range, bind };
}
