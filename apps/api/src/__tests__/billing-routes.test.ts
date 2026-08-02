import { describe, it, expect, beforeAll } from "bun:test"
import { createMockProvider } from "../services/billing/mock-provider"
import { mapSubscriptionEventToState } from "../services/billing/subscription-transitions"

beforeAll(() => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
  process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
  process.env.CLIENT_URL = "http://localhost:5173"
  process.env.AI_PROVIDER = "mock"
  process.env.BILLING_PROVIDER = "mock"
})

describe("billing routes (auth gate)", () => {
  it("GET /api/orgs/x/billing returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/orgs/x/billing")
    )
    expect(res.status).toBe(401)
  })

  it("POST /api/orgs/x/billing/checkout returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/orgs/x/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier: "pro" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("POST /api/orgs/x/billing/downgrade returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/orgs/x/billing/downgrade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    )
    expect(res.status).toBe(401)
  })

  it("GET /api/orgs/x/billing/portal returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/orgs/x/billing/portal")
    )
    expect(res.status).toBe(401)
  })
})

describe("stripe webhook route (signature gate)", () => {
  it("POST /api/stripe/webhook with an unverifiable body returns 400", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    )
    expect(res.status).toBe(400)
  })

  it("mock webhook rejects a malformed body before any transition", async () => {
    const provider = createMockProvider()
    const res = await provider.handleWebhook(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    )
    expect(res.handled).toBe(false)
  })
})

describe("mock billing provider (pure, no network)", () => {
  it("createCheckoutSession url contains mock-checkout and the orgId", async () => {
    const provider = createMockProvider()
    const { url } = await provider.createCheckoutSession({
      orgId: "org_abc",
      tier: "pro",
      userId: "user_1",
      successUrl: "http://localhost:5173/orgs/org_abc/billing?checkout=success",
      cancelUrl: "http://localhost:5173/orgs/org_abc/billing",
    })
    expect(url).toContain("mock-checkout")
    expect(url).toContain("org_abc")
    expect(url).toContain("tier=pro")
  })

  it("createPortalSession url contains mock-portal and the orgId", async () => {
    const provider = createMockProvider()
    const { url } = await provider.createPortalSession("org_abc")
    expect(url).toContain("mock-portal")
    expect(url).toContain("org_abc")
  })

  it("subscription.updated event maps to plan pro via the shared helper", () => {
    const state = mapSubscriptionEventToState({
      type: "subscription.updated",
      orgId: "org_abc",
      plan: "pro",
    })
    expect(state.plan).toBe("pro")
    expect(state.status).toBe("active")
  })
})
