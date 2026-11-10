import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Läuft vor Dashboard-, API-, Login- und Registrierungs-Requests:
 *  - erneuert die Supabase-Web-Session (Cookies)
 *  - nicht angemeldet + /dashboard  → /login
 *  - angemeldet + /login|/registrieren → /dashboard (Einladungscodes werden mitgenommen)
 * Optimistische Prüfung – die eigentliche Autorisierung passiert in der API.
 */
export async function proxy(request: NextRequest) {
  // Apps authentifizieren sich per Bearer-Token → keine Cookie-Session nötig.
  if (request.headers.has("authorization") || !isSupabaseConfigured()) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Kaputte Cookies können getClaims werfen lassen → wie „nicht angemeldet“ behandeln
  let claims: { user_metadata?: { role?: string } } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    claims = data?.claims ?? null;
  } catch {
    claims = null;
  }

  /** Weiterleiten und dabei evtl. gerade erneuerte Session-Cookies mitnehmen. */
  const redirect = (pathname: string, search = "", hash = "") => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    url.hash = hash;
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  const path = request.nextUrl.pathname;

  if (!claims && path.startsWith("/dashboard")) return redirect("/login");

  if (claims && (path === "/login" || path === "/registrieren")) {
    const params = request.nextUrl.searchParams;
    const studioCode = params.get("studio");
    const clientCode = params.get("code");
    // Bereits angemeldeter Trainer öffnet einen Studio-Einladungslink → Studio-Beitritt in den Einstellungen
    if (studioCode && claims.user_metadata?.role === "trainer") {
      return redirect("/dashboard/einstellungen", `?studio=${encodeURIComponent(studioCode)}`, "#studio");
    }
    // Bereits angemeldeter Kunde öffnet einen Einladungslink → Code im Dashboard vorausgefüllt
    if (clientCode) return redirect("/dashboard", `?code=${encodeURIComponent(clientCode)}`);
    return redirect("/dashboard");
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/v1/:path*", "/login", "/registrieren"],
};
