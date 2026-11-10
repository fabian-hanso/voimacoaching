import type { Metadata } from "next";
import { AgbContent } from "@/components/legal/agb-content";
import { LegalLayout, legalRobots } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "AGB",
  alternates: { canonical: "/agb" },
  robots: legalRobots,
};

export default function AgbPage() {
  return (
    <LegalLayout title="Allgemeine Geschäftsbedingungen">
      <AgbContent />
    </LegalLayout>
  );
}
