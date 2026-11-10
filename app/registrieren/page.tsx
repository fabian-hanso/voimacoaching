import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell, Spinner } from "@/components/ui";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrieren · Voima Coach" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Konto erstellen"
      subtitle={
        <>
          Schon registriert?{" "}
          <Link href="/login" className="font-semibold text-brand-ink hover:text-brand-ink/80">
            Anmelden
          </Link>
        </>
      }
    >
      {/* RegisterForm liest ?rolle= und ?code= aus der URL → Suspense nötig */}
      <Suspense fallback={<Spinner />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
