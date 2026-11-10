/**
 * Marke und Adresse – EINE Stelle für Name und Domain. Wer umbenennt, ändert hier und prüft danach
 * die Stellen außerhalb des Codes (Liste unten).
 *
 * Außerhalb des Codes (bei einer Umbenennung von Hand anpassen):
 *  - public/logo.jpg (Bildmarke) und app/icon.png, app/apple-icon.png
 *  - app/opengraph-image.jpg / .alt.txt (Vorschaubild für Social Media)
 *  - Supabase → Authentication → E-Mail-Vorlagen (Absendername, Texte)
 *  - Stripe → Einstellungen: Unternehmensname, Abrechnungsbeschreibung (Kontoauszug), Branding;
 *    danach `npm run stripe:setup`, damit Produktnamen und Kundenportal den neuen Namen tragen
 *  - Vercel-Projekt/Domain, GitHub-Repo
 * Interne Kennungen wie Stripe-Lookup-Keys (`voima_…`) oder Demo-Passwörter bleiben bewusst unverändert.
 */

/** Produktname, wie Nutzer ihn sehen. */
export const SITE_NAME = "Voima Coach";

/** Für Zusammensetzungen nach deutscher Rechtschreibung, z. B. „Voima-Coach-Team“. */
export const SITE_NAME_COMPOUND = SITE_NAME.replace(/\s+/g, "-");

/**
 * Live-Adresse der Seite – für Canonical, Open Graph, Sitemap und robots.txt.
 * Zeigt immer auf die Live-Umgebung, auch lokal (Suchmaschinen sollen nur die Live-Seite kennen).
 *
 * TODO: Vorläufig die Vercel-Adresse – durch die echte Domain ersetzen, sobald sie feststeht.
 */
export const SITE_URL = "https://voimacoach.vercel.app";

/** Titel und Beschreibung der Startseite (Suchergebnis, Social-Media-Vorschau, strukturierte Daten). */
export const SITE_TITLE = `Software für Personal Trainer & Fitnessstudios | ${SITE_NAME}`;
export const SITE_DESCRIPTION = `Trainingspläne mit Übungsanleitungen, Terminbuchung, Kurse und Kundenverwaltung in einer App. Für Personal Trainer und Studios – 7 Tage kostenlos testen, Kunden nutzen ${SITE_NAME} gratis.`;
