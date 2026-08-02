import { describe, it, expect, beforeAll } from "bun:test"
import { mapSubscriptionEventToState } from "../services/billing/subscription-transitions"

beforeAll(() => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
})

describe("mapSubscriptionEventToState (pure webhook → transition mapping)", () => {
  it("checkout.session.completed maps plan/status/ids/period", () => {
    const state = mapSubscriptionEventToState({
      type: "checkout.session.completed",
      orgId: "org_1",
      plan: "pro",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_456",
      currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
    })
    expect(state).toEqual({
      plan: "pro",
      status: "active",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_456",
      currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
    })
  })

  it("subscription.updated maps plan with explicit status", () => {
    const state = mapSubscriptionEventToState({
      type: "subscription.updated",
      orgId: "org_1",
      plan: "pro",
      status: "past_due",
    })
    expect(state.plan).toBe("pro")
    expect(state.status).toBe("past_due")
    expect(state.stripeCustomerId).toBeNull()
    expect(state.stripeSubscriptionId).toBeNull()
  })

  it("subscription.updated without status defaults to active", () => {
    const state = mapSubscriptionEventToState({
      type: "subscription.updated",
      orgId: "org_1",
      plan: "pro",
    })
    expect(state.status).toBe("active")
  })

  it("subscription.deleted maps to plan free + status canceled", () => {
    const state = mapSubscriptionEventToState({
      type: "subscription.deleted",
      orgId: "org_1",
    })
    expect(state).toEqual({
      plan: "free",
      status: "canceled",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    })
  })
})
