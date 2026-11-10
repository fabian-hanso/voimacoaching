import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import heroImage from "@/public/images/hero-training.jpg";
import { Pricing } from "@/components/landing/pricing";
import { GuestActions, HeaderActions } from "@/components/landing/header-actions";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/ui";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/* ------------------------------------------------------------------ */
/* SEO                                                                 */
/* ------------------------------------------------------------------ */

const TITLE = "Software für Personal Trainer & Fitnessstudios | Voima Coach";
const DESCRIPTION =
  "Trainingspläne mit Übungsanleitungen, Terminbuchung, Kurse und Kundenverwaltung in einer App. Für Personal Trainer und Studios – 7 Tage kostenlos testen, Kunden nutzen Voima gratis.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/** FAQ – sichtbar auf der Seite und als strukturierte Daten (FAQPage) für Suchmaschinen. */
const FAQ: { q: string; a: string }[] = [
  {
    q: "Was kostet Voima Coach für meine Kunden?",
    a: "Nichts. Kunden nutzen Voima Coach dauerhaft kostenlos. Bezahlt wird nur vom Trainer oder Studio – je nach Paket.",
  },
  {
    q: "Wie kommen meine Kunden in die App?",
    a: "Du schickst deinen Kunden einen Einladungscode. Damit registrieren sie sich und sind direkt mit dir verbunden. Studios hängen zusätzlich einen Mitglieds-QR-Code an der Rezeption aus.",
  },
  {
    q: "Brauche ich als Personal Trainer ein Studio?",
    a: "Nein. Als selbstständiger Trainer nutzt du Voima Coach allein – mit eigenen Kunden, Plänen und Terminen. Arbeitest du in einem Studio, lädt es dich ins Team ein.",
  },
  {
    q: "Was bekommt ein Fitnessstudio zusätzlich?",
    a: "Bis zu 10 Trainer im Team, Kunden zuweisen und bei Ausfall übertragen, Kurse mit Platzkontingent, einen gemeinsamen Wochenkalender, Mitglieds-Code mit QR und eine eigene Studio-Seite mit Logo, Öffnungszeiten und Team.",
  },
  {
    q: "Können Kunden Termine und Kurse selbst buchen?",
    a: "Ja. Trainer legen Angebote und ihre Verfügbarkeit fest, Kunden fragen freie Zeiten an und der Trainer bestätigt. Kurse buchen Studio-Mitglieder direkt – überbucht wird dabei nie.",
  },
  {
    q: "Brauche ich eine App aus dem App Store?",
    a: "Nein. Voima Coach läuft im Browser auf Smartphone, Tablet und Desktop – ohne Installation.",
  },
  {
    q: "Kann ich Voima Coach kostenlos testen?",
    a: "Ja, 7 Tage lang und ohne Kreditkarte. Danach ist das Abo monatlich kündbar.",
  },
];

function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "de",
        description: DESCRIPTION,
        offers: { "@type": "AggregateOffer", priceCurrency: "EUR", lowPrice: "0", highPrice: "299" },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      // `<` maskieren, damit kein Inhalt aus dem Script-Tag ausbrechen kann
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Bausteine                                                           */
/* ------------------------------------------------------------------ */

const container = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-sm font-semibold text-fg-muted">
      <span className="size-1.5 rounded-full bg-brand ring-2 ring-brand/40" aria-hidden="true" />
      {children}
    </p>
  );
}

function CheckList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-8 space-y-3 text-fg-muted">
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

