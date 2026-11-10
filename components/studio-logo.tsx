import { cx } from "./ui";

/**
 * Studio-Logo (frei proportioniert, Transparenz erlaubt) – ohne Logo: Initialen des Studios.
 * Sichtbar für Inhaber, Trainer und Kunden des Studios.
 */
export function StudioLogo({
  name,
  logoUrl,
  size = "md",
  className,
}: {
  name: string;
  logoUrl: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const box = { sm: "size-7", md: "size-9", lg: "size-12", xl: "size-24" }[size];
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- bereits serverseitig verkleinert
      <img
        src={logoUrl}
        alt={`Logo von ${name}`}
        className={cx(box, "shrink-0 rounded-control bg-surface object-contain p-0.5 ring-1 ring-line", className)}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      role="img"
      aria-label={`Logo von ${name}`}
      className={cx(
        box,
        "grid shrink-0 place-items-center rounded-control bg-brand-fg font-bold text-brand",
        size === "xl" ? "text-2xl" : size === "lg" ? "text-sm" : "text-[10px]",
        className,
      )}
    >
      {initials || "S"}
    </span>
  );
}
