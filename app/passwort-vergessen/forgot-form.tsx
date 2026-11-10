"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { authErrorMessage } from "@/lib/client/errors";
import { Alert, Button, Field, Input } from "@/components/ui";

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    try {
      const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/passwort-neu`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err as Parameters<typeof authErrorMessage>[0]));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return <Alert tone="success">Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link geschickt.</Alert>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <Field label="E-Mail">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Wird gesendet …" : "Link zum Zurücksetzen senden"}
      </Button>
    </form>
  );
}
