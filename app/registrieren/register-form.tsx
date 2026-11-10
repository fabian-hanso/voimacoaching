"use client";

import { useSearchParams } from "next/navigation";
import { hardNavigate } from "@/lib/client/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { authErrorMessage } from "@/lib/client/errors";
import { Alert, Button, cx, Field, Input } from "@/components/ui";
import type { Role } from "@/lib/types";

const ROLES: [Role, string][] = [
  ["trainer", "Trainer"],
  ["client", "Kunde"],
  ["studio", "Studio"],
];

function initialRole(params: URLSearchParams): Role {
  const r = params.get("rolle");
  if (r === "kunde" || params.get("code") || params.get("mitglied")) return "client";
  if (r === "studio") return "studio";
  return "trainer";
}

export function RegisterForm() {
  const params = useSearchParams();
  const [role, setRole] = useState<Role>(() => initialRole(params));
  // Kunden: Einladungscode eines Trainers ODER Mitglieds-Code eines Studios (QR) · Trainer: Studio-Code – alles optional
  const [code, setCode] = useState(() => (params.get("code") ?? params.get("mitglied") ?? params.get("studio") ?? "").toUpperCase());
  const [check, setCheck] = useState<{ key: string; name: string | null; kind: "coach" | "member" | "studio" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const usesCode = role === "client" || role === "trainer";
  const checkKey = `${role}:${code}`;

  // Code live prüfen und Trainer- bzw. Studionamen anzeigen (Kunden: erst Einladung eines Coaches, dann Mitglieds-Code)
  useEffect(() => {
    if (!usesCode || code.length < 6) return;
    let cancelled = false;
    type Check = { valid: boolean; trainerName?: string | null; studioName?: string | null };
    const enc = encodeURIComponent(code);
    const run = async (): Promise<{ name: string | null; kind: "coach" | "member" | "studio" }> => {
      if (role === "trainer") {
        const r = await api<Check>(`/studio-invitations/${enc}`);
        return { name: r.valid ? (r.studioName ?? null) : null, kind: "studio" };
      }
      const coach = await api<Check>(`/invitations/${enc}`);
      if (coach.valid) return { name: coach.trainerName ?? null, kind: "coach" };
      const member = await api<Check>(`/studio-join/${enc}`);
      return { name: member.valid ? (member.studioName ?? null) : null, kind: "member" };
    };
    run()
      .then((r) => !cancelled && setCheck({ key: checkKey, ...r }))
      .catch(() => !cancelled && setCheck({ key: checkKey, name: null, kind: role === "trainer" ? "studio" : "coach" }));
    return () => {
      cancelled = true;
    };
  }, [code, role, usesCode, checkKey]);

  const checked = usesCode && code.length >= 6 && check?.key === checkKey;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (usesCode && code && checked && !check?.name) {
      setError("Der Code ist ungültig oder abgelaufen. Lass das Feld leer, um ihn später einzugeben.");
      return;
    }
    setPending(true);
    setError(null);
    const email = String(form.get("email")).trim();
    // Profil (Name, Rolle), Studio und Einladungen legt die Datenbank per Trigger aus den Metadaten an.
    let data: Awaited<ReturnType<ReturnType<typeof supabaseBrowser>["auth"]["signUp"]>>["data"];
    try {
      const res = await supabaseBrowser().auth.signUp({
        email,
        password: String(form.get("password")),
        options: {
          data: {
            name: String(form.get("name")).trim(),
            role,
            // Ist noch nicht klar, welche Art Code es ist, beide versuchen – ungültige ignoriert die Datenbank
            invite_code: role === "client" && code && (!checked || check?.kind === "coach") ? code : undefined,
            studio_join_code: role === "client" && code && (!checked || check?.kind === "member") ? code : undefined,
            studio_code: role === "trainer" && code ? code : undefined,
            studio_name: role === "studio" ? String(form.get("studioName")).trim() : undefined,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (res.error) throw res.error;
      data = res.data;
    } catch (err) {
      setError(authErrorMessage(err as Parameters<typeof authErrorMessage>[0]));
      setPending(false);
      return;
    }
    if (data.session) {
      hardNavigate("/dashboard"); // vollständiger Seitenwechsel – kein Zustand eines früheren Kontos
    } else {
      setConfirmEmail(email); // E-Mail-Bestätigung aktiv
    }
  }

  if (confirmEmail) {
    return (
      <Alert tone="success">
        Fast geschafft! Wir haben dir eine E-Mail an <strong>{confirmEmail}</strong> geschickt. Klicke auf den Link darin, um dein
        Konto zu bestätigen.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div role="radiogroup" aria-label="Ich bin …" className="grid grid-cols-3 gap-1 rounded-control bg-surface-3 p-1">
        {ROLES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={role === value}
            onClick={() => setRole(value)}
            className={cx(
              "rounded-inner py-2 text-sm font-semibold transition",
              role === value ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-fg-muted">
        {
          {
            trainer: "Du betreust Kunden – allein oder als Teil eines Studios.",
            client: "Du trainierst mit einem Coach. Für dich ist Voima Coach kostenlos.",
            studio: "Du führst ein Studio mit mehreren Trainern und verwaltest Team und Kunden.",
          }[role]
        }
      </p>

      {error && <Alert>{error}</Alert>}

      {role === "studio" && (
        <Field label="Name des Studios">
          <Input name="studioName" autoComplete="organization" maxLength={100} required placeholder="z. B. Iron Gym" />
        </Field>
      )}
      <Field label={role === "studio" ? "Dein Name" : "Name"}>
        <Input name="name" autoComplete="name" required />
      </Field>
      <Field label="E-Mail">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Passwort" hint="Mindestens 8 Zeichen">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>

      {usesCode && (
        <Field
          label={role === "client" ? "Einladungs- oder Studio-Code (optional)" : "Studio-Code (optional)"}
          hint={
            role === "client"
              ? "Von deinem Trainer oder deinem Studio (z. B. per QR-Code an der Rezeption). Du kannst ihn auch später eingeben."
              : "Nur wenn dich ein Studio eingeladen hat. Du kannst später in den Einstellungen beitreten."
          }
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
            placeholder="z. B. K7MX2QPA"
            className="font-mono tracking-widest uppercase"
          />
        </Field>
      )}
      {checked &&
        (check?.name ? (
          <Alert tone="success">
            {check.kind === "coach"
              ? `Du trainierst mit ${check.name}.`
              : check.kind === "member"
                ? `Du wirst Mitglied bei ${check.name} – mit Kursen und 1:1-Terminen bei allen Trainern.`
                : `Du trittst dem Studio ${check.name} bei.`}
          </Alert>
        ) : (
          <Alert>Dieser Code ist ungültig oder abgelaufen.</Alert>
        ))}

      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? "Konto wird erstellt …"
          : { trainer: "Trainer-Konto erstellen", client: "Kunden-Konto erstellen", studio: "Studio anlegen" }[role]}
      </Button>
    </form>
  );
}
