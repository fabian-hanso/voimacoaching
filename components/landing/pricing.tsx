"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cx } from "../ui";
import { Icon, IconTile } from "../icons";

type Billing = "monthly" | "yearly";

/* ------------------------------------------------------------------ */
/* Preise (Platzhalter) – Jahrespreis = 10 × Monatspreis ÷ 12          */
/* („2 Monate gratis“)                                                  */
/* ------------------------------------------------------------------ */

interface TrainerPackage {
  id: string;
  label: string;
  monthly: number;
  yearly: number;
  popular?: boolean;
}

const TRAINER_PACKAGES: TrainerPackage[] = [
  { id: "10", label: "bis 10 Kunden", monthly: 19, yearly: 16 },
  { id: "20", label: "bis 20 Kunden", monthly: 29, yearly: 24, popular: true },
  { id: "unbegrenzt", label: "Unbegrenzt", monthly: 49, yearly: 41 },
];

const STUDIO = { monthly: 299, yearly: 249 };

const TRAINER_FEATURES = [
  "Unbegrenzte Pläne & Vorlagen",
  "Übungskatalog inkl. Ausdauergeräten",
  "Kunden-Dashboard mit Aktivitätsstatus",
  "Echtzeit-Chat mit allen Kunden",
  "Einladungen per Link oder Code",
  "Fortschritt jedes Kunden im Blick",
];

const euro = (n: number) => `${new Intl.NumberFormat("de-DE").format(n)} €`;

