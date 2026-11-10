"use client";

import { useEffect, useRef, useState } from "react";
import { api, fmtDate, useApi } from "@/lib/client/api";
import { cx } from "@/components/ui";
import { isRealtimeDown, subscribeWithAuth } from "@/lib/client/realtime";
import { Icon, IconTile } from "@/components/icons";
import type { Notice, NoticeKind } from "@/lib/types";

const TEXT: Record<NoticeKind, (name: string, detail: string) => { title: string; text: string }> = {
  appointment_requested: (n, d) => ({
    title: `Neue Terminanfrage von ${n}`,
    text: `${d} – bestätige oder lehne sie im Tab „Termine“ ab.`,
  }),
  appointment_confirmed: (n, d) => ({ title: `${n} hat deinen Termin bestätigt`, text: d }),
  appointment_declined: (n, d) => ({
    title: `${n} hat deine Terminanfrage abgelehnt`,
    text: `${d} – unter „Meine Termine“ siehst du ggf. den Grund und kannst eine andere Zeit anfragen.`,
  }),
  appointment_cancelled: (n, d) => ({ title: `${n} hat einen Termin abgesagt`, text: d }),
  appointment_booked: (n, d) => ({ title: `${n} hat einen Termin eingetragen`, text: d }),
  appointment_comment: (n, d) => ({ title: `${n} hat einen Termin kommentiert`, text: d }),
  client_deleted: (n) => ({
    title: `${n} hat das Konto gelöscht`,
    text: `Alle Daten von ${n} wurden auf eigenen Wunsch entfernt – auch Trainingsverlauf und Nachrichten.`,
  }),
  client_left: (n) => ({
    title: `${n} hat die Verbindung zu dir getrennt`,
    text: "Die Planzuweisungen wurden aufgehoben. Für eine neue Zusammenarbeit brauchst du eine neue Einladung.",
  }),
  trainer_deleted: (n) => ({
    title: `Dein Coach ${n} hat das Konto gelöscht`,
    text: "Deine Workouts und Messwerte bleiben erhalten. Mit einem Einladungscode kannst du dich mit einem neuen Coach verbinden.",
  }),
  coach_changed: (n) => ({
    title: `Dein Coach ist jetzt ${n}`,
    text: "Dein Studio hat dich einem neuen Coach zugeordnet. Deine Pläne, Workouts und Messwerte bleiben erhalten.",
  }),
  client_transferred: (n) => ({
    title: `${n} wurde dir übertragen`,
    text: "Du betreust diesen Kunden jetzt. Zugewiesene Pläne wurden für dich übernommen.",
  }),
  client_reassigned: (n) => ({
    title: `${n} wird jetzt von jemand anderem betreut`,
    text: "Dein Studio hat den Kunden einem anderen Trainer zugeordnet.",
  }),
  trainer_joined: (n) => ({
    title: `${n} ist deinem Studio beigetreten`,
    text: "Der Trainer und seine Kunden sind jetzt Teil deines Studios.",
  }),
  trainer_removed: (n) => ({
    title: `Du gehörst nicht mehr zu ${n}`,
    text: "Das Studio hat dich entfernt. Dein Trainer-Konto bleibt bestehen.",
  }),
  studio_trainer_deleted: (n) => ({
    title: `${n} hat das Trainer-Konto gelöscht`,
    text: "Die Kunden sind weiterhin in deinem Studio – weise sie einem anderen Trainer zu.",
  }),
  studio_deleted: (n) => ({
    title: `Das Studio ${n} wurde aufgelöst`,
    text: "Du arbeitest jetzt als eigenständiger Trainer weiter – mit all deinen Kunden.",
  }),
  client_removed: (n) => ({
    title: `${n} hat die Zusammenarbeit beendet`,
    text: "Deine Workouts und Messwerte bleiben erhalten. Mit einem Einladungscode kannst du dich mit einem neuen Coach verbinden.",
  }),
};

/** Nachladen, solange Realtime gestört ist */
const POLL_MS = 60_000;
/** Sicherheitsnetz auch bei „verbunden“ (Realtime meldet fehlende Rechte nicht als Fehler) */
const SAFETY_POLL_MS = 5 * 60_000;

