"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Alert, Button, Input } from "./ui";
import { Icon } from "./icons";

/**
 * Modal für gefährliche Aktionen: Bestätigen erst möglich, wenn das Bestätigungswort
 * (Standard: „löschen“) eingetippt wurde. Nur rendern, solange es offen ist –
 * so wird die Eingabe beim Schließen automatisch zurückgesetzt.
 */
export function ConfirmDialog({
  title,
  description,
  confirmWord = "löschen",
  confirmLabel = "Endgültig löschen",
  onConfirm,
  onClose,
}: {
  title: string;
  description: ReactNode;
  confirmWord?: string;
  confirmLabel?: string;
  /** Darf werfen – die Fehlermeldung wird im Modal angezeigt. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const inputId = useId();
  const matches = value.trim().toLocaleLowerCase("de") === confirmWord.toLocaleLowerCase("de");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!matches || pending) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktion fehlgeschlagen.");
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        aria-label="Abbrechen"
        tabIndex={-1}
        onClick={() => !pending && onClose()}
        className="absolute inset-0 bg-fg/30 backdrop-blur-[2px]"
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl ring-1 ring-line-strong"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger/15 text-danger">
            <Icon name="alert" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-fg">
              {title}
            </h2>
            <div className="mt-2 text-sm text-fg-muted">{description}</div>
          </div>
        </div>

        <label htmlFor={inputId} className="mt-6 block text-sm text-fg">
          Gib zur Bestätigung <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono font-semibold text-danger">{confirmWord}</span> ein:
        </label>
        <Input
          id={inputId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={confirmWord}
          className="mt-2"
        />

        {error && (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!matches || pending} className="bg-danger text-danger-fg hover:bg-danger/90">
            {pending ? "Wird ausgeführt …" : confirmLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
