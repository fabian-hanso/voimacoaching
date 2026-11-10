import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "../icons";
import { cx } from "../ui";

/* ------------------------------------------------------------------ */
/* Layout-Bausteine der Landingpage                                    */
/* ------------------------------------------------------------------ */

/** Seitenbreite mit Rand – überall gleich. */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

/**
 * Abschnitt mit einheitlichem Abstand. `id` macht ihn per Anker erreichbar (Navigation),
 * `labelledBy` verknüpft ihn mit seiner Überschrift (Barrierefreiheit/SEO).
 */
export function Section({
  id,
  labelledBy,
  muted,
  flushTop,
  className,
  children,
}: {
  id?: string;
  labelledBy?: string;
  /** grauer Hintergrund zur Abgrenzung */
  muted?: boolean;
  /** kein Abstand oben (z. B. direkt nach einem Abschnitt mit gleichem Hintergrund) */
  flushTop?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cx(
        "scroll-mt-20 pb-20 sm:pb-28",
        !flushTop && "pt-20 sm:pt-28",
        muted && "bg-surface-2",
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}

/** Kleine Zeile über einer Überschrift, mit Lime-Punkt. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-sm font-semibold text-fg-muted">
      <span
        className="size-1.5 rounded-full bg-brand ring-2 ring-brand/40"
        aria-hidden="true"
      />
      {children}
    </p>
  );
}

/** Eyebrow + H2 + optionaler Einleitungstext – immer linksbündig. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  children,
  className,
}: {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  /** Einleitungstext unter der Überschrift */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("max-w-2xl", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        id={id}
        className="mt-3 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl"
      >
        {title}
      </h2>
      {children && <p className="mt-4 text-lg text-fg-muted">{children}</p>}
    </div>
  );
}

/** Aufzählung mit Lime-Häkchen. */
export function CheckList({
  items,
  className,
}: {
  items: ReactNode[];
  className?: string;
}) {
  return (
    <ul className={cx("space-y-3 text-fg-muted", className)}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-brand-fg">
            <Icon name="check" className="size-3.5" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* CTA                                                                 */
/* ------------------------------------------------------------------ */

const CTA_VARIANTS = {
  /** Lime – Hauptaktion */
  primary:
    "bg-brand text-brand-fg hover:bg-brand-hover focus-visible:ring-brand",
  /** Glas auf dunklem Foto (Hero) */
  glass:
    "bg-white/10 text-white ring-1 ring-white/25 ring-inset backdrop-blur-md hover:bg-white/20 focus-visible:ring-white",
  /** Schwarz – auf Lime-Flächen */
  dark: "bg-brand-fg text-white hover:bg-black focus-visible:ring-brand-fg",
  /** Hell – Zweitaktion auf Lime-Flächen */
  light:
    "bg-white/60 text-brand-fg ring-1 ring-brand-fg/15 ring-inset hover:bg-white focus-visible:ring-brand-fg",
} as const;

/** Großer CTA-Link – überall gleiche Höhe und Rundung, Variante je nach Untergrund. */
export function CtaLink({
  href,
  variant = "primary",
  icon,
  arrow,
  children,
}: {
  href: string;
  variant?: keyof typeof CTA_VARIANTS;
  icon?: IconName;
  /** Pfeil rechts – für die Hauptaktion */
  arrow?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "flex h-12 items-center justify-center gap-2 rounded-control px-6 font-semibold transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none",
        CTA_VARIANTS[variant],
      )}
    >
      {icon && <Icon name={icon} className="size-4" />}
      {children}
      {arrow && <Icon name="arrow" className="size-4" />}
    </Link>
  );
}

/** Reihe von CTAs: mobil untereinander, ab sm nebeneinander. */
export function CtaRow({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("flex flex-col gap-3 sm:flex-row", className)}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Zielgruppen-Abschnitt: Text + Checkliste + CTA neben einer Vorschau */
/* ------------------------------------------------------------------ */

export function AudienceSection({
  id,
  eyebrow,
  title,
  intro,
  points,
  cta,
  preview,
  previewFirst,
  muted,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  points: string[];
  cta: { href: string; label: string };
  /** dekorative Produkt-Vorschau */
  preview: ReactNode;
  /** Vorschau auf Desktop links statt rechts */
  previewFirst?: boolean;
  muted?: boolean;
}) {
  const titleId = `${id}-titel`;
  return (
    <Section id={id} labelledBy={titleId} muted={muted}>
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading id={titleId} eyebrow={eyebrow} title={title}>
            {intro}
          </SectionHeading>
          <CheckList items={points} className="mt-8" />
          <CtaRow className="mt-10">
            <CtaLink href={cta.href} arrow>
              {cta.label}
            </CtaLink>
          </CtaRow>
        </div>
        <div
          aria-hidden="true"
          className={cx("order-last", previewFirst && "lg:order-first")}
        >
          {preview}
        </div>
      </div>
    </Section>
  );
}
