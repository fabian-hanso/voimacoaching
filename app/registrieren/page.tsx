import type { Metadata } from "next";
import { AuthSwitchLink } from "@/components/auth/auth-switch-link";
import { Suspense } from "react";
import { AuthShell, Spinner } from "@/components/ui";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Registrieren" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Konto erstellen"
      subtitle={
        <AuthSwitchLink
          question="Schon registriert?"
          href="/login"
          label="Anmelden"
        />
      }
    >
      {/* RegisterForm liest ?rolle= und ?code= aus der URL → Suspense nötig */}
      <Suspense fallback={<Spinner />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
