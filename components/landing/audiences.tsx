import Link from "next/link";
import { Icon } from "../icons";
import {
  CLIENT_POINTS,
  SIGNUP,
  STUDIO_POINTS,
  TRAINER_POINTS,
} from "./content";
import { PlanEditorPreview, StudioPreview } from "./previews";
import { AudienceSection, Section } from "./section";

export function ForTrainers() {
  return (
    <AudienceSection
      id="trainer"
      muted
      eyebrow="Für Personal Trainer"
      title="Mehr Zeit fürs Coaching, weniger für Verwaltung."
      intro="Erstelle Trainingspläne in Minuten, gib jeder Übung eine Anleitung mit und sieh, wie deine Kunden trainieren – online wie vor Ort."
      points={TRAINER_POINTS}
      cta={{ href: SIGNUP.trainer, label: "Trainer-Konto erstellen" }}
      preview={<PlanEditorPreview />}
    />
  );
}

export function ForStudios() {
  return (
    <AudienceSection
      id="studios"
      previewFirst
      eyebrow="Für Fitnessstudios"
      title="Ein Dashboard für Team, Kunden und Kurse."
      intro="Behalte alle Trainer und Mitglieder im Blick, organisiere Kurse ohne Überbuchung und präsentiere dein Studio mit eigener Seite und Logo."
      points={STUDIO_POINTS}
      cta={{ href: SIGNUP.studio, label: "Studio anlegen" }}
      preview={<StudioPreview />}
    />
  );
}

/** Kurzer Block für Kunden – sie kommen meist per Einladung ihres Trainers. */
export function ForClients() {
  return (
    <Section labelledBy="kunden-titel" flushTop>
      <div className="grid gap-8 rounded-box bg-brand-fg p-8 text-white sm:p-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-brand">Für deine Kunden</p>
          <h2
            id="kunden-titel"
            className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl"
          >
            Kostenlos und per Einladung startklar.
          </h2>
          <p className="mt-3 text-white/70">
            Deine Kunden brauchen kein Abo und keine Installation. Mit deinem
            Einladungscode sind sie in einer Minute verbunden.
          </p>
          <Link
            href={SIGNUP.client}
            className="mt-6 inline-flex items-center gap-2 rounded-control text-sm font-semibold text-brand hover:underline"
          >
            Einladung erhalten? Hier beitreten{" "}
            <Icon name="arrow" className="size-4" />
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {CLIENT_POINTS.map((p) => (
            <li
              key={p.text}
              className="flex items-center gap-3 rounded-tile bg-white/5 p-4 text-sm ring-1 ring-white/10"
            >
              <Icon name={p.icon} className="size-5 shrink-0 text-brand" />
              {p.text}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
