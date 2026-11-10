import type { Metadata } from "next";
import { ImpressumContent } from "@/components/legal/impressum-content";
import { LegalLayout, legalRobots } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Impressum",
  alternates: { canonical: "/impressum" },
  robots: legalRobots,
};

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <ImpressumContent />
    </LegalLayout>
  );
}
