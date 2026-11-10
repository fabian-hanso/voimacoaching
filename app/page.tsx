import Image from "next/image";
import Link from "next/link";
import heroImage from "@/public/images/hero-training.jpg";
import { Pricing } from "@/components/landing/pricing";
import { Logo } from "@/components/ui";
import { Suspense, type ReactNode } from "react";
import { GuestActions, HeaderActions } from "@/components/landing/header-actions";

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function Icon({ children, className = "size-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const icons = {
  plan: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5" />
    </>
  ),
  chat: (
    <>
      <path d="M21 12a8 8 0 0 1-11.8 7L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </>
  ),
  check: <path d="m5 12 5 5 9-10" />,
  flame: (
    <path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8Z" />
  ),
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </>
  ),
  phone: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  library: (
    <>
      <path d="M4 19V5M8 19V5M12 19 15 5M20 19l-3-14" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
    </>
  ),
};

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-bg/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-semibold text-fg md:flex">
          <a href="#trainer" className="hover:text-brand-ink/80">Für Trainer</a>
          <a href="#kunden" className="hover:text-brand-ink/80">Für Kunden</a>
          <a href="#features" className="hover:text-brand-ink/80">Features</a>
          <a href="#preise" className="hover:text-brand-ink/80">Preise</a>
        </nav>
        <div className="flex items-center gap-3">
          {/* Angemeldet → „Zum Dashboard“ (pro Anfrage ermittelt, Rest der Seite bleibt statisch) */}
          <Suspense fallback={<GuestActions />}>
            <HeaderActions />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function BackgroundGlow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-black)_5%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-black)_5%,transparent)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="absolute left-1/2 top-[-10rem] h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,var(--color-brand)_0%,transparent_65%)] opacity-40 blur-3xl" />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate">
      <BackgroundGlow />
      {/* Volle Breite: Bild von Rand zu Rand, Inhalt bleibt auf der Seitenbreite (max-w-7xl) */}
      <div>
        <div className="relative isolate overflow-hidden bg-brand-fg">
          <Image
            src={heroImage}
            alt="Gruppentraining: drei Personen machen Kniebeugen mit der Langhantel"
            fill
            placeholder="blur"
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
            className="-z-20 object-cover object-[60%_35%]"
          />
          {/* Verlauf für Lesbarkeit: mobil von unten, Desktop von links (feste Farben – gehören zum Foto, nicht zum Theme) */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/55 to-black/15 lg:bg-gradient-to-r lg:from-black/90 lg:via-black/50 lg:to-black/0"
          />
          <div aria-hidden="true" className="absolute -bottom-48 -left-24 -z-10 size-[30rem] rounded-full bg-brand opacity-25 blur-3xl" />

          <div className="mx-auto grid min-h-[max(36rem,calc(100svh-4rem))] max-w-7xl items-end gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:max-h-[56rem] lg:min-h-[max(40rem,calc(100svh-8rem))] lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-8">
            {/* Text */}
            <div className="max-w-2xl">
              <a
                href="#trainer"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur-md ring-inset hover:bg-white/15"
              >
                <span className="size-1.5 rounded-full bg-brand" />
                Neu: Fortschrittsfotos & Körpermaße im Vergleich
              </a>
              <h1 className="mt-6 text-4xl leading-[1.08] font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                <span className="block">Trainingspläne teilen.</span>
                {/* Eigener Block mit Abstand, damit der Balken die Unterlängen der Zeile darüber nicht verdeckt */}
                <span className="my-2 inline-block max-w-full rounded-control bg-brand px-3 py-1 leading-[1.05] text-brand-fg sm:my-3">
                  Fortschritt sehen.
                </span>
                <span className="block">Gemeinsam ans Ziel.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
                Voima Coach verbindet Personal Trainer und ihre Kunden. Trainer erstellen Pläne in Minuten –
                Kunden trainieren, loggen ihre Workouts und sehen jeden Erfolg schwarz auf weiß.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/registrieren?rolle=trainer"
                  className="flex h-12 items-center justify-center gap-2 rounded-control bg-brand px-6 font-semibold text-brand-fg transition hover:bg-brand-hover focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-black focus:outline-none"
                >
                  Ich bin Trainer
                  <Icon className="size-4">{icons.arrow}</Icon>
                </Link>
                <Link
                  href="/registrieren?rolle=kunde"
                  className="flex h-12 items-center justify-center gap-2 rounded-control bg-white/10 px-6 font-semibold text-white ring-1 ring-white/25 backdrop-blur-md transition ring-inset hover:bg-white/20"
                >
                  Ich trainiere mit Coach
                </Link>
              </div>

              <p className="mt-6 text-xs text-white/55">7 Tage kostenlos · Keine Kreditkarte nötig</p>
            </div>

            {/* Schwebende App-Karten (Desktop) */}
            <div aria-hidden="true" className="relative hidden h-[30rem] opacity-85 lg:block">
              <div className="absolute top-4 right-0 w-72 rounded-box bg-white p-5 text-brand-fg shadow-2xl motion-safe:animate-float">
                <p className="text-xs font-medium text-fg-muted">Heute · von Coach Marco</p>
                <p className="mt-1 text-lg font-bold">Unterkörper A</p>
                <div className="mt-3 h-2 rounded-full bg-surface-3">
                  <div className="h-2 w-1/2 rounded-full bg-brand" />
                </div>
                <p className="mt-1.5 text-xs text-fg-muted">2 von 4 Übungen · ca. 55 min</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {[
                    ["Kniebeuge", "4 × 6 @ 85 kg", true],
                    ["Rumän. Kreuzheben", "3 × 8 @ 70 kg", true],
                    ["Laufband", "20 min · Zone 2", false],
                  ].map(([name, detail, done]) => (
                    <li key={String(name)} className="flex items-center gap-2">
                      <span
                        className={`grid size-4 place-items-center rounded ${done ? "bg-brand-fg text-brand" : "ring-1 ring-line-strong"}`}
                      >
                        {done && <Icon className="size-3">{icons.check}</Icon>}
                      </span>
                      <span className={done ? "text-fg-muted line-through" : "font-medium"}>{name}</span>
                      <span className="ml-auto font-mono text-[10px] text-fg-subtle">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="absolute bottom-24 left-0 flex w-64 items-center gap-3 rounded-box bg-brand p-4 text-brand-fg shadow-2xl motion-safe:animate-float [animation-delay:-2s]">
                <span className="grid size-10 shrink-0 place-items-center rounded-control bg-brand-fg text-brand">
                  <Icon className="size-5">{icons.trophy}</Icon>
                </span>
                <div>
                  <p className="font-bold">Neuer Bestwert!</p>
                  <p className="text-sm text-brand-fg/75">Kniebeuge 85 kg × 6</p>
                </div>
              </div>

              <div className="absolute right-6 bottom-2 flex w-72 items-start gap-3 rounded-box bg-white/95 p-4 text-brand-fg shadow-2xl backdrop-blur motion-safe:animate-float [animation-delay:-4s]">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-fg">M</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">Coach Marco</p>
                  <p className="mt-0.5 text-sm text-fg-muted">Stark heute! Achte beim Split Squat auf die Knieposition 💪</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

function Stats() {
  const stats = [
    { value: "2.400+", label: "Personal Trainer" },
    { value: "38.000", label: "aktive Kunden" },
    { value: "1,2 Mio.", label: "geloggte Workouts" },
    { value: "4,9 / 5", label: "Bewertung im App Store" },
  ];
  return (
    <section className="border-y border-line bg-surface-2">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <dt className="text-sm text-fg-muted">{s.label}</dt>
            <dd className="mt-1 text-3xl font-bold tracking-tight text-fg">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Audience sections                                                   */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold text-brand-ink">{children}</p>;
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="mt-8 space-y-3 text-fg-muted">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand/30 text-brand-ink">
            <Icon className="size-3.5">{icons.check}</Icon>
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function ForTrainers() {
  return (
    <section id="trainer" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <Eyebrow>Für Personal Trainer</Eyebrow>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Mehr Kunden betreuen – ohne mehr Excel.
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Erstelle Pläne aus Vorlagen, weise sie mit einem Klick zu und behalte alle Kunden in einem Dashboard im
            Blick. Du siehst sofort, wer dranbleibt – und wer gerade Unterstützung braucht.
          </p>
          <CheckList
            items={[
              "Plan-Builder mit über 800 Übungen inkl. Videos",
              "Vorlagen speichern und für neue Kunden anpassen",
              "Automatische Hinweise bei verpassten Einheiten",
              "Check-ins, Notizen und Chat an einem Ort",
            ]}
          />
          <Link
            href="/registrieren?rolle=trainer"
            className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-brand-ink hover:text-brand-ink/80"
          >
            Trainer-Account erstellen <Icon className="size-4">{icons.arrow}</Icon>
          </Link>
        </div>

        {/* Plan builder mock */}
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-box bg-gradient-to-tr from-brand/10 to-surface" />
          <div className="rounded-box bg-surface p-6 shadow-xl ring-1 ring-line-strong">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-fg">Plan-Builder</p>
              <span className="rounded-inner bg-brand px-2.5 py-1 text-xs font-semibold text-brand-fg">
                Zuweisen an 3 Kunden
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs font-medium">
              {["Mo · Push", "Mi · Pull", "Fr · Beine"].map((d, i) => (
                <div
                  key={d}
                  className={`rounded-inner py-2 ${
                    i === 0
                      ? "bg-brand text-brand-fg"
                      : "bg-surface-3 text-fg-muted"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="mt-5 divide-y divide-line">
              {[
                ["Bankdrücken", "4", "8", "RPE 8"],
                ["Schulterdrücken KH", "3", "10", "RPE 7"],
                ["Dips", "3", "AMRAP", "—"],
                ["Seitheben", "3", "15", "RPE 9"],
              ].map(([ex, sets, reps, int]) => (
                <div key={ex} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 py-3 text-sm">
                  <span className="font-medium text-fg">{ex}</span>
                  <span className="font-mono text-xs text-fg-muted">{sets} Sätze</span>
                  <span className="font-mono text-xs text-fg-muted">{reps} Wdh.</span>
                  <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
                    {int}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-control border border-dashed border-line-strong py-2 text-sm text-fg-muted"
            >
              + Übung hinzufügen
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ForClients() {
  return (
    <section id="kunden" className="scroll-mt-20 bg-surface-2 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        {/* Phone mock */}
        <div className="order-last flex justify-center lg:order-first">
          <div className="w-72 rounded-[2.5rem] bg-black p-3 shadow-2xl ring-1 ring-line-strong">
            <div className="overflow-hidden rounded-[2rem] bg-surface">
              <div className="bg-gradient-to-br from-brand to-brand-strong px-5 pt-8 pb-6 text-brand-fg">
                <p className="text-sm opacity-80">Guten Morgen, Lena 👋</p>
                <p className="mt-1 text-xl font-bold">Unterkörper A</p>
                <p className="text-sm opacity-80">von Coach Marco · ca. 55 Min.</p>
                <div className="mt-4 h-2 rounded-full bg-fg/25">
                  <div className="h-2 w-1/2 rounded-full bg-surface" />
                </div>
                <p className="mt-1 text-xs opacity-80">2 von 4 Übungen erledigt</p>
              </div>
              <div className="space-y-3 p-4">
                <div className="rounded-tile p-3 ring-1 ring-line">
                  <p className="text-xs text-fg-muted">Nächster Satz</p>
                  <p className="font-semibold text-fg">Bulgarian Split Squat</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    {["Satz 1", "Satz 2", "Satz 3"].map((s, i) => (
                      <span
                        key={s}
                        className={`rounded-inner py-1.5 ${
                          i === 0
                            ? "bg-brand font-semibold text-brand-fg"
                            : "bg-surface-3 text-fg-muted"
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-tile p-3 ring-1 ring-line">
                  <span className="grid size-9 place-items-center rounded-control bg-warning/15 text-warning">
                    <Icon className="size-5">{icons.trophy}</Icon>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-fg">Neuer Bestwert!</p>
                    <p className="text-xs text-fg-muted">Kniebeuge 85 kg × 6</p>
                  </div>
                </div>
                <div className="rounded-tile bg-surface-2 p-3 text-xs text-fg-muted">
                  <span className="font-semibold text-fg">Coach Marco:</span> Stark heute!
                  Achte beim Split Squat auf die Knieposition 💪
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Eyebrow>Für Kunden</Eyebrow>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Dein Coach in der Hosentasche.
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Kein Zettel, keine Zettelwirtschaft: Dein Trainingsplan ist immer dabei. Logge Sätze und Gewichte mit
            einem Tipp, sieh deine Fortschritte als Grafik und bleib mit deinem Coach im direkten Austausch.
          </p>
          <CheckList
            items={[
              "Tagesplan mit Übungsvideos und Hinweisen deines Coaches",
              "Gewichte, Wiederholungen & Körpermaße in Sekunden erfassen",
              "Bestwerte, Streaks und Fortschrittsfotos im Überblick",
              "Direkter Chat mit deinem Trainer – auch offline nutzbar",
            ]}
          />
          <Link
            href="/registrieren?rolle=kunde"
            className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-brand-ink hover:text-brand-ink/80"
          >
            Einladung erhalten? Jetzt beitreten <Icon className="size-4">{icons.arrow}</Icon>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Features grid                                                       */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: icons.plan,
    title: "Individuelle Trainingspläne",
    text: "Baue periodisierte Pläne mit Sätzen, Wiederholungen, RPE und Pausen – oder starte aus einer Vorlage.",
  },
  {
    icon: icons.chart,
    title: "Progress-Tracking",
    text: "Kraftwerte, Volumen, Körpermaße und Fotos werden automatisch zu aussagekräftigen Verläufen.",
  },
  {
    icon: icons.users,
    title: "Kundenverwaltung",
    text: "Alle Kunden, Ziele und Termine in einer Übersicht. Lade neue Kunden per Link oder QR-Code ein.",
  },
  {
    icon: icons.chat,
    title: "Chat & Feedback",
    text: "Kommentiere einzelne Workouts, schicke Formchecks per Video und motiviere zur richtigen Zeit.",
  },
  {
    icon: icons.calendar,
    title: "Check-ins & Termine",
    text: "Wöchentliche Check-in-Fragebögen und Terminplanung für Live-Sessions – automatisch erinnert.",
  },
  {
    icon: icons.phone,
    title: "Apps für iOS & Android",
    text: "Kunden trainieren mit der nativen App, Trainer planen bequem am Desktop. Alles synchron.",
  },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Alles, was ihr braucht</Eyebrow>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Eine Plattform. Zwei Perspektiven.
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Trainer planen und analysieren, Kunden trainieren und wachsen – mit denselben Daten, in Echtzeit.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-box bg-surface p-6 ring-1 ring-line transition hover:shadow-lg hover:ring-line-strong"
            >
              <span className="grid size-10 place-items-center rounded-control bg-brand/30 text-brand-ink ring-1 ring-brand-ink/20 transition group-hover:bg-brand group-hover:text-brand-fg">
                <Icon>{f.icon}</Icon>
              </span>
              <h3 className="mt-5 font-semibold text-fg">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-fg-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const steps = [
    { title: "Trainer erstellt Plan", text: "Aus Vorlage oder von Grund auf – in wenigen Minuten fertig." },
    { title: "Kunde wird eingeladen", text: "Per Link oder QR-Code. Der Plan ist sofort in der App." },
    { title: "Training & Logging", text: "Der Kunde trainiert und erfasst Sätze, Gewichte und Notizen." },
    { title: "Fortschritt & Anpassung", text: "Der Trainer sieht die Daten live und passt den Plan an." },
  ];
  return (
    <section className="bg-surface py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand-ink">So funktioniert&apos;s</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Vom Plan zum Ergebnis in vier Schritten.
          </h2>
        </div>
        <ol className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="relative border-l border-line pl-6">
              <span className="font-mono text-sm text-brand-ink">0{i + 1}</span>
              <h3 className="mt-2 font-semibold text-fg">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-fg-subtle">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Testimonials                                                        */
/* ------------------------------------------------------------------ */

function Testimonials() {
  const quotes = [
    {
      text: "Ich betreue inzwischen 40 Online-Kunden statt 15. Das Dashboard zeigt mir sofort, wo ich nachhaken muss.",
      name: "Marco Weber",
      role: "Personal Trainer, Köln",
    },
    {
      text: "Endlich sehe ich schwarz auf weiß, wie stark ich geworden bin. Das motiviert mich mehr als jeder Spiegel.",
      name: "Lena Müller",
      role: "Kundin seit 8 Monaten",
    },
    {
      text: "Vorlagen, Check-ins, Chat – alles an einem Ort. Ich spare locker fünf Stunden pro Woche an Verwaltung.",
      name: "Sarah Koch",
      role: "Coach für Frauenfitness, Berlin",
    },
  ];
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Stimmen</Eyebrow>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Von Trainern und Kunden geliebt.
          </h2>
        </div>
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {quotes.map((q) => (
            <figure
              key={q.name}
              className="flex flex-col rounded-box bg-surface-2 p-8 ring-1 ring-line"
            >
              <blockquote className="flex-1 text-fg">„{q.text}“</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-strong font-semibold text-brand-fg">
                  {q.name[0]}
                </span>
                <div>
                  <p className="font-semibold text-fg">{q.name}</p>
                  <p className="text-sm text-fg-muted">{q.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* CTA + Footer                                                        */
/* ------------------------------------------------------------------ */

function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -z-10 h-[30rem] w-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand/15 to-brand/5 blur-3xl"
      />
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
          Bereit für messbare Ergebnisse?
        </h2>
        <p className="mt-4 text-lg text-fg-muted">
          Starte heute als Trainer oder nimm die Einladung deines Coaches an. Das erste Workout ist nur ein paar
          Klicks entfernt.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/registrieren?rolle=trainer"
            className="flex h-12 items-center justify-center gap-2 rounded-control bg-brand px-6 font-semibold text-brand-fg hover:bg-brand-hover"
          >
            <Icon className="size-4">{icons.bolt}</Icon>
            Als Trainer starten
          </Link>
          <Link
            href="/registrieren?rolle=kunde"
            className="flex h-12 items-center justify-center gap-2 rounded-control bg-surface px-6 font-semibold text-fg shadow-sm ring-1 ring-line-strong hover:bg-surface-2"
          >
            <Icon className="size-4">{icons.flame}</Icon>
            Als Kunde beitreten
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const columns = [
    { title: "Produkt", links: ["Für Trainer", "Für Kunden", "Features", "Preise"] },
    { title: "Ressourcen", links: ["Hilfe-Center", "Übungsbibliothek", "Blog", "Status"] },
    { title: "Rechtliches", links: ["Impressum", "Datenschutz", "AGB", "Cookies"] },
  ];
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-fg-muted">
            Die Plattform für Personal Trainer und ihre Kunden. Made in Germany, DSGVO-konform.
          </p>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-semibold text-fg">{c.title}</p>
            <ul className="mt-4 space-y-3 text-sm text-fg-muted">
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#" className="hover:text-fg">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line py-6 text-center text-sm text-fg-muted">
        © 2026 Voima Coach. Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Stats />
        <ForTrainers />
        <ForClients />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
