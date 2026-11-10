import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { FAQ } from "./content";

/** JSON-LD für Suchmaschinen: Software-Angaben und die FAQ der Seite. */
export function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "de",
        description: SITE_DESCRIPTION,
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "EUR",
          lowPrice: "0",
          highPrice: "299",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      // `<` maskieren, damit kein Inhalt aus dem Script-Tag ausbrechen kann
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
