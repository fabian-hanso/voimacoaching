"use client";

import { Alert, Button, Field } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { authErrorMessage } from "@/lib/client/errors";
import { hardNavigate } from "@/lib/client/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useState } from "react";

export function NewPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      // Ohne gültige Sitzung (Link abgelaufen / in anderem Browser geöffnet) klappt das Setzen nicht
      const { data } = await supabaseBrowser().auth.getSession();
      if (!data.session) throw { code: "otp_expired" };
      const { error } = await supabaseBrowser().auth.updateUser({
        password: String(form.get("password")),
      });
      if (error) throw error;
    } catch (err) {
      setError(authErrorMessage(err as Parameters<typeof authErrorMessage>[0]));
      setPending(false);
      return;
    }
    hardNavigate("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <Field label="Neues Passwort" hint="Mindestens 8 Zeichen">
        <PasswordInput
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Field label="Passwort wiederholen">
        <PasswordInput
          name="confirm"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Speichern …" : "Passwort speichern"}
      </Button>
    </form>
  );
}
