/**
 * Einheitliche, deutsche Fehlermeldungen für alles, was im Browser schiefgehen kann:
 * API-Fehler, Netzwerkprobleme, Supabase-Auth-Fehler und unerwartete Ausnahmen.
 */

/** Meldungen nach HTTP-Status, wenn der Server keine eigene (sinnvolle) Meldung liefert. */
export const STATUS_MESSAGES: Record<number, string> = {
  0: "Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.",
  400: "Die Anfrage war ungültig.",
  401: "Deine Sitzung ist abgelaufen. Bitte melde dich neu an.",
  403: "Dafür hast du keine Berechtigung.",
  404: "Das wurde nicht gefunden – evtl. wurde es gelöscht.",
  408: "Zeitüberschreitung. Bitte versuche es erneut.",
  409: "Das existiert bereits.",
  413: "Die Datei ist zu groß.",
  422: "Bitte prüfe deine Eingaben.",
  429: "Zu viele Anfragen. Bitte warte einen Moment.",
  500: "Auf dem Server ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
  502: "Der Server ist gerade nicht erreichbar. Bitte versuche es später erneut.",
  503: "Der Dienst ist gerade nicht verfügbar. Bitte versuche es später erneut.",
  504: "Der Server antwortet nicht. Bitte versuche es später erneut.",
};

export const statusMessage = (status: number) =>
  STATUS_MESSAGES[status] ?? (status >= 500 ? STATUS_MESSAGES[500] : "Etwas ist schiefgelaufen. Bitte versuche es erneut.");

/** Supabase-Auth-Fehlercodes → Deutsch. https://supabase.com/docs/guides/auth/debugging/error-codes */
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-Mail oder Passwort ist falsch.",
  email_not_confirmed: "Bitte bestätige zuerst deine E-Mail-Adresse (Link in deinem Postfach).",
  user_already_exists: "Für diese E-Mail existiert bereits ein Konto.",
  email_exists: "Diese E-Mail-Adresse wird bereits verwendet.",
  email_address_invalid: "Diese E-Mail-Adresse ist ungültig oder wird nicht akzeptiert.",
  email_address_not_authorized: "An diese E-Mail-Adresse können keine Mails gesendet werden.",
  weak_password: "Das Passwort ist zu schwach. Nutze mehr Zeichen und mische Buchstaben, Zahlen und Sonderzeichen.",
  same_password: "Das neue Passwort muss sich vom aktuellen unterscheiden.",
  over_email_send_rate_limit: "Es wurden zu viele E-Mails verschickt. Bitte warte ein paar Minuten.",
  over_request_rate_limit: "Zu viele Versuche. Bitte warte einen Moment.",
  over_sms_send_rate_limit: "Zu viele Versuche. Bitte warte einen Moment.",
  signup_disabled: "Registrierungen sind derzeit deaktiviert.",
  email_provider_disabled: "Anmeldung per E-Mail ist derzeit deaktiviert.",
  user_banned: "Dieses Konto ist gesperrt.",
  user_not_found: "Dieses Konto existiert nicht (mehr).",
  session_not_found: "Deine Sitzung ist abgelaufen. Bitte melde dich neu an.",
  session_expired: "Deine Sitzung ist abgelaufen. Bitte melde dich neu an.",
  refresh_token_not_found: "Deine Sitzung ist abgelaufen. Bitte melde dich neu an.",
  refresh_token_already_used: "Deine Sitzung ist abgelaufen. Bitte melde dich neu an.",
  reauthentication_needed: "Bitte melde dich aus Sicherheitsgründen neu an und versuche es dann erneut.",
  otp_expired: "Der Link ist abgelaufen. Bitte fordere einen neuen an.",
  flow_state_expired: "Der Link ist abgelaufen. Bitte fordere einen neuen an.",
  flow_state_not_found: "Der Link ist ungültig. Bitte fordere einen neuen an.",
  bad_code_verifier: "Bitte öffne den Link im selben Browser, in dem du ihn angefordert hast.",
  validation_failed: "Bitte prüfe deine Eingaben.",
  request_timeout: "Zeitüberschreitung. Bitte versuche es erneut.",
  unexpected_failure: "Beim Anmeldedienst ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
};

interface AuthLikeError {
  code?: string;
  status?: number;
  name?: string;
  message?: string;
}

/** Deutsche Meldung für einen Supabase-Auth-Fehler (inkl. Netzwerkfehlern). */
export function authErrorMessage(error: AuthLikeError | null | undefined): string {
  if (!error) return "Unbekannter Fehler.";
  if (error.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code];
  // Netzwerk: supabase-js meldet AuthRetryableFetchError (status 0) bzw. "Failed to fetch"
  if (error.name === "AuthRetryableFetchError" || error.status === 0 || /fetch|network/i.test(error.message ?? "")) {
    return STATUS_MESSAGES[0];
  }
  if (error.status === 429) return STATUS_MESSAGES[429];
  if (error.status && error.status >= 500) return STATUS_MESSAGES[500];
  return error.message || "Unbekannter Fehler.";
}

/** Beliebigen Fehler (z. B. aus try/catch) in eine anzeigbare Meldung verwandeln. */
export function errorMessage(err: unknown, fallback = "Etwas ist schiefgelaufen. Bitte versuche es erneut."): string {
  if (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) return STATUS_MESSAGES[0];
  if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) return STATUS_MESSAGES[408];
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
