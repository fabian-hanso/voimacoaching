import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/ui";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Passwort vergessen · Voima Coach" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Passwort zurücksetzen"
      subtitle={
        <>
          Doch wieder eingefallen?{" "}
          <Link href="/login" className="font-semibold text-brand-ink hover:text-brand-ink/80">
            Anmelden
          </Link>
        </>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
