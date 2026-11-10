import "server-only";
import type { NextRequest } from "next/server";
import { supabaseFromCookies, supabaseVerifier } from "../supabase/server";
import { ApiError, forbidden, unauthorized } from "./http";
import { getProfile, type ProfileRow } from "./repo";

/**
 * Authentifizierung über Supabase Auth – für Web UND Apps:
 *  - Apps: `Authorization: Bearer <access_token>` (Token aus dem Supabase-SDK der App)
 *  - Web:  Supabase-Session-Cookies (gesetzt von @supabase/ssr im Browser)
 */
type ClaimsResult = { data: { claims: { sub?: string } } | null; error: { name?: string; status?: number; message?: string } | null };

/**
 * Wertet das Ergebnis von getClaims aus. Ungültige/abgelaufene Tokens → null (= 401).
 * Ist Supabase Auth dagegen NICHT ERREICHBAR, wird 503 geworfen – sonst würden Nutzer
 * bei einer kurzen Störung fälschlich abgemeldet.
 */
function subjectFrom({ data, error }: ClaimsResult): string | null {
  if (error) {
    const unreachable = error.name === "AuthRetryableFetchError" || error.status === 0 || (error.status ?? 0) >= 500;
    if (unreachable) {
      console.error("[auth] Supabase Auth nicht erreichbar:", error.message);
      throw new ApiError(503, "auth_unavailable", "Die Anmeldung ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.");
    }
    return null;
  }
  return data?.claims.sub ?? null;
}

/**
 * getClaims liefert Fehler normalerweise zurück, WIRFT aber bei manchen kaputten Tokens
 * (z. B. „Invalid UTF-8 sequence“). Solche Tokens sind schlicht ungültig → 401, nicht 500.
 */
async function claims(fn: () => Promise<unknown>): Promise<ClaimsResult> {
  try {
    return (await fn()) as ClaimsResult;
  } catch (err) {
    if (err instanceof TypeError && /fetch failed/i.test(err.message)) {
      return { data: null, error: { name: "AuthRetryableFetchError", status: 0, message: err.message } };
    }
    return { data: null, error: { name: "AuthInvalidJwtError", status: 400, message: String(err) } };
  }
}

async function userIdFromRequest(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (!token) return null;
    return subjectFrom(await claims(() => supabaseVerifier().auth.getClaims(token)));
  }
  const supabase = await supabaseFromCookies();
  return subjectFrom(await claims(() => supabase.auth.getClaims()));
}

/** Liefert das Profil des angemeldeten Nutzers oder wirft 401. Optional mit Rollenprüfung (403). */
export async function requireUser(req: NextRequest, role?: ProfileRow["role"]): Promise<ProfileRow> {
  const userId = await userIdFromRequest(req);
  if (!userId) throw unauthorized("Nicht angemeldet oder Sitzung abgelaufen.");
  const profile = await getProfile(userId);
  if (!profile) throw unauthorized("Kein Profil zu diesem Konto gefunden.");
  if (role && profile.role !== role) {
    throw forbidden(role === "trainer" ? "Nur für Trainer." : "Nur für Kunden.");
  }
  return profile;
}
