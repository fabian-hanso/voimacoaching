import "server-only";
import Stripe from "stripe";
import { supabaseAdmin } from "../supabase/admin";
import {
  lookupKey,
  parseLookupKey,
  PLANS,
  SMALL_BUSINESS_NOTE,
  type BillingInterval,
  type PlanId,
} from "../billing-plans";
import type { BillingStatus } from "../types";
import { ApiError, conflict, forbidden } from "./http";
import type { ProfileRow } from "./repo";
import { SITE_NAME } from "../site";

/**
 * Abrechnung mit Stripe.
 *  - Testphase: 7 Tage ab Registrierung (profiles.trial_ends_at), ohne Zahlungsdaten.
 *  - Abo: Stripe Checkout (gehostet) → Webhook spiegelt den Stand in `subscriptions`.
 *  - Verwalten (Paket wechseln, kündigen, Zahlungsart, Rechnungen): Stripe-Kundenportal.
 *  - Trainer eines Studios sind über das Studio-Abo abgedeckt.
 *  - Ohne Zugang (Testphase vorbei, kein aktives Abo) ist das Dashboard gesperrt – Kunden betrifft das nicht.
 */

const sb = () => supabaseAdmin();

/** Supabase-Ergebnis auspacken (eigene Kopie, damit billing.ts nicht zur Laufzeit von repo.ts abhängt). */
function must<T>(res: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (res.error) throw res.error;
  return res.data as T;
}

/** Stripe-Status, mit denen das Konto nutzbar ist (past_due: Zahlung fehlgeschlagen, Stripe versucht es erneut). */
const ACTIVE = new Set(["active", "trialing", "past_due"]);

/** Diese API-Pfade bleiben ohne Abo erreichbar: Profil/Einstellungen/Konto löschen und die Abrechnung selbst. */
const ALWAYS_ALLOWED = [
  /^\/api\/v1\/me(\/|$)/,
  /^\/api\/v1\/billing(\/|$)/,
  /^\/api\/v1\/studio-invitations\//,
];

interface SubscriptionRow {
  owner_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: PlanId | null;
  billing_interval: BillingInterval | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

/* ------------------------------------------------------------------ */
/* Stripe-Client                                                       */
/* ------------------------------------------------------------------ */

export const isStripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;

let client: Stripe | null = null;
function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key)
    throw new ApiError(
      503,
      "billing_not_configured",
      "Zahlungen sind noch nicht eingerichtet. Bitte versuche es später erneut.",
    );
  client ??= new Stripe(key, { appInfo: { name: SITE_NAME } });
  return client;
}

/* ------------------------------------------------------------------ */
/* Status & Zugang                                                     */
/* ------------------------------------------------------------------ */

async function getSubscription(
  ownerId: string,
): Promise<SubscriptionRow | null> {
  return must(
    await sb()
      .from("subscriptions")
      .select("*")
      .eq("owner_id", ownerId)
      .maybeSingle<SubscriptionRow>(),
  );
}

/** Wer zahlt für dieses Konto? Studio-Trainer → Inhaber des Studios, sonst das Konto selbst. */
async function payerOf(user: ProfileRow): Promise<ProfileRow | null> {
  if (user.role === "trainer" && user.studio_id) {
    const studio = must(
      await sb()
        .from("studios")
        .select("owner_id")
        .eq("id", user.studio_id)
        .maybeSingle<{ owner_id: string }>(),
    );
    if (!studio) return null;
    return must(
      await sb()
        .from("profiles")
        .select("*")
        .eq("id", studio.owner_id)
        .maybeSingle<ProfileRow>(),
    );
  }
  return user;
}

const iso = (ts: string | null) => (ts ? new Date(ts).toISOString() : null);

