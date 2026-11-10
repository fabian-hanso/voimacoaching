import type { ReactNode } from "react";
import { LEGAL } from "@/lib/legal";
import { Container } from "../landing/section";
import { SiteFooter } from "../landing/site-footer";
import { SiteHeader } from "../landing/site-header";

/** Rahmen für Impressum, Datenschutz und AGB: Header/Footer der Landingpage, lesefreundliche Textbreite. */
export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 py-16 sm:py-24">
        <Container>
          <article className="max-w-3xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-fg-muted">Stand: {LEGAL.updated}</p>
            {LEGAL.draft && (
              <p className="mt-6 rounded-tile bg-warning/15 px-4 py-3 text-sm text-fg ring-1 ring-warning/30 ring-inset">
                <strong>Entwurf:</strong> Dieser Text ist ein Muster und noch
                nicht rechtlich geprüft. Angaben in eckigen Klammern werden vor
                dem Livegang ersetzt.
              </p>
            )}
            <div className="mt-10 space-y-10">{children}</div>
          </article>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

/** Abschnitt mit Überschrift. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight text-fg">{title}</h2>
      <div className="mt-3 space-y-3 leading-7 text-fg-muted">{children}</div>
    </section>
  );
}

/** Aufzählung im Fließtext. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-fg-subtle">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** Anschrift des Anbieters als Block. */
export function OwnerAddress() {
  return (
    <p className="text-fg">
      {LEGAL.owner}
      <br />
      {LEGAL.street}
      <br />
      {LEGAL.zipCity}
      <br />
      {LEGAL.country}
    </p>
  );
}

/** Metadaten-Zusatz: Entwürfe nicht indexieren. */
export const legalRobots = LEGAL.draft
  ? { index: false, follow: true }
  : undefined;
