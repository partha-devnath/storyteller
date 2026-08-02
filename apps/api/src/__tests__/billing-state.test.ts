import { describe, it, expect } from "bun:test"
import { computeBillingState } from "../services/billing-state"
import { PLANS } from "@workspace/schemas"

describe("computeBillingState", () => {
  it("free plan: exact free limits, price mapping, monthly cycle, url passthrough", () => {
    const state = computeBillingState({
      plan: "free",
      usage: { projects: 1, members: 2, aiActions: 10, cards: 100 },
      checkoutUrl: "https://checkout.example/free",
      portalUrl: null,
    })
    expect(state.plan).toBe("free")
    expect(state.cycle).toBe("monthly")
    expect(state.limits).toEqual(PLANS.free.limits)
    expect(state.price).toEqual({ free: 0, pro: 12 })
    expect(state.price.pro).toBe(12)
    expect(state.checkoutUrl).toBe("https://checkout.example/free")
    expect(state.portalUrl).toBeNull()
    expect(state.usage).toEqual({
      projects: 1,
      members: 2,
      aiActions: 10,
      cards: 100,
    })
  })

  it("pro plan: exact pro limits and url passthrough", () => {
    const state = computeBillingState({
      plan: "pro",
      usage: { projects: 3, members: 12, aiActions: 250, cards: 700 },
      checkoutUrl: null,
      portalUrl: "https://portal.example/pro",
    })
    expect(state.plan).toBe("pro")
    expect(state.limits).toEqual(PLANS.pro.limits)
    expect(state.checkoutUrl).toBeNull()
    expect(state.portalUrl).toBe("https://portal.example/pro")
    expect(state.usage).toEqual({
      projects: 3,
      members: 12,
      aiActions: 250,
      cards: 700,
    })
  })

  it("usage values pass through untouched", () => {
    const usage = { projects: 5, members: 9, aiActions: 300, cards: 1200 }
    const state = computeBillingState({
      plan: "pro",
      usage,
      checkoutUrl: null,
      portalUrl: null,
    })
    expect(state.usage).toEqual(usage)
  })
})