/* ------------------------------------------------------------------ */

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <section id="preise" className="relative isolate scroll-mt-20 overflow-hidden bg-surface-2 py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="absolute top-1/3 left-2/3 -z-10 h-[36rem] w-[50rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,var(--color-brand)_0%,transparent_65%)] opacity-30 blur-3xl"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Kopf */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand-ink">Preise</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-5xl">
              Fair für Trainer.{" "}
              <span className="rounded-xl bg-brand box-decoration-clone px-2 text-brand-fg">Kostenlos für Kunden.</span>
            </h2>
            <p className="mt-4 text-lg text-fg-muted">
              Deine Kunden zahlen nie etwas. Du zahlst nur nach Anzahl deiner Kunden – alle Funktionen sind immer dabei.
            </p>
          </div>
          <BillingToggle billing={billing} onChange={setBilling} />
        </div>

        {/* Trainer – Hauptprodukt mit aufgefächerten Paketen */}
        <div className="mt-14 rounded-[2rem] bg-surface p-6 ring-1 ring-line sm:p-10 xl:p-12">
          <div className="grid gap-12 xl:grid-cols-[1fr_1.2fr] xl:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand/40 px-3 py-1 text-xs font-semibold text-brand-ink">
                <Icon name="dumbbell" className="size-3.5" /> Für Personal Trainer
              </span>
              <h3 className="mt-4 text-3xl font-extrabold tracking-tight text-fg">Trainer</h3>
              <p className="mt-2 max-w-md text-fg-muted">
                Alles, was du für professionelles Coaching brauchst. Wähle einfach das Paket, das zu deiner Kundenzahl passt –
                ein Wechsel ist jederzeit möglich.
              </p>
              <ul className="mt-8 grid gap-3 text-sm text-fg-muted sm:grid-cols-2">
                {TRAINER_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <TrainerDeck billing={billing} />
          </div>
        </div>

        {/* Kunde & Studio */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <SideCard
            icon="user"
            tone="brand"
            name="Kunde"
            description="Für alle, die mit einem Coach trainieren – App, Pläne, Tracking und Chat."
            price="0 €"
            note="für immer kostenlos"
            cta="Einladung annehmen"
            href="/registrieren?rolle=kunde"
          />
          <SideCard
            icon="building"
            tone="neutral"
            name="Studio"
            description="Für Teams: bis zu 10 Trainer, eigenes Logo für deine Kunden und Kunden-Übergabe, wenn ein Trainer ausfällt."
            price={euro(STUDIO[billing])}
            perMonth
            note={
              billing === "yearly"
                ? `${euro(STUDIO.yearly * 12)} jährlich · unbegrenzt viele Kunden`
                : "monatlich kündbar · unbegrenzt viele Kunden"
            }
            cta="Studio anlegen"
            href="/registrieren?rolle=studio"
          />
        </div>

        {/* Vertrauen */}
        <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-fg-muted">
          {["14 Tage kostenlos testen", "Monatlich kündbar", "Keine Kreditkarte nötig", "Kunden immer kostenlos"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-brand text-brand-fg">
                <Icon name="check" className="size-3" />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Aufgefächerte Paket-Karten mit dezenter Scroll-Bewegung             */
/* ------------------------------------------------------------------ */

// Endposition (voll aufgefächert): [links, Mitte, rechts] = [10, 20, Unbegrenzt]
// f = Parallax-Faktor: wie stark sich die Karte beim Scrollen vertikal verschiebt
const FAN = [
  { x: "-10.5rem", y: "1.75rem", r: "-9deg", z: 20, f: 1 },
  { x: "0rem", y: "-0.75rem", r: "0deg", z: 30, f: -0.5 },
  { x: "10.5rem", y: "1.75rem", r: "9deg", z: 20, f: 1 },
];

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const smooth = (t: number) => t * t * (3 - 2 * t); // sanftes Ein-/Ausblenden

/**
 * Setzt beim Scrollen zwei CSS-Variablen am Element (ohne React-Re-Render):
 *  --spread  0.88 → 1   Karten fächern beim Hereinscrollen auf und bleiben dann offen
 *  --shift   ±12px      leichte Parallaxe
 * Nur ab Desktop-Breite und ohne „Bewegung reduzieren“.
 */
function useScrollFan<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 1024px)");
    let frame = 0;
    let visible = false;

    const update = () => {
      frame = 0;
      if (reduced.matches || !desktop.matches) {
        el.style.setProperty("--spread", "1");
        el.style.setProperty("--shift", "0px");
        return;
      }
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 = Oberkante erreicht den unteren Bildschirmrand, 1 = Unterkante verlässt den oberen Rand
      const progress = clamp((vh - rect.top) / (vh + rect.height));
      const spread = 0.88 + 0.12 * smooth(clamp(progress / 0.45)); // ab ~45 % voll aufgefächert
      el.style.setProperty("--spread", spread.toFixed(3));
      el.style.setProperty("--shift", `${((progress - 0.5) * 24).toFixed(1)}px`);
    };
    const schedule = () => {
      if (visible && !frame) frame = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    });
    io.observe(el);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", update);
    desktop.addEventListener("change", update);
    update();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", update);
      desktop.removeEventListener("change", update);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}

function TrainerDeck({ billing }: { billing: Billing }) {
  const ref = useScrollFan<HTMLDivElement>();

  return (
    // Mobil: Karten nebeneinander/untereinander. Ab lg: aufgefächert.
    <div ref={ref} className="group/deck grid gap-4 sm:grid-cols-3 lg:relative lg:block lg:h-[21rem]">
      {TRAINER_PACKAGES.map((p, i) => (
        <PackageCard
          key={p.id}
          pkg={p}
          billing={billing}
          variant={i === 0 ? "light" : i === 1 ? "dark" : "lime"}
          back={i !== 1}
          style={
            {
              "--x": FAN[i].x,
              "--y": FAN[i].y,
              "--r": FAN[i].r,
              "--f": FAN[i].f,
              "--z": FAN[i].z,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function PackageCard({
  pkg,
  billing,
  variant,
  style,
  back,
}: {
  pkg: TrainerPackage;
  billing: Billing;
  variant: "light" | "dark" | "lime";
  style: CSSProperties;
  /** Hintere Karte: gedimmt, kommt beim Hover/Fokus nach vorn */
  back?: boolean;
}) {
  const dark = variant === "dark";
  const lime = variant === "lime";
  const muted = dark ? "text-white/60" : lime ? "text-brand-fg/65" : "text-fg-muted";

  return (
    <div
      style={style}
      className={cx(
        "flex flex-col rounded-3xl p-6 shadow-xl",
        // ab lg: absolut positioniert, Position/Rotation über CSS-Variablen
        "lg:absolute lg:top-6 lg:left-1/2 lg:-ml-28 lg:h-[16.5rem] lg:w-56 lg:z-[var(--z)]",
        // Hover/Fokus: nach vorn holen, voll sichtbar, leicht anheben (--lift fließt in die Position ein)
        "lg:transition-[opacity,transform] lg:duration-200 lg:ease-out",
        "lg:hover:z-40 lg:hover:opacity-100 lg:hover:[--lift:-0.75rem] lg:focus-within:z-40 lg:focus-within:opacity-100 lg:focus-within:[--lift:-0.75rem]",
        back
          ? "deck-back lg:opacity-60"
          : // Mittlere Karte tritt zurück, solange eine hintere Karte aktiv ist
            "lg:group-has-[.deck-back:hover]/deck:opacity-60 lg:group-has-[.deck-back:focus-within]/deck:opacity-60",
        // Position = Endposition × Auffächerung (--spread) + Parallaxe (--shift × --f), gesetzt von useScrollFan
        "lg:[transform:translate(calc(var(--x)*var(--spread,1)),calc(var(--y)_+_var(--shift,0px)*var(--f,0)_+_var(--lift,0px)))_rotate(calc(var(--r)*var(--spread,1)))] lg:will-change-transform",
        dark && "bg-brand-fg text-white shadow-brand-fg/25",
        lime && "bg-brand text-brand-fg shadow-brand-ink/20",
        variant === "light" && "bg-surface text-fg ring-1 ring-line-strong",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cx(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            dark ? "bg-white/10 text-white" : lime ? "bg-brand-fg/10" : "bg-surface-3 text-fg",
          )}
        >
          {pkg.label}
        </span>
        {pkg.popular && (
          <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-[11px] font-semibold text-accent-fg">
            <Icon name="sparkles" className="size-3" /> Beliebt
          </span>
        )}
      </div>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold tracking-tight tabular-nums">{euro(pkg[billing])}</span>
        <span className={cx("text-sm", muted)}>/ Monat</span>
      </div>
      <p className={cx("mt-1 text-xs", muted)}>
        {billing === "yearly" ? `${euro(pkg.yearly * 12)} jährlich` : "monatlich kündbar"}
      </p>

      <Link
        href={`/registrieren?rolle=trainer&paket=${pkg.id}`}
        className={cx(
          "mt-6 flex h-11 items-center lg:mt-auto justify-center gap-2 rounded-xl text-sm font-semibold transition",
          dark && "bg-brand text-brand-fg hover:bg-brand-hover",
          lime && "bg-brand-fg text-white hover:bg-brand-fg/85",
          variant === "light" && "bg-brand-fg text-white hover:bg-brand-fg/85",
        )}
      >
        Kostenlos testen <Icon name="arrow" className="size-4" />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kunde & Studio                                                      */
/* ------------------------------------------------------------------ */

function SideCard({
  icon,
  tone,
  name,
  description,
  price,
  perMonth,
  note,
  cta,
  href,
}: {
  icon: "user" | "building";
  tone: "brand" | "neutral";
  name: string;
  description: string;
  price: string;
  perMonth?: boolean;
  note: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col gap-6 rounded-3xl bg-surface p-6 ring-1 ring-line sm:flex-row sm:items-center sm:p-8">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <IconTile name={icon} tone={tone} />
          <h3 className="text-xl font-bold text-fg">{name}</h3>
        </div>
        <p className="mt-3 text-sm text-fg-muted">{description}</p>
      </div>
      <div className="shrink-0 sm:w-48 sm:text-right">
        <p className="text-3xl font-extrabold tracking-tight text-fg tabular-nums">
          {price}
          {perMonth && <span className="ml-1 text-sm font-medium text-fg-muted">/ Monat</span>}
        </p>
        <p className="mt-1 text-xs text-fg-subtle">{note}</p>
        <Link
          href={href}
          className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-surface-3 px-4 text-sm font-semibold text-fg ring-1 ring-line-strong transition hover:bg-line-strong"
        >
          {cta} <Icon name="arrow" className="size-4" />
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BillingToggle({ billing, onChange }: { billing: Billing; onChange: (b: Billing) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Zahlweise"
      className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-surface p-1 ring-1 ring-line lg:self-auto"
    >
      {(
        [
          ["monthly", "Monatlich"],
          ["yearly", "Jährlich"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={billing === value}
          onClick={() => onChange(value)}
          className={cx(
            "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
            billing === value ? "bg-brand-fg text-white shadow-sm" : "text-fg-muted hover:text-fg",
          )}
        >
          {label}
          {value === "yearly" && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-fg">2 Monate gratis</span>
          )}
        </button>
      ))}
    </div>
  );
}

function Check() {
  return (
    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand/40 text-brand-ink">
      <Icon name="check" className="size-3" />
    </span>
  );
}
