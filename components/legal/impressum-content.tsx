import { LEGAL } from "@/lib/legal";
import { SITE_NAME } from "@/lib/site";
import { LegalSection, OwnerAddress } from "./legal-layout";

/** Impressum nach § 5 DDG (Muster – vor dem Livegang prüfen). */
export function ImpressumContent() {
  return (
    <>
      <LegalSection title="Angaben gemäß § 5 DDG">
        <OwnerAddress />
        <p>Betreiber von {SITE_NAME} (Einzelunternehmen).</p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          E-Mail:{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-medium text-fg underline-offset-4 hover:underline"
          >
            {LEGAL.email}
          </a>
          <br />
          Telefon: {LEGAL.phone}
        </p>
      </LegalSection>

      <LegalSection title="Umsatzsteuer">
        <p>
          Kleinunternehmer im Sinne von § 19 UStG. Es wird keine Umsatzsteuer
          berechnet und daher keine Umsatzsteuer-Identifikationsnummer
          ausgewiesen.
        </p>
      </LegalSection>

      <LegalSection title="Verbraucherstreitbeilegung">
        <p>
          Wir sind nicht bereit und nicht verpflichtet, an
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </LegalSection>
    </>
  );
}
