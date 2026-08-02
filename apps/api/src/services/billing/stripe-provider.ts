import Stripe from "stripe"
import type { BillingProvider } from "./provider"
import {
  applySubscriptionTransition,
  getOrgIdByStripeSubscriptionId,
  getOrgSubscription,
} from "./subscription-transitions"
import type { SubscriptionStatus } from "./subscription-transitions"
import { httpError } from "../../middleware/org-scope"

const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173"

function requireStripeConfig(): {
  stripe: Stripe
  pricePro: string
  webhookSecret: string
} {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const pricePro = process.env.STRIPE_PRICE_PRO
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secretKey || !pricePro || !webhookSecret) {
    throw httpError("Stripe is not configured", 500)
  }
  return {
    stripe: new Stripe(secretKey),
    pricePro,
    webhookSecret,
  }
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
  if (status === "past_due") return "past_due"
  if (status === "active") return "active"
  // canceled, unpaid, paused, trialing, incomplete, incomplete_expired
  return "canceled"
}

/**
 * current_period_end is a real Stripe API field on subscription objects but
 * the v22 generated types omit it from the Subscription/Session interfaces —
 * read it defensively (unix seconds → Date).
 */
function getCurrentPeriodEnd(obj: unknown): Date | null {
  const period = (obj as { current_period_end?: number | null })
    .current_period_end
  return typeof period === "number" && period > 0
    ? new Date(period * 1000)
    : null
}

/**
 * Real Stripe billing provider — Checkout session, Customer Portal, and
 * signature-verified webhooks. Only constructed when BILLING_PROVIDER=stripe.
 */
export function createStripeProvider(): BillingProvider {
  const { stripe, pricePro, webhookSecret } = requireStripeConfig()

  return {
    async createCheckoutSession(input) {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: pricePro, quantity: 1 }],
        client_reference_id: input.orgId,
        metadata: { orgId: input.orgId, tier: input.tier },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        subscription_data: { metadata: { orgId: input.orgId } },
      })
      if (!session.url) {
        throw httpError("Stripe checkout did not return a url", 500)
      }
      return { url: session.url }
    },

    async createPortalSession(orgId) {
      const state = await getOrgSubscription(orgId)
      if (!state.stripeCustomerId) {
        throw httpError("No subscription found", 404)
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: state.stripeCustomerId,
        return_url: `${CLIENT_URL}/orgs/${orgId}/billing`,
      })
      return { url: session.url }
    },

    async handleWebhook(request) {
      const raw = await request.text()
      const signature = request.headers.get("stripe-signature")
      let event: Stripe.Event
      try {
        event = stripe.webhooks.constructEvent(
          raw,
          signature ?? "",
          webhookSecret
        )
      } catch {
        // Signature verification failed — never touch state on an
        // unverified payload (T-03-10).
        return { handled: false }
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session
          const orgId = session.metadata?.orgId
          const tier = session.metadata?.tier
          if (!orgId || !tier) return { handled: true }
          await applySubscriptionTransition({
            orgId,
            plan: tier === "pro" ? "pro" : "free",
            status: "active",
            stripeCustomerId:
              typeof session.customer === "string"
                ? session.customer
                : (session.customer?.id ?? null),
            stripeSubscriptionId:
              typeof session.subscription === "string"
                ? session.subscription
                : (session.subscription?.id ?? null),
            currentPeriodEnd: getCurrentPeriodEnd(session),
          })
          return { handled: true }
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription
          const orgId =
            sub.metadata?.orgId ??
            (await getOrgIdByStripeSubscriptionId(sub.id))
          if (!orgId) return { handled: true }
          if (event.type === "customer.subscription.deleted") {
            await applySubscriptionTransition({
              orgId,
              plan: "free",
              status: "canceled",
              stripeSubscriptionId: sub.id,
            })
            return { handled: true }
          }
          const existing = await getOrgSubscription(orgId)
          await applySubscriptionTransition({
            orgId,
            plan:
              (sub.metadata?.tier as "free" | "pro" | undefined) ??
              existing.plan,
            status: mapStripeStatus(sub.status),
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: getCurrentPeriodEnd(sub),
          })
          return { handled: true }
        }
        default:
          return { handled: true }
      }
    },
  }
}
