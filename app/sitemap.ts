import type { MetadataRoute } from "next";
import { LEGAL } from "@/lib/legal";
import { SITE_URL } from "@/lib/site";

/** Öffentliche, indexierbare Seiten. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/registrieren`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    { url: `${SITE_URL}/login`, changeFrequency: "yearly", priority: 0.3 },
    // Rechtstexte erst listen, wenn sie final sind (solange Entwurf: noindex)
    ...(LEGAL.draft
      ? []
      : ["impressum", "datenschutz", "agb"].map((p) => ({
          url: `${SITE_URL}/${p}`,
          changeFrequency: "yearly" as const,
          priority: 0.2,
        }))),
  ];
}
