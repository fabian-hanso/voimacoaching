"use client";

import { Icon, type IconName } from "@/components/icons";

export function ContactLink({
  href,
  icon,
  label,
  external,
}: {
  href: string;
  icon: IconName;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex items-center gap-3 rounded-tile px-3 py-2 text-sm font-medium text-fg ring-1 ring-line transition hover:bg-surface-2"
    >
      <Icon name={icon} className="size-4 shrink-0 text-brand-ink" />
      <span className="truncate">{label}</span>
    </a>
  );
}
