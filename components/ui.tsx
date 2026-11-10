import Image from "next/image";
import Link from "next/link";
import logoMark from "@/public/logo.jpg";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/** Kleine UI-Bausteine im Tailwind-Look, geteilt von Login, Registrierung und Dashboard. */

/** Verbindet Klassen; bei Konflikten (z. B. `w-full` vs. `w-28`) gewinnt die spätere Klasse. */
export function cx(...classes: (string | false | null | undefined)[]) {
  return twMerge(classes.filter(Boolean).join(" "));
}

/** Voima-Coach-Logo (Bildmarke aus /public/logo.jpg) mit Schriftzug. */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cx("flex items-center gap-2.5 font-bold tracking-tight text-fg", className)}>
      <Image src={logoMark} alt="" width={32} height={32} className="size-8 rounded-lg" />
      Voima Coach
    </Link>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:bg-brand-hover",
  secondary: "bg-surface-3 text-fg ring-1 ring-line-strong hover:bg-line-strong",
  ghost: "text-fg-muted hover:bg-fg/5 hover:text-fg",
  danger: "text-danger hover:bg-danger/10",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
        variants[variant],
        className,
      )}
    />
  );
}

const fieldBase =
  "block w-full rounded-lg border-0 bg-surface-2 px-3 py-2 text-sm text-fg ring-1 ring-line-strong ring-inset placeholder:text-fg-subtle focus:ring-2 focus:ring-brand-ink focus:outline-none";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldBase, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldBase, className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  // select-chevron (globals.css): eigener, eingerückter Pfeil statt des bündigen Browser-Pfeils
  return <select {...props} className={cx(fieldBase, "select-chevron pr-10", className)} />;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-fg-muted">{hint}</span>}
    </label>
  );
}

export function Card({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={cx("rounded-2xl bg-surface p-6 ring-1 ring-line", className)}>
      {children}
    </div>
  );
}

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  const tones = {
    error: "bg-danger/10 text-danger ring-danger/25",
    success: "bg-success/10 text-success ring-success/25",
    info: "bg-brand/30 text-brand-ink ring-brand-ink/20",
  };
  return <div className={cx("rounded-lg px-3 py-2 text-sm ring-1 ring-inset", tones[tone])}>{children}</div>;
}

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "accent";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-surface-3 text-fg-muted",
    brand: "bg-brand/30 text-brand-ink ring-1 ring-brand-ink/20 ring-inset",
    success: "bg-success/10 text-success ring-1 ring-success/25 ring-inset",
    warning: "bg-warning/10 text-warning ring-1 ring-warning/25 ring-inset",
    danger: "bg-danger/10 text-danger ring-1 ring-danger/25 ring-inset",
    accent: "bg-accent/20 text-accent-soft ring-1 ring-accent/40 ring-inset",
  };
  return <span className={cx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="size-6 animate-spin rounded-full border-2 border-line border-t-brand-ink" />
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="font-semibold text-fg">{title}</p>
      <p className="mt-1 text-sm text-fg-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="relative isolate flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -z-10 h-[24rem] w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand/15 to-brand/5 blur-3xl"
      />
      <Logo />
      <div className="mt-8 w-full max-w-md rounded-2xl bg-surface p-8 shadow-xl ring-1 ring-line-strong">
        <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

const avatarSizes = {
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-12 text-base",
  "2xl": "size-16 text-xl",
  "3xl": "size-24 text-3xl",
} as const;

/** Profilbild – mit Initialen (z. B. „FH“) als Fallback, wenn kein Bild hinterlegt ist. */
export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof avatarSizes;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  const base = cx("shrink-0 rounded-full ring-2 ring-surface", avatarSizes[size], className);
  if (src) {
    // Bereits serverseitig auf 512×512 verkleinert → kein next/image nötig
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} loading="lazy" className={cx(base, "bg-surface-3 object-cover")} />;
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={cx(base, "grid place-items-center bg-gradient-to-br from-brand to-brand-strong font-semibold text-brand-fg")}
    >
      {initials || "?"}
    </span>
  );
}

/** Fehler beim Laden – mit „Erneut versuchen“. */
export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger ring-1 ring-danger/25 ring-inset">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-semibold underline-offset-2 hover:underline">
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
