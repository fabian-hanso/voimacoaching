import { Icon } from "../icons";
import { FEATURES } from "./content";
import { Section, SectionHeading } from "./section";

/** „Funktionen auf einen Blick“: sechs Kacheln, je mit Kennzeichnung Trainer/Studios. */
export function FeatureOverview() {
  return (
    <Section id="funktionen" labelledBy="funktionen-titel">
      <SectionHeading
        id="funktionen-titel"
        eyebrow="Funktionen"
        title="Alles fürs Coaching. Nichts, was du nicht brauchst."
      >
        Pläne, Termine, Kurse und Kommunikation in einer Plattform – statt
        Excel, WhatsApp und Terminkalender.
      </SectionHeading>
      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <li
            key={f.title}
            className="rounded-box bg-surface p-6 ring-1 ring-line"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-10 place-items-center rounded-control bg-brand text-brand-fg">
                <Icon name={f.icon} />
              </span>
              <span className="flex gap-1.5">
                {f.for.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold text-fg-muted"
                  >
                    {a}
                  </span>
                ))}
              </span>
            </div>
            <h3 className="mt-5 font-semibold text-fg">{f.title}</h3>
            <p className="mt-2 text-sm leading-6 text-fg-muted">{f.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
