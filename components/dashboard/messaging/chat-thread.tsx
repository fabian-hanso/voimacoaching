"use client";

import { Icon } from "@/components/icons";
import { Alert, Avatar, cx, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { ConversationPartner, Message } from "@/lib/types";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fmtDay, fmtTime } from "./chat-format";
import { useMessaging } from "./messaging-context";

const PAGE = 50;

export function ChatThread({ partner }: { partner: ConversationPartner }) {
  const {
    me,
    subscribe,
    resync,
    live,
    reload: reloadConversations,
  } = useMessaging();
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
        } else
          setError(
            errorMessage(err, "Nachrichten konnten nicht geladen werden."),
          );
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
          const byId = new Map(
            prev.filter((m) => !m.id.startsWith("tmp-")).map((m) => [m.id, m]),
          );
          for (const m of r.messages) byId.set(m.id, m);
          const temps = prev.filter((m) => m.id.startsWith("tmp-"));
          return [
            ...[...byId.values()].sort((a, b) =>
              a.createdAt.localeCompare(b.createdAt),
            ),
            ...temps,
          ];
        });
      })
      .catch((err: unknown) => {
        if (!cancelled && err instanceof ApiClientError && err.status === 404)
          setGone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [resync, base]);

  // Live-Updates nur für diese Unterhaltung
  useEffect(
    () =>
      subscribe(({ type, message }) => {
        if (message.trainerId !== partner.id && message.clientId !== partner.id)
          return;
        setMessages((prev) => {
          if (type === "UPDATE")
            return prev.map((m) => (m.id === message.id ? message : m));
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }),
    [subscribe, partner.id],
  );

  // Ungelesene Nachrichten des Gegenübers als gelesen markieren, solange der Chat offen ist
  const unreadFromPartner = messages.filter(
    (m) => m.senderId === partner.id && !m.readAt,
  ).length;
  useEffect(() => {
    if (unreadFromPartner > 0)
      void api(`${base}/read`, { method: "POST" }).catch(() => {});
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
      r = await api<{ messages: Message[] }>(
        `${base}/messages?limit=${PAGE}&before=${encodeURIComponent(messages[0].createdAt)}`,
      );
    } catch (err) {
      setError(
        errorMessage(err, "Ältere Nachrichten konnten nicht geladen werden."),
      );
      return;
    }
    setHasMore(r.messages.length === PAGE);
    setMessages((prev) => [
      ...r.messages.filter((m) => !prev.some((p) => p.id === m.id)),
      ...prev,
    ]);
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
        prev.some((m) => m.id === saved.id)
          ? prev.filter((m) => m.id !== tempId)
          : prev.map((m) => (m.id === tempId ? saved : m)),
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

  const lastOwn = [...messages]
    .reverse()
    .find((m) => m.senderId === me.user.id);

  if (gone) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-3 text-fg-subtle">
            <Icon name="chat" className="size-6" />
          </span>
          <p className="mt-4 font-semibold text-fg">
            Unterhaltung nicht mehr verfügbar
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            {partner.name} ist nicht mehr mit dir verbunden – das Konto wurde
            gelöscht oder die Verbindung getrennt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!live && (
        <div className="shrink-0 bg-warning/10 px-4 py-1.5 text-center text-xs text-warning">
          Verbindung unterbrochen – neue Nachrichten werden regelmäßig
          nachgeladen.
        </div>
      )}
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 overflow-y-auto bg-surface-2 px-4 py-4"
      >
        {loading ? (
          <Spinner />
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <Avatar
                name={partner.name}
                src={partner.avatarUrl}
                size="3xl"
                className="mx-auto"
              />
              <p className="mt-3 text-sm font-semibold text-fg">
                Schreib {partner.name.split(" ")[0]} eine Nachricht
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                Fragen zum Plan, Feedback zum Training – alles hier.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {hasMore && (
              <div className="pb-3 text-center">
                <button
                  onClick={loadOlder}
                  className="text-xs font-medium text-brand-ink hover:text-brand-ink/80"
                >
                  Ältere Nachrichten laden
                </button>
              </div>
            )}
            {messages.map((m, i) => {
              const mine = m.senderId === me.user.id;
              const prev = messages[i - 1];
              const newDay =
                !prev ||
                new Date(prev.createdAt).toDateString() !==
                  new Date(m.createdAt).toDateString();
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
                  <div
                    className={cx(
                      "flex",
                      mine ? "justify-end" : "justify-start",
                      !grouped && "mt-3",
                    )}
                  >
                    <div
                      className={cx(
                        "max-w-[80%] rounded-tile px-3.5 py-2 text-sm whitespace-pre-wrap break-words shadow-sm",
                        mine
                          ? "rounded-br-md bg-brand text-brand-fg"
                          : "rounded-bl-md bg-surface text-fg ring-1 ring-line",
                        m.id.startsWith("tmp-") && "opacity-60",
                      )}
                    >
                      {m.body}
                      <span
                        className={cx(
                          "mt-0.5 block text-right text-[10px]",
                          mine ? "text-brand-fg/70" : "text-fg-subtle",
                        )}
                      >
                        {fmtTime(m.createdAt)}
                      </span>
                    </div>
                  </div>
                  {m.id === lastOwn?.id && m.readAt && (
                    <p className="mt-1 text-right text-[10px] text-fg-subtle">
                      Gelesen {fmtTime(m.readAt)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={send}
        className="shrink-0 border-t border-line bg-surface p-3"
      >
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
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void send();
              }
            }}
            rows={Math.min(5, Math.max(1, text.split("\n").length))}
            maxLength={4000}
            placeholder="Nachricht schreiben …"
            aria-label="Nachricht"
            className="block max-h-40 min-h-10 flex-1 resize-none rounded-control border-0 bg-surface-3 px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:ring-2 focus:ring-brand-ink focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Senden"
            className="grid size-10 shrink-0 place-items-center rounded-control bg-brand text-brand-fg transition hover:bg-brand-hover disabled:opacity-40"
          >
            <Icon name="send" className="size-4" />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-fg-subtle">
          Enter senden · Shift + Enter neue Zeile
        </p>
      </form>
    </>
  );
}
