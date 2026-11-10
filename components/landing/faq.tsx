import { Icon } from "../icons";
import { FAQ } from "./content";
import { Section, SectionHeading } from "./section";

/** Aufklappbare FAQ (ohne JavaScript, per <details>). Dieselben Fragen gehen als FAQPage in die strukturierten Daten. */
export function Faq() {
  return (
    <Section id="faq" labelledBy="faq-titel">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <SectionHeading id="faq-titel" eyebrow="FAQ" title="Häufige Fragen">
          Kurz beantwortet – für Personal Trainer und Studios.
        </SectionHeading>
        <div className="divide-y divide-line rounded-box bg-surface ring-1 ring-line">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-fg">
                <h3>{f.q}</h3>
                <span className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-2 text-fg-muted transition group-open:rotate-45">
                  <Icon name="plus" className="size-4" />
                </span>
              </summary>
              <p className="mt-3 pr-12 text-sm leading-6 text-fg-muted">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
