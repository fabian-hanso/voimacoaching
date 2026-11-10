"use client";

/**
 * Vollständiger Seitenwechsel (kein Client-Routing).
 *
 * Für Anmelde-Wechsel (Login, Logout, Kontowechsel, Konto gelöscht, Sitzung abgelaufen):
 * Mit Cache Components hält Next.js besuchte Seiten per React <Activity> versteckt im Speicher.
 * Ein normales router.push() würde danach kurz die UI – und Daten – des vorherigen Kontos zeigen.
 * Ein echter Seitenwechsel verwirft Router-Cache, versteckte Seiten, Realtime-Verbindungen und State.
 * `replace`, damit „Zurück“ nicht auf die alte Sitzung führt.
 */
export function hardNavigate(path: string) {
  window.location.replace(path);
}
