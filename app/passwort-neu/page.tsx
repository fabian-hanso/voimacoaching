import type { Metadata } from "next";
import { AuthShell } from "@/components/ui";
import { NewPasswordForm } from "@/components/auth/new-password-form";

export const metadata: Metadata = { title: "Neues Passwort" };

export default function NewPasswordPage() {
  return (
    <AuthShell title="Neues Passwort festlegen" subtitle="Wähle ein neues Passwort für dein Konto.">
      <NewPasswordForm />
    </AuthShell>
  );
}
