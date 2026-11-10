import Link from "next/link";
import { connection } from "next/server";
import { supabaseFromCookies } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Buttons für Gäste – auch Platzhalter, solange die Sitzung noch geprüft wird. */
export function GuestActions() {
  return (
    <>
      <Link href="/login" className="hidden text-sm font-semibold text-fg hover:text-brand-ink/80 sm:block">
        Anmelden
      </Link>
      <Link href="/registrieren" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-fg hover:bg-brand-hover">
        Kostenlos starten
      </Link>
    </>
  );
}

/**
 * Header-Aktionen der Startseite: angemeldet → „Zum Dashboard“, sonst Anmelden/Registrieren.
 * Liest die Session-Cookies (Laufzeitdaten) → muss in <Suspense> stehen; der Rest der Seite bleibt statisch.
 */
export async function HeaderActions() {
  // Explizit zur Anfragezeit rendern: die Session-Prüfung nutzt Zeitstempel (Token-Ablauf)
  await connection();
  let signedIn = false;
  if (isSupabaseConfigured()) {
    try {
      const { data } = await (await supabaseFromCookies()).auth.getClaims();
      signedIn = !!data?.claims;
    } catch {
      signedIn = false; // kaputtes Cookie o. Ä. → wie Gast behandeln
    }
  }
  if (!signedIn) return <GuestActions />;
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-fg hover:bg-brand-hover"
    >
      Zum Dashboard
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-4" aria-hidden="true">
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </svg>
    </Link>
  );
}
