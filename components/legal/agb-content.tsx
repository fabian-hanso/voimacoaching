import { euro, PLANS, TRAINER_PLANS, TRIAL_DAYS } from "@/lib/billing-plans";
import { LEGAL } from "@/lib/legal";
import { SITE_NAME } from "@/lib/site";
import { LegalList, LegalSection } from "./legal-layout";

/**
 * AGB (Muster – vor dem Livegang prüfen). Ausgelegt auf Geschäftskunden (Trainer, Studios = Unternehmer).
 * Preise, Testphase und Pakete kommen aus lib/billing-plans.ts und bleiben so automatisch aktuell.
 */
export function AgbContent() {
  const plans = [...TRAINER_PLANS, PLANS.studio];
  return (
    <>
      <LegalSection title="§ 1 Geltungsbereich">
        <p>
          Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung von{" "}
          {SITE_NAME} (die „Plattform“), betrieben von {LEGAL.owner},{" "}
          {LEGAL.street}, {LEGAL.zipCity} („Anbieter“).
        </p>
        <p>
          Kostenpflichtige Pakete richten sich ausschließlich an Unternehmer im
          Sinne von § 14 BGB, insbesondere selbstständige Personal Trainer und
          Fitnessstudios („Trainer“ bzw. „Studios“). Kunden von Trainern und
          Studios nutzen die Plattform kostenlos; für sie gelten diese
          Bedingungen mit Ausnahme der Regelungen zu Paketen und Zahlung
          entsprechend.
        </p>
        <p>
          Abweichende Bedingungen der Nutzer gelten nur, wenn der Anbieter ihnen
          ausdrücklich zustimmt.
        </p>
      </LegalSection>

      <LegalSection title="§ 2 Leistungen">
        <p>
          Die Plattform ermöglicht unter anderem das Erstellen und Zuweisen von
          Trainingsplänen mit Übungsanleitungen, das Erfassen von Workouts und
          Körperdaten, Terminbuchung, Kursverwaltung, Kundenverwaltung und einen
          Chat zwischen Trainer und Kunde. Der Leistungsumfang ergibt sich aus
          der jeweils aktuellen Beschreibung auf der Website. Der Anbieter darf
          die Plattform weiterentwickeln, solange die wesentlichen Funktionen
          erhalten bleiben.
        </p>
        <p>
          Übungsanleitungen sind allgemeine Informationen und ersetzen keine
          persönliche, ärztliche oder therapeutische Beratung. Für
          Trainingsempfehlungen an ihre Kunden sind Trainer und Studios selbst
          verantwortlich.
        </p>
      </LegalSection>

      <LegalSection title="§ 3 Konto">
        <p>
          Für die Nutzung ist ein Konto nötig. Die Angaben bei der Registrierung
          müssen wahr sein. Zugangsdaten sind geheim zu halten; bei Verdacht auf
          Missbrauch ist der Anbieter unverzüglich zu informieren.
        </p>
      </LegalSection>

      <LegalSection title="§ 4 Kostenlose Testphase">
        <p>
          Trainer und Studios können die Plattform nach der Registrierung{" "}
          {TRIAL_DAYS} Tage kostenlos und ohne Angabe von Zahlungsdaten testen.
          Die Testphase endet automatisch und verlängert sich nicht
          kostenpflichtig. Wird danach kein Paket gebucht, ist das Dashboard
          gesperrt, bis ein Paket gebucht wird. Gespeicherte Daten bleiben
          erhalten; Kunden können die Plattform weiter nutzen.
        </p>
      </LegalSection>

      <LegalSection title="§ 5 Pakete und Preise">
        <LegalList
          items={plans.map(
            (p) =>
              `${p.audience === "studio" ? "Studio (bis zu 10 Trainer, unbegrenzt Kunden)" : p.productName}: ${euro(p.monthly)} pro Monat oder ${euro(p.yearly)} pro Jahr`,
          )}
        />
        <p>
          Der Anbieter ist Kleinunternehmer im Sinne von § 19 UStG; es wird
          keine Umsatzsteuer berechnet. Trainer, die einem Studio angehören,
          sind über das Paket des Studios abgedeckt.
        </p>
        <p>
          Die Trainer-Pakete begrenzen die Anzahl verbundener Kunden. Ist das
          Limit erreicht, können keine weiteren Kunden eingeladen werden;
          bestehende Verbindungen bleiben bestehen.
        </p>
      </LegalSection>

      <LegalSection title="§ 6 Zahlung">
        <p>
          Die Zahlung erfolgt im Voraus für den gewählten Abrechnungszeitraum
          (Monat oder Jahr) über den Zahlungsdienstleister Stripe. Wird ein
          Paket während der Testphase gebucht, beginnt die Abrechnung mit dem
          Ende der Testphase. Rechnungen werden elektronisch bereitgestellt.
        </p>
        <p>
          Schlägt eine Zahlung fehl, versucht Stripe den Einzug erneut. Bleibt
          die Zahlung aus, endet das Paket und das Dashboard wird gesperrt, bis
          ein Paket gebucht wird.
        </p>
      </LegalSection>

      <LegalSection title="§ 7 Laufzeit, Kündigung und Paketwechsel">
        <p>
          Ein Paket läuft für den gewählten Abrechnungszeitraum und verlängert
          sich automatisch um denselben Zeitraum, wenn es nicht gekündigt wird.
          Die Kündigung ist jederzeit zum Ende des laufenden Zeitraums möglich,
          im Dashboard unter „Abo & Rechnungen“ → „Abo verwalten“. Bereits
          gezahlte Beträge werden nicht anteilig erstattet.
        </p>
        <p>
          Ein Wechsel zwischen Trainer-Paketen ist jederzeit möglich; die
          Differenz wird anteilig verrechnet. Das Recht zur außerordentlichen
          Kündigung aus wichtigem Grund bleibt unberührt.
        </p>
      </LegalSection>

      <LegalSection title="§ 8 Pflichten der Nutzer">
        <LegalList
          items={[
            "Inhalte (z. B. Pläne, Nachrichten, Bilder) dürfen keine Rechte Dritter und keine Gesetze verletzen.",
            "Die Plattform darf nicht missbräuchlich genutzt oder in ihrer Funktion beeinträchtigt werden.",
            "Trainer und Studios verarbeiten über die Plattform personenbezogene Daten ihrer Kunden und sind dafür datenschutzrechtlich verantwortlich. Ein Vertrag zur Auftragsverarbeitung (Art. 28 DSGVO) wird auf Anfrage bereitgestellt.",
          ]}
        />
      </LegalSection>

      <LegalSection title="§ 9 Verfügbarkeit">
        <p>
          Der Anbieter bemüht sich um eine möglichst unterbrechungsfreie
          Verfügbarkeit. Wartungen, Störungen bei Dienstleistern oder höhere
          Gewalt können zu Einschränkungen führen; ein Anspruch auf ständige
          Verfügbarkeit besteht nicht.
        </p>
      </LegalSection>

      <LegalSection title="§ 10 Haftung">
        <p>
          Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit
          sowie bei Verletzung von Leben, Körper oder Gesundheit. Bei leichter
          Fahrlässigkeit haftet er nur bei Verletzung wesentlicher
          Vertragspflichten und begrenzt auf den vorhersehbaren,
          vertragstypischen Schaden. Die Haftung nach dem Produkthaftungsgesetz
          bleibt unberührt.
        </p>
      </LegalSection>

      <LegalSection title="§ 11 Änderungen dieser Bedingungen">
        <p>
          Der Anbieter kann diese Bedingungen mit Wirkung für die Zukunft
          ändern. Änderungen werden mindestens vier Wochen vorher per E-Mail
          angekündigt. Widerspricht der Nutzer nicht innerhalb dieser Frist,
          gelten die Änderungen als angenommen; auf diese Folge wird in der
          Ankündigung hingewiesen.
        </p>
      </LegalSection>

      <LegalSection title="§ 12 Schlussbestimmungen">
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
          UN-Kaufrechts. Gerichtsstand für Streitigkeiten mit Kaufleuten ist{" "}
          {LEGAL.courtCity}. Sollte eine Bestimmung unwirksam sein, bleiben die
          übrigen Bestimmungen wirksam.
        </p>
      </LegalSection>
    </>
  );
}
