"use client";

import { useMe } from "@/components/dashboard/shell";
import { Button, Field, Input } from "@/components/ui";
import { authErrorMessage } from "@/lib/client/errors";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useState } from "react";
import { AuthLike, Feedback, Msg } from "./settings-section";

/** Prüft das aktuelle Passwort mit einem separaten Client, ohne die laufende Sitzung zu verändern. */
async function verifyCurrentPassword(email: string, password: string) {
  const temp = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const { error } = await temp.auth.signInWithPassword({ email, password });
  if (!error) {
    await temp.auth.signOut({ scope: "local" }).catch(() => {}); // Prüf-Sitzung sofort wieder beenden
    return true;
  }
  if (error.code === "invalid_credentials") return false;
  throw error; // z. B. keine Verbindung oder Rate-Limit → eigene Meldung
}

export function PasswordForm() {
  const { me } = useMe();
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const current = String(form.get("current"));
    const next = String(form.get("next"));
    if (next !== form.get("confirm")) {
      setMsg({
        tone: "error",
        text: "Die neuen Passwörter stimmen nicht überein.",
      });
      return;
    }
    setPending(true);
    setMsg(null);
    try {
      if (!(await verifyCurrentPassword(me.user.email, current))) {
        setMsg({ tone: "error", text: "Das aktuelle Passwort ist falsch." });
        return;
      }
      const { error } = await supabaseBrowser().auth.updateUser({
        password: next,
      });
      if (error) throw error;
      formEl.reset();
      setMsg({ tone: "success", text: "Passwort geändert." });
    } catch (err) {
      setMsg({ tone: "error", text: authErrorMessage(err as AuthLike) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="grid max-w-sm gap-4">
        <Field label="Aktuelles Passwort">
          <Input
            name="current"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label="Neues Passwort" hint="Mindestens 8 Zeichen">
          <Input
            name="next"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Field label="Neues Passwort wiederholen">
          <Input
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
      </div>
      <Feedback msg={msg} />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/passwort-vergessen"
          className="text-sm font-medium text-brand-ink hover:text-brand-ink/80"
        >
          Aktuelles Passwort vergessen?
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Wird geändert …" : "Passwort ändern"}
        </Button>
      </div>
    </form>
  );
}
