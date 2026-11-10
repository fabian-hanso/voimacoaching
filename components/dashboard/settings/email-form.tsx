"use client";

import { useMe } from "@/components/dashboard/shell";
import { Button, Field, Input } from "@/components/ui";
import { authErrorMessage } from "@/lib/client/errors";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useState } from "react";
import { AuthLike, Feedback, Msg } from "./settings-section";

export function EmailForm() {
  const { me } = useMe();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = email.trim();
    if (next.toLowerCase() === me.user.email.toLowerCase()) {
      setMsg({ tone: "error", text: "Das ist bereits deine E-Mail-Adresse." });
      return;
    }
    setPending(true);
    setMsg(null);
    try {
      const { error } = await supabaseBrowser().auth.updateUser(
        { email: next },
        {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard/einstellungen`,
        },
      );
      if (error) throw error;
    } catch (err) {
      setMsg({ tone: "error", text: authErrorMessage(err as AuthLike) });
      return;
    } finally {
      setPending(false);
    }
    setEmail("");
    setMsg({
      tone: "success",
      text: (
        <>
          Bestätigungslink verschickt. Bitte bestätige die Änderung per E-Mail
          (je nach Einstellung an <strong>{next}</strong> und{" "}
          <strong>{me.user.email}</strong>). Bis dahin bleibt deine bisherige
          Adresse aktiv.
        </>
      ),
    });
  }

  return (
    <form onSubmit={submit}>
      <p className="text-sm text-fg-muted">
        Aktuell: <span className="font-medium text-fg">{me.user.email}</span>
      </p>
      <div className="mt-4 max-w-sm">
        <Field label="Neue E-Mail-Adresse">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
      </div>
      <Feedback msg={msg} />
      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={!email.trim() || pending}>
          {pending ? "Wird gesendet …" : "E-Mail ändern"}
        </Button>
      </div>
    </form>
  );
}
