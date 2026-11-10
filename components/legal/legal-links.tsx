import Link from "next/link";

/** Rechtliche Seiten – müssen von jeder Seite aus erreichbar sein (Impressumspflicht). */
export const LEGAL_LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB" },
];

/** Dezente Link-Zeile für Seiten ohne großen Footer (Login, Registrierung, Dashboard). */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Rechtliches"
      className={`flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-fg-subtle ${className ?? ""}`}
    >
      {LEGAL_LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="transition hover:text-fg">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
