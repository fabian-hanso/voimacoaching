import type { Metadata } from "next";
import { StudioPage } from "@/components/dashboard/studio-page/studio-page";

export const metadata: Metadata = { title: "Studio" };

/**
 * Keine Instant-Navigation-Prüfung: Die Dashboard-Shell rendert Seiten erst, wenn das Profil (/me)
 * im Browser geladen ist – alle Daten hier sind nutzerspezifisch. Eine statische Hülle gäbe es
 * ohnehin nur als Lade-Spinner; die Shell zeigt diesen sofort.
 */
export const instant = false;

export default function Page() {
  return <StudioPage />;
}
