import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ConfigError, supabaseUrl } from "./env";

/**
 * Server-Client mit Secret Key (neu: sb_secret_…, alt: service_role).
 * Umgeht RLS – darf NIEMALS in den Browser oder in Apps gelangen.
 * Die API prüft Berechtigungen selbst (siehe lib/server/repo.ts).
 */
let admin: SupabaseClient | undefined;

export function supabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new ConfigError("SUPABASE_SECRET_KEY ist nicht gesetzt (siehe .env.example).");
  admin = createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return admin;
}
