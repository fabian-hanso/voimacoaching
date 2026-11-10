"use client";

import { useState } from "react";
import { api, fmtDate, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  cx,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
  LoadError,
  type BadgeTone,
} from "@/components/ui";
import type {
  Appointment,
  ClientDetail,
  ClientSummary,
  Invitation,
  PlanWithAssignments,
} from "@/lib/types";
import type { PlanInput } from "@/lib/schemas";
import { ProgressView } from "./progress-view";
import { openRequests, TrainerAppointments } from "./appointments";
import { useMessaging } from "./messaging";
import { WishLink } from "./feature-wish";
import { Icon } from "@/components/icons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  cleanPlanExercise,
  ExerciseDatalist,
  EXERCISE_DATALIST_ID,
  MiniField,
  newPlanExercise,
  numOrNull,
  UnitInput,
  withName,
  withType,
} from "./exercise-fields";
import {
  ExerciseCatalog,
  ExerciseCatalogModal,
  ExplainButton,
} from "./exercise-guide";
import { EXERCISE_CATALOG } from "@/lib/exercises";

type Tab = "clients" | "plans" | "exercises" | "appointments" | "invitations";

export function TrainerView() {
  const [tab, setTab] = useState<Tab>("clients");
  const [clientId, setClientId] = useState<string | null>(null);
  const appointments = useApi<{ appointments: Appointment[] }>("/appointments");
  const [now] = useState(() => Date.now());
  const pending = openRequests(appointments.data?.appointments, now);

  const tabs: [Tab, string, number | null][] = [
    ["clients", "Kunden", null],
    ["plans", "Trainingspläne", null],
    ["exercises", "Übungen", null],
    ["appointments", "Termine", pending || null],
    ["invitations", "Einladungen", null],
  ];

  return (
    <div>
      <nav className="tab-bar flex gap-6 overflow-x-auto overflow-y-hidden">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setClientId(null);
            }}
            className={cx(
              "flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition",
              tab === key
                ? "border-fg text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {label}
            {count != null && (
              <span className="rounded-full bg-accent px-1.5 text-xs text-accent-fg">
                {count}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="mt-8">
        {tab === "clients" &&
          (clientId ? (
            <ClientDetailView id={clientId} onBack={() => setClientId(null)} />
          ) : (
            <ClientsList
              onOpen={setClientId}
              onInvite={() => setTab("invitations")}
            />
          ))}
        {tab === "plans" && <PlansTab />}
        {tab === "exercises" && <ExercisesTab />}
        {tab === "appointments" && (
          <TrainerAppointments appointments={appointments} />
        )}
        {tab === "invitations" && <InvitationsTab />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kunden                                                              */
/* ------------------------------------------------------------------ */

type ClientStatus = "active" | "inactive" | "new" | "invited";

const STATUS: Record<
  ClientStatus,
  { label: string; tone: BadgeTone; hint: string }
> = {
  active: {
    label: "Aktiv",
    tone: "success",
    hint: "Hat in den letzten 7 Tagen trainiert.",
  },
  inactive: {
    label: "Inaktiv",
    tone: "warning",
    hint: "Hat seit über 7 Tagen nicht trainiert.",
  },
  new: {
    label: "Neu angemeldet",
    tone: "accent",
    hint: "Registriert, hat aber noch kein Training getrackt.",
  },
  invited: {
    label: "Eingeladen",
    tone: "neutral",
    hint: "Einladung verschickt, aber noch nicht angemeldet.",
  },
};

const DAY_MS = 86_400_000;

function clientStatus(c: ClientSummary): ClientStatus {
  if (!c.lastWorkoutAt) return "new";
  return c.workoutsLast7Days > 0 ? "active" : "inactive";
}

function StatusBadge({
  status,
  detail,
}: {
  status: ClientStatus;
  detail?: string;
}) {
  const s = STATUS[status];
  return (
    <span
      title={detail ? `${s.hint} ${detail}` : s.hint}
      className="shrink-0 cursor-help"
    >
      <Badge tone={s.tone}>{s.label}</Badge>
    </span>
  );
}

const inviteLink = (code: string) =>
  `${window.location.origin}/registrieren?rolle=kunde&code=${code}`;

function ClientsList({
  onOpen,
  onInvite,
}: {
  onOpen: (id: string) => void;
  onInvite: () => void;
}) {
  const { data, loading, error, reload } = useApi<{ clients: ClientSummary[] }>(
    "/clients",
  );
  const invites = useApi<{ invitations: Invitation[] }>("/invitations");
  const { conversations } = useMessaging();
  const [filter, setFilter] = useState<ClientStatus | "all">("all");
  const [now] = useState(() => Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const unreadOf = (id: string) =>
    conversations.find((c) => c.partner.id === id)?.unread ?? 0;

  if (loading) return <Spinner />;
  if (error && !data)
    return <LoadError message={error.message} onRetry={reload} />;

  const clients = (data?.clients ?? []).map((c) => ({
    c,
    status: clientStatus(c),
  }));
  // Offene Einladungen = „noch nicht angemeldet“
  const pending = (invites.data?.invitations ?? []).filter(
    (i) => !i.usedBy && new Date(i.expiresAt).getTime() > now,
  );
  const counts: Record<ClientStatus, number> = {
    active: clients.filter((x) => x.status === "active").length,
    inactive: clients.filter((x) => x.status === "inactive").length,
    new: clients.filter((x) => x.status === "new").length,
    invited: pending.length,
  };

  if (!clients.length && !pending.length) {
    return (
      <EmptyState
        title="Noch keine Kunden"
        text="Erstelle eine Einladung und schicke deinem Kunden den Link oder Code."
        action={<Button onClick={onInvite}>Kunden einladen</Button>}
      />
    );
  }

  const order: ClientStatus[] = ["active", "inactive", "new", "invited"];
  const shownClients = clients
    .filter((x) => filter === "all" || x.status === filter)
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const shownInvites = filter === "all" || filter === "invited" ? pending : [];

  return (
    <div className="space-y-6">
      {/* Filter mit Anzahl je Status */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="Alle"
          count={clients.length + pending.length}
        />
        {order.map((st) => (
          <FilterChip
            key={st}
            active={filter === st}
            onClick={() => setFilter(st)}
            label={STATUS[st].label}
            count={counts[st]}
            title={STATUS[st].hint}
          />
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={onInvite}
        >
          <Icon name="plus" className="size-3.5" /> Kunden einladen
        </Button>
      </div>
      {copyError && <Alert>{copyError}</Alert>}

      {shownClients.length === 0 && shownInvites.length === 0 ? (
        <EmptyState
          title={`Keine Kunden mit Status „${filter === "all" ? "Alle" : STATUS[filter].label}“`}
          text="Wähle oben einen anderen Filter."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shownClients.map(({ c, status }) => {
            const daysSince = c.lastWorkoutAt
              ? Math.floor((now - new Date(c.lastWorkoutAt).getTime()) / DAY_MS)
              : null;
            return (
              <button
                key={c.id}
                onClick={() => onOpen(c.id)}
                className="rounded-box bg-surface p-6 text-left ring-1 ring-line transition hover:shadow-lg hover:ring-line-strong"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} src={c.avatarUrl} size="xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fg">{c.name}</p>
                    <p className="truncate text-xs text-fg-muted">{c.email}</p>
                  </div>
                  {unreadOf(c.id) > 0 && (
                    <span
                      title="Ungelesene Nachrichten"
                      className="flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-brand-fg"
                    >
                      <Icon name="chat" className="size-3" /> {unreadOf(c.id)}
                    </span>
                  )}
                  <StatusBadge
                    status={status}
                    detail={
                      status === "inactive" && daysSince != null
                        ? `Letztes Training vor ${daysSince} Tagen.`
                        : undefined
                    }
                  />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <MiniStat
                    label="7 Tage"
                    value={String(c.workoutsLast7Days)}
                  />
                  <MiniStat label="Pläne" value={String(c.activePlans)} />
                  <MiniStat
                    label="Zuletzt"
                    value={
                      daysSince == null
                        ? "–"
                        : daysSince === 0
                          ? "Heute"
                          : daysSince === 1
                            ? "Gestern"
                            : `vor ${daysSince} T.`
                    }
                  />
                </dl>
              </button>
            );
          })}

          {shownInvites.map((inv) => (
            <div
              key={inv.code}
              className="rounded-box border border-dashed border-line-strong bg-surface/60 p-6"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-3 text-fg-subtle">
                  <Icon name="mail" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">
                    {inv.email ?? "Offene Einladung"}
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    Code{" "}
                    <span className="font-mono font-semibold tracking-wider">
                      {inv.code}
                    </span>{" "}
                    · gültig bis {fmtDate(inv.expiresAt)}
                  </p>
                </div>
                <StatusBadge status="invited" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 rounded-tile bg-surface-2 px-3 py-2">
                <span className="text-xs text-fg-muted">
                  Noch nicht angemeldet
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setCopyError(null);
                    try {
                      await navigator.clipboard.writeText(inviteLink(inv.code));
                      setCopied(inv.code);
                    } catch {
                      setCopyError(
                        `Kopieren nicht möglich. Bitte manuell kopieren: ${inviteLink(inv.code)}`,
                      );
                    }
                  }}
                >
                  {copied === inv.code ? "Kopiert ✓" : "Link kopieren"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-center pt-2">
        <WishLink context="Kundenliste" />
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition",
        active
          ? "bg-brand text-brand-fg ring-brand"
          : "bg-surface text-fg-muted ring-line-strong hover:bg-surface-2",
      )}
    >
      {label}
      <span
        className={cx(
          "rounded-full px-1.5 text-xs",
          active ? "bg-fg/20" : "bg-surface-3",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-tile bg-surface-2 py-2">
      <dt className="text-[10px] text-fg-muted">{label}</dt>
      <dd className="text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}

function ClientDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const detail = useApi<ClientDetail>(`/clients/${id}`);
  const plans = useApi<{ plans: PlanWithAssignments[] }>("/plans");
  const [planId, setPlanId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messaging = useMessaging();
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (detail.loading) return <Spinner />;
  if (detail.error?.status === 404) {
    return (
      <EmptyState
        title="Dieser Kunde ist nicht mehr verfügbar"
        text="Das Konto wurde gelöscht oder die Verbindung zu dir wurde getrennt."
        action={<Button onClick={onBack}>Zurück zur Kundenliste</Button>}
      />
    );
  }
  if (detail.error || !detail.data) {
    return (
      <LoadError
        message={detail.error?.message ?? "Kunde konnte nicht geladen werden."}
        onRetry={detail.reload}
      />
    );
  }
  const { client, plans: assigned, progress } = detail.data;
  const assignable =
    plans.data?.plans.filter((p) => !assigned.some((a) => a.id === p.id)) ?? [];

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      detail.reload();
      plans.reload();
    } catch (err) {
      setError(errorMessage(err, "Aktion fehlgeschlagen."));
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm font-medium text-fg-muted hover:text-fg"
      >
        ← Alle Kunden
      </button>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={client.name} src={client.avatarUrl} size="2xl" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-fg">
                {client.name}
              </h2>
              <StatusBadge status={clientStatus(client)} />
            </div>
            <p className="text-sm text-fg-muted">
              {client.email} · Kunde seit {fmtDate(client.joinedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => messaging.open(id)}
          >
            <Icon name="chat" className="size-4" /> Nachricht
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmRemove(true)}
          >
            Kunde entfernen
          </Button>
        </div>
        {confirmRemove && (
          <ConfirmDialog
            title={`${client.name} entfernen?`}
            description={
              <>
                <p>
                  Die Verbindung zwischen dir und {client.name} wird getrennt:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Alle zugewiesenen Pläne werden aufgehoben.</li>
                  <li>Ihr könnt euch keine Nachrichten mehr schreiben.</li>
                  <li>Du siehst den Fortschritt nicht mehr.</li>
                  <li>{client.name} bekommt einen Hinweis darüber.</li>
                </ul>
                <p className="mt-2">
                  Das Konto und die Trainingsdaten von {client.name} bleiben
                  erhalten. Für eine neue Verbindung brauchst du eine neue
                  Einladung.
                </p>
              </>
            }
            confirmLabel="Kunde entfernen"
            onClose={() => setConfirmRemove(false)}
            onConfirm={async () => {
              await api(`/clients/${id}`, { method: "DELETE" });
              messaging.reload();
              onBack();
            }}
          />
        )}
      </div>
      {error && <Alert>{error}</Alert>}

      <Card>
        <h3 className="text-sm font-semibold text-fg">Zugewiesene Pläne</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {assigned.length === 0 && (
            <p className="text-sm text-fg-muted">Noch kein Plan zugewiesen.</p>
          )}
          {assigned.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-2 rounded-full bg-brand/30 py-1 pr-1 pl-3 text-sm text-brand-ink ring-1 ring-brand-ink/20"
            >
              {p.title}
              <button
                aria-label={`${p.title} entfernen`}
                onClick={() =>
                  run(() =>
                    api(`/plans/${p.id}/assignments/${id}`, {
                      method: "DELETE",
                    }),
                  )
                }
                className="grid size-5 place-items-center rounded-full hover:bg-brand/40"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {assignable.length > 0 && (
          <div className="mt-4 flex gap-2">
            <Select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="max-w-xs"
            >
              <option value="">Plan auswählen …</option>
              {assignable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
            <Button
              disabled={!planId}
              onClick={() =>
                run(async () => {
                  await api(`/plans/${planId}/assignments`, {
                    body: { clientId: id },
                  });
                  setPlanId("");
                })
              }
            >
              Zuweisen
            </Button>
          </div>
        )}
      </Card>

      <ProgressView progress={progress} />
      <div className="flex justify-center pt-2">
        <WishLink context="Kundendetail" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pläne                                                               */
/* ------------------------------------------------------------------ */

const emptyPlan = (): PlanInput => ({
  title: "",
  description: "",
  days: [{ name: "Tag 1", exercises: [newPlanExercise()] }],
});

function PlansTab() {
  const { data, loading, error, reload } = useApi<{
    plans: PlanWithAssignments[];
  }>("/plans");
  const [editing, setEditing] = useState<{
    id: string | null;
    plan: PlanInput;
  } | null>(null);
  const [deleting, setDeleting] = useState<PlanWithAssignments | null>(null);

  if (editing) {
    return (
      <PlanEditor
        id={editing.id}
        initial={editing.plan}
        onDone={() => {
          setEditing(null);
          reload();
        }}
      />
    );
  }
  if (loading) return <Spinner />;
  if (error && !data)
    return <LoadError message={error.message} onRetry={reload} />;

  return (
    <div className="space-y-6">
      {deleting && (
        <ConfirmDialog
          title={`Plan „${deleting.title}“ löschen?`}
          description={
            deleting.assignedClientIds.length > 0 ? (
              <p>
                Der Plan ist{" "}
                <strong>{deleting.assignedClientIds.length} Kunden</strong>{" "}
                zugewiesen und verschwindet auch bei ihnen. Bereits geloggte
                Workouts bleiben erhalten.
              </p>
            ) : (
              <p>Der Plan wird endgültig gelöscht.</p>
            )
          }
          confirmLabel="Plan löschen"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api(`/plans/${deleting.id}`, { method: "DELETE" });
            setDeleting(null);
            reload();
          }}
        />
      )}
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ id: null, plan: emptyPlan() })}>
          + Neuer Plan
        </Button>
      </div>
      {!data?.plans.length ? (
        <EmptyState
          title="Noch keine Pläne"
          text="Erstelle deinen ersten Trainingsplan und weise ihn Kunden zu."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.plans.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-fg">{p.title}</h3>
                  {p.description && (
                    <p className="mt-1 text-sm text-fg-muted">
                      {p.description}
                    </p>
                  )}
                </div>
                <Badge tone="brand">{p.assignedClientIds.length} Kunden</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.days.map((d, i) => (
                  <Badge key={i}>
                    {d.name} · {d.exercises.length} Übungen
                  </Badge>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      id: p.id,
                      plan: {
                        title: p.title,
                        description: p.description ?? "",
                        days: p.days,
                      },
                    })
                  }
                >
                  Bearbeiten
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleting(p)}
                >
                  Löschen
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanEditor({
  id,
  initial,
  onDone,
}: {
  id: string | null;
  initial: PlanInput;
  onDone: () => void;
}) {
  const [plan, setPlan] = useState<PlanInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pickFor, setPickFor] = useState<number | null>(null);

  const update = (fn: (draft: PlanInput) => void) =>
    setPlan((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  async function save() {
    setPending(true);
    setError(null);
    try {
      const body = {
        ...plan,
        days: plan.days.map((d) => ({
          ...d,
          exercises: d.exercises
            .filter((e) => e.name.trim())
            .map(cleanPlanExercise),
        })),
      };
      await api(id ? `/plans/${id}` : "/plans", {
        method: id ? "PUT" : "POST",
        body,
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err, "Speichern fehlgeschlagen."));
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-fg">
          {id ? "Plan bearbeiten" : "Neuer Plan"}
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDone}>
            Abbrechen
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Speichern …" : "Speichern"}
          </Button>
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      <ExerciseDatalist />
      {pickFor !== null && plan.days[pickFor] && (
        <ExerciseCatalogModal
          dayName={plan.days[pickFor].name}
          onClose={() => setPickFor(null)}
          onPick={(e) =>
            update((p) => {
              const list = p.days[pickFor].exercises;
              // Leere Platzhalter-Übung (z. B. bei neuem Tag) durch die gewählte ersetzen
              if (list.length === 1 && !list[0].name.trim()) list.pop();
              list.push(newPlanExercise(e.type, e.name));
            })
          }
        />
      )}

      <Card className="grid gap-4 md:grid-cols-2">
        <Field label="Titel">
          <Input
            value={plan.title}
            onChange={(e) => update((p) => void (p.title = e.target.value))}
            placeholder="z. B. Kraftaufbau Phase 1"
          />
        </Field>
        <Field label="Beschreibung (optional)">
          <Textarea
            rows={1}
            value={plan.description ?? ""}
            onChange={(e) =>
              update((p) => void (p.description = e.target.value))
            }
            placeholder="Ziel, Hinweise, Dauer …"
          />
        </Field>
      </Card>

      {plan.days.map((day, di) => (
        <Card key={di}>
          <div className="flex items-center gap-3">
            <Input
              value={day.name}
              onChange={(e) =>
                update((p) => void (p.days[di].name = e.target.value))
              }
              className="max-w-xs font-semibold"
            />
            {plan.days.length > 1 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => update((p) => void p.days.splice(di, 1))}
              >
                Tag entfernen
              </Button>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {day.exercises.map((ex, ei) => {
              const set = (fn: (e: typeof ex) => typeof ex) =>
                update(
                  (p) =>
                    void (p.days[di].exercises[ei] = fn(
                      p.days[di].exercises[ei],
                    )),
                );
              const remove = (
                <button
                  type="button"
                  aria-label="Übung entfernen"
                  title="Übung entfernen"
                  onClick={() =>
                    update((p) => void p.days[di].exercises.splice(ei, 1))
                  }
                  className="grid size-9 shrink-0 place-items-center rounded-control text-lg text-fg-subtle hover:bg-danger/10 hover:text-danger"
                >
                  ×
                </button>
              );
              return (
                <div
                  key={ei}
                  className="space-y-3 rounded-tile bg-surface-2 p-3 ring-1 ring-line"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    {/* Art + Name */}
                    <div className="flex min-w-0 items-end gap-2 lg:w-[42%] lg:shrink-0">
                      <MiniField label="Art" className="w-28 shrink-0">
                        <Select
                          value={ex.type}
                          onChange={(e) =>
                            set((x) =>
                              withType(x, e.target.value as typeof ex.type),
                            )
                          }
                        >
                          <option value="strength">Kraft</option>
                          <option value="cardio">Ausdauer</option>
                        </Select>
                      </MiniField>
                      <MiniField label="Übung" className="flex-1">
                        <span className="relative block">
                          <Input
                            value={ex.name}
                            list={EXERCISE_DATALIST_ID}
                            placeholder={
                              ex.type === "cardio"
                                ? "z. B. Laufband"
                                : "z. B. Kniebeuge"
                            }
                            onChange={(e) =>
                              set((x) => withName(x, e.target.value))
                            }
                            className="pr-10"
                          />
                          <ExplainButton
                            name={ex.name}
                            className="absolute top-1/2 right-1.5 -translate-y-1/2"
                          />
                        </span>
                      </MiniField>
                      <div className="lg:hidden">{remove}</div>
                    </div>

                    {/* Werte je nach Art */}
                    {ex.type === "strength" ? (
                      <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
                        <MiniField label="Sätze">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={20}
                            value={ex.sets ?? ""}
                            onChange={(e) =>
                              set((x) => ({
                                ...x,
                                sets: Number(e.target.value) || 1,
                              }))
                            }
                          />
                        </MiniField>
                        <MiniField label="Wiederholungen">
                          <Input
                            value={ex.reps ?? ""}
                            placeholder="8-10"
                            onChange={(e) =>
                              set((x) => ({ ...x, reps: e.target.value }))
                            }
                          />
                        </MiniField>
                        <MiniField label="Gewicht">
                          <UnitInput
                            unit="kg"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.5"
                            placeholder="–"
                            value={ex.weightKg ?? ""}
                            onChange={(e) =>
                              set((x) => ({
                                ...x,
                                weightKg: numOrNull(e.target.value),
                              }))
                            }
                          />
                        </MiniField>
                      </div>
                    ) : (
                      <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_2fr]">
                        <MiniField label="Dauer">
                          <UnitInput
                            unit="min"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={ex.durationMin ?? ""}
                            onChange={(e) =>
                              set((x) => ({
                                ...x,
                                durationMin: numOrNull(e.target.value),
                              }))
                            }
                          />
                        </MiniField>
                        <MiniField label="Distanz">
                          <UnitInput
                            unit="km"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.1"
                            placeholder="–"
                            value={ex.distanceKm ?? ""}
                            onChange={(e) =>
                              set((x) => ({
                                ...x,
                                distanceKm: numOrNull(e.target.value),
                              }))
                            }
                          />
                        </MiniField>
                        <MiniField
                          label="Intensität"
                          className="col-span-2 sm:col-span-1"
                        >
                          <Input
                            value={ex.intensity ?? ""}
                            placeholder="z. B. Zone 2, Steigung 8 %"
                            title="z. B. Zone 2, 130–140 bpm, Steigung 8 %, 150 W, Intervalle 6 × 1 min"
                            onChange={(e) =>
                              set((x) => ({ ...x, intensity: e.target.value }))
                            }
                          />
                        </MiniField>
                      </div>
                    )}
                    <div className="hidden lg:block">{remove}</div>
                  </div>
                  <MiniField label="Hinweis für den Kunden (optional)">
                    <Input
                      value={ex.notes ?? ""}
                      maxLength={500}
                      placeholder="z. B. Langsam absenken, Sitzhöhe Stufe 4, Knie nicht nach innen"
                      onChange={(e) =>
                        set((x) => ({ ...x, notes: e.target.value }))
                      }
                    />
                  </MiniField>
                </div>
              );
            })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() =>
              update((p) => void p.days[di].exercises.push(newPlanExercise()))
            }
          >
            + Kraftübung
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() =>
              update(
                (p) =>
                  void p.days[di].exercises.push(newPlanExercise("cardio")),
              )
            }
          >
            + Ausdauer (Laufband, Rad …)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setPickFor(di)}
          >
            <Icon name="book" className="size-3.5" /> Aus Katalog wählen
          </Button>
        </Card>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          update(
            (p) =>
              void p.days.push({
                name: `Tag ${p.days.length + 1}`,
                exercises: [newPlanExercise()],
              }),
          )
        }
      >
        + Trainingstag hinzufügen
      </Button>
      <div className="flex justify-center pt-4">
        <WishLink context="Plan-Editor" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Übungskatalog                                                       */
/* ------------------------------------------------------------------ */

function ExercisesTab() {
  return (
    <Card>
      <h2 className="font-semibold text-fg">Übungskatalog</h2>
      <p className="mt-1 text-sm text-fg-muted">
        {EXERCISE_CATALOG.length} Übungen mit Anleitung. Nimmst du sie in einen
        Plan auf, sehen deine Kunden die Erklärung direkt an der Übung –
        zusammen mit deinem persönlichen Hinweis.
      </p>
      <div className="mt-5">
        <ExerciseCatalog />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Einladungen                                                         */
/* ------------------------------------------------------------------ */

function InvitationsTab() {
  const { data, loading, error, reload } = useApi<{
    invitations: Invitation[];
  }>("/invitations");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const link = (code: string) =>
    `${window.location.origin}/registrieren?rolle=kunde&code=${code}`;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await api("/invitations", { body: email ? { email } : {} });
      setEmail("");
      reload();
    } catch (err) {
      setFormError(
        errorMessage(err, "Einladung konnte nicht erstellt werden."),
      );
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold text-fg">Neuen Kunden einladen</h3>
        <p className="mt-1 text-sm text-fg-muted">
          Der Code ist 14 Tage gültig und kann im Web oder in der App eingegeben
          werden.
        </p>
        <form
          onSubmit={create}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail des Kunden (optional, bindet den Code an diese Adresse)"
          />
          <Button type="submit" className="shrink-0">
            Einladung erstellen
          </Button>
        </form>
        {formError && (
          <div className="mt-3">
            <Alert>{formError}</Alert>
          </div>
        )}
      </Card>

      {loading ? (
        <Spinner />
      ) : error && !data ? (
        <LoadError message={error.message} onRetry={reload} />
      ) : !data?.invitations.length ? (
        <EmptyState
          title="Keine Einladungen"
          text="Erstelle oben deine erste Einladung."
        />
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
                const expired = new Date(inv.expiresAt) < new Date();
                return (
                  <tr key={inv.code}>
                    <td className="px-6 py-3 font-mono font-semibold tracking-widest text-fg">
                      {inv.code}
                    </td>
                    <td className="px-6 py-3 text-fg-muted">
                      {inv.email ?? "–"}
                    </td>
                    <td className="px-6 py-3">
                      {inv.usedBy ? (
                        <Badge tone="success">
                          Angenommen {fmtDate(inv.usedAt)}
                        </Badge>
                      ) : expired ? (
                        <Badge>Abgelaufen</Badge>
                      ) : (
                        <Badge tone="brand">
                          Offen bis {fmtDate(inv.expiresAt)}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      {!inv.usedBy && !expired && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                link(inv.code),
                              );
                              setCopied(inv.code);
                            } catch {
                              // z. B. ohne HTTPS oder ohne Berechtigung → Link zum manuellen Kopieren anzeigen
                              setFormError(
                                `Kopieren nicht möglich. Bitte manuell kopieren: ${link(inv.code)}`,
                              );
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
                          setFormError(null);
                          try {
                            await api(`/invitations/${inv.code}`, {
                              method: "DELETE",
                            });
                          } catch (err) {
                            // 404 = schon gelöscht → Liste trotzdem aktualisieren
                            if (!(
                              err instanceof Error &&
                              "status" in err &&
                              err.status === 404
                            )) {
                              setFormError(
                                errorMessage(
                                  err,
                                  "Einladung konnte nicht gelöscht werden.",
                                ),
                              );
                            }
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