/** Abo-Status eines Trainers oder Studios (null für Kunden). */
export async function getBillingStatus(
  user: ProfileRow,
  withClientCount = true,
): Promise<BillingStatus | null> {
  if (user.role === "client") return null;
  const managedByStudio = user.role === "trainer" && !!user.studio_id;
  const payer = await payerOf(user);
  const sub = payer ? await getSubscription(payer.id) : null;
  const subscribed = !!sub?.status && ACTIVE.has(sub.status);
  const inTrial =
    !!payer && new Date(payer.trial_ends_at).getTime() > Date.now();

  let clientCount: number | null = null;
  if (withClientCount && user.role === "trainer") {
    const { count, error } = await sb()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("trainer_id", user.id)
      .eq("role", "client");
    if (error) throw error;
    clientCount = count ?? 0;
  }

  return {
    access: subscribed || inTrial,
    source: managedByStudio
      ? "studio"
      : subscribed
        ? "subscription"
        : inTrial
          ? "trial"
          : "none",
    managedByStudio,
    trialEndsAt: payer ? iso(payer.trial_ends_at) : null,
    plan: subscribed ? sub!.plan : null,
    interval: subscribed ? sub!.billing_interval : null,
    status: sub?.status ?? null,
    currentPeriodEnd: subscribed ? iso(sub!.current_period_end) : null,
    cancelAtPeriodEnd: subscribed ? sub!.cancel_at_period_end : false,
    clientLimit:
      managedByStudio || !subscribed || !sub!.plan
        ? null
        : PLANS[sub!.plan].clientLimit,
    clientCount,
    hasCustomer: !!sub && !managedByStudio,
    checkoutAvailable: isStripeConfigured(),
  };
}

/**
 * Sperre für Trainer/Studios ohne Zugang (Testphase vorbei, kein aktives Abo).
 * Wird von requireUser für jede API-Anfrage geprüft – außer für Profil, Konto und Abrechnung.
 */
export async function assertBillingAccess(
  user: ProfileRow,
  pathname: string,
): Promise<void> {
  if (user.role === "client" || ALWAYS_ALLOWED.some((re) => re.test(pathname)))
    return;
  const status = await getBillingStatus(user, false);
  if (status?.access) return;
  throw new ApiError(
    402,
    "billing_required",
    status?.managedByStudio
      ? "Das Abo deines Studios ist nicht aktiv. Bitte wende dich an dein Studio."
      : "Deine Testphase ist abgelaufen. Wähle ein Abo, um weiterzumachen.",
  );
}

/** Kundenlimit des Pakets prüfen, bevor ein Trainer eine neue Einladung erstellt. */
export async function assertClientCapacity(trainer: ProfileRow): Promise<void> {
  const status = await getBillingStatus(trainer);
  if (
    status?.clientLimit != null &&
    (status.clientCount ?? 0) >= status.clientLimit
  ) {
    throw conflict(
      `Dein Paket umfasst bis zu ${status.clientLimit} Kunden. Wechsle unter „Abo“ auf ein größeres Paket, um weitere Kunden einzuladen.`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Checkout & Kundenportal                                             */
/* ------------------------------------------------------------------ */

async function ensureCustomer(user: ProfileRow): Promise<string> {
  const existing = await getSubscription(user.id);
  if (existing) return existing.stripe_customer_id;
  const customer = await stripe().customers.create({
    email: user.email,
    name: user.name,
    preferred_locales: ["de"],
    metadata: { owner_id: user.id, role: user.role },
    invoice_settings: { footer: SMALL_BUSINESS_NOTE },
  });
  must(
    await sb()
      .from("subscriptions")
      .insert({ owner_id: user.id, stripe_customer_id: customer.id })
      .select()
      .single(),
  );
  return customer.id;
}

/** Startet Stripe Checkout für ein Paket und liefert die URL der Bezahlseite. */
export async function createCheckout(
  user: ProfileRow,
  plan: PlanId,
  interval: BillingInterval,
  origin: string,
) {
  if (user.role === "client")
    throw forbidden(`Kunden nutzen ${SITE_NAME} kostenlos.`);
  if (user.role === "trainer" && user.studio_id)
    throw conflict("Du bist über das Abo deines Studios abgedeckt.");
  if (PLANS[plan].audience !== user.role) {
    throw conflict(
      user.role === "studio"
        ? "Studios buchen das Studio-Paket."
        : "Trainer buchen eines der Trainer-Pakete.",
    );
  }
  const current = await getSubscription(user.id);
  if (current?.status && ACTIVE.has(current.status)) {
    throw conflict(
      "Du hast bereits ein aktives Abo. Paketwechsel und Kündigung gehen über „Abo verwalten“.",
    );
  }

  const prices = await stripe().prices.list({
    lookup_keys: [lookupKey(plan, interval)],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    console.error(
      `[billing] Preis ${lookupKey(plan, interval)} fehlt in Stripe – scripts/stripe-setup.mjs ausführen`,
    );
    throw new ApiError(
      503,
      "billing_not_configured",
      "Dieses Paket ist noch nicht buchbar. Bitte versuche es später erneut.",
    );
  }

  const customer = await ensureCustomer(user);
  // Restliche Testphase bleibt kostenlos – Stripe verlangt dafür mind. 48 h Vorlauf
  const trialEnd = Math.floor(new Date(user.trial_ends_at).getTime() / 1000);
  const keepTrial = trialEnd - Date.now() / 1000 > 48 * 3600;

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price: price.id, quantity: 1 }],
    subscription_data: {
      metadata: { owner_id: user.id },
      ...(keepTrial ? { trial_end: trialEnd } : {}),
    },
    metadata: { owner_id: user.id },
    locale: "de",
    allow_promotion_codes: true,
    customer_update: { name: "auto", address: "auto" },
    billing_address_collection: "auto",
    success_url: `${origin}/dashboard/abo?checkout=erfolg`,
    cancel_url: `${origin}/dashboard/abo`,
  });
  if (!session.url)
    throw new ApiError(
      502,
      "billing_failed",
      "Die Bezahlseite konnte nicht geöffnet werden.",
    );
  return { url: session.url };
}

