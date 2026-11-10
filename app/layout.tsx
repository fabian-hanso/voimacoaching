import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin", "latin-ext"],
});

export const viewport: Viewport = { themeColor: "#f7f7f7", colorScheme: "light" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Voima Coach – Software für Personal Trainer & Fitnessstudios",
  description:
    "Trainingspläne mit Übungsanleitungen, Terminbuchung, Kurse und Kundenverwaltung für Personal Trainer und Studios. Kunden nutzen Voima Coach kostenlos.",
  applicationName: SITE_NAME,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${urbanist.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg font-sans text-fg">{children}</body>
    </html>
  );
}
