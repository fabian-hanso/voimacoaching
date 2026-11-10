"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, ApiClientError, fmtDate, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { toLogo, toSquareAvatar } from "@/lib/client/image";
import { Alert, Avatar, Badge, Button, Card, cx, EmptyState, Field, Input, LoadError, Select, Spinner, Textarea, type BadgeTone } from "@/components/ui";
import { Icon, IconTile } from "@/components/icons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StudioLogo } from "@/components/studio-logo";
import type { Appointment, OpeningHoursDay, StaffCategory, StudioClient, StudioOverview, StudioProfile, StudioStaffMember, StudioTrainer } from "@/lib/types";
import { WEEKDAYS } from "./studio/studio-page";
import { WishLink } from "./feature-wish";
import { CalendarView, openRequests } from "./appointments";
import { StudioCourses } from "./courses";
import { ExerciseCatalog } from "./exercise-guide";
import { EXERCISE_CATALOG } from "@/lib/exercises";

type Tab = "team" | "clients" | "appointments" | "courses" | "exercises" | "invitations" | "profile";

/**
 * Dashboard für Studio-Inhaber: Trainer verwalten, Kunden zuweisen/übertragen,
 * Trainer einladen, Studio-Profil (Name & Logo). Trainingsdaten und Chats sieht das Studio NICHT.
 */
export function StudioView() {
  const overview = useApi<StudioOverview>("/studio");
  const appointments = useApi<{ appointments: Appointment[] }>("/appointments");
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" && window.location.hash === "#studio-profil" ? "profile" : "team",
  );

  if (overview.loading) return <Spinner />;
  if (!overview.data) return <LoadError message={overview.error?.message ?? "Studio konnte nicht geladen werden."} onRetry={overview.reload} />;
  const data = overview.data;
  // Nur Kunden, deren Coach weggefallen ist – Mitglieder (per Code) brauchen keinen festen Trainer
  const unassigned = data.clients.filter((c) => !c.trainerId && !c.studioMember).length;

  const tabs: [Tab, string, number | null][] = [
    ["team", "Team", data.trainers.length],
    ["clients", "Kunden", data.clients.length],
    ["appointments", "Termine", openRequests(appointments.data?.appointments, now) || null],
    ["courses", "Kurse", null],
    ["exercises", "Übungen", null],
    ["invitations", "Einladungen", null],
    ["profile", "Studio-Profil", null],
  ];

  return (
    <div className="space-y-8">
      {/* Kopf mit Logo & Kennzahlen */}
      <div className="flex flex-wrap items-center gap-4">
        <StudioLogo name={data.studio.name} logoUrl={data.studio.logoUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-fg-subtle">Dein Studio</p>
          <p className="truncate text-xl font-bold text-fg">{data.studio.name}</p>
        </div>
        <div className="flex gap-6 text-right">
          <Kpi label="Trainer" value={`${data.trainers.length}/${data.studio.maxTrainers}`} />
          <Kpi label="Kunden" value={String(data.clients.length)} />
          <Kpi label="Aktiv (7 Tage)" value={String(data.clients.filter((c) => c.workoutsLast7Days > 0).length)} />
        </div>
      </div>

      {unassigned > 0 && (
        <button
          onClick={() => setTab("clients")}
          className="flex w-full items-center gap-3 rounded-box bg-accent/10 p-4 text-left ring-1 ring-accent/30 transition hover:bg-accent/15"
        >
          <IconTile name="alert" tone="accent" />
          <span className="flex-1 text-sm">
            <span className="font-semibold text-fg">
              {unassigned} {unassigned === 1 ? "Kunde ist" : "Kunden sind"} ohne Trainer.
            </span>{" "}
            <span className="text-fg-muted">Weise sie einem Trainer zu, damit sie weiter betreut werden.</span>
          </span>
          <Icon name="arrow" className="size-4 text-fg-muted" />
        </button>
      )}

      <nav className="tab-bar flex gap-6 overflow-x-auto overflow-y-hidden">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cx(
              "flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition",
              tab === key ? "border-fg text-fg" : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {label}
            {count != null && <span className="rounded-full bg-surface-3 px-1.5 text-xs text-fg-muted">{count}</span>}
          </button>
        ))}
      </nav>

      {tab === "team" && <TeamTab data={data} reload={overview.reload} onInvite={() => setTab("invitations")} />}
      {tab === "clients" && <ClientsTab data={data} reload={overview.reload} />}
      {tab === "appointments" && <CalendarView role="studio" onChanged={appointments.reload} />}
      {tab === "courses" && <StudioCourses trainers={data.trainers} />}
      {tab === "exercises" && (
        <Card>
          <h2 className="font-semibold text-fg">Übungskatalog</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {EXERCISE_CATALOG.length} Übungen mit Anleitung. Nehmen eure Trainer sie in einen Plan auf, sehen die Kunden die Erklärung direkt an der Übung.
          </p>
          <div className="mt-5">
            <ExerciseCatalog />
          </div>
        </Card>
      )}
      {tab === "invitations" && <InvitationsTab data={data} reload={overview.reload} />}
      {tab === "profile" && <ProfileTab data={data} reload={overview.reload} />}

      <div className="flex justify-center pt-2">
        <WishLink context="Studio-Dashboard" />
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-extrabold text-fg tabular-nums">{value}</p>
      <p className="text-xs text-fg-subtle">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

