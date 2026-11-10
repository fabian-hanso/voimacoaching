/**
 * VORERST AUSGEBLENDET – Feature-Tour (Chat + Gamification).
 * Der Ordner heißt `_features` und ist damit eine private Next.js-Route (nicht erreichbar).
 * Zum Aktivieren: Ordner zurück in `app/features` umbenennen und auf der Startseite verlinken.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { FeatureTour } from "@/components/features/feature-tour";
import { Logo } from "@/components/ui";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Alle Features",
  description:
    `Alle Funktionen von ${SITE_NAME} – erzählt als Chat zwischen Coach und Kundin. Scroll los und sammle XP.`,
};

export default function FeaturesPage() {
  return (
    <>
      <header className="sticky top-0 z-40 h-16 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="flex items-center gap-2 text-sm font-semibold sm:gap-6">
            <Link href="/" className="hidden text-fg-muted hover:text-fg sm:block">
              Startseite
            </Link>
            <Link href="/#preise" className="hidden text-fg-muted hover:text-fg sm:block">
              Preise
            </Link>
            <Link href="/login" className="text-fg-muted hover:text-fg">
              Anmelden
            </Link>
            <Link href="/registrieren" className="rounded-control bg-brand px-4 py-2 text-brand-fg hover:bg-brand-hover">
              Kostenlos starten
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 pt-16 text-center sm:px-6 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-fg">
            🎮 Interaktive Feature-Tour
          </p>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-fg sm:text-6xl">
            Alle Features.{" "}
            <span className="rounded-control bg-brand box-decoration-clone px-2 text-brand-fg">Erzählt als Chat.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-fg-muted">
            Begleite Coach Marco und Lena durch einen Trainingsmonat. Jedes Feature, das du entdeckst, bringt dir XP – schaffst du
            alle {12}?
          </p>
        </div>
        <FeatureTour />
      </main>
    </>
  );
}
