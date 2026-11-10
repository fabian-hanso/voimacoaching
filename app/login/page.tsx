import type { Metadata } from "next";
import { AuthSwitchLink } from "@/components/auth/auth-switch-link";
import { Suspense } from "react";
import { AuthShell, Spinner } from "@/components/ui";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Willkommen zurück"
      subtitle={
        <AuthSwitchLink
          question="Noch kein Konto?"
          href="/registrieren"
          label="Jetzt registrieren"
        />
      }
    >
      <Suspense fallback={<Spinner />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
