"use client";

import { WishLink } from "@/components/dashboard/feature-wish";
import { useMessaging } from "@/components/dashboard/messaging/messaging-context";
import { Icon } from "@/components/icons";
import {
  Alert,
  Avatar,
  Button,
  cx,
  EmptyState,
  LoadError,
  Spinner,
} from "@/components/ui";
import { fmtDate, useApi } from "@/lib/client/api";
import type { ClientSummary, Invitation } from "@/lib/types";
import { useState } from "react";
import { MiniStat } from "./client-detail";
import {
  ClientStatus,
  clientStatus,
  DAY_MS,
  STATUS,
  StatusBadge,
} from "./client-status";

const inviteLink = (code: string) =>
  `${window.location.origin}/registrieren?rolle=kunde&code=${code}`;

export function ClientsList({
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
