"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Realtime-Abo mit Login-Token. Gibt eine Aufräumfunktion zurück (für useEffect).
 *
 * Wichtig: Erst die Sitzung laden und den Token an Realtime geben, DANN abonnieren.
 * Direkt nach einem Seitenaufruf liest Supabase die Sitzung noch asynchron aus dem Cookie –
 * ein sofortiges Abo liefe ohne Login-Token. RLS filtert dann still alle Ereignisse heraus,
 * der Status ist trotzdem „SUBSCRIBED“ (es greift also auch kein Fallback).
 */
export function subscribeWithAuth(build: (supabase: SupabaseClient) => RealtimeChannel): () => void {
  const supabase = supabaseBrowser();
  let channel: RealtimeChannel | null = null;
  let cancelled = false;

  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
    } catch {
      // ohne Token geht es weiter; Aufrufer haben einen Fallback (Nachladen)
    }
    if (!cancelled) channel = build(supabase);
  })();

  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
  };
}

/** Realtime-Status, bei dem Ereignisse ausbleiben können → Fallback (Nachladen) aktivieren. */
export const isRealtimeDown = (status: string) => status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED";
