/**
 * Pakete und Preise – EINE Quelle für Landingpage, Abo-Seite, API und Stripe-Einrichtung.
 * Kleinunternehmer (§ 19 UStG): Preise sind Endpreise, es wird keine Umsatzsteuer berechnet.
 * Jahrespreis = 10 × Monatspreis („2 Monate gratis“).
 */

export type PlanId =
  "trainer_10" | "trainer_20" | "trainer_unlimited" | "studio";
export type BillingInterval = "month" | "year";

export interface Plan {
  id: PlanId;
  audience: "trainer" | "studio";
  /** kurze Bezeichnung, z. B. „bis 10 Kunden“ */
  label: string;
  /** Name in Stripe und auf Rechnungen (ohne Marke – stripe-setup stellt SITE_NAME voran) */
  productName: string;
  /** max. Kunden des Trainers; null = unbegrenzt */
  clientLimit: number | null;
  /** € pro Monat bei monatlicher Zahlung */
  monthly: number;
  /** € pro Jahr bei jährlicher Zahlung */
  yearly: number;
  popular?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  trainer_10: {
    id: "trainer_10",
    audience: "trainer",
    label: "bis 10 Kunden",
    productName: "Trainer – bis 10 Kunden",
    clientLimit: 10,
    monthly: 19,
    yearly: 190,
  },
  trainer_20: {
    id: "trainer_20",
    audience: "trainer",
    label: "bis 20 Kunden",
    productName: "Trainer – bis 20 Kunden",
    clientLimit: 20,
    monthly: 29,
    yearly: 290,
    popular: true,
  },
  trainer_unlimited: {
    id: "trainer_unlimited",
    audience: "trainer",
    label: "Unbegrenzt",
    productName: "Trainer – unbegrenzt",
    clientLimit: null,
    monthly: 49,
    yearly: 490,
  },
  studio: {
    id: "studio",
    audience: "studio",
    label: "Studio",
    productName: "Studio",
    clientLimit: null,
    monthly: 299,
    yearly: 2990,
  },
};

export const TRAINER_PLANS = [
  PLANS.trainer_10,
  PLANS.trainer_20,
  PLANS.trainer_unlimited,
];

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

/** Kostenlose Testphase nach der Registrierung (ohne Zahlungsdaten). */
export const TRIAL_DAYS = 7;

/** Preis pro Monat bei jährlicher Zahlung (gerundet, für die Anzeige). */
export const yearlyPerMonth = (p: Plan) => Math.round(p.yearly / 12);

/** Preis für das gewählte Intervall in Euro. */
export const priceFor = (p: Plan, interval: BillingInterval) =>
  interval === "year" ? p.yearly : p.monthly;

/** Stripe-Lookup-Key je Paket und Intervall (so findet die API den Preis ohne Preis-IDs in der Konfiguration). */
export const lookupKey = (plan: PlanId, interval: BillingInterval) =>
  `voima_${plan}_${interval}`;

/** Umkehrung von `lookupKey`; null bei fremden Preisen. */
export function parseLookupKey(
  key: string | null | undefined,
): { plan: PlanId; interval: BillingInterval } | null {
  const m = key?.match(/^voima_(.+)_(month|year)$/);
  if (!m || !(m[1] in PLANS)) return null;
  return { plan: m[1] as PlanId, interval: m[2] as BillingInterval };
}

export const euro = (n: number) =>
  `${new Intl.NumberFormat("de-DE").format(n)} €`;

/** Pflichthinweis auf Rechnungen als Kleinunternehmer. */
export const SMALL_BUSINESS_NOTE =
  "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.";
