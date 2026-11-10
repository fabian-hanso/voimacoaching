import type { CSSProperties, ReactNode } from "react";
import { Icon } from "../icons";
import { cx } from "../ui";

/**
 * Karte, die beim Laden von unten einschwebt (`riseDelay`) und danach sanft schwebt (`floatDelay`).
 * Außen: Position + Einschweben, innen: Schweben – zwei Transforms, darum zwei Elemente.
 */
function FloatingCard({
  position,
  riseDelay,
  floatDelay,
  className,
  children,
}: {
  position: string;
  riseDelay: string;
  floatDelay?: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx("absolute motion-safe:animate-rise-in", position)}
      style={{ "--rise-delay": riseDelay } as CSSProperties}
    >
      <div
        className={cx(
          "rounded-box text-brand-fg shadow-2xl motion-safe:animate-float",
          className,
        )}
        style={
          floatDelay
            ? ({ "--float-delay": floatDelay } as CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}

/** Schwebende App-Karten im Hero (nur Desktop, dekorativ): Plan, Terminanfrage, Kursbelegung. */
export function HeroCards() {
  return (
    <div
      aria-hidden="true"
      className="relative hidden h-[30rem] opacity-85 lg:block"
    >
      <FloatingCard
        position="top-2 right-0 w-72"
        riseDelay="200ms"
        className="bg-white p-5"
      >
        <p className="text-xs font-medium text-fg-muted">
          Plan · Kraft 3× pro Woche
        </p>
        <p className="mt-1 text-lg font-bold">Unterkörper A</p>
        <ul className="mt-4 space-y-2.5 text-sm">
          {(
            [
              ["Kniebeuge", "4 × 6 · 85 kg", true],
              ["Rumän. Kreuzheben", "3 × 8 · 70 kg", false],
              ["Laufband", "20 min · Zone 2", false],
            ] as const
          ).map(([name, detail, note]) => (
            <li key={name} className="flex items-center gap-2">
              <span className="font-medium">{name}</span>
              {note && <span className="size-1.5 rounded-full bg-accent" />}
              <span className="ml-auto font-mono text-[10px] text-fg-subtle">
                {detail}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-tile bg-brand/30 px-3 py-2 text-xs text-fg">
          <span className="font-semibold">Hinweis:</span> Knie aktiv nach außen
          drücken.
        </p>
      </FloatingCard>

      <FloatingCard
        position="top-52 left-0 w-64"
        riseDelay="700ms"
        floatDelay="-2s"
        className="bg-brand p-4"
      >
        <p className="flex items-center gap-2 text-xs font-semibold">
          <Icon name="calendar" className="size-3.5" /> Neue Terminanfrage
        </p>
        <p className="mt-1.5 font-bold">Personal Training</p>
        <p className="text-sm text-brand-fg/75">Do · 18:00 – 19:00 · Lena M.</p>
        <div className="mt-3 flex gap-2 text-xs font-semibold">
          <span className="rounded-inner bg-brand-fg px-2.5 py-1.5 text-white">
            Bestätigen
          </span>
          <span className="rounded-inner bg-brand-fg/10 px-2.5 py-1.5">
            Ablehnen
          </span>
        </div>
      </FloatingCard>

      <FloatingCard
        position="right-6 bottom-0 w-72"
        riseDelay="1500ms"
        floatDelay="-4s"
        className="bg-white/95 p-4 backdrop-blur"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Yoga Flow</p>
          <span className="text-xs text-fg-muted">Mi · 19:00</span>
        </div>
        <div className="mt-2.5 h-2 rounded-full bg-surface-3">
          <div className="h-2 w-4/5 rounded-full bg-brand-fg" />
        </div>
        <p className="mt-1.5 text-xs text-fg-muted">
          12 von 15 Plätzen gebucht
        </p>
      </FloatingCard>
    </div>
  );
}
