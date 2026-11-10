import { Suspense } from "react";
import { Logo } from "../ui";
import { NAV } from "./content";
import { GuestActions, HeaderActions } from "./header-actions";
import { Container } from "./section";

/** Fester Header der Landingpage mit Anker-Navigation und Anmelde-Aktionen. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-bg/80 backdrop-blur-sm">
      <Container className="flex h-16 items-center justify-between">
        <Logo />
        <nav
          aria-label="Hauptnavigation"
          className="hidden items-center gap-8 text-sm font-semibold md:flex"
        >
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-fg-muted transition hover:text-fg"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {/* Angemeldet → „Zum Dashboard“ (pro Anfrage ermittelt, Rest der Seite bleibt statisch) */}
          <Suspense fallback={<GuestActions />}>
            <HeaderActions />
          </Suspense>
        </div>
      </Container>
    </header>
  );
}
