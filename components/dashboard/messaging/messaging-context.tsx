"use client";

import type { Conversation, MeResponse, Message } from "@/lib/types";
import { createContext, useContext } from "react";

export type MessageEvent = { type: "INSERT" | "UPDATE"; message: Message };

export type Listener = (e: MessageEvent) => void;

export interface MessagingContext {
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

export const Ctx = createContext<MessagingContext | null>(null);

export function useMessaging() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error(
      "useMessaging muss innerhalb von <MessagingProvider> verwendet werden.",
    );
  return ctx;
}
