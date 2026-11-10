"use client";

import { Icon, IconTile, type IconName, type Tone } from "@/components/icons";

export function QuickAction({
  icon,
  tone,
  title,
  text,
  onClick,
}: {
  icon: IconName;
  tone: Tone;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-tile p-2 text-left transition hover:bg-surface-2"
    >
      <IconTile name={icon} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="block truncate text-xs text-fg-muted">{text}</span>
      </span>
      <Icon
        name="arrow"
        className="size-4 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-brand-ink"
      />
    </button>
  );
}
