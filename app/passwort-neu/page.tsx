import type { Metadata } from "next";
import { AuthShell } from "@/components/ui";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Neues Passwort · Voima Coach" };

export default function NewPasswordPage() {
  return (
    <AuthShell title="Neues Passwort festlegen" subtitle="Wähle ein neues Passwort für dein Konto.">
      <NewPasswordForm />
    </AuthShell>
  );
}
