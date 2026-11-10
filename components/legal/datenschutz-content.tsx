import { LEGAL } from "@/lib/legal";
import { SITE_NAME } from "@/lib/site";
import { LegalList, LegalSection, OwnerAddress } from "./legal-layout";

/**
 * Datenschutzerklärung (Muster – vor dem Livegang prüfen).
 * Beschreibt die tatsächlich eingesetzten Dienste: Vercel (Hosting), Supabase (Datenbank, Anmeldung, Dateien),
 * Stripe (Zahlungen). Kein Tracking, keine Analyse-Tools, Schriften lokal eingebunden.
 */
export function DatenschutzContent() {
  return (
    <>
      <LegalSection title="1. Verantwortlicher">
        <OwnerAddress />
        <p>E-Mail: {LEGAL.email}</p>
      </LegalSection>

      <LegalSection title="2. Überblick">
        <p>
          {SITE_NAME} ist eine Plattform für Personal Trainer, Fitnessstudios
          und deren Kunden. Wir verarbeiten personenbezogene Daten nur, soweit
          es für den Betrieb der Plattform nötig ist. Es gibt keine Werbe- oder
          Analyse-Tools und kein Tracking.
        </p>
      </LegalSection>

      <LegalSection title="3. Hosting der Website">
        <p>
          Die Website wird bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA
          91723, USA gehostet. Beim Aufruf verarbeitet Vercel technisch
          notwendige Daten (z. B. IP-Adresse, Zeitpunkt, aufgerufene Seite,
          Browser) in Server-Logs, um die Seite auszuliefern und vor Missbrauch
          zu schützen. Rechtsgrundlage ist unser berechtigtes Interesse an einem
          sicheren Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Vercel ist unter dem
          EU-US Data Privacy Framework zertifiziert; zusätzlich besteht ein
          Vertrag zur Auftragsverarbeitung.
        </p>
      </LegalSection>

      <LegalSection title="4. Konto und Nutzung der Plattform">
        <p>
          Für die Nutzung legst du ein Konto an. Dabei und bei der Nutzung
          verarbeiten wir:
        </p>
        <LegalList
          items={[
            "Name, E-Mail-Adresse, Passwort (verschlüsselt gespeichert), Rolle (Kunde, Trainer, Studio)",
            "freiwillig: Telefonnummer, Profilbild",
            "Verbindungen zwischen Kunden, Trainern und Studios, Einladungscodes",
            "Trainingspläne, Termine, Kursbuchungen, Nachrichten im Chat und Benachrichtigungen",
          ]}
        />
        <p>
          Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1
          lit. b DSGVO). Daten, Anmeldung und Dateien werden bei Supabase Inc.
          ([Anschrift laut Auftragsverarbeitungsvertrag]) verarbeitet; die
          Datenbank liegt in der Region {LEGAL.databaseRegion}. Mit Supabase
          besteht ein Vertrag zur Auftragsverarbeitung inklusive
          EU-Standardvertragsklauseln.
        </p>
        <p>
          E-Mails zur Bestätigung der Adresse und zum Zurücksetzen des Passworts
          werden über Supabase versendet.
        </p>
      </LegalSection>

      <LegalSection title="5. Trainings- und Körperdaten">
        <p>
          Kunden können Workouts (Übungen, Sätze, Gewichte, Ausdauerwerte) sowie
          Körperdaten (Körpergewicht, Körperfett, Taillenumfang) erfassen.
          Körperdaten können Gesundheitsdaten im Sinne von Art. 9 DSGVO sein.
          Wir verarbeiten sie nur auf Grundlage deiner ausdrücklichen
          Einwilligung (Art. 9 Abs. 2 lit. a DSGVO), die du jederzeit mit
          Wirkung für die Zukunft widerrufen kannst, indem du die Daten löschst
          oder dein Konto löschst.
        </p>
        <p>
          Sichtbar sind diese Daten nur für dich und den Trainer, mit dem du
          verbunden bist. Fitnessstudios sehen keine Trainingsdaten und keine
          Chats.
        </p>
      </LegalSection>

      <LegalSection title="6. Zahlungen (Trainer und Studios)">
        <p>
          Kostenpflichtige Abos werden über Stripe Payments Europe, Ltd., 1
          Grand Canal Street Lower, Grand Canal Dock, Dublin, D02 H210, Irland
          abgewickelt. Zahlungsdaten (z. B. Kartennummer, IBAN) gibst du direkt
          bei Stripe ein; wir erhalten sie nicht. Wir speichern nur eine Kunden-
          und Abo-Kennung von Stripe sowie Paket, Status und Laufzeit deines
          Abos. Rechtsgrundlage ist die Vertragserfüllung (Art. 6 Abs. 1 lit. b
          DSGVO) und unsere gesetzliche Pflicht zur Aufbewahrung von Rechnungen
          (Art. 6 Abs. 1 lit. c DSGVO). Stripe ist für die Zahlungsabwicklung
          teilweise selbst verantwortlich; Einzelheiten:{" "}
          <a
            href="https://stripe.com/de/privacy"
            className="font-medium text-fg underline-offset-4 hover:underline"
          >
            stripe.com/de/privacy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies und lokale Speicherung">
        <p>
          Wir setzen nur technisch notwendige Cookies, um dich angemeldet zu
          halten (§ 25 Abs. 2 Nr. 2 TDDDG). Es gibt keine Cookies zu Werbe- oder
          Analysezwecken, daher auch kein Cookie-Banner. Schriftarten sind lokal
          eingebunden; beim Aufruf entsteht keine Verbindung zu Google.
        </p>
      </LegalSection>

      <LegalSection title="8. Speicherdauer">
        <p>
          Wir speichern deine Daten, solange dein Konto besteht. Löschst du dein
          Konto (Einstellungen → Konto löschen), werden deine personenbezogenen
          Daten einschließlich Trainingsdaten, Nachrichten und Profilbild
          gelöscht. Rechnungs- und Buchungsbelege bewahren wir aufgrund
          gesetzlicher Pflichten bis zu zehn Jahre auf (§ 147 AO, § 257 HGB).
        </p>
      </LegalSection>

      <LegalSection title="9. Deine Rechte">
        <p>Du hast das Recht auf:</p>
        <LegalList
          items={[
            "Auskunft über deine gespeicherten Daten (Art. 15 DSGVO)",
            "Berichtigung (Art. 16 DSGVO) und Löschung (Art. 17 DSGVO)",
            "Einschränkung der Verarbeitung (Art. 18 DSGVO)",
            "Datenübertragbarkeit (Art. 20 DSGVO)",
            "Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO)",
            "Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)",
          ]}
        />
        <p>
          Schreib uns dazu an {LEGAL.email}. Du kannst dich außerdem bei einer
          Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der für uns
          zuständigen: {LEGAL.supervisoryAuthority}.
        </p>
      </LegalSection>
    </>
  );
}
