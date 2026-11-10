"use client";

import { createClient } from "@supabase/supabase-js";
import { hardNavigate } from "@/lib/client/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/client/api";
import { toSquareAvatar } from "@/lib/client/image";
import { authErrorMessage, errorMessage } from "@/lib/client/errors";

type AuthLike = Parameters<typeof authErrorMessage>[0];
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Alert, Avatar, Button, Card, cx, Field, Input } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StudioLogo } from "@/components/studio-logo";
import { useMe } from "../shell";

type Msg = { tone: "success" | "error"; text: ReactNode } | null;

export function SettingsPage() {
  const { me } = useMe();
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"
      >
        <Icon name="chevronLeft" className="size-4" /> Zurück zum Dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">Einstellungen</h1>
      <p className="mt-2 text-fg-muted">Verwalte dein Profil, deine Anmeldedaten und dein Konto.</p>

      <div className="mt-6 divide-y divide-line">
        <Section id="profil" title="Profil" description="Foto und Name sind für deinen Coach bzw. deine Kunden sichtbar.">
          <ProfileForm />
        </Section>
        <Section id="email" title="E-Mail-Adresse" description="Damit meldest du dich an. Eine Änderung musst du per Link bestätigen.">
          <EmailForm />
        </Section>
        <Section id="passwort" title="Passwort" description="Zur Sicherheit fragen wir zuerst dein aktuelles Passwort ab.">
          <PasswordForm />
        </Section>
        {me.user.role === "client" && (
          <Section id="coach" title="Coach" description="Mit wem du trainierst. Pläne und Chat hängen an dieser Verbindung.">
            <CoachSection />
          </Section>
        )}
        {me.user.role === "trainer" && (
          <Section id="studio" title="Studio" description="Als Teil eines Studios kann dich bei Ausfall ein Kollege vertreten.">
            <TrainerStudioSection />
          </Section>
        )}
        <Section id="sitzungen" title="Sitzungen" description="Z. B. wenn du dich auf einem fremden Gerät nicht abgemeldet hast.">
          <SessionsSection />
        </Section>
        <Section id="konto" title="Konto löschen" description="Endgültig und nicht rückgängig zu machen." danger>
          <DeleteSection />
        </Section>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  danger,
  children,
}: {
  id: string;
  title: string;
  description: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="grid scroll-mt-24 gap-x-8 gap-y-6 py-10 md:grid-cols-3">
      <div>
        <h2 className={cx("text-base font-semibold", danger ? "text-danger" : "text-fg")}>
          {title}
        </h2>
        <p className="mt-1 text-sm text-fg-muted">{description}</p>
      </div>
      <Card className={cx("md:col-span-2", danger && "ring-danger/25")}>{children}</Card>
    </section>
  );
}

function Feedback({ msg }: { msg: Msg }) {
  return msg ? (
    <div className="mt-4">
      <Alert tone={msg.tone}>{msg.text}</Alert>
    </div>
  ) : null;
}

/* ------------------------------------------------------------------ */
/* Profil                                                              */
/* ------------------------------------------------------------------ */

function ProfileForm() {
  const { me, reload } = useMe();
  const [name, setName] = useState(me.user.name);
  const [phone, setPhone] = useState(me.user.phone ?? "");
  // undefined = unverändert, null = entfernen, Blob = neues Bild
  const [image, setImage] = useState<Blob | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(me.user.avatarUrl);
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview?.startsWith("blob:") && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    try {
      const blob = await toSquareAvatar(file);
      setImage(blob);
      setPreview(URL.createObjectURL(blob));
    } catch (err) {
      setMsg({ tone: "error", text: errorMessage(err, "Bild konnte nicht geladen werden.") });
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      if (image instanceof Blob) {
        const form = new FormData();
        form.append("file", image, image.type === "image/webp" ? "avatar.webp" : "avatar.jpg");
        await api("/me/avatar", { method: "POST", body: form, timeoutMs: 60_000 });
      } else if (image === null) {
        await api("/me/avatar", { method: "DELETE" });
      }
      const patch: { name?: string; phone?: string | null } = {};
      if (name.trim() && name.trim() !== me.user.name) patch.name = name.trim();
      if (phone.trim() !== (me.user.phone ?? "")) patch.phone = phone.trim() || null;
      if (Object.keys(patch).length) await api("/me", { method: "PATCH", body: patch });
      setImage(undefined);
      setMsg({ tone: "success", text: "Profil gespeichert." });
      reload();
    } catch (err) {
      setMsg({ tone: "error", text: errorMessage(err, "Speichern fehlgeschlagen.") });
    } finally {
      setPending(false);
    }
  }

  const dirty = image !== undefined || (name.trim() !== "" && name.trim() !== me.user.name) || phone.trim() !== (me.user.phone ?? "");

  return (
    <form onSubmit={save}>
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="group relative rounded-full focus:ring-2 focus:ring-brand-ink focus:ring-offset-2 focus:ring-offset-bg focus:outline-none"
          aria-label="Foto auswählen"
        >
          <Avatar name={name || me.user.name} src={preview} size="3xl" />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-fg/30 text-fg opacity-0 transition group-hover:opacity-100">
            <Icon name="camera" className="size-6" />
          </span>
        </button>
        <div className="text-center sm:text-left">
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
              <Icon name="camera" className="size-4" /> {preview ? "Foto ändern" : "Foto hochladen"}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  setImage(null);
                  setPreview(null);
                }}
              >
                Entfernen
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-fg-muted">JPEG, PNG oder WebP · wird quadratisch zugeschnitten.</p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required autoComplete="name" />
        </Field>
        <Field
          label="Telefon (optional)"
          hint={me.user.role === "client" ? "Sehen nur dein Trainer und dein Studio – z. B. für kurzfristige Terminänderungen." : "Sehen nur Personen, mit denen du zusammenarbeitest."}
        >
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} autoComplete="tel" placeholder="z. B. +49 170 1234567" />
        </Field>
      </div>
      <Feedback msg={msg} />
      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? "Speichern …" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* E-Mail                                                              */
