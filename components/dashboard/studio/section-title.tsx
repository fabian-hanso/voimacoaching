"use client";

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold text-fg">{title}</h3>
        {subtitle && <p className="text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
