"use client";

import { Icon } from "@/components/icons";
import { useMessaging } from "./messaging-context";

export function MessagesButton() {
  const { unreadTotal, open } = useMessaging();
  return (
    <button
      type="button"
      onClick={() => open()}
      aria-label={
        unreadTotal ? `Nachrichten, ${unreadTotal} ungelesen` : "Nachrichten"
      }
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
