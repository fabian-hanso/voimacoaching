import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** Supabase-Client mit der Web-Session aus den Cookies (für Route Handler). Pro Request neu erstellen. */
export async function supabaseFromCookies() {
  const store = await cookies();
  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // In Server Components nicht setzbar – die Proxy übernimmt das Refresh.
        }
      },
    },
  });
}

/** Zustandsloser Client zum Prüfen von Bearer-Tokens aus Apps (JWKS wird gecacht). */
let verifier: SupabaseClient | undefined;
export function supabaseVerifier(): SupabaseClient {
  verifier ??= createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return verifier;
}
