/**
 * Richtet die App in Stripe ein (idempotent – mehrfach ausführbar):
 *  - je Paket ein Produkt mit Monats- und Jahrespreis (Lookup-Keys voima_<paket>_<month|year>)
 *  - Kundenportal: Trainer dürfen zwischen den Trainer-Paketen wechseln, alle dürfen kündigen (zum Periodenende),
 *    Zahlungsart ändern und Rechnungen ansehen
 *
 * Preise kommen aus lib/billing-plans.ts. Ändert sich ein Betrag, legt das Skript einen neuen Preis an und
 * übernimmt den Lookup-Key (bestehende Abos behalten ihren alten Preis, bis sie wechseln).
 *
 * Aufruf:  npm run stripe:setup   (liest STRIPE_SECRET_KEY aus .env.local)
 */
import Stripe from "stripe";
import { PLANS, lookupKey } from "../lib/billing-plans.ts";
import { SITE_NAME } from "../lib/site.ts";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY fehlt (in .env.local eintragen, siehe docs/STRIPE.md).");
  process.exit(1);
}
const stripe = new Stripe(key);
console.log(`Stripe-Modus: ${key.startsWith("sk_live") ? "LIVE" : "Test"}\n`);

/** Produkt je Paket finden (über metadata.voima_plan) oder anlegen. */
async function ensureProduct(plan) {
  const name = `${SITE_NAME} ${plan.productName}`;
  // list statt search: die Suche ist bei Stripe verzögert und fände frisch angelegte Produkte noch nicht
  let existing = null;
  for await (const p of stripe.products.list({ limit: 100 })) {
    if (p.metadata?.voima_plan === plan.id) {
      existing = p;
      break;
    }
  }
  if (existing) {
    if (existing.name !== name || !existing.active) {
      await stripe.products.update(existing.id, { name, active: true });
    }
    return existing.id;
  }
  const created = await stripe.products.create({ name, metadata: { voima_plan: plan.id } });
  console.log(`+ Produkt ${name}`);
  return created.id;
}

/** Preis mit Lookup-Key sicherstellen (Betrag in Cent, wiederkehrend). */
async function ensurePrice(plan, product, interval) {
  const lk = lookupKey(plan.id, interval);
  const amount = (interval === "year" ? plan.yearly : plan.monthly) * 100;
  const current = (await stripe.prices.list({ lookup_keys: [lk], limit: 1 })).data[0];
  if (current && current.unit_amount === amount && current.product === product && current.active) {
    console.log(`= ${lk}: ${amount / 100} €`);
    return current.id;
  }
  const price = await stripe.prices.create({
    product,
    currency: "eur",
    unit_amount: amount,
    recurring: { interval },
    lookup_key: lk,
    transfer_lookup_key: true,
    metadata: { voima_plan: plan.id },
  });
  if (current) await stripe.prices.update(current.id, { active: false });
  console.log(`+ ${lk}: ${amount / 100} €${current ? ` (vorher ${current.unit_amount / 100} €)` : ""}`);
  return price.id;
}

const catalog = {};
for (const plan of Object.values(PLANS)) {
  const product = await ensureProduct(plan);
  catalog[plan.id] = { product, prices: [await ensurePrice(plan, product, "month"), await ensurePrice(plan, product, "year")] };
}

/** Portal-Konfiguration je Zielgruppe (metadata.voima = trainer | studio). */
async function ensurePortal(audience) {
  const trainerProducts = Object.values(PLANS)
    .filter((p) => p.audience === "trainer")
    .map((p) => ({ product: catalog[p.id].product, prices: catalog[p.id].prices }));
  const features = {
    customer_update: { enabled: true, allowed_updates: ["name", "email", "address"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    subscription_update:
      audience === "trainer"
        ? { enabled: true, default_allowed_updates: ["price"], products: trainerProducts, proration_behavior: "create_prorations" }
        : { enabled: false },
  };
  const all = await stripe.billingPortal.configurations.list({ active: true, limit: 50 });
  const existing = all.data.find((c) => c.metadata?.voima === audience);
  const params = {
    name: `${SITE_NAME} – ${audience === "trainer" ? "Trainer" : "Studios"}`,
    features,
    business_profile: { headline: `${SITE_NAME} – Abo verwalten` },
    metadata: { voima: audience },
  };
  if (existing) {
    await stripe.billingPortal.configurations.update(existing.id, params);
    console.log(`= Kundenportal ${audience} aktualisiert`);
  } else {
    await stripe.billingPortal.configurations.create(params);
    console.log(`+ Kundenportal ${audience}`);
  }
}
await ensurePortal("trainer");
await ensurePortal("studio");

console.log(`
Fertig. Nächste Schritte (siehe docs/STRIPE.md):
  1. Webhook-Endpunkt anlegen: <deine Domain>/api/v1/billing/webhook
     Events: checkout.session.completed, customer.subscription.created/updated/deleted/paused/resumed
  2. Signing-Secret als STRIPE_WEBHOOK_SECRET eintragen.
  3. Stripe-Dashboard → Einstellungen → Rechnungen: Firmenname und Adresse prüfen.`);
