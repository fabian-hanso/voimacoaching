"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiClientError, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { isRealtimeDown, subscribeWithAuth } from "@/lib/client/realtime";
import { Alert, Avatar, cx, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { Conversation, ConversationPartner, MeResponse, Message } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Provider: eine Realtime-Verbindung pro Nutzer                       */
/* ------------------------------------------------------------------ */

type MessageEvent = { type: "INSERT" | "UPDATE"; message: Message };
type Listener = (e: MessageEvent) => void;

interface MessagingContext {
  me: MeResponse;
  conversations: Conversation[];
  unreadTotal: number;
  reload: () => void;
  /** Öffnet das Chat-Fenster – optional direkt in einer Unterhaltung. */
  open: (partnerId?: string | null) => void;
  subscribe: (l: Listener) => () => void;
  /** Steigt, wenn verpasste Nachrichten nachgeladen werden sollten (Tab wieder aktiv, Verbindung zurück). */
  resync: number;
  /** false, solange die Realtime-Verbindung gestört ist (dann wird regelmäßig nachgeladen). */
  live: boolean;
}

const Ctx = createContext<MessagingContext | null>(null);

export function useMessaging() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMessaging muss innerhalb von <MessagingProvider> verwendet werden.");
  return ctx;
}

/** Realtime-Payload (snake_case) → Message. */
function toMessage(r: Record<string, unknown>): Message {
  return {
    id: String(r.id),
    trainerId: String(r.trainer_id),
    clientId: String(r.client_id),
    senderId: String(r.sender_id),
    body: String(r.body),
    createdAt: new Date(String(r.created_at)).toISOString(),
    readAt: r.read_at ? new Date(String(r.read_at)).toISOString() : null,
  };
}

