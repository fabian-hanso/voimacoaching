import type { Metadata } from "next";
import { SettingsPage } from "@/components/dashboard/settings/settings-page";

export const metadata: Metadata = { title: "Einstellungen" };

/**
 * Keine Instant-Navigation-Prüfung: Die Dashboard-Shell rendert Seiten erst, wenn das Profil (/me)
 * im Browser geladen ist – alle Daten hier sind nutzerspezifisch. Eine statische Hülle gäbe es
 * ohnehin nur als Lade-Spinner; die Shell zeigt diesen sofort.
 */
export const instant = false;

export default function Page() {
  return <SettingsPage />;
}
