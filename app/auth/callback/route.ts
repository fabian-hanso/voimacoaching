import { NextResponse, type NextRequest } from "next/server";
import { supabaseFromCookies } from "@/lib/supabase/server";

/**
 * Ziel der Links aus Supabase-E-Mails (Registrierung bestätigen, Passwort zurücksetzen).
 * Tauscht den Code gegen eine Session (Cookies) und leitet weiter.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next");
  // Nur relative Ziele erlauben (kein Open Redirect)
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await supabaseFromCookies();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(target, req.url));
  }
  return NextResponse.redirect(new URL("/login?fehler=link", req.url));
}
