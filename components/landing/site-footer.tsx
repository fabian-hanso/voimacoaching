import Link from "next/link";
import { Logo } from "../ui";
import { FOOTER_COLUMNS } from "./content";
import { Container } from "./section";
import { SITE_NAME } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <Container className="grid gap-12 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-fg-muted">
            Software für Personal Trainer und Fitnessstudios: Trainingspläne,
            Termine, Kurse und Kundenbetreuung an einem Ort.
          </p>
        </div>
        {FOOTER_COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="text-sm font-semibold text-fg">{c.title}</p>
            <ul className="mt-4 space-y-3 text-sm text-fg-muted">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") ? (
                    <Link href={l.href} className="hover:text-fg">
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} className="hover:text-fg">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <div className="border-t border-line py-6 text-center text-sm text-fg-muted">
        © 2026 {SITE_NAME}. Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}
