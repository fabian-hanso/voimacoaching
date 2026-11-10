import { useRef, useState, type PointerEvent } from "react";
import type { Appointment } from "@/lib/types";

const STEP = 15;
const MAX_DURATION = 240;
const DRAG_THRESHOLD_PX = 4;
/** Unterer Rand eines Termins, an dem man die Dauer zieht */
export const RESIZE_HANDLE_PX = 8;

export interface MoveDraft {
  a: Appointment;
  /** Ziel-Tag JJJJ-MM-TT und Minuten seit Mitternacht */
  day: string;
  start: number;
  end: number;
}

interface DragState {
  a: Appointment;
  mode: "move" | "resize";
  x0: number;
  y0: number;
  moved: boolean;
  day: string;
  start: number;
  duration: number;
  /** Abstand Mauszeiger ↔ Terminbeginn in Minuten (beim Verschieben bleibt der Griffpunkt gleich) */
  grab: number;
  cols: { day: string; left: number; right: number; top: number }[];
}

/**
 * Bestehende Termine im Wochenkalender per Maus verschieben (auch auf andere Tage) oder an der Unterkante
 * die Dauer ändern. 15-Minuten-Raster, max. 4 h. Ein Klick ohne Ziehen öffnet weiterhin die Details;
 * Touch und Tastatur nutzen „Verschieben“ im Termin-Detail.
 * Tages-Spalten müssen `data-cal-day="JJJJ-MM-TT"` tragen.
 */
export function useDragMove({
  bounds,
  pxPerHour,
  onDrop,
}: {
  bounds: () => { startMin: number; endMin: number };
  pxPerHour: number;
  onDrop: (draft: MoveDraft) => void;
}) {
  const [draft, setDraft] = useState<MoveDraft | null>(null);
  const state = useRef<DragState | null>(null);
  /** Nach einem Ziehen den folgenden Klick (Details öffnen) unterdrücken */
  const suppressClick = useRef(false);

  const snap = (m: number) => Math.round(m / STEP) * STEP;

  function bind(
    a: Appointment,
    pos: { day: string; start: number; end: number },
  ) {
    return {
      onPointerDown(e: PointerEvent<HTMLElement>) {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const grid = e.currentTarget.closest("[data-cal-grid]");
        const cols = [
          ...(grid?.querySelectorAll<HTMLElement>("[data-cal-day]") ?? []),
        ].map((el) => {
          const r = el.getBoundingClientRect();
          return {
            day: el.dataset.calDay!,
            left: r.left,
            right: r.right,
            top: r.top,
          };
        });
        const col = cols.find((c) => c.day === pos.day);
        if (!col) return;
        const pointerMin =
          bounds().startMin + ((e.clientY - col.top) / pxPerHour) * 60;
        state.current = {
          a,
          mode: e.clientY >= rect.bottom - RESIZE_HANDLE_PX ? "resize" : "move",
          x0: e.clientX,
          y0: e.clientY,
          moved: false,
          day: pos.day,
          start: pos.start,
          duration: pos.end - pos.start,
          grab: pointerMin - pos.start,
          cols,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove(e: PointerEvent<HTMLElement>) {
        const s = state.current;
        if (!s) return;
        if (
          !s.moved &&
          Math.hypot(e.clientX - s.x0, e.clientY - s.y0) <= DRAG_THRESHOLD_PX
        )
          return;
        s.moved = true;
        const { startMin, endMin } = bounds();
        if (s.mode === "resize") {
          const col = s.cols.find((c) => c.day === s.day)!;
          const pointerMin =
            startMin + ((e.clientY - col.top) / pxPerHour) * 60;
          const end = Math.min(
            endMin,
            s.start + MAX_DURATION,
            Math.max(s.start + STEP, snap(pointerMin)),
          );
          setDraft({ a: s.a, day: s.day, start: s.start, end });
          return;
        }
        const col =
          s.cols.find((c) => e.clientX >= c.left && e.clientX < c.right) ??
          s.cols.find((c) => c.day === s.day)!;
        const pointerMin = startMin + ((e.clientY - col.top) / pxPerHour) * 60;
        const start = Math.min(
          endMin - s.duration,
          Math.max(startMin, snap(pointerMin - s.grab)),
        );
        setDraft({ a: s.a, day: col.day, start, end: start + s.duration });
      },
      onPointerUp() {
        const s = state.current;
        state.current = null;
        if (!s?.moved || !draft) return setDraft(null);
        suppressClick.current = true;
        setDraft(null);
        const changed =
          draft.day !== s.day ||
          draft.start !== s.start ||
          draft.end - draft.start !== s.duration;
        if (changed) onDrop(draft);
      },
      onPointerCancel() {
        state.current = null;
        setDraft(null);
      },
    };
  }

  /** true, wenn der aktuelle Klick zu einem Ziehen gehörte und ignoriert werden soll */
  function consumeClick() {
    const v = suppressClick.current;
    suppressClick.current = false;
    return v;
  }

  return { draft, bind, consumeClick };
}
