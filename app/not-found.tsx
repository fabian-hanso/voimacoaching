import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Logo />
      <p className="mt-10 text-sm font-semibold text-brand-ink">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">Seite nicht gefunden</h1>
      <p className="mt-3 text-fg-muted">Diese Seite gibt es nicht (mehr). Vielleicht hat sich ein Tippfehler eingeschlichen?</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="rounded-control bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-hover">
          Zur Startseite
        </Link>
        <Link href="/dashboard" className="rounded-control px-4 py-2.5 text-sm font-semibold text-fg ring-1 ring-line-strong hover:bg-surface-2">
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
