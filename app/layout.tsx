import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin", "latin-ext"],
});

export const viewport: Viewport = { themeColor: "#f7f7f7", colorScheme: "light" };

export const metadata: Metadata = {
  title: "Voima Coach – Trainingspläne & Progress-Tracking für Trainer und Kunden",
  description: "Personal Trainer erstellen individuelle Pläne, Kunden trainieren und tracken ihren Fortschritt – alles in einer App.",
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