/** Öffnet das Stripe-Kundenportal (Paket wechseln, kündigen, Zahlungsart, Rechnungen). */
export async function createPortal(user: ProfileRow, origin: string) {
  if (user.role === "trainer" && user.studio_id)
    throw conflict("Das Abo verwaltet dein Studio.");
  const sub = await getSubscription(user.id);
  if (!sub) throw conflict("Du hast noch kein Abo abgeschlossen.");
  // Eigene Portal-Konfiguration je Zielgruppe (scripts/stripe-setup.mjs), sonst Stripe-Standard
  const configs = await stripe().billingPortal.configurations.list({
    active: true,
    limit: 20,
  });
  const configuration = configs.data.find(
    (c) => c.metadata?.voima === user.role,
  )?.id;
  const session = await stripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/dashboard/abo`,
    locale: "de",
    ...(configuration ? { configuration } : {}),
  });
  return { url: session.url };
}

/* ------------------------------------------------------------------ */
/* Webhook                                                             */
/* ------------------------------------------------------------------ */

/** Prüft die Stripe-Signatur und liefert das Event (wirft 400 bei ungültiger Signatur). */
export async function verifyWebhook(
  payload: string,
  signature: string | null,
): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    throw new ApiError(
      503,
      "billing_not_configured",
      "STRIPE_WEBHOOK_SECRET ist nicht gesetzt.",
    );
  if (!signature)
    throw new ApiError(400, "bad_signature", "Stripe-Signatur fehlt.");
  try {
    return await Stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret,
    );
  } catch {
    throw new ApiError(400, "bad_signature", "Ungültige Stripe-Signatur.");
  }
}

/** Verarbeitet relevante Events: Abo-Stand immer frisch von Stripe holen (Reihenfolge der Events ist nicht garantiert). */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.mode === "subscription" && typeof s.subscription === "string")
        await syncSubscription(s.subscription);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscription(event.data.object.id);
      break;
    default:
      break;
  }
}

async function syncSubscription(subscriptionId: string): Promise<void> {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const parsed = parseLookupKey(item?.price.lookup_key);

  let ownerId = sub.metadata?.owner_id;
  if (!ownerId) {
    const row = must(
      await sb()
        .from("subscriptions")
        .select("owner_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle<{ owner_id: string }>(),
    );
    ownerId = row?.owner_id;
  }
  if (!ownerId) {
    console.error(
      `[billing] Abo ${sub.id} keinem Konto zuzuordnen (Kunde ${customerId})`,
    );
    return;
  }

  const current = await getSubscription(ownerId);
  // Ein altes, beendetes Abo darf ein neueres nicht überschreiben
  if (
    current?.stripe_subscription_id &&
    current.stripe_subscription_id !== sub.id &&
    !ACTIVE.has(sub.status)
  )
    return;

  const row = {
    owner_id: ownerId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    plan: parsed?.plan ?? null,
    billing_interval: parsed?.interval ?? null,
    status: sub.status,
    // Gekündigt: Neuere Stripe-Versionen setzen dafür `cancel_at` (Enddatum) statt `cancel_at_period_end`.
    // Dann gibt es keine nächste Abbuchung mehr – current_period_end ist das Ende des Abos.
    current_period_end: sub.cancel_at
      ? new Date(sub.cancel_at * 1000).toISOString()
      : item
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
    cancel_at_period_end: sub.cancel_at_period_end || !!sub.cancel_at,
    updated_at: new Date().toISOString(),
  };
  must(
    await sb()
      .from("subscriptions")
      .upsert(row, { onConflict: "owner_id" })
      .select()
      .single(),
  );
}
