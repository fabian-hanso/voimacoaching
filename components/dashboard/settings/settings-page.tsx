"use client";

import { useMe } from "@/components/dashboard/shell";
import { Icon } from "@/components/icons";
import Link from "next/link";
import { ClientStudioSection } from "./client-studio-section";
import { CoachSection } from "./coach-section";
import { DeleteSection } from "./delete-section";
import { EmailForm } from "./email-form";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";
import { SessionsSection } from "./sessions-section";
import { Section } from "./settings-section";
import { TrainerStudioSection } from "./trainer-studio-section";

export function SettingsPage() {
  const { me } = useMe();
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"
      >
        <Icon name="chevronLeft" className="size-4" /> Zurück zum Dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
        Einstellungen
      </h1>
      <p className="mt-2 text-fg-muted">
        Verwalte dein Profil, deine Anmeldedaten und dein Konto.
      </p>

      <div className="mt-6 divide-y divide-line">
        <Section
          id="profil"
          title="Profil"
          description="Foto und Name sind für deinen Coach bzw. deine Kunden sichtbar."
        >
          <ProfileForm />
        </Section>
        <Section
          id="email"
          title="E-Mail-Adresse"
          description="Damit meldest du dich an. Eine Änderung musst du per Link bestätigen."
        >
          <EmailForm />
        </Section>
        <Section
          id="passwort"
          title="Passwort"
          description="Zur Sicherheit fragen wir zuerst dein aktuelles Passwort ab."
        >
          <PasswordForm />
        </Section>
        {me.user.role === "client" && (
          <Section
            id="coach"
            title="Coach"
            description="Mit wem du trainierst. Pläne und Chat hängen an dieser Verbindung."
          >
            <CoachSection />
          </Section>
        )}
        {me.user.role === "client" && (
          <Section
            id="studio"
            title="Studio"
            description="Als Mitglied siehst du Kurse und buchst 1:1-Termine bei allen Trainern des Studios – auch ohne festen Coach."
          >
            <ClientStudioSection />
          </Section>
        )}
        {me.user.role === "trainer" && (
          <Section
            id="studio"
            title="Studio"
            description="Als Teil eines Studios kann dich bei Ausfall ein Kollege vertreten."
          >
            <TrainerStudioSection />
          </Section>
        )}
        <Section
          id="sitzungen"
          title="Sitzungen"
          description="Z. B. wenn du dich auf einem fremden Gerät nicht abgemeldet hast."
        >
          <SessionsSection />
        </Section>
        <Section
          id="konto"
          title="Konto löschen"
          description="Endgültig und nicht rückgängig zu machen."
          danger
        >
          <DeleteSection />
        </Section>
      </div>
    </div>
  );
}
