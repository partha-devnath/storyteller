import type { BillingProvider } from "./provider"
import {
  applySubscriptionTransition,
  mapSubscriptionEventToState,
} from "./subscription-transitions"
import type { SubscriptionEvent } from "./subscription-transitions"
import { z } from "zod"

const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173"

const eventSchema = z.object({
  type: z.enum([
    "checkout.session.completed",
    "subscription.updated",
    "subscription.deleted",
  ]),
  orgId: z.string().min(1),
  plan: z.enum(["free", "pro"]).optional(),
  status: z.enum(["active", "past_due", "canceled"]).optional(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  currentPeriodEnd: z.coerce.date().optional(),
})

/**
 * Deterministic no-network billing provider for dev + E2E (mirrors
 * AI_PROVIDER=mock). Checkout/portal return plain URLs; the webhook path
 * accepts a body-based event only in mock mode (never in stripe mode).
 */
export function createMockProvider(): BillingProvider {
  return {
    async createCheckoutSession(input) {
      return {
        url: `${CLIENT_URL}/mock-checkout?orgId=${input.orgId}&tier=${input.tier}`,
      }
    },
    async createPortalSession(orgId) {
      return { url: `${CLIENT_URL}/mock-portal?orgId=${orgId}` }
    },
    async handleWebhook(request) {
      let body: Record<string, unknown>
      try {
        body = (await request.json()) as Record<string, unknown>
      } catch {
        // Unparseable body — nothing verifiable, reject like an invalid signature.
        return { handled: false }
      }
      const parsed = eventSchema.safeParse(body)
      if (!parsed.success) {
        return { handled: false }
      }
      if (parsed.data.type === "subscription.deleted") {
        const event: SubscriptionEvent = {
          type: "subscription.deleted",
          orgId: parsed.data.orgId,
        }
        await applySubscriptionTransition({
          orgId: event.orgId,
          plan: "free",
          status: "canceled",
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        })
        return { handled: true }
      }
      if (!parsed.data.plan) {
        return { handled: false }
      }
      const event: SubscriptionEvent = {
        type: parsed.data.type,
        orgId: parsed.data.orgId,
        plan: parsed.data.plan,
        status: parsed.data.status,
        stripeCustomerId: parsed.data.stripeCustomerId,
        stripeSubscriptionId: parsed.data.stripeSubscriptionId,
        currentPeriodEnd: parsed.data.currentPeriodEnd,
      }
      const state = mapSubscriptionEventToState(event)
      await applySubscriptionTransition({
        orgId: event.orgId,
        plan: state.plan,
        status: state.status,
        stripeCustomerId: state.stripeCustomerId,
        stripeSubscriptionId: state.stripeSubscriptionId,
        currentPeriodEnd: state.currentPeriodEnd ?? undefined,
      })
      return { handled: true }
    },
  }
}
