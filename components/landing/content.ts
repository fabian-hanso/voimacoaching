import type { IconName } from "../icons";
import { SITE_NAME } from "@/lib/site";
import { LEGAL_LINKS } from "../legal/legal-links";

/**
 * Texte und Listen der Landingpage an einem Ort – Komponenten bleiben reine Darstellung.
 * Nur versprechen, was das Produkt wirklich kann.
 */

export const SIGNUP = {
  trainer: "/registrieren?rolle=trainer",
  studio: "/registrieren?rolle=studio",
  client: "/registrieren?rolle=kunde",
} as const;

/** Anker der Abschnitte – Header- und Footer-Navigation. */
export const NAV: { href: string; label: string }[] = [
  { href: "#trainer", label: "Für Trainer" },
  { href: "#studios", label: "Für Studios" },
  { href: "#funktionen", label: "Funktionen" },
  { href: "#preise", label: "Preise" },
  { href: "#faq", label: "FAQ" },
];

export const TRIAL_NOTE =
  "7 Tage kostenlos · Keine Kreditkarte nötig · Für Kunden immer gratis";

/* ------------------------------------------------------------------ */

export type Audience = "Trainer" | "Studios";

export const FEATURES: {
  icon: IconName;
  title: string;
  text: string;
  for: Audience[];
}[] = [
  {
    icon: "dumbbell",
    title: "Trainingspläne",
    text: "Kraft- und Ausdauerübungen mit Sätzen, Wiederholungen, Gewicht und Pausen. Einmal bauen, mehreren Kunden zuweisen.",
    for: ["Trainer"],
  },
  {
    icon: "book",
    title: "Übungskatalog mit Anleitungen",
    text: "46 Übungen mit Muskeln, Ausführung Schritt für Schritt und typischen Fehlern – ergänzt um deinen persönlichen Hinweis.",
    for: ["Trainer", "Studios"],
  },
  {
    icon: "chart",
    title: "Fortschritt im Blick",
    text: "Workouts, Bestwerte, Trainings-Streak, Volumen, Ausdauer und Körpermaße. Du siehst sofort, wer dranbleibt.",
    for: ["Trainer"],
  },
  {
    icon: "calendar",
    title: "Termine & Wochenkalender",
    text: "Angebote und Verfügbarkeit festlegen, Anfragen bestätigen, Termine auch für Gäste eintragen – ohne Doppelbuchung.",
    for: ["Trainer", "Studios"],
  },
  {
    icon: "users",
    title: "Kurse & Mitglieder",
    text: "Kurse mit festen Plätzen pro Termin, Anmeldung durch Mitglieder und ein Mitglieds-QR-Code für die Rezeption.",
    for: ["Studios"],
  },
  {
    icon: "chat",
    title: "Chat & Benachrichtigungen",
    text: "Direkter Chat mit jedem Kunden in Echtzeit. Neue Anfragen, Absagen und Kommentare landen sofort in der Glocke.",
    for: ["Trainer", "Studios"],
  },
];

export const TRAINER_POINTS = [
  "Plan-Editor mit Übungen aus dem Katalog oder frei eingetragen",
  "Persönlicher Hinweis je Übung – deine Kunden sehen ihn direkt neben der Anleitung",
  "Kundenliste mit Status Aktiv, Inaktiv, Neu und Eingeladen",
  "Terminbuchung: Kunden fragen an, du bestätigst mit einem Klick",
  "Echtzeit-Chat und Benachrichtigungen bei allem Wichtigen",
];

export const STUDIO_POINTS = [
  "Bis zu 10 Trainer per Code ins Team einladen",
  "Kunden Trainern zuweisen – oder bei Ausfall komplett übertragen",
  "Kurse mit Plätzen pro Termin, Mitglieder buchen selbst",
  "Gemeinsamer Wochenkalender aller Trainer inkl. Auslastung",
  "Studio-Seite mit Logo, Öffnungszeiten, Ausstattung und Team",
];

export const CLIENT_POINTS: { icon: IconName; text: string }[] = [
  { icon: "list", text: "Trainingsplan mit Anleitung zu jeder Übung" },
  { icon: "check", text: "Workouts nach Plan oder frei loggen" },
  { icon: "calendar", text: "Termine und Kurse selbst buchen" },
  { icon: "chart", text: "Bestwerte, Streak und Körpermaße" },
];

/* ------------------------------------------------------------------ */

/** FAQ – sichtbar auf der Seite und als strukturierte Daten (FAQPage) für Suchmaschinen. */
export const FAQ: { q: string; a: string }[] = [
  {
    q: `Was kostet ${SITE_NAME} für meine Kunden?`,
    a: `Nichts. Kunden nutzen ${SITE_NAME} dauerhaft kostenlos. Bezahlt wird nur vom Trainer oder Studio – je nach Paket.`,
  },
  {
    q: "Wie kommen meine Kunden in die App?",
    a: "Du schickst deinen Kunden einen Einladungscode. Damit registrieren sie sich und sind direkt mit dir verbunden. Studios hängen zusätzlich einen Mitglieds-QR-Code an der Rezeption aus.",
  },
  {
    q: "Brauche ich als Personal Trainer ein Studio?",
    a: `Nein. Als selbstständiger Trainer nutzt du ${SITE_NAME} allein – mit eigenen Kunden, Plänen und Terminen. Arbeitest du in einem Studio, lädt es dich ins Team ein.`,
  },
  {
    q: "Was bekommt ein Fitnessstudio zusätzlich?",
    a: "Bis zu 10 Trainer im Team, Kunden zuweisen und bei Ausfall übertragen, Kurse mit Platzkontingent, einen gemeinsamen Wochenkalender, Mitglieds-Code mit QR und eine eigene Studio-Seite mit Logo, Öffnungszeiten und Team.",
  },
  {
    q: "Können Kunden Termine und Kurse selbst buchen?",
    a: "Ja. Trainer legen Angebote und ihre Verfügbarkeit fest, Kunden fragen freie Zeiten an und der Trainer bestätigt. Kurse buchen Studio-Mitglieder direkt – überbucht wird dabei nie.",
  },
  {
    q: "Brauche ich eine App aus dem App Store?",
    a: `Nein. ${SITE_NAME} läuft im Browser auf Smartphone, Tablet und Desktop – ohne Installation.`,
  },
  {
    q: `Kann ich ${SITE_NAME} kostenlos testen?`,
    a: "Ja, 7 Tage lang und ohne Kreditkarte. Danach ist das Abo monatlich kündbar.",
  },
];

/* ------------------------------------------------------------------ */

export const FOOTER_COLUMNS: {
  title: string;
  links: { href: string; label: string }[];
}[] = [
  { title: "Produkt", links: NAV },
  {
    title: "Konto",
    links: [
      { href: "/login", label: "Anmelden" },
      { href: SIGNUP.trainer, label: "Als Trainer registrieren" },
      { href: SIGNUP.studio, label: "Studio anlegen" },
      { href: SIGNUP.client, label: "Einladung annehmen" },
    ],
  },
  {
    title: "Rechtliches",
    links: LEGAL_LINKS,
  },
];
