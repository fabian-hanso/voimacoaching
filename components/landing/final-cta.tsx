import { SIGNUP } from "./content";
import { CtaLink, CtaRow, Section } from "./section";
import { SITE_NAME } from "@/lib/site";

/** Abschluss-Box in Lime mit beiden Einstiegen. */
export function FinalCta() {
  return (
    <Section labelledBy="abschluss-titel" flushTop>
      <div className="rounded-box bg-brand px-6 py-14 sm:px-12">
        <h2
          id="abschluss-titel"
          className="text-3xl font-extrabold tracking-tight text-brand-fg sm:text-4xl"
        >
          Bereit, dein Coaching zu vereinfachen?
        </h2>
        <p className="mt-4 max-w-xl text-lg text-brand-fg/75">
          7 Tage kostenlos testen, ohne Kreditkarte. Deine Kunden nutzen{" "}
          {SITE_NAME} gratis.
        </p>
        <CtaRow className="mt-8">
          <CtaLink href={SIGNUP.trainer} variant="dark" arrow>
            Als Trainer starten
          </CtaLink>
          <CtaLink href={SIGNUP.studio} variant="light" icon="building">
            Studio anlegen
          </CtaLink>
        </CtaRow>
      </div>
    </Section>
  );
}
