/**
 * Supabase-Konfiguration aus .env.local.
 * NEXT_PUBLIC_*-Variablen müssen wörtlich referenziert werden, damit Next sie in den Browser-Code einbettet.
 */
/** Fehlende Konfiguration → API antwortet mit 503 statt 500. */
export class ConfigError extends Error {}

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new ConfigError("NEXT_PUBLIC_SUPABASE_URL ist nicht gesetzt (siehe .env.example).");
  return url;
}

/** Öffentlicher Key (neu: sb_publishable_…, alt: anon key). Darf im Browser/in Apps stehen. */
export function supabasePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new ConfigError("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ist nicht gesetzt (siehe .env.example).");
  return key;
}

export const isSupabaseConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