/**
 * Glocke im Header: Benachrichtigungen (Terminanfragen, Kommentare, beendete Verbindungen, …) als Dropdown.
 * Der Zähler zeigt ungelesene; beim Öffnen werden alle als gelesen markiert. Wegklicken entfernt sie.
 * Neue Hinweise kommen per Realtime sofort an; ist die Verbindung gestört, wird minütlich nachgeladen.
 */
export function NotificationsButton({ userId }: { userId: string }) {
  const { data, reload } = useApi<{ notices: Notice[] }>("/notices");
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [readLocally, setReadLocally] = useState(false);
  const [live, setLive] = useState(true);
  const root = useRef<HTMLDivElement>(null);

  // Realtime: eigene Hinweise (RLS-Policy „Nutzer lesen eigene Hinweise“) – neu, gelesen, entfernt
  useEffect(() => {
    // Mehrere Ereignisse kurz hintereinander (z. B. „alle gelesen“) → nur einmal nachladen
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reloadSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(reload, 250);
    };
    const unsubscribe = subscribeWithAuth((supabase) =>
      supabase
        .channel(`notices:${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notices", filter: `user_id=eq.${userId}` }, reloadSoon)
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setLive(true);
            reloadSoon(); // nachholen, was beim Verbindungsaufbau kam
          } else if (isRealtimeDown(status)) setLive(false);
        }),
    );
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [userId, reload]);

  // Zurück im Tab → nachladen; zusätzlich minütlich (Realtime gestört) bzw. alle 5 Minuten (Sicherheitsnetz)
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => document.visibilityState === "visible" && reload(), live ? SAFETY_POLL_MS : POLL_MS);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload, live]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const notices = (data?.notices ?? []).filter((n) => !hidden.has(n.id));
  const unread = notices.filter((n) => !n.readAt).length;
  // Nach dem Öffnen gilt alles bis zum nächsten Laden als gelesen (Server wird parallel aktualisiert)
  const count = readLocally ? 0 : unread;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setReadLocally(true);
      void api("/notices/read", { method: "POST" })
        .then(reload)
        .catch(() => {})
        .finally(() => setReadLocally(false));
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={count ? `Benachrichtigungen, ${count} neu` : "Benachrichtigungen"}
        className={cx(
          "relative grid size-10 place-items-center rounded-full text-fg-muted transition hover:bg-surface-3 hover:text-fg",
          open && "bg-surface-3 text-fg",
        )}
      >
        <Icon name="bell" className="size-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] leading-4 font-bold text-accent-fg ring-2 ring-surface">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Benachrichtigungen"
          className="fixed inset-x-4 top-16 z-50 overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-line-strong sm:absolute sm:inset-x-auto sm:top-12 sm:right-0 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold text-fg">Benachrichtigungen</p>
            {notices.length > 0 && <span className="text-xs text-fg-subtle">{notices.length} insgesamt</span>}
          </div>
          {notices.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-full bg-surface-3 text-fg-subtle">
                <Icon name="bell" className="size-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-fg">Alles erledigt</p>
              <p className="mt-0.5 text-xs text-fg-muted">Neue Terminanfragen und Hinweise erscheinen hier.</p>
            </div>
          ) : (
            <ul className="max-h-[min(70vh,28rem)] divide-y divide-line overflow-y-auto">
              {notices.map((n) => {
                const { title, text } = TEXT[n.kind](n.actorName, n.detail ?? "");
                const appointment = n.kind.startsWith("appointment_");
                return (
                  <li key={n.id} className={cx("flex items-start gap-3 px-4 py-3", !n.readAt && "bg-brand/10")}>
                    <IconTile
                      name={appointment ? "calendar" : "alert"}
                      tone={n.kind === "appointment_confirmed" || n.kind === "appointment_booked" ? "brand" : appointment ? "accent" : "warning"}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-fg">{title}</p>
                      <p className="mt-0.5 text-xs text-fg-muted">{text}</p>
                      <p className="mt-1 text-[11px] text-fg-subtle">{fmtDate(n.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Benachrichtigung entfernen"
                      onClick={() => {
                        setHidden((h) => new Set(h).add(n.id));
                        // Fehler beim Wegklicken sind unkritisch – Hinweise verschwinden spätestens nach 30 Tagen
                        void api(`/notices/${n.id}`, { method: "DELETE" }).catch(() => {});
                      }}
                      className="grid size-7 shrink-0 place-items-center rounded-lg text-fg-subtle hover:bg-surface-3 hover:text-fg"
                    >
                      <Icon name="x" className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
