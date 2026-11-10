import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell, Spinner } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden · Voima Coach" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Willkommen zurück"
      subtitle={
        <>
          Noch kein Konto?{" "}
          <Link href="/registrieren" className="font-semibold text-brand-ink hover:text-brand-ink/80">
            Jetzt registrieren
          </Link>
        </>
      }
    >
      <Suspense fallback={<Spinner />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
