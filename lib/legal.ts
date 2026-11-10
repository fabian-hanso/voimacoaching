/**
 * Angaben für Impressum, Datenschutz und AGB – an EINER Stelle.
 *
 * TODO vor dem Livegang:
 *  1. Alle Werte in eckigen Klammern ersetzen.
 *  2. Texte in components/legal/ rechtlich prüfen lassen (Muster, keine Rechtsberatung).
 *  3. `draft` auf false setzen – dann verschwindet der Entwurfs-Hinweis und die Seiten werden indexiert.
 */
export const LEGAL = {
  /** true: Seiten zeigen einen Entwurfs-Hinweis und sind für Suchmaschinen gesperrt (noindex) */
  draft: true,
  /** Stand der Texte (Anzeige unter der Überschrift) */
  updated: "10. November 2026",

  /** Anbieter (Einzelunternehmen) */
  owner: "[Vorname Nachname]",
  street: "[Straße Hausnummer]",
  zipCity: "[PLZ Ort]",
  country: "Deutschland",
  email: "[kontakt@example.com]",
  phone: "[+49 …]",
  /** Kleinunternehmer: Steuernummer gehört auf Rechnungen; im Impressum optional */
  taxNumber: "[Steuernummer]",
  /** Ort für Gerichtsstand (AGB) */
  courtCity: "[Ort]",

  /** Region der Supabase-Datenbank (Supabase → Project Settings → General) */
  databaseRegion: "[z. B. Frankfurt (EU)]",
  /** Zuständige Datenschutz-Aufsichtsbehörde (Bundesland des Anbieters) */
  supervisoryAuthority:
    "[Landesbeauftragte/r für Datenschutz des Bundeslandes, Anschrift, Website]",
} as const;
