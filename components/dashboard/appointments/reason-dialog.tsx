"use client";

import { Modal } from "@/components/dashboard/modal";
import { Alert, Button, Field, Textarea } from "@/components/ui";
import { errorMessage } from "@/lib/client/errors";
import { useState, type ReactNode } from "react";

/** Rückfrage mit optionaler Nachricht (Ablehnen / Absagen). */
export function ReasonDialog({
  title,
  description,
  confirmLabel,
  placeholder,
  onSubmit,
  onClose,
}: {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  placeholder: string;
  onSubmit: (message: string) => Promise<void>;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal label={title} onClose={onClose} busy={pending}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          try {
            await onSubmit(message.trim());
          } catch (err) {
            setError(errorMessage(err));
            setPending(false);
          }
        }}
      >
        <h2 className="text-lg font-bold text-fg">{title}</h2>
        <div className="text-sm text-fg-muted">{description}</div>
        {error && <Alert>{error}</Alert>}
        <Field label="Nachricht (optional)">
          <Textarea
            rows={3}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={pending}
          >
            Zurück
          </Button>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Wird gesendet …" : confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
