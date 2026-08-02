import { PLANS } from "@workspace/schemas"
import type { BillingState, LimitMetric, PlanId } from "@workspace/schemas"

export function computeBillingState(input: {
  plan: PlanId
  usage: Record<LimitMetric, number>
  checkoutUrl: string | null
  portalUrl: string | null
}): BillingState {
  const { plan, usage, checkoutUrl, portalUrl } = input
  return {
    plan,
    cycle: "monthly",
    price: {
      free: PLANS.free.priceUsdMonthly,
      pro: PLANS.pro.priceUsdMonthly,
    },
    limits: PLANS[plan].limits,
    usage,
    checkoutUrl,
    portalUrl,
  }
}