function TeamTab({ data, reload, onInvite }: { data: StudioOverview; reload: () => void; onInvite: () => void }) {
  const [transferFrom, setTransferFrom] = useState<StudioTrainer | null>(null);
  const [removing, setRemoving] = useState<StudioTrainer | null>(null);

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle
          title="Trainer"
          subtitle={`${data.trainers.length}/${data.studio.maxTrainers} Plätze · mit eigenem Konto – Foto & Name pflegen Trainer selbst in ihren Einstellungen`}
        />
      {!data.trainers.length ? (
        <EmptyState
          title="Noch keine Trainer"
          text="Lade deine Trainer per Link oder Code in dein Studio ein."
          action={<Button onClick={onInvite}>Trainer einladen</Button>}
        />
      ) : (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.trainers.map((t) => (
          <Card key={t.id} className="flex flex-col">
            <div className="flex items-center gap-3">
              <Avatar name={t.name} src={t.avatarUrl} size="xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-fg">{t.name}</p>
                <p className="truncate text-xs text-fg-muted">{t.email}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-tile bg-surface-2 py-2">
                <dt className="text-[10px] text-fg-subtle">Kunden</dt>
                <dd className="text-sm font-semibold text-fg">{t.clientCount}</dd>
              </div>
              <div className="rounded-tile bg-surface-2 py-2">
                <dt className="text-[10px] text-fg-subtle">Aktiv (7 Tage)</dt>
                <dd className="text-sm font-semibold text-fg">{t.activeClients}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={data.trainers.length < 2}
                title={data.trainers.length < 2 ? "Es gibt keinen anderen Trainer im Studio." : undefined}
                onClick={() => setTransferFrom(t)}
              >
                Vertretung / Übergabe
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={t.clientCount > 0}
                title={t.clientCount > 0 ? "Übertrage zuerst alle Kunden an einen anderen Trainer." : undefined}
                onClick={() => setRemoving(t)}
              >
                Entfernen
              </Button>
            </div>
          </Card>
        ))}
      </div>
      )}
      </section>

      <StaffSection staff={data.staff} reload={reload} />

      {transferFrom && (
        <TransferAllDialog
          from={transferFrom}
          candidates={data.trainers.filter((t) => t.id !== transferFrom.id)}
          onClose={() => setTransferFrom(null)}
          onDone={() => {
            setTransferFrom(null);
            reload();
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title={`${removing.name} aus dem Studio entfernen?`}
          description={
            <p>
              {removing.name} gehört dann nicht mehr zu deinem Studio. Das Trainer-Konto bleibt bestehen, {removing.name} bekommt einen
              Hinweis.
            </p>
          }
          confirmWord="entfernen"
          confirmLabel="Trainer entfernen"
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await api(`/studio/trainers/${removing.id}`, { method: "DELETE" });
            setRemoving(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold text-fg">{title}</h3>
        {subtitle && <p className="text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Weitere Mitarbeitende (ohne Konto)                                  */
/* ------------------------------------------------------------------ */

export const STAFF_CATEGORIES: { value: StaffCategory; label: string }[] = [
  { value: "management", label: "Leitung" },
  { value: "service", label: "Service & Empfang" },
  { value: "other", label: "Weitere" },
];
const categoryLabel = (c: StaffCategory) => STAFF_CATEGORIES.find((x) => x.value === c)?.label ?? c;

function StaffSection({ staff, reload }: { staff: StudioStaffMember[]; reload: () => void }) {
  const [editing, setEditing] = useState<StudioStaffMember | "new" | null>(null);
  const [deleting, setDeleting] = useState<StudioStaffMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const photoFor = useRef<string | null>(null);

  async function uploadPhoto(file: File) {
    const id = photoFor.current;
    if (!id) return;
    setError(null);
    try {
      const blob = await toSquareAvatar(file);
      const form = new FormData();
      form.append("file", blob, blob.type === "image/webp" ? "foto.webp" : "foto.jpg");
      await api(`/studio/staff/${id}/photo`, { method: "POST", body: form, timeoutMs: 60_000 });
      reload();
    } catch (err) {
      setError(errorMessage(err, "Foto konnte nicht gespeichert werden."));
    }
  }

  return (
    <section>
      <SectionTitle
        title="Weitere Mitarbeitende"
        subtitle="Leitung, Service & Empfang und Co. – ohne eigenes Konto, sichtbar auf deiner Studio-Seite."
        action={
          <Button variant="secondary" size="sm" onClick={() => setEditing("new")}>
            <Icon name="plus" className="size-3.5" /> Mitarbeitende hinzufügen
          </Button>
        }
      />
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {!staff.length ? (
        <EmptyState
          title="Noch niemand eingetragen"
          text="Trage z. B. deine Studioleitung oder das Team am Empfang ein – deine Kunden sehen dann, wer für sie da ist."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((m) => (
            <Card key={m.id} className="flex flex-col">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    photoFor.current = m.id;
                    photoInput.current?.click();
                  }}
                  aria-label={`Foto von ${m.name} ${m.photoUrl ? "ändern" : "hinzufügen"}`}
                  title="Foto ändern"
                  className="group relative shrink-0 rounded-full"
                >
                  <Avatar name={m.name} src={m.photoUrl} size="xl" />
                  <span className="absolute inset-0 grid place-items-center rounded-full bg-fg/50 text-white opacity-0 transition group-hover:opacity-100">
                    <Icon name="camera" className="size-4" />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">{m.name}</p>
                  <p className="truncate text-sm text-fg-muted">{m.position ?? categoryLabel(m.category)}</p>
                  <div className="mt-1">
                    <Badge tone={m.category === "management" ? "brand" : "neutral"}>{categoryLabel(m.category)}</Badge>
                  </div>
                </div>
              </div>
              {m.bio && <p className="mt-3 line-clamp-3 text-sm text-fg-muted">{m.bio}</p>}
              <div className="mt-4 flex gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={() => setEditing(m)}>
                  Bearbeiten
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    photoFor.current = m.id;
                    photoInput.current?.click();
                  }}
                >
                  <Icon name="camera" className="size-3.5" /> Foto
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDeleting(m)}>
                  Löschen
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <input
        ref={photoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void uploadPhoto(f);
        }}
      />

      {editing && (
        <StaffDialog
          member={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`${deleting.name} entfernen?`}
          description={<p>{deleting.name} wird von deiner Studio-Seite entfernt.</p>}
          confirmWord="löschen"
          confirmLabel="Entfernen"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api(`/studio/staff/${deleting.id}`, { method: "DELETE" });
            setDeleting(null);
            reload();
          }}
        />
      )}
    </section>
  );
}

function StaffDialog({ member, onClose, onSaved }: { member: StudioStaffMember | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: member?.name ?? "",
    category: member?.category ?? ("management" as StaffCategory),
    position: member?.position ?? "",
    bio: member?.bio ?? "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Foto: undefined = unverändert, null = entfernen, Blob = neu
  const [photo, setPhoto] = useState<Blob | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(member?.photoUrl ?? null);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview?.startsWith("blob:") && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const blob = await toSquareAvatar(file);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch (err) {
      setError(errorMessage(err, "Bild konnte nicht geladen werden."));
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const saved = member
        ? await api<StudioStaffMember>(`/studio/staff/${member.id}`, { method: "PATCH", body: f })
        : await api<StudioStaffMember>("/studio/staff", { body: f });
      if (photo instanceof Blob) {
        const form = new FormData();
        form.append("file", photo, photo.type === "image/webp" ? "foto.webp" : "foto.jpg");
        try {
          await api(`/studio/staff/${saved.id}/photo`, { method: "POST", body: form, timeoutMs: 60_000 });
        } catch (err) {
          // Person ist gespeichert – nur das Foto fehlt: Dialog schließen und Hinweis geben
          onSaved();
          window.alert(`${saved.name} wurde gespeichert, das Foto aber nicht: ${errorMessage(err)}`);
          return;
        }
      } else if (photo === null && member?.photoUrl) {
        await api(`/studio/staff/${saved.id}/photo`, { method: "DELETE" });
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Speichern fehlgeschlagen."));
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Mitarbeitende">
      <button aria-label="Abbrechen" tabIndex={-1} onClick={() => !pending && onClose()} className="absolute inset-0 bg-fg/30 backdrop-blur-[2px]" />
      <form onSubmit={save} className="relative w-full max-w-md space-y-4 rounded-box bg-surface p-6 shadow-2xl ring-1 ring-line-strong">
        <h2 className="text-lg font-semibold text-fg">{member ? `${member.name} bearbeiten` : "Mitarbeitende hinzufügen"}</h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => photoInput.current?.click()}
            aria-label="Foto wählen"
            className="group relative rounded-full focus:ring-2 focus:ring-brand-ink focus:ring-offset-2 focus:outline-none"
          >
            <Avatar name={f.name || "?"} src={preview} size="2xl" />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-fg/50 text-white opacity-0 transition group-hover:opacity-100">
              <Icon name="camera" className="size-5" />
            </span>
          </button>
          <div className="flex flex-col gap-1.5">
            <Button type="button" variant="secondary" size="sm" onClick={() => photoInput.current?.click()}>
              <Icon name="camera" className="size-3.5" /> {preview ? "Foto ändern" : "Foto wählen"}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  setPhoto(null);
                  setPreview(null);
                }}
              >
                Foto entfernen
              </Button>
            )}
            <span className="text-[11px] text-fg-subtle">JPEG, PNG oder WebP · wird quadratisch zugeschnitten</span>
          </div>
          <input
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <Field label="Name">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={100} required autoFocus />
        </Field>
        <Field label="Bereich">
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as StaffCategory })}>
            {STAFF_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Position (optional)" hint="z. B. Studioleitung, Rezeption, Ernährungsberatung">
          <Input value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} maxLength={80} />
        </Field>
        <Field label="Kurze Info (optional)">
          <Textarea
            value={f.bio}
            onChange={(e) => setF({ ...f, bio: e.target.value })}
            rows={3}
            maxLength={300}
            placeholder="z. B. „Ansprechpartnerin für Verträge und Kurse.“"
          />
        </Field>
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={pending || !f.name.trim()}>
            {pending ? "Speichern …" : member ? "Speichern" : "Hinzufügen"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** „Trainer fällt aus“: alle Kunden, Pläne und offene Einladungen an einen anderen Trainer übergeben. */
function TransferAllDialog({
  from,
  candidates,
  onClose,
  onDone,
}: {
  from: StudioTrainer;
  candidates: StudioTrainer[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [to, setTo] = useState(candidates[0]?.id ?? "");
  const target = candidates.find((c) => c.id === to);
  return (
    <ConfirmDialog
      title={`Kunden von ${from.name} übergeben`}
      description={
        <div className="space-y-3">
          <p>
            Fällt {from.name} aus, übernimmt ein anderer Trainer <strong>alle {from.clientCount} Kunden</strong>, alle Pläne und offene
            Kunden-Einladungen. Kunden und neuer Trainer bekommen einen Hinweis. Der bisherige Chat-Verlauf bleibt bei {from.name}.
          </p>
          <Field label="Übernehmender Trainer">
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.clientCount} Kunden
                </option>
              ))}
            </Select>
          </Field>
        </div>
      }
      confirmWord="übergeben"
      confirmLabel={target ? `An ${target.name} übergeben` : "Übergeben"}
      onClose={onClose}
      onConfirm={async () => {
        await api(`/studio/trainers/${from.id}/transfer`, { body: { toTrainerId: to } });
        onDone();
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Kunden                                                              */
/* ------------------------------------------------------------------ */

function clientStatus(c: StudioClient): { label: string; tone: BadgeTone } {
  if (!c.trainerId) return c.studioMember ? { label: "Mitglied", tone: "brand" } : { label: "Ohne Trainer", tone: "accent" };
  if (!c.lastWorkoutAt) return { label: "Neu", tone: "neutral" };
  return c.workoutsLast7Days > 0 ? { label: "Aktiv", tone: "success" } : { label: "Inaktiv", tone: "warning" };
}

const needsCoach = (c: StudioClient) => !c.trainerId && !c.studioMember;

function ClientsTab({ data, reload }: { data: StudioOverview; reload: () => void }) {
  const [filter, setFilter] = useState<"all" | "members" | "unassigned">(data.clients.some(needsCoach) ? "unassigned" : "all");
  const [pending, setPending] = useState<{ client: StudioClient; trainerId: string } | null>(null);
  const [removing, setRemoving] = useState<StudioClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data.clients.length) {
    return (
      <div className="space-y-6">
        <MemberCodeCard code={data.studio.joinCode} studioName={data.studio.name} onRenewed={reload} />
        <EmptyState title="Noch keine Kunden" text="Neue Mitglieder kommen über deinen Mitglieds-Code bzw. QR-Code – oder über die Einladungen deiner Trainer." />
      </div>
    );
  }

  const shown = data.clients.filter((c) => filter === "all" || (filter === "members" ? c.studioMember : needsCoach(c)));
  const unassigned = data.clients.filter(needsCoach).length;
  const members = data.clients.filter((c) => c.studioMember).length;

  async function assign(client: StudioClient, trainerId: string) {
    setError(null);
    try {
      await api(`/studio/clients/${client.id}/trainer`, { method: "PUT", body: { trainerId } });
      setPending(null);
      reload();
    } catch (err) {
      setError(errorMessage(err, "Zuweisung fehlgeschlagen."));
    }
  }

  return (
    <div className="space-y-4">
      <MemberCodeCard code={data.studio.joinCode} studioName={data.studio.name} onRenewed={reload} />
      {!data.trainers.length && <Alert tone="info">Lade Trainer ein, um Kunden einen festen Coach zuweisen zu können.</Alert>}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", `Alle (${data.clients.length})`],
            ["members", `Mitglieder (${members})`],
            ["unassigned", `Coach fehlt (${unassigned})`],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={cx(
              "rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition",
              filter === v ? "bg-brand text-brand-fg ring-brand" : "bg-surface text-fg-muted ring-line-strong hover:bg-surface-3",
            )}
          >
            {l}
          </button>
        ))}
        <p className="ml-auto text-xs text-fg-subtle">Trainingsdaten und Chats sind nur für den jeweiligen Trainer sichtbar.</p>
      </div>
      {error && <Alert>{error}</Alert>}

      {shown.length === 0 ? (
        <EmptyState
          title={filter === "members" ? "Noch keine Mitglieder" : "Allen Kunden ist ein Coach zugeordnet 🎉"}
          text={filter === "members" ? "Teile deinen Mitglieds-Code oder hänge den QR-Code an der Rezeption aus." : "Mitglieder ohne festen Coach brauchen keinen – sie buchen Kurse und 1:1-Termine direkt."}
        />
      ) : (
        <Card className="divide-y divide-line p-0">
          {shown.map((c) => {
            const st = clientStatus(c);
            return (
              <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={c.name} src={c.avatarUrl} size="lg" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-fg">
                      <span className="truncate">{c.name}</span> <Badge tone={st.tone}>{st.label}</Badge>
                    </p>
                    <p className="truncate text-xs text-fg-muted">
                      {c.email} · seit {fmtDate(c.joinedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:w-80">
                  {data.trainers.length > 0 && (
                  <Select
                    aria-label={`Trainer für ${c.name}`}
                    value={c.trainerId ?? ""}
                    onChange={(e) => e.target.value && setPending({ client: c, trainerId: e.target.value })}
                  >
                    {!c.trainerId && <option value="">{c.studioMember ? "Kein fester Coach" : "– Trainer wählen –"}</option>}
                    {data.trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                  )}
                  <button
                    type="button"
                    onClick={() => setRemoving(c)}
                    aria-label={`${c.name} aus dem Studio entfernen`}
                    title="Aus dem Studio entfernen"
                    className="grid size-9 shrink-0 place-items-center rounded-control text-fg-subtle ring-1 ring-line transition hover:bg-danger/10 hover:text-danger"
                  >
                    <Icon name="x" className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {removing && (
        <ConfirmDialog
          title={`${removing.name} aus dem Studio entfernen?`}
          description={
            <ul className="list-disc space-y-1 pl-5">
              {removing.trainerId && removing.trainerName && (
                <li>
                  Die Verbindung zu {removing.trainerName} endet, Planzuweisungen werden aufgehoben.
                </li>
              )}
              <li>Künftige Kursanmeldungen und Termine bei euren Trainern werden storniert.</li>
              <li>Workouts und Messwerte bleiben bei {removing.name}; {removing.name} bekommt einen Hinweis.</li>
              <li>Mit dem Mitglieds-Code kann {removing.name} später wieder beitreten – erneuere ihn bei Bedarf.</li>
            </ul>
          }
          confirmWord="entfernen"
          confirmLabel="Aus dem Studio entfernen"
          onConfirm={async () => {
            await api(`/studio/clients/${removing.id}`, { method: "DELETE" });
            setRemoving(null);
            reload();
          }}
          onClose={() => setRemoving(null)}
        />
      )}
      {pending && (
        <AssignDialog
          client={pending.client}
          trainer={data.trainers.find((t) => t.id === pending.trainerId)!}
          onClose={() => setPending(null)}
          onConfirm={() => assign(pending.client, pending.trainerId)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mitglieds-Code & QR                                                 */
/* ------------------------------------------------------------------ */

function MemberCodeCard({ code, studioName, onRenewed }: { code: string; studioName: string; onRenewed: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [renew, setRenew] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/registrieren?rolle=kunde&mitglied=${code}`;
    let cancelled = false;
    void import("qrcode").then((QR) =>
      QR.toDataURL(url, { width: 640, margin: 1, errorCorrectionLevel: "M", color: { dark: "#11120e", light: "#ffffff" } }).then((data) => {
        if (cancelled) return;
        setQr(data);
        setLink(url);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <Card className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="grid size-36 shrink-0 place-items-center self-center rounded-tile bg-white p-2 ring-1 ring-line">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element -- lokal erzeugter QR-Code (data:-URL)
          <img src={qr} alt={`QR-Code zum Beitritt bei ${studioName}`} className="size-full" />
        ) : (
          <span className="size-6 animate-spin rounded-full border-2 border-line border-t-brand-ink" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">Mitglieder einladen</p>
        <p className="mt-1 text-sm text-fg-muted">
          Hänge den QR-Code an der Rezeption aus oder teile den Code. Mitglieder brauchen keinen festen Coach – sie sehen eure Kurse,
          buchen 1:1-Termine bei allen Trainern und bekommen eure Benachrichtigungen.
        </p>
        <p className="mt-3 font-mono text-2xl font-bold tracking-[0.25em] text-fg">{code}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!link}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                window.prompt("Link kopieren:", link);
              }
            }}
          >
            <Icon name={copied ? "check" : "arrow"} className="size-3.5" /> {copied ? "Kopiert" : "Link kopieren"}
          </Button>
          {qr && (
            <a
              href={qr}
              download={`qr-${studioName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}
              className="inline-flex items-center gap-2 rounded-control bg-surface-3 px-2.5 py-1.5 text-xs font-semibold text-fg ring-1 ring-line-strong transition hover:bg-line-strong"
            >
              <Icon name="camera" className="size-3.5" /> QR-Code herunterladen
            </a>
          )}
          <Button size="sm" variant="ghost" onClick={() => setRenew(true)}>
            Code erneuern
          </Button>
        </div>
      </div>
      {renew && (
        <ConfirmDialog
          title="Mitglieds-Code erneuern?"
          description="Der bisherige Code und ausgehängte QR-Codes funktionieren danach nicht mehr. Bestehende Mitglieder bleiben Mitglieder."
          confirmWord="erneuern"
          confirmLabel="Neuen Code erzeugen"
          onConfirm={async () => {
            await api("/studio/join-code", { method: "POST" });
            setRenew(false);
            onRenewed();
          }}
          onClose={() => setRenew(false)}
        />
      )}
    </Card>
  );
}

function AssignDialog({
  client,
  trainer,
  onClose,
  onConfirm,
}: {
  client: StudioClient;
  trainer: StudioTrainer;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const isTransfer = !!client.trainerId;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Abbrechen" tabIndex={-1} onClick={() => !pending && onClose()} className="absolute inset-0 bg-fg/30 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-md rounded-box bg-surface p-6 shadow-2xl ring-1 ring-line-strong">
        <h2 className="text-lg font-semibold text-fg">
          {isTransfer ? `${client.name} an ${trainer.name} übertragen?` : `${client.name} an ${trainer.name} zuweisen?`}
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-fg-muted">
          {isTransfer && <li>{trainer.name} bekommt Kopien der Pläne, die {client.name} zugewiesen sind.</li>}
          <li>Workouts, Messwerte und Fortschritt bleiben vollständig erhalten.</li>
          {isTransfer && <li>Der bisherige Chat-Verlauf bleibt bei {client.trainerName}.</li>}
          <li>
            {client.name} und {trainer.name} bekommen einen Hinweis.
          </li>
        </ul>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await onConfirm();
              setPending(false);
            }}
          >
            {pending ? "Wird übertragen …" : isTransfer ? "Übertragen" : "Zuweisen"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Einladungen                                                         */
/* ------------------------------------------------------------------ */

function InvitationsTab({ data, reload }: { data: StudioOverview; reload: () => void }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const full = data.trainers.length >= data.studio.maxTrainers;
  const link = (code: string) => `${window.location.origin}/registrieren?rolle=trainer&studio=${code}`;
  const [now] = useState(() => Date.now());

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/studio/invitations", { body: email ? { email } : {} });
      setEmail("");
      reload();
    } catch (err) {
      setMsg(errorMessage(err, "Einladung konnte nicht erstellt werden."));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold text-fg">Trainer einladen</h3>
        <p className="mt-1 text-sm text-fg-muted">
          Neue Trainer registrieren sich über den Link. Bestehende Trainer geben den Code in ihren Einstellungen ein – ihre Kunden
          kommen mit ins Studio. {data.trainers.length}/{data.studio.maxTrainers} Plätze belegt.
        </p>
        {full ? (
          <div className="mt-4">
            <Alert tone="info">Dein Studio hat die maximale Anzahl an Trainern erreicht.</Alert>
          </div>
        ) : (
          <form onSubmit={create} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail des Trainers (optional, bindet den Code an diese Adresse)"
            />
            <Button type="submit" className="shrink-0">
              Einladung erstellen
            </Button>
          </form>
        )}
        {msg && (
          <div className="mt-3">
            <Alert>{msg}</Alert>
          </div>
        )}
      </Card>

      {data.invitations.length === 0 ? (
        <EmptyState title="Keine Einladungen" text="Erstelle oben deine erste Trainer-Einladung." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-fg-muted">
              <tr>
                <th className="px-6 py-3 font-medium">Code</th>
                <th className="px-6 py-3 font-medium">E-Mail</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.invitations.map((inv) => {
                const expired = new Date(inv.expiresAt).getTime() < now;
                return (
                  <tr key={inv.code}>
                    <td className="px-6 py-3 font-mono font-semibold tracking-widest text-fg">{inv.code}</td>
                    <td className="px-6 py-3 text-fg-muted">{inv.email ?? "–"}</td>
                    <td className="px-6 py-3">
                      {inv.usedBy ? (
                        <Badge tone="success">Angenommen {fmtDate(inv.usedAt)}</Badge>
                      ) : expired ? (
                        <Badge>Abgelaufen</Badge>
                      ) : (
                        <Badge tone="brand">Offen bis {fmtDate(inv.expiresAt)}</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      {!inv.usedBy && !expired && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(link(inv.code));
                              setCopied(inv.code);
                            } catch {
                              setMsg(`Kopieren nicht möglich. Bitte manuell kopieren: ${link(inv.code)}`);
                            }
                          }}
                        >
                          {copied === inv.code ? "Kopiert ✓" : "Link kopieren"}
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          try {
                            await api(`/studio/invitations/${inv.code}`, { method: "DELETE" });
                          } catch (err) {
                            if (!(err instanceof ApiClientError && err.status === 404)) setMsg(errorMessage(err));
                          }
                          reload();
                        }}
                      >
                        Löschen
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Studio-Profil: Name & Logo                                          */
/* ------------------------------------------------------------------ */

function ProfileTab({ data, reload }: { data: StudioOverview; reload: () => void }) {
  const [name, setName] = useState(data.studio.name);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "success", text: success });
      reload();
    } catch (err) {
      setMsg({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="font-semibold text-fg">Logo</h3>
        <p className="mt-1 text-sm text-fg-muted">
          Dein Logo sehen deine Trainer und deren Kunden in der App. Am besten ein PNG mit transparentem Hintergrund.
        </p>
        <div className="mt-6 flex items-center gap-5">
          <StudioLogo name={data.studio.name} logoUrl={data.studio.logoUrl} size="xl" />
          <div className="flex flex-col gap-2">
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => file.current?.click()}>
              <Icon name="camera" className="size-4" /> {data.studio.logoUrl ? "Logo ändern" : "Logo hochladen"}
            </Button>
            {data.studio.logoUrl && (
              <Button variant="danger" size="sm" disabled={busy} onClick={() => run(() => api("/studio/logo", { method: "DELETE" }), "Logo entfernt.")}>
                Entfernen
              </Button>
            )}
          </div>
          <input
            ref={file}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              void run(async () => {
                const blob = await toLogo(f);
                const form = new FormData();
                form.append("file", blob, blob.type === "image/webp" ? "logo.webp" : "logo.png");
                await api("/studio/logo", { method: "POST", body: form, timeoutMs: 60_000 });
              }, "Logo gespeichert.");
            }}
          />
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-fg">Name</h3>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => api("/studio", { method: "PATCH", body: { name } }), "Name gespeichert.");
          }}
        >
          <Field label="Studioname">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !name.trim() || name.trim() === data.studio.name}>
              Speichern
            </Button>
          </div>
        </form>
      </Card>

      {msg && (
        <div className="lg:col-span-2">
          <Alert tone={msg.tone}>{msg.text}</Alert>
        </div>
      )}

      <div className="border-t border-line pt-6 lg:col-span-2">
        <StudioDetailsForm onSaved={reload} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Studio-Infos: Beschreibung, Adresse, Kontakt, Öffnungszeiten, Ausstattung */
/* ------------------------------------------------------------------ */

const AMENITY_SUGGESTIONS = [
  "Freihantelbereich",
  "Cardio-Bereich",
  "Kursraum",
  "Sauna",
  "Duschen",
  "Umkleiden",
  "Parkplätze",
  "Getränkebar",
  "WLAN",
  "Barrierefrei",
  "Kinderbetreuung",
  "24/7-Zugang",
];

const DEFAULT_HOURS: OpeningHoursDay[] = WEEKDAYS.map((_, day) => ({
  day,
  closed: false,
  open: day < 5 ? "06:00" : "09:00",
  close: day < 5 ? "22:00" : "18:00",
}));

function StudioDetailsForm({ onSaved }: { onSaved: () => void }) {
  const profile = useApi<StudioProfile>("/studio/profile");
  if (profile.loading) return <Spinner />;
  if (!profile.data) return <LoadError message={profile.error?.message ?? "Infos konnten nicht geladen werden."} onRetry={profile.reload} />;
  return (
    <DetailsEditor
      key={profile.data.id}
      initial={profile.data}
      onSaved={() => {
        profile.reload();
        onSaved();
      }}
    />
  );
}

function DetailsEditor({ initial, onSaved }: { initial: StudioProfile; onSaved: () => void }) {
  const [f, setF] = useState({
    description: initial.description ?? "",
    street: initial.address.street ?? "",
    postalCode: initial.address.postalCode ?? "",
    city: initial.address.city ?? "",
    phone: initial.contact.phone ?? "",
    email: initial.contact.email ?? "",
    website: initial.contact.website ?? "",
    instagram: initial.contact.instagram ?? "",
  });
  const [hours, setHours] = useState<OpeningHoursDay[]>(initial.openingHours.length ? initial.openingHours : DEFAULT_HOURS);
  const [hoursEnabled, setHoursEnabled] = useState(initial.openingHours.length > 0);
  const [amenities, setAmenities] = useState<string[]>(initial.amenities);
  const [newAmenity, setNewAmenity] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const set = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }));
  const setDay = (day: number, patch: Partial<OpeningHoursDay>) =>
    setHours((prev) => WEEKDAYS.map((_, d) => ({ ...(prev.find((h) => h.day === d) ?? DEFAULT_HOURS[d]), ...(d === day ? patch : {}) })));
  const addAmenity = (a: string) => {
    const v = a.trim();
    if (v && !amenities.includes(v) && amenities.length < 20) setAmenities([...amenities, v]);
    setNewAmenity("");
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      await api("/studio", {
        method: "PATCH",
        body: { ...f, website: f.website && !/^https?:\/\//i.test(f.website) ? `https://${f.website}` : f.website, openingHours: hoursEnabled ? hours : [], amenities },
      });
      setMsg({ tone: "success", text: "Studio-Infos gespeichert. Deine Trainer und Kunden sehen sie ab sofort." });
      onSaved();
    } catch (err) {
      setMsg({ tone: "error", text: errorMessage(err, "Speichern fehlgeschlagen.") });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-fg">Studio-Infos</h3>
          <p className="text-sm text-fg-muted">Sichtbar für deine Trainer und deren Kunden auf der Studio-Seite.</p>
        </div>
        <Link href="/dashboard/studio" className="text-sm font-semibold text-brand-ink hover:underline">
          Studio-Seite ansehen →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h4 className="font-semibold text-fg">Über das Studio</h4>
          <Textarea
            value={f.description}
            onChange={set("description")}
            rows={6}
            maxLength={1000}
            placeholder="Was macht euer Studio aus? z. B. Schwerpunkte, Atmosphäre, Kurse …"
            className="mt-3"
          />
          <p className="mt-1 text-right text-xs text-fg-subtle tabular-nums">{f.description.length}/1000</p>
        </Card>

        <Card>
          <h4 className="font-semibold text-fg">Adresse & Kontakt</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem_1fr]">
            <Field label="Straße & Nr.">
              <Input value={f.street} onChange={set("street")} autoComplete="street-address" maxLength={120} />
            </Field>
            <Field label="PLZ">
              <Input value={f.postalCode} onChange={set("postalCode")} autoComplete="postal-code" maxLength={12} inputMode="numeric" />
            </Field>
            <Field label="Ort">
              <Input value={f.city} onChange={set("city")} autoComplete="address-level2" maxLength={80} />
            </Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Telefon">
              <Input value={f.phone} onChange={set("phone")} type="tel" placeholder="+49 …" maxLength={40} />
            </Field>
            <Field label="E-Mail">
              <Input value={f.email} onChange={set("email")} type="email" maxLength={254} />
            </Field>
            <Field label="Website">
              <Input value={f.website} onChange={set("website")} placeholder="https://…" maxLength={300} />
            </Field>
            <Field label="Instagram">
              <Input value={f.instagram} onChange={set("instagram")} placeholder="@deinstudio" maxLength={31} />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-fg">Öffnungszeiten</h4>
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input type="checkbox" checked={hoursEnabled} onChange={(e) => setHoursEnabled(e.target.checked)} className="size-4 accent-[var(--color-brand-ink)]" />
              anzeigen
            </label>
          </div>
          {hoursEnabled ? (
            <div className="mt-3 space-y-2">
              {WEEKDAYS.map((name, day) => {
                const h = hours.find((x) => x.day === day) ?? DEFAULT_HOURS[day];
                return (
                  <div key={day} className="grid grid-cols-[6.5rem_1fr] items-center gap-2 sm:grid-cols-[6.5rem_1fr_auto]">
                    <span className="text-sm font-medium text-fg">{name}</span>
                    {h.closed ? (
                      <span className="text-sm text-fg-subtle">geschlossen</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Input type="time" value={h.open} onChange={(e) => setDay(day, { open: e.target.value })} aria-label={`${name} von`} className="w-28" />
                        <span className="text-fg-subtle">–</span>
                        <Input type="time" value={h.close} onChange={(e) => setDay(day, { close: e.target.value })} aria-label={`${name} bis`} className="w-28" />
                      </span>
                    )}
                    <label className="col-start-2 flex items-center gap-1.5 text-xs text-fg-muted sm:col-start-auto">
                      <input type="checkbox" checked={h.closed} onChange={(e) => setDay(day, { closed: e.target.checked })} className="size-4 accent-[var(--color-brand-ink)]" />
                      geschlossen
                    </label>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  const mo = hours.find((x) => x.day === 0) ?? DEFAULT_HOURS[0];
                  setHours((prev) => prev.map((h) => (h.day <= 4 ? { ...mo, day: h.day } : h)));
                }}
                className="text-xs font-semibold text-brand-ink hover:underline"
              >
                Montag für Mo–Fr übernehmen
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">Öffnungszeiten werden auf der Studio-Seite nicht angezeigt.</p>
          )}
        </Card>

        <Card>
          <h4 className="font-semibold text-fg">Ausstattung</h4>
          <ul className="mt-3 flex flex-wrap gap-2">
            {amenities.map((a) => (
              <li key={a} className="flex items-center gap-1 rounded-full bg-brand/30 py-1 pr-1 pl-3 text-sm font-medium text-brand-ink">
                {a}
                <button
                  type="button"
                  aria-label={`${a} entfernen`}
                  onClick={() => setAmenities(amenities.filter((x) => x !== a))}
                  className="grid size-5 place-items-center rounded-full hover:bg-brand-ink/15"
                >
                  <Icon name="x" className="size-3" />
                </button>
              </li>
            ))}
            {!amenities.length && <li className="text-sm text-fg-subtle">Noch nichts eingetragen.</li>}
          </ul>
          <div className="mt-3 flex gap-2">
            <Input
              value={newAmenity}
              onChange={(e) => setNewAmenity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAmenity(newAmenity);
                }
              }}
              placeholder="Eigene hinzufügen …"
              maxLength={40}
            />
            <Button type="button" variant="secondary" onClick={() => addAmenity(newAmenity)} disabled={!newAmenity.trim()}>
              Hinzufügen
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {AMENITY_SUGGESTIONS.filter((a) => !amenities.includes(a)).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => addAmenity(a)}
                className="rounded-full px-2.5 py-1 text-xs font-medium text-fg-muted ring-1 ring-line-strong transition hover:bg-surface-3 hover:text-fg"
              >
                + {a}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern …" : "Studio-Infos speichern"}
        </Button>
      </div>
    </form>
  );
}
