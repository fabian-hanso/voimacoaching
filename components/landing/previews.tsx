import { Icon } from "../icons";

/* Dekorative Produkt-Vorschauen für die Zielgruppen-Abschnitte (aria-hidden über AudienceSection). */

const PLAN = [
  {
    name: "Bankdrücken",
    detail: "4 × 8 · 60 kg",
    note: "Schulterblätter zusammen, Füße fest am Boden.",
  },
  { name: "Klimmzüge", detail: "3 × 6" },
  { name: "Schulterdrücken", detail: "3 × 10 · 14 kg" },
];

/** Plan-Editor mit Katalog-Button, Erklär-Icon und Hinweis für den Kunden. */
export function PlanEditorPreview() {
  return (
    <div className="rounded-box bg-surface p-6 shadow-xl ring-1 ring-line-strong">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-fg">Oberkörper · Tag A</p>
        <span className="inline-flex items-center gap-1.5 rounded-control bg-surface-3 px-3 py-1.5 text-xs font-semibold text-fg">
          <Icon name="book" className="size-3.5" /> Aus Katalog wählen
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {PLAN.map((ex) => (
          <div
            key={ex.name}
            className="rounded-tile bg-surface-2 p-3 ring-1 ring-line"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-fg">{ex.name}</span>
              <Icon name="info" className="size-4 text-fg-subtle" />
              <span className="ml-auto font-mono text-xs text-fg-muted">
                {ex.detail}
              </span>
            </div>
            {ex.note && (
              <p className="mt-2 rounded-inner bg-surface px-2.5 py-1.5 text-xs text-fg-muted ring-1 ring-line">
                <span className="font-semibold text-fg">
                  Hinweis für den Kunden:
                </span>{" "}
                {ex.note}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-tile bg-brand px-4 py-3 text-sm font-semibold text-brand-fg">
        Zuweisen an 3 Kunden
        <Icon name="arrow" className="size-4" />
      </div>
    </div>
  );
}

const COURSES = [
  { name: "Yoga Flow", when: "Mo · 18:00 · Raum 1", booked: 12, cap: 15 },
  { name: "Spinning", when: "Mi · 07:00 · Cycling", booked: 20, cap: 20 },
  { name: "Rücken-Fit", when: "Fr · 17:30 · Raum 2", booked: 6, cap: 12 },
];

/** Kursbelegung der Woche plus Mitglieds-QR-Code. */
export function StudioPreview() {
  return (
    <div className="space-y-4">
      <div className="rounded-box bg-surface p-6 shadow-xl ring-1 ring-line-strong">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-fg">Kurse diese Woche</p>
          <span className="text-xs text-fg-muted">Iron Gym</span>
        </div>
        <ul className="mt-4 space-y-4">
          {COURSES.map((c) => {
            const full = c.booked === c.cap;
            return (
              <li key={c.name}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-fg">{c.name}</span>
                  <span className="text-xs text-fg-muted">
                    {full ? "ausgebucht" : `${c.booked}/${c.cap} Plätze`}
                  </span>
                </div>
                <p className="text-xs text-fg-subtle">{c.when}</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-3">
                  <div
                    className={`h-1.5 rounded-full ${full ? "bg-fg" : "bg-brand-fg/70"}`}
                    style={{ width: `${(c.booked / c.cap) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-box bg-brand p-5 text-brand-fg shadow-xl">
        <span className="grid size-14 place-items-center rounded-tile bg-white">
          <Icon name="qr" className="size-9" />
        </span>
        <div>
          <p className="font-bold">Mitglieds-Code für die Rezeption</p>
          <p className="text-sm text-brand-fg/75">
            Scannen, registrieren, Kurse buchen.
          </p>
        </div>
      </div>
    </div>
  );
}
