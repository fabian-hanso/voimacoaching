"use client";

import { Icon } from "@/components/icons";
import { Avatar, cx } from "@/components/ui";
import type { ConversationPartner } from "@/lib/types";
import { useEffect } from "react";
import { fmtPreviewTime } from "./chat-format";
import { ChatThread } from "./chat-thread";
import { useMessaging } from "./messaging-context";

export function ChatDrawer({
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
    (!isTrainer && me.trainer && me.trainer.id === partnerId
      ? { ...me.trainer, role: "trainer" }
      : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Nachrichten"
    >
      <button
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 bg-fg/30 backdrop-blur-[2px]"
      />
      <div className="relative flex h-full w-full flex-col bg-surface shadow-2xl sm:max-w-md">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4">
          {partner && isTrainer && (
            <button
              onClick={() => onSelect(null)}
              aria-label="Zurück zur Übersicht"
              className="grid size-9 place-items-center rounded-control text-fg-muted hover:bg-surface-3"
            >
              <Icon name="chevronLeft" className="size-5" />
            </button>
          )}
          {partner ? (
            <>
              <Avatar name={partner.name} src={partner.avatarUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">
                  {partner.name}
                </p>
                <p className="truncate text-xs text-fg-muted">
                  {partner.role === "trainer" ? "Dein Coach" : "Kunde"}
                </p>
              </div>
            </>
          ) : (
            <p className="flex-1 text-base font-semibold text-fg">
              Nachrichten
            </p>
          )}
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="grid size-9 place-items-center rounded-control text-fg-muted hover:bg-surface-3"
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
                <p
                  className={cx(
                    "truncate text-sm text-fg",
                    c.unread ? "font-bold" : "font-semibold",
                  )}
                >
                  {c.partner.name}
                </p>
                {c.lastMessage && (
                  <span className="shrink-0 text-xs text-fg-subtle">
                    {fmtPreviewTime(c.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cx(
                    "truncate text-sm",
                    c.unread ? "font-medium text-fg" : "text-fg-muted",
                  )}
                >
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