export function MessagingProvider({ me, children }: { me: MeResponse; children: ReactNode }) {
  const conv = useApi<{ conversations: Conversation[]; unreadTotal: number }>("/conversations");
  const listeners = useRef(new Set<Listener>());
  const [drawer, setDrawer] = useState<{ open: boolean; partnerId: string | null }>({ open: false, partnerId: null });
  const [live, setLive] = useState(true);
  const liveRef = useRef(true);
  const [resync, setResync] = useState(0);
  const { reload } = conv;

  // Realtime: Änderungen an eigenen Nachrichten (RLS sorgt dafür, dass nur eigene ankommen)
  useEffect(() => {
    const column = me.user.role === "trainer" ? "trainer_id" : "client_id";
    // subscribeWithAuth: erst Login-Token an Realtime, dann abonnieren (sonst kommen nach einem Reload keine Ereignisse an)
    return subscribeWithAuth((supabase) =>
      supabase
        .channel(`messages:${me.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages", filter: `${column}=eq.${me.user.id}` },
          (payload) => {
            if (payload.eventType !== "INSERT" && payload.eventType !== "UPDATE") return;
            const event: MessageEvent = { type: payload.eventType, message: toMessage(payload.new) };
            listeners.current.forEach((l) => l(event));
            reload();
          },
        )
        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            // (Wieder) verbunden → nachholen, was beim Verbindungsaufbau bzw. in der Zwischenzeit kam
            reload();
            setResync((n) => n + 1);
            liveRef.current = true;
            setLive(true);
          } else if (isRealtimeDown(status)) {
            if (err) console.warn("[realtime]", status, err.message);
            liveRef.current = false;
            setLive(false); // supabase-js versucht automatisch neu zu verbinden
          }
        }),
    );
  }, [me.user.id, me.user.role, reload]);

  // Fallback: solange Realtime gestört ist, alle 20 s nachladen
  useEffect(() => {
    if (live) return;
    const t = setInterval(() => {
      reload();
      setResync((n) => n + 1);
    }, 20_000);
    return () => clearInterval(t);
  }, [live, reload]);

  // Tab wieder sichtbar (z. B. nach Standby) → verpasste Nachrichten nachholen
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      reload();
      setResync((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  const subscribe = useCallback((l: Listener) => {
    listeners.current.add(l);
    return () => void listeners.current.delete(l);
  }, []);

  const open = useCallback(
    (partnerId?: string | null) => setDrawer({ open: true, partnerId: partnerId ?? me.trainer?.id ?? null }),
    [me.trainer?.id],
  );

  const value: MessagingContext = {
    me,
    conversations: conv.data?.conversations ?? [],
    unreadTotal: conv.data?.unreadTotal ?? 0,
    reload,
    open,
    subscribe,
    resync,
    live,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {drawer.open && (
        <ChatDrawer
          partnerId={drawer.partnerId}
          onSelect={(partnerId) => setDrawer({ open: true, partnerId })}
          onClose={() => setDrawer({ open: false, partnerId: null })}
        />
      )}
    </Ctx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Header-Button mit Zähler                                            */
/* ------------------------------------------------------------------ */

export function MessagesButton() {
  const { unreadTotal, open } = useMessaging();
  return (
    <button
      type="button"
      onClick={() => open()}
      aria-label={unreadTotal ? `Nachrichten, ${unreadTotal} ungelesen` : "Nachrichten"}
      className="relative grid size-10 place-items-center rounded-full text-fg-muted transition hover:bg-surface-3 hover:text-fg"
    >
      <Icon name="chat" className="size-5" />
      {unreadTotal > 0 && (
        <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] leading-4 font-bold text-accent-fg ring-2 ring-surface">
          {unreadTotal > 9 ? "9+" : unreadTotal}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Seitliches Chat-Fenster                                             */
/* ------------------------------------------------------------------ */

function ChatDrawer({
  partnerId,
  onSelect,
  onClose,
}: {
  partnerId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const { me, conversations } = useMessaging();
  const isTrainer = me.user.role === "trainer";
  const partner: ConversationPartner | null =
    conversations.find((c) => c.partner.id === partnerId)?.partner ??
    (!isTrainer && me.trainer && me.trainer.id === partnerId ? { ...me.trainer, role: "trainer" } : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Nachrichten">
      <button aria-label="Schließen" onClick={onClose} className="absolute inset-0 bg-fg/30 backdrop-blur-[2px]" />
      <div className="relative flex h-full w-full flex-col bg-surface shadow-2xl sm:max-w-md">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4">
          {partner && isTrainer && (
            <button
              onClick={() => onSelect(null)}
              aria-label="Zurück zur Übersicht"
              className="grid size-9 place-items-center rounded-lg text-fg-muted hover:bg-surface-3"
            >
              <Icon name="chevronLeft" className="size-5" />
            </button>
          )}
          {partner ? (
            <>
              <Avatar name={partner.name} src={partner.avatarUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{partner.name}</p>
                <p className="truncate text-xs text-fg-muted">{partner.role === "trainer" ? "Dein Coach" : "Kunde"}</p>
              </div>
            </>
          ) : (
            <p className="flex-1 text-base font-semibold text-fg">Nachrichten</p>
          )}
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="grid size-9 place-items-center rounded-lg text-fg-muted hover:bg-surface-3"
          >
            <Icon name="x" className="size-5" />
          </button>
        </header>

        {partner ? (
          <ChatThread key={partner.id} partner={partner} />
        ) : isTrainer ? (
          <Inbox onSelect={onSelect} />
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center text-sm text-fg-muted">
            Verbinde dich zuerst mit deinem Coach, um Nachrichten zu schreiben.
          </div>
        )}
      </div>
    </div>
  );
}

const fmtTime = (iso: string) => new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function fmtDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Heute";
  if (d.toDateString() === yesterday.toDateString()) return "Gestern";
  return new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

function fmtPreviewTime(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? fmtTime(iso)
    : new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(d);
}

function Inbox({ onSelect }: { onSelect: (id: string) => void }) {
  const { me, conversations } = useMessaging();
  if (!conversations.length) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center text-sm text-fg-muted">
        Noch keine Kunden. Lade Kunden ein, um mit ihnen zu schreiben.
      </div>
    );
  }
  return (
    <ul className="flex-1 divide-y divide-line overflow-y-auto">
      {conversations.map((c) => (
        <li key={c.partner.id}>
          <button
            onClick={() => onSelect(c.partner.id)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2"
          >
            <Avatar name={c.partner.name} src={c.partner.avatarUrl} size="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className={cx("truncate text-sm text-fg", c.unread ? "font-bold" : "font-semibold")}>
                  {c.partner.name}
                </p>
                {c.lastMessage && <span className="shrink-0 text-xs text-fg-subtle">{fmtPreviewTime(c.lastMessage.createdAt)}</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className={cx("truncate text-sm", c.unread ? "font-medium text-fg" : "text-fg-muted")}>
                  {c.lastMessage
                    ? `${c.lastMessage.senderId === me.user.id ? "Du: " : ""}${c.lastMessage.body}`
                    : "Noch keine Nachrichten"}
                </p>
                {c.unread > 0 && (
                  <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] leading-5 font-bold text-accent-fg">
                    {c.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Unterhaltung                                                        */
/* ------------------------------------------------------------------ */

const PAGE = 50;

function ChatThread({ partner }: { partner: ConversationPartner }) {
  const { me, subscribe, resync, live, reload: reloadConversations } = useMessaging();
  const [gone, setGone] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const base = `/conversations/${partner.id}`;

  // Erste Seite laden
  useEffect(() => {
    let cancelled = false;
    api<{ messages: Message[] }>(`${base}/messages?limit=${PAGE}`)
      .then((r) => {
        if (cancelled) return;
        setMessages(r.messages);
        setHasMore(r.messages.length === PAGE);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 404) {
          setGone(true);
          reloadConversations();
        } else setError(errorMessage(err, "Nachrichten konnten nicht geladen werden."));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [base, reloadConversations]);

  // Nachholen verpasster Nachrichten (Tab wieder aktiv / Verbindung zurück): neueste Seite holen und zusammenführen
  useEffect(() => {
    if (resync === 0) return;
    let cancelled = false;
    api<{ messages: Message[] }>(`${base}/messages?limit=${PAGE}`)
      .then((r) => {
        if (cancelled) return;
        setMessages((prev) => {
          const byId = new Map(prev.filter((m) => !m.id.startsWith("tmp-")).map((m) => [m.id, m]));
          for (const m of r.messages) byId.set(m.id, m);
          const temps = prev.filter((m) => m.id.startsWith("tmp-"));
          return [...[...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), ...temps];
        });
      })
      .catch((err: unknown) => {
        if (!cancelled && err instanceof ApiClientError && err.status === 404) setGone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [resync, base]);

  // Live-Updates nur für diese Unterhaltung
  useEffect(
    () =>
      subscribe(({ type, message }) => {
        if (message.trainerId !== partner.id && message.clientId !== partner.id) return;
        setMessages((prev) => {
          if (type === "UPDATE") return prev.map((m) => (m.id === message.id ? message : m));
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }),
    [subscribe, partner.id],
  );

  // Ungelesene Nachrichten des Gegenübers als gelesen markieren, solange der Chat offen ist
  const unreadFromPartner = messages.filter((m) => m.senderId === partner.id && !m.readAt).length;
  useEffect(() => {
    if (unreadFromPartner > 0) void api(`${base}/read`, { method: "POST" }).catch(() => {});
  }, [unreadFromPartner, base]);

  // Automatisch nach unten scrollen, wenn man ohnehin unten war
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function loadOlder() {
    const el = scroller.current;
    const prevHeight = el?.scrollHeight ?? 0;
    stickToBottom.current = false;
    let r: { messages: Message[] };
    try {
      r = await api<{ messages: Message[] }>(`${base}/messages?limit=${PAGE}&before=${encodeURIComponent(messages[0].createdAt)}`);
    } catch (err) {
      setError(errorMessage(err, "Ältere Nachrichten konnten nicht geladen werden."));
      return;
    }
    setHasMore(r.messages.length === PAGE);
    setMessages((prev) => [...r.messages.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    });
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setError(null);
    setText("");
    stickToBottom.current = true;
    // Optimistisch anzeigen, bis die Antwort der API (oder das Realtime-Event) kommt
    const tempId = `tmp-${Date.now()}`;
    const isTrainer = me.user.role === "trainer";
    const temp: Message = {
      id: tempId,
      trainerId: isTrainer ? me.user.id : partner.id,
      clientId: isTrainer ? partner.id : me.user.id,
      senderId: me.user.id,
      body,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setMessages((prev) => [...prev, temp]);
    try {
      const saved = await api<Message>(`${base}/messages`, { body: { body } });
      setMessages((prev) =>
        prev.some((m) => m.id === saved.id) ? prev.filter((m) => m.id !== tempId) : prev.map((m) => (m.id === tempId ? saved : m)),
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(body); // Text nicht verlieren
      if (err instanceof ApiClientError && err.status === 404) {
        setGone(true);
        reloadConversations();
      } else {
        setError(errorMessage(err, "Nachricht konnte nicht gesendet werden."));
      }
    }
  }

  const lastOwn = [...messages].reverse().find((m) => m.senderId === me.user.id);

  if (gone) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-3 text-fg-subtle">
            <Icon name="chat" className="size-6" />
          </span>
          <p className="mt-4 font-semibold text-fg">Unterhaltung nicht mehr verfügbar</p>
          <p className="mt-1 text-sm text-fg-muted">
            {partner.name} ist nicht mehr mit dir verbunden – das Konto wurde gelöscht oder die Verbindung getrennt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!live && (
        <div className="shrink-0 bg-warning/10 px-4 py-1.5 text-center text-xs text-warning">
          Verbindung unterbrochen – neue Nachrichten werden regelmäßig nachgeladen.
        </div>
      )}
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 overflow-y-auto bg-surface-2 px-4 py-4"
      >
        {loading ? (
          <Spinner />
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <Avatar name={partner.name} src={partner.avatarUrl} size="3xl" className="mx-auto" />
              <p className="mt-3 text-sm font-semibold text-fg">Schreib {partner.name.split(" ")[0]} eine Nachricht</p>
              <p className="mt-1 text-xs text-fg-muted">Fragen zum Plan, Feedback zum Training – alles hier.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {hasMore && (
              <div className="pb-3 text-center">
                <button onClick={loadOlder} className="text-xs font-medium text-brand-ink hover:text-brand-ink/80">
                  Ältere Nachrichten laden
                </button>
              </div>
            )}
            {messages.map((m, i) => {
              const mine = m.senderId === me.user.id;
              const prev = messages[i - 1];
              const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
              const grouped = prev && !newDay && prev.senderId === m.senderId;
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="my-4 flex justify-center">
                      <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-fg-muted ring-1 ring-line">
                        {fmtDay(m.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={cx("flex", mine ? "justify-end" : "justify-start", !grouped && "mt-3")}>
                    <div
                      className={cx(
                        "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words shadow-sm",
                        mine
                          ? "rounded-br-md bg-brand text-brand-fg"
                          : "rounded-bl-md bg-surface text-fg ring-1 ring-line",
                        m.id.startsWith("tmp-") && "opacity-60",
                      )}
                    >
                      {m.body}
                      <span className={cx("mt-0.5 block text-right text-[10px]", mine ? "text-brand-fg/70" : "text-fg-subtle")}>
                        {fmtTime(m.createdAt)}
                      </span>
                    </div>
                  </div>
                  {m.id === lastOwn?.id && m.readAt && (
                    <p className="mt-1 text-right text-[10px] text-fg-subtle">Gelesen {fmtTime(m.readAt)}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form onSubmit={send} className="shrink-0 border-t border-line bg-surface p-3">
        {error && (
          <div className="mb-2">
            <Alert>{error}</Alert>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
            rows={Math.min(5, Math.max(1, text.split("\n").length))}
            maxLength={4000}
            placeholder="Nachricht schreiben …"
            aria-label="Nachricht"
            className="block max-h-40 min-h-10 flex-1 resize-none rounded-xl border-0 bg-surface-3 px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:ring-2 focus:ring-brand-ink focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Senden"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-fg transition hover:bg-brand-hover disabled:opacity-40"
          >
            <Icon name="send" className="size-4" />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-fg-subtle">Enter senden · Shift + Enter neue Zeile</p>
      </form>
    </>
  );
}
