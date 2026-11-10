"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { cx } from "@/components/ui";

// Offene Modals (zuletzt geöffnetes oben) – Escape schließt nur das oberste, z. B. Erklärung über dem Katalog.
const stack: object[] = [];

/** Einfaches Modal (Escape und Klick daneben schließen, außer während `busy`). */
export function Modal({ label, onClose, busy, children, wide }: { label: string; onClose: () => void; busy?: boolean; children: ReactNode; wide?: boolean }) {
  const self = useRef({});
  useEffect(() => {
    const id = self.current;
    stack.push(id);
    return () => void stack.splice(stack.indexOf(id), 1);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && stack.at(-1) === self.current && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={label}>
      <button aria-label="Schließen" tabIndex={-1} onClick={() => !busy && onClose()} className="absolute inset-0 bg-fg/30 backdrop-blur-[2px]" />
      <div
        className={cx(
          "relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-box bg-surface p-6 shadow-2xl ring-1 ring-line-strong",
          wide ? "max-w-2xl" : "max-w-md",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      <button type="button" aria-label="Schließen" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-control text-fg-subtle hover:bg-surface-3 hover:text-fg">
        <Icon name="x" className="size-4" />
      </button>
    </div>
  );
}

