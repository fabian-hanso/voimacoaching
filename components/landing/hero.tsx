import Image from "next/image";
import heroImage from "@/public/images/hero-training.jpg";
import { SIGNUP, TRIAL_NOTE } from "./content";
import { HeroCards } from "./hero-cards";
import { Container, CtaLink, CtaRow } from "./section";

/** Vollbreites Hero mit Foto, H1 (einzige der Seite) und den Haupt-CTAs. */
export function Hero() {
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

      <Container className="grid min-h-[max(36rem,calc(100svh-4rem))] items-end gap-10 py-12 sm:py-16 lg:max-h-[56rem] lg:min-h-[max(40rem,calc(100svh-8rem))] lg:grid-cols-[1.15fr_1fr] lg:items-center">
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
            <span className="block">
              und{" "}
              <span className="inline-block max-w-full rounded-control bg-accent px-3 py-1 leading-[1.05] text-accent-fg">
                Fitnessstudios
              </span>
              .
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
            Trainingspläne mit Übungsanleitungen, Terminbuchung, Kurse und
            Kundenverwaltung – an einem Ort. Deine Kunden trainieren nach Plan,
            du siehst jeden Fortschritt.
          </p>
          <CtaRow className="mt-8">
            <CtaLink href={SIGNUP.trainer} arrow>
              Als Trainer starten
            </CtaLink>
            <CtaLink href={SIGNUP.studio} variant="glass" icon="building">
              Studio anlegen
            </CtaLink>
          </CtaRow>
          <p className="mt-6 text-xs text-white/55">{TRIAL_NOTE}</p>
        </div>

        <HeroCards />
      </Container>
    </section>
  );
}
