import type { Metadata } from "next";
import { DatenschutzContent } from "@/components/legal/datenschutz-content";
import { LegalLayout, legalRobots } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Datenschutz",
  alternates: { canonical: "/datenschutz" },
  robots: legalRobots,
};

export default function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <DatenschutzContent />
    </LegalLayout>
  );
}
