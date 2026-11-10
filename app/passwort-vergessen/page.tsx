import type { Metadata } from "next";
import { AuthSwitchLink } from "@/components/auth/auth-switch-link";
import { AuthShell } from "@/components/ui";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = { title: "Passwort vergessen" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Passwort zurücksetzen"
      subtitle={
        <AuthSwitchLink
          question="Doch wieder eingefallen?"
          href="/login"
          label="Anmelden"
        />
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
