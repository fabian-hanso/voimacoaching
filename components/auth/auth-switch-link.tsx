import Link from "next/link";

/** Zeile unter dem Auth-Titel, z. B. „Noch kein Konto? Jetzt registrieren“. */
export function AuthSwitchLink({
  question,
  href,
  label,
}: {
  question: string;
  href: string;
  label: string;
}) {
  return (
    <>
      {question}{" "}
      <Link
        href={href}
        className="font-semibold text-brand-ink hover:text-brand-ink/80"
      >
        {label}
      </Link>
    </>
  );
}