function PrimaryCta({ href, children, dark }: { href: string; children: ReactNode; dark?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex h-12 items-center justify-center gap-2 rounded-control bg-brand px-6 font-semibold text-brand-fg transition hover:bg-brand-hover focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:outline-none ${dark ? "focus:ring-offset-black" : "focus:ring-offset-bg"}`}
    >
      {children}
      <Icon name="arrow" className="size-4" />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

const NAV = [
  ["#trainer", "Für Trainer"],
  ["#studios", "Für Studios"],
  ["#funktionen", "Funktionen"],
  ["#preise", "Preise"],
  ["#faq", "FAQ"],
] as const;

function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-bg/80 backdrop-blur-sm">
      <div className={`${container} flex h-16 items-center justify-between`}>
        <Logo />
        <nav aria-label="Hauptnavigation" className="hidden items-center gap-8 text-sm font-semibold text-fg md:flex">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className="text-fg-muted transition hover:text-fg">
              {label}
            </a>
          ))}
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

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-brand-fg">
      <Image
        src={heroImage}
        alt="Gruppentraining im Studio: drei Personen machen Kniebeugen mit der Langhantel"
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
        className="absolute inset-0 -z-10 bg-linear-to-t from-black/90 via-black/60 to-black/20 lg:bg-linear-to-r lg:from-black/90 lg:via-black/55 lg:to-black/5"
      />

      <div
        className={`${container} grid min-h-[max(36rem,calc(100svh-4rem))] items-end gap-10 py-12 sm:py-16 lg:max-h-[56rem] lg:min-h-[max(40rem,calc(100svh-8rem))] lg:grid-cols-[1.15fr_1fr] lg:items-center`}
      >
        <div className="max-w-2xl">
          <a
            href="#funktionen"
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur-md ring-inset hover:bg-white/15"
          >
            <span className="size-1.5 rounded-full bg-brand" />
            Neu: Übungskatalog mit Anleitungen
          </a>
          <h1 className="mt-6 text-4xl leading-[1.08] font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="block">Die Software für</span>
            {/* Eigener Block mit Abstand, damit der Balken die Unterlängen der Zeile darüber nicht verdeckt */}
            <span className="my-2 inline-block max-w-full rounded-control bg-brand px-3 py-1 leading-[1.05] text-brand-fg sm:my-3">
              Personal Trainer
            </span>
            <span className="block">und Fitnessstudios.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
            Trainingspläne mit Übungsanleitungen, Terminbuchung, Kurse und Kundenverwaltung – an einem Ort. Deine Kunden
            trainieren nach Plan, du siehst jeden Fortschritt.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryCta href="/registrieren?rolle=trainer" dark>
              Als Trainer starten
            </PrimaryCta>
            <Link
              href="/registrieren?rolle=studio"
              className="flex h-12 items-center justify-center gap-2 rounded-control bg-white/10 px-6 font-semibold text-white ring-1 ring-white/25 backdrop-blur-md transition ring-inset hover:bg-white/20"
            >
              <Icon name="building" className="size-4" />
              Studio anlegen
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/55">7 Tage kostenlos · Keine Kreditkarte nötig · Für Kunden immer gratis</p>
        </div>

        <HeroCards />
      </div>
    </section>
  );
}

/** Schwebende App-Karten (nur Desktop, dekorativ). */
function HeroCards() {
  return (
    <div aria-hidden="true" className="relative hidden h-[30rem] opacity-85 lg:block">
      <div className="absolute top-2 right-0 w-72 rounded-box bg-white p-5 text-brand-fg shadow-2xl motion-safe:animate-float">
        <p className="text-xs font-medium text-fg-muted">Plan · Kraft 3× pro Woche</p>
        <p className="mt-1 text-lg font-bold">Unterkörper A</p>
        <ul className="mt-4 space-y-2.5 text-sm">
          {[
            ["Kniebeuge", "4 × 6 · 85 kg", true],
            ["Rumän. Kreuzheben", "3 × 8 · 70 kg", false],
            ["Laufband", "20 min · Zone 2", false],
          ].map(([name, detail, note]) => (
            <li key={String(name)} className="flex items-center gap-2">
              <span className="font-medium">{name}</span>
              {note && <span className="size-1.5 rounded-full bg-accent" />}
              <span className="ml-auto font-mono text-[10px] text-fg-subtle">{detail}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-tile bg-brand/30 px-3 py-2 text-xs text-fg">
          <span className="font-semibold">Hinweis:</span> Knie aktiv nach außen drücken.
        </p>
      </div>

      <div className="absolute top-52 left-0 w-64 rounded-box bg-brand p-4 text-brand-fg shadow-2xl motion-safe:animate-float [animation-delay:-2s]">
        <p className="flex items-center gap-2 text-xs font-semibold">
          <Icon name="calendar" className="size-3.5" /> Neue Terminanfrage
        </p>
        <p className="mt-1.5 font-bold">Personal Training</p>
        <p className="text-sm text-brand-fg/75">Do · 18:00 – 19:00 · Lena M.</p>
        <div className="mt-3 flex gap-2 text-xs font-semibold">
          <span className="rounded-inner bg-brand-fg px-2.5 py-1.5 text-white">Bestätigen</span>
          <span className="rounded-inner bg-brand-fg/10 px-2.5 py-1.5">Ablehnen</span>
        </div>
      </div>

      <div className="absolute right-6 bottom-0 w-72 rounded-box bg-white/95 p-4 text-brand-fg shadow-2xl backdrop-blur motion-safe:animate-float [animation-delay:-4s]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Yoga Flow</p>
          <span className="text-xs text-fg-muted">Mi · 19:00</span>
        </div>
        <div className="mt-2.5 h-2 rounded-full bg-surface-3">
          <div className="h-2 w-4/5 rounded-full bg-brand-fg" />
        </div>
        <p className="mt-1.5 text-xs text-fg-muted">12 von 15 Plätzen gebucht</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Funktionen auf einen Blick                                          */
/* ------------------------------------------------------------------ */

type Audience = "Trainer" | "Studios";

const FEATURES: { icon: IconName; title: string; text: string; for: Audience[] }[] = [
  {
    icon: "dumbbell",
    title: "Trainingspläne",
    text: "Kraft- und Ausdauerübungen mit Sätzen, Wiederholungen, Gewicht und Pausen. Einmal bauen, mehreren Kunden zuweisen.",
    for: ["Trainer"],
  },
  {
    icon: "book",
    title: "Übungskatalog mit Anleitungen",
    text: "46 Übungen mit Muskeln, Ausführung Schritt für Schritt und typischen Fehlern – ergänzt um deinen persönlichen Hinweis.",
    for: ["Trainer", "Studios"],
  },
  {
    icon: "chart",
    title: "Fortschritt im Blick",
    text: "Workouts, Bestwerte, Trainings-Streak, Volumen, Ausdauer und Körpermaße. Du siehst sofort, wer dranbleibt.",
    for: ["Trainer"],
  },
  {
    icon: "calendar",
    title: "Termine & Wochenkalender",
    text: "Angebote und Verfügbarkeit festlegen, Anfragen bestätigen, Termine auch für Gäste eintragen – ohne Doppelbuchung.",
    for: ["Trainer", "Studios"],
  },
  {
    icon: "users",
    title: "Kurse & Mitglieder",
    text: "Kurse mit festen Plätzen pro Termin, Anmeldung durch Mitglieder und ein Mitglieds-QR-Code für die Rezeption.",
    for: ["Studios"],
  },
  {
    icon: "chat",
    title: "Chat & Benachrichtigungen",
    text: "Direkter Chat mit jedem Kunden in Echtzeit. Neue Anfragen, Absagen und Kommentare landen sofort in der Glocke.",
    for: ["Trainer", "Studios"],
  },
];

function FeatureOverview() {
  return (
    <section id="funktionen" aria-labelledby="funktionen-titel" className="scroll-mt-20 py-20 sm:py-28">
      <div className={container}>
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Funktionen</Eyebrow>
          <h2 id="funktionen-titel" className="mt-3 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Alles fürs Coaching. Nichts, was du nicht brauchst.
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Pläne, Termine, Kurse und Kommunikation in einer Plattform – statt Excel, WhatsApp und Terminkalender.
          </p>
        </div>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-box bg-surface p-6 ring-1 ring-line">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-control bg-brand text-brand-fg">
                  <Icon name={f.icon} />
                </span>
                <span className="flex gap-1.5">
                  {f.for.map((a) => (
                    <span key={a} className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
                      {a}
                    </span>
                  ))}
                </span>
              </div>
              <h3 className="mt-5 font-semibold text-fg">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-fg-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Für Trainer                                                         */
/* ------------------------------------------------------------------ */

function ForTrainers() {
  return (
    <section id="trainer" aria-labelledby="trainer-titel" className="scroll-mt-20 bg-surface-2 py-20 sm:py-28">
      <div className={`${container} grid items-center gap-14 lg:grid-cols-2`}>
        <div>
          <Eyebrow>Für Personal Trainer</Eyebrow>
          <h2 id="trainer-titel" className="mt-3 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Mehr Zeit fürs Coaching, weniger für Verwaltung.
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Erstelle Trainingspläne in Minuten, gib jeder Übung eine Anleitung mit und sieh, wie deine Kunden trainieren –
            online wie vor Ort.
          </p>
          <CheckList
            items={[
              "Plan-Editor mit Übungen aus dem Katalog oder frei eingetragen",
              "Persönlicher Hinweis je Übung – deine Kunden sehen ihn direkt neben der Anleitung",
              "Kundenliste mit Status Aktiv, Inaktiv, Neu und Eingeladen",
              "Terminbuchung: Kunden fragen an, du bestätigst mit einem Klick",
              "Echtzeit-Chat und Benachrichtigungen bei allem Wichtigen",
            ]}
          />
          <div className="mt-10 flex">
            <PrimaryCta href="/registrieren?rolle=trainer">Trainer-Konto erstellen</PrimaryCta>
          </div>
        </div>

        {/* Plan-Editor (Illustration) */}
        <div aria-hidden="true" className="rounded-box bg-surface p-6 shadow-xl ring-1 ring-line-strong">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-fg">Oberkörper · Tag A</p>
            <span className="inline-flex items-center gap-1.5 rounded-control bg-surface-3 px-3 py-1.5 text-xs font-semibold text-fg">
              <Icon name="book" className="size-3.5" /> Aus Katalog wählen
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["Bankdrücken", "4 × 8 · 60 kg", "Schulterblätter zusammen, Füße fest am Boden."],
              ["Klimmzüge", "3 × 6", null],
              ["Schulterdrücken", "3 × 10 · 14 kg", null],
            ].map(([name, detail, note]) => (
              <div key={name} className="rounded-tile bg-surface-2 p-3 ring-1 ring-line">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-fg">{name}</span>
                  <Icon name="info" className="size-4 text-fg-subtle" />
                  <span className="ml-auto font-mono text-xs text-fg-muted">{detail}</span>
                </div>
                {note && (
                  <p className="mt-2 rounded-inner bg-surface px-2.5 py-1.5 text-xs text-fg-muted ring-1 ring-line">
                    <span className="font-semibold text-fg">Hinweis für den Kunden:</span> {note}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-tile bg-brand px-4 py-3 text-sm font-semibold text-brand-fg">
            Zuweisen an 3 Kunden
            <Icon name="arrow" className="size-4" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Für Studios                                                         */
/* ------------------------------------------------------------------ */

function ForStudios() {
  return (
    <section id="studios" aria-labelledby="studios-titel" className="scroll-mt-20 py-20 sm:py-28">
      <div className={`${container} grid items-center gap-14 lg:grid-cols-2`}>
        {/* Studio-Dashboard (Illustration) */}
        <div aria-hidden="true" className="order-last space-y-4 lg:order-first">
          <div className="rounded-box bg-surface p-6 shadow-xl ring-1 ring-line-strong">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-fg">Kurse diese Woche</p>
              <span className="text-xs text-fg-muted">Iron Gym</span>
            </div>
            <ul className="mt-4 space-y-4">
              {[
                ["Yoga Flow", "Mo · 18:00 · Raum 1", 12, 15],
                ["Spinning", "Mi · 07:00 · Cycling", 20, 20],
                ["Rücken-Fit", "Fr · 17:30 · Raum 2", 6, 12],
              ].map(([name, when, booked, cap]) => (
                <li key={name as string}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-fg">{name}</span>
                    <span className="text-xs text-fg-muted">
                      {booked === cap ? "ausgebucht" : `${booked}/${cap} Plätze`}
                    </span>
                  </div>
                  <p className="text-xs text-fg-subtle">{when}</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-surface-3">
                    <div
                      className={`h-1.5 rounded-full ${booked === cap ? "bg-fg" : "bg-brand-fg/70"}`}
                      style={{ width: `${((booked as number) / (cap as number)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-box bg-brand p-5 text-brand-fg shadow-xl">
            <span className="grid size-14 place-items-center rounded-tile bg-white">
              <Icon name="qr" className="size-9" />
            </span>
            <div>
              <p className="font-bold">Mitglieds-Code für die Rezeption</p>
              <p className="text-sm text-brand-fg/75">Scannen, registrieren, Kurse buchen.</p>
            </div>
          </div>
        </div>

        <div>
          <Eyebrow>Für Fitnessstudios</Eyebrow>
          <h2 id="studios-titel" className="mt-3 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Ein Dashboard für Team, Kunden und Kurse.
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Behalte alle Trainer und Mitglieder im Blick, organisiere Kurse ohne Überbuchung und präsentiere dein Studio
            mit eigener Seite und Logo.
          </p>
          <CheckList
            items={[
              "Bis zu 10 Trainer per Code ins Team einladen",
              "Kunden Trainern zuweisen – oder bei Ausfall komplett übertragen",
              "Kurse mit Plätzen pro Termin, Mitglieder buchen selbst",
              "Gemeinsamer Wochenkalender aller Trainer inkl. Auslastung",
              "Studio-Seite mit Logo, Öffnungszeiten, Ausstattung und Team",
            ]}
          />
          <div className="mt-10 flex">
            <PrimaryCta href="/registrieren?rolle=studio">Studio anlegen</PrimaryCta>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Kunden (kurz – kommen meist per Einladung)                          */
/* ------------------------------------------------------------------ */

function ForClients() {
  return (
    <section aria-labelledby="kunden-titel" className="pb-20 sm:pb-28">
      <div className={container}>
        <div className="grid gap-8 rounded-box bg-brand-fg p-8 text-white sm:p-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-brand">Für deine Kunden</p>
            <h2 id="kunden-titel" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Kostenlos und per Einladung startklar.
            </h2>
            <p className="mt-3 text-white/70">
              Deine Kunden brauchen kein Abo und keine Installation. Mit deinem Einladungscode sind sie in einer Minute
              verbunden.
            </p>
            <Link
              href="/registrieren?rolle=kunde"
              className="mt-6 inline-flex items-center gap-2 rounded-control text-sm font-semibold text-brand hover:underline"
            >
              Einladung erhalten? Hier beitreten <Icon name="arrow" className="size-4" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["list", "Trainingsplan mit Anleitung zu jeder Übung"],
                ["check", "Workouts nach Plan oder frei loggen"],
                ["calendar", "Termine und Kurse selbst buchen"],
                ["chart", "Bestwerte, Streak und Körpermaße"],
              ] as [IconName, string][]
            ).map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3 rounded-tile bg-white/5 p-4 text-sm ring-1 ring-white/10">
                <Icon name={icon} className="size-5 shrink-0 text-brand" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-titel" className="scroll-mt-20 py-20 sm:py-28">
      <div className={`${container} grid gap-12 lg:grid-cols-[1fr_1.6fr]`}>
        <div>
          <Eyebrow>FAQ</Eyebrow>
          <h2 id="faq-titel" className="mt-3 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Häufige Fragen
          </h2>
          <p className="mt-4 text-fg-muted">Kurz beantwortet – für Personal Trainer und Studios.</p>
        </div>
        <div className="divide-y divide-line rounded-box bg-surface ring-1 ring-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-fg">
                <h3>{f.q}</h3>
                <span className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-2 text-fg-muted transition group-open:rotate-45">
                  <Icon name="plus" className="size-4" />
                </span>
              </summary>
              <p className="mt-3 pr-12 text-sm leading-6 text-fg-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Abschluss + Footer                                                  */
/* ------------------------------------------------------------------ */

function FinalCta() {
  return (
    <section className="pb-20 sm:pb-28">
      <div className={container}>
        <div className="relative isolate overflow-hidden rounded-box bg-brand px-6 py-14 text-center sm:px-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-fg sm:text-4xl">Bereit, dein Coaching zu vereinfachen?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-fg/75">
            7 Tage kostenlos testen, ohne Kreditkarte. Deine Kunden nutzen Voima Coach gratis.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/registrieren?rolle=trainer"
              className="flex h-12 items-center justify-center gap-2 rounded-control bg-brand-fg px-6 font-semibold text-white transition hover:bg-black"
            >
              Als Trainer starten <Icon name="arrow" className="size-4" />
            </Link>
            <Link
              href="/registrieren?rolle=studio"
              className="flex h-12 items-center justify-center gap-2 rounded-control bg-white/60 px-6 font-semibold text-brand-fg ring-1 ring-brand-fg/15 transition ring-inset hover:bg-white"
            >
              <Icon name="building" className="size-4" /> Studio anlegen
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const columns: { title: string; links: [string, string][] }[] = [
    {
      title: "Produkt",
      links: [
        ["#trainer", "Für Trainer"],
        ["#studios", "Für Studios"],
        ["#funktionen", "Funktionen"],
        ["#preise", "Preise"],
        ["#faq", "FAQ"],
      ],
    },
    {
      title: "Konto",
      links: [
        ["/login", "Anmelden"],
        ["/registrieren?rolle=trainer", "Als Trainer registrieren"],
        ["/registrieren?rolle=studio", "Studio anlegen"],
        ["/registrieren?rolle=kunde", "Einladung annehmen"],
      ],
    },
    {
      // TODO: Impressum & Datenschutz als eigene Seiten anlegen (in Deutschland Pflicht) und hier verlinken
      title: "Rechtliches",
      links: [
        ["#", "Impressum"],
        ["#", "Datenschutz"],
        ["#", "AGB"],
      ],
    },
  ];
  return (
    <footer className="border-t border-line">
      <div className={`${container} grid gap-12 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]`}>
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-fg-muted">
            Software für Personal Trainer und Fitnessstudios: Trainingspläne, Termine, Kurse und Kundenbetreuung an einem
            Ort.
          </p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="text-sm font-semibold text-fg">{c.title}</p>
            <ul className="mt-4 space-y-3 text-sm text-fg-muted">
              {c.links.map(([href, label]) => (
                <li key={label}>
                  {href.startsWith("/") ? (
                    <Link href={href} className="hover:text-fg">
                      {label}
                    </Link>
                  ) : (
                    <a href={href} className="hover:text-fg">
                      {label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line py-6 text-center text-sm text-fg-muted">
        © 2026 Voima Coach. Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Seite                                                               */
/* ------------------------------------------------------------------ */

export default function Home() {
  return (
    <>
      <StructuredData />
      <Header />
      <main className="flex-1">
        <Hero />
        <FeatureOverview />
        <ForTrainers />
        <ForStudios />
        <ForClients />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
