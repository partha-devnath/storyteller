import { createMockProvider } from "./mock-provider"
import { createStripeProvider } from "./stripe-provider"

export type BillingProvider = {
  createCheckoutSession(input: {
    orgId: string
    tier: "pro"
    userId: string
    successUrl: string
    cancelUrl: string
  }): Promise<{ url: string }>
  createPortalSession(orgId: string): Promise<{ url: string }>
  handleWebhook(request: Request): Promise<{ handled: boolean }>
}

export function getBillingProvider(): BillingProvider {
  switch (process.env.BILLING_PROVIDER) {
    case "stripe":
      return createStripeProvider()
    case "mock":
    default:
      return createMockProvider()
  }
}

export const billingProvider = getBillingProvider()
