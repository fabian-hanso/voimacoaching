import { ButtonLink, Logo } from "./ui";

/** 404-Ansicht: Seite gibt es nicht (mehr). */
export function NotFoundState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Logo />
      <p className="mt-10 text-sm font-semibold text-brand-ink">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
        Seite nicht gefunden
      </h1>
      <p className="mt-3 text-fg-muted">
        Diese Seite gibt es nicht (mehr). Vielleicht hat sich ein Tippfehler
        eingeschlichen?
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/">Zur Startseite</ButtonLink>
        <ButtonLink href="/dashboard" variant="outline">
          Zum Dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
