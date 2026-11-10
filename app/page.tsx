import type { Metadata } from "next";
import { Faq } from "@/components/landing/faq";
import { FeatureOverview } from "@/components/landing/feature-overview";
import { FinalCta } from "@/components/landing/final-cta";
import {
  ForClients,
  ForStudios,
  ForTrainers,
} from "@/components/landing/audiences";
import { Hero } from "@/components/landing/hero";
import { Pricing } from "@/components/landing/pricing";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { StructuredData } from "@/components/landing/structured-data";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

/** Startseite: nur Zusammenstellung – Inhalte in components/landing/content.ts, Abschnitte als eigene Komponenten. */
export default function Home() {
  return (
    <>
      <StructuredData />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <FeatureOverview />
        <ForTrainers />
        <ForStudios />
        <ForClients />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
