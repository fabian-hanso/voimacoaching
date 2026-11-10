"use client";

import Link from "next/link";
import { hardNavigate } from "@/lib/client/navigation";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { authErrorMessage } from "@/lib/client/errors";

type AuthLike = Parameters<typeof authErrorMessage>[0];
import { Alert, Button, Field, Input } from "@/components/ui";

const urlErrors: Record<string, string> = {
  link: "Der Link ist ungültig oder abgelaufen. Bitte erneut versuchen.",
  sitzung: "Deine Sitzung ist abgelaufen. Bitte melde dich neu an.",
};

export function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(urlErrors[params.get("fehler") ?? ""] ?? null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const { error } = await supabaseBrowser().auth.signInWithPassword({
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
      });
      if (error) throw error;
    } catch (err) {
      setError(authErrorMessage(err as AuthLike));
      setPending(false);
      return;
    }
    hardNavigate("/dashboard"); // vollständiger Seitenwechsel – kein Zustand eines früheren Kontos
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <Field label="E-Mail">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Passwort">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="text-right text-sm">
        <Link href="/passwort-vergessen" className="font-medium text-brand-ink hover:text-brand-ink/80">
          Passwort vergessen?
        </Link>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Anmelden …" : "Anmelden"}
      </Button>
    </form>
  );
}
