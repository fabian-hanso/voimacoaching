import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** robots.txt: Startseite und Registrierung indexieren, App-Bereiche und API nicht. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/", "/auth/", "/passwort-neu"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
