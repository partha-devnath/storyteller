import type { BillingProvider } from "./provider"
import {
  applySubscriptionTransition,
  mapSubscriptionEventToState,
} from "./subscription-transitions"
import type { SubscriptionEvent } from "./subscription-transitions"

const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173"

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
      if (typeof body.type !== "string" || typeof body.orgId !== "string") {
        return { handled: false }
      }
      const event: SubscriptionEvent = body as unknown as SubscriptionEvent
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
