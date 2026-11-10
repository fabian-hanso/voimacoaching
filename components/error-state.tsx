"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "./ui";
import { Icon } from "./icons";

/** Freundliche Fehleranzeige für Error-Boundaries (error.tsx). */
export function ErrorState({ error, retry, homeHref = "/" }: { error: unknown; retry?: () => void; homeHref?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-danger/15 text-danger">
        <Icon name="alert" className="size-7" />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-fg">Da ist etwas schiefgelaufen</h1>
      <p className="mt-2 text-fg-muted">
        Ein unerwarteter Fehler ist aufgetreten. Deine Daten sind sicher – bitte versuche es noch einmal.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {retry && <Button onClick={() => retry()}>Erneut versuchen</Button>}
        <Link
          href={homeHref}
          className="inline-flex items-center rounded-control px-4 py-2.5 text-sm font-semibold text-fg ring-1 ring-line-strong hover:bg-surface-2"
        >
          Zur Startseite
        </Link>
      </div>
      {digest && <p className="mt-6 font-mono text-xs text-fg-subtle">Fehler-ID: {digest}</p>}
    </div>
  );
}
