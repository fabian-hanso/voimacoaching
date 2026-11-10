"use client";

import { useApi } from "@/lib/client/api";
import { isRealtimeDown, subscribeWithAuth } from "@/lib/client/realtime";
import type { Conversation, MeResponse, Message } from "@/lib/types";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChatDrawer } from "./chat-drawer";
import {
  Ctx,
  Listener,
  MessageEvent,
  MessagingContext,
} from "./messaging-context";

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

export function MessagingProvider({
  me,
  children,
}: {
  me: MeResponse;
  children: ReactNode;
}) {
  const conv = useApi<{ conversations: Conversation[]; unreadTotal: number }>(
    "/conversations",
  );
  const listeners = useRef(new Set<Listener>());
  const [drawer, setDrawer] = useState<{
    open: boolean;
    partnerId: string | null;
  }>({ open: false, partnerId: null });
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
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `${column}=eq.${me.user.id}`,
          },
          (payload) => {
            if (
              payload.eventType !== "INSERT" &&
              payload.eventType !== "UPDATE"
            )
              return;
            const event: MessageEvent = {
              type: payload.eventType,
              message: toMessage(payload.new),
            };
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
    (partnerId?: string | null) =>
      setDrawer({ open: true, partnerId: partnerId ?? me.trainer?.id ?? null }),
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