/* ------------------------------------------------------------------ */

function EmailForm() {
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
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard/einstellungen` },
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
          Bestätigungslink verschickt. Bitte bestätige die Änderung per E-Mail (je nach Einstellung an <strong>{next}</strong> und{" "}
          <strong>{me.user.email}</strong>). Bis dahin bleibt deine bisherige Adresse aktiv.
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
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
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

/* ------------------------------------------------------------------ */
/* Passwort                                                            */
/* ------------------------------------------------------------------ */

/** Prüft das aktuelle Passwort mit einem separaten Client, ohne die laufende Sitzung zu verändern. */
async function verifyCurrentPassword(email: string, password: string) {
  const temp = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { error } = await temp.auth.signInWithPassword({ email, password });
  if (!error) {
    await temp.auth.signOut({ scope: "local" }).catch(() => {}); // Prüf-Sitzung sofort wieder beenden
    return true;
  }
  if (error.code === "invalid_credentials") return false;
  throw error; // z. B. keine Verbindung oder Rate-Limit → eigene Meldung
}

function PasswordForm() {
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
      setMsg({ tone: "error", text: "Die neuen Passwörter stimmen nicht überein." });
      return;
    }
    setPending(true);
    setMsg(null);
    try {
      if (!(await verifyCurrentPassword(me.user.email, current))) {
        setMsg({ tone: "error", text: "Das aktuelle Passwort ist falsch." });
        return;
      }
      const { error } = await supabaseBrowser().auth.updateUser({ password: next });
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
          <Input name="current" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="Neues Passwort" hint="Mindestens 8 Zeichen">
          <Input name="next" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Neues Passwort wiederholen">
          <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      </div>
      <Feedback msg={msg} />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/passwort-vergessen" className="text-sm font-medium text-brand-ink hover:text-brand-ink/80">
          Aktuelles Passwort vergessen?
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Wird geändert …" : "Passwort ändern"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Coach (nur Kunden)                                                  */
/* ------------------------------------------------------------------ */

function CoachSection() {
  const { me, reload } = useMe();
  const [confirm, setConfirm] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<Msg>(null);

  if (!me.trainer) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          try {
            await api("/me/trainer", { body: { inviteCode: code } });
            setCode("");
            reload();
          } catch (err) {
            setMsg({ tone: "error", text: errorMessage(err) });
          }
        }}
      >
        <p className="text-sm text-fg-muted">Du bist aktuell mit keinem Coach verbunden.</p>
        <div className="mt-4 flex max-w-sm gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
            placeholder="Einladungscode"
            aria-label="Einladungscode"
            className="font-mono tracking-widest uppercase"
            required
          />
          <Button type="submit" className="shrink-0">
            Verbinden
          </Button>
        </div>
        <Feedback msg={msg} />
      </form>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={me.trainer.name} src={me.trainer.avatarUrl} size="2xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-fg">{me.trainer.name}</p>
          <p className="truncate text-sm text-fg-muted">{me.trainer.email}</p>
        </div>
        <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
          Verbindung trennen
        </Button>
      </div>
      {confirm && (
        <ConfirmDialog
          title={`Verbindung zu ${me.trainer.name} trennen?`}
          description={
            <ul className="list-disc space-y-1 pl-5">
              <li>Die Pläne von {me.trainer.name} werden dir nicht mehr angezeigt.</li>
              <li>Ihr könnt euch keine Nachrichten mehr schreiben.</li>
              <li>{me.trainer.name} sieht deinen Fortschritt nicht mehr.</li>
              <li>Deine eigenen Workouts und Messwerte bleiben erhalten.</li>
              <li>{me.trainer.name} wird darüber informiert.</li>
            </ul>
          }
          confirmWord="trennen"
          confirmLabel="Verbindung trennen"
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            await api("/me/trainer", { method: "DELETE" });
            setConfirm(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sitzungen                                                           */
/* ------------------------------------------------------------------ */

function SessionsSection() {
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  return (
    <>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="max-w-md text-sm text-fg-muted">
        Meldet dich überall ab: im Browser, in der App und auf allen anderen Geräten. Danach musst du dich neu anmelden.
      </p>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setMsg(null);
          try {
            const { error } = await supabaseBrowser().auth.signOut({ scope: "global" });
            if (error) throw error;
            hardNavigate("/login");
          } catch (err) {
            setMsg({ tone: "error", text: authErrorMessage(err as AuthLike) });
            setPending(false);
          }
        }}
      >
        <Icon name="logout" className="size-4" /> {pending ? "Wird abgemeldet …" : "Überall abmelden"}
      </Button>
    </div>
    <Feedback msg={msg} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Konto löschen                                                       */
/* ------------------------------------------------------------------ */

function DeleteSection() {
  const { me } = useMe();
  const [confirm, setConfirm] = useState(false);
  const isTrainer = me.user.role === "trainer";

  return (
    <div>
      <p className="text-sm text-fg-muted">
        {me.user.role === "studio"
          ? "Löscht dein Konto und löst dein Studio auf. Deine Trainer und deren Kunden bleiben bestehen und arbeiten eigenständig weiter – die Trainer bekommen einen Hinweis."
          : isTrainer
            ? "Löscht dein Konto mit allen Plänen, Einladungen und Nachrichten. Deine Kunden behalten ihre Konten und Trainingsdaten, verlieren aber die Verbindung zu dir – sie bekommen einen Hinweis."
            : `Löscht dein Konto mit allen Workouts, Messwerten, Nachrichten und deinem Profilbild.${me.trainer ? ` ${me.trainer.name} bekommt einen Hinweis, dass du dein Konto gelöscht hast.` : ""}`}
      </p>
      <div className="mt-6 flex justify-end">
        <Button className="bg-danger text-danger-fg hover:bg-danger/90" onClick={() => setConfirm(true)}>
          Konto löschen
        </Button>
      </div>
      {confirm && (
        <ConfirmDialog
          title="Konto endgültig löschen?"
          description={
            <p>
              Alle Daten von <strong>{me.user.email}</strong> werden sofort und unwiderruflich gelöscht. Das kann nicht rückgängig gemacht
              werden.
            </p>
          }
          confirmLabel="Konto endgültig löschen"
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            await api("/me", { method: "DELETE" });
            await supabaseBrowser()
              .auth.signOut({ scope: "local" })
              .catch(() => {});
            hardNavigate("/");
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Studio (nur Trainer)                                                */
/* ------------------------------------------------------------------ */

function TrainerStudioSection() {
  const { me, reload } = useMe();
  // Vorausgefüllt, wenn ein angemeldeter Trainer einen Studio-Link geöffnet hat (?studio=…)
  const [code, setCode] = useState(() =>
    typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("studio") ?? "").toUpperCase(),
  );
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, setPending] = useState(false);

  if (me.studio) {
    return (
      <div className="flex items-center gap-4">
        <StudioLogo name={me.studio.name} logoUrl={me.studio.logoUrl} size="lg" />
        <div className="min-w-0">
          <p className="font-semibold text-fg">{me.studio.name}</p>
          <p className="text-sm text-fg-muted">
            Du gehörst zu diesem Studio. Das Studio kann deine Kunden bei Ausfall an Kollegen übergeben.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setMsg(null);
        try {
          await api("/me/studio", { body: { code } });
          setCode("");
          reload();
        } catch (err) {
          setMsg({ tone: "error", text: errorMessage(err) });
        } finally {
          setPending(false);
        }
      }}
    >
      <p className="text-sm text-fg-muted">
        Du arbeitest eigenständig. Hat dich ein Studio eingeladen, gib hier den Code ein – deine Kunden kommen mit ins Studio.
      </p>
      <div className="mt-4 flex max-w-sm gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
          placeholder="Studio-Code"
          aria-label="Studio-Code"
          className="font-mono tracking-widest uppercase"
          required
        />
        <Button type="submit" className="shrink-0" disabled={pending}>
          Beitreten
        </Button>
      </div>
      <Feedback msg={msg} />
    </form>
  );
}
