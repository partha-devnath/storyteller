import { Hono } from "hono"
import { billingProvider } from "../services/billing/provider"
import {
  getOrgPlan,
  setOrgPlan,
} from "../services/billing/subscription-transitions"
import { getUsage } from "../services/usage"
import { computeBillingState } from "../services/billing-state"
import { checkoutTierSchema } from "@workspace/schemas/validations/billing"
import { requireOrg } from "../middleware/org-scope"
import { requireRole } from "../middleware/role-guard"
import { validateBody } from "../middleware/validate"
import { rateLimiter } from "../middleware/rate-limit"
import { errorHandler } from "../middleware/error-handler"
import { httpError } from "../middleware/org-scope"
import type { AppEnv } from "../middleware/env"

const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173"

export const billingRoutes = new Hono<AppEnv>()
billingRoutes.onError(errorHandler)

/**
 * GET /:id/billing — any org member. Server-truth plan + usage; checkoutUrl
 * only when on free, portalUrl only when on pro (stripe session creation
 * only happens when the plan warrants it — keeps the read path cheap).
 */
billingRoutes.get("/:id/billing", requireOrg, async (c) => {
  const orgId = c.var.orgId
  const plan = await getOrgPlan(orgId)
  const usage = await getUsage(orgId)

  let checkoutUrl: string | null = null
  let portalUrl: string | null = null
  if (plan === "pro") {
    portalUrl = (await billingProvider.createPortalSession(orgId)).url
  } else {
    const successUrl = `${CLIENT_URL}/orgs/${orgId}/billing?checkout=success`
    const cancelUrl = `${CLIENT_URL}/orgs/${orgId}/billing`
    checkoutUrl = (
      await billingProvider.createCheckoutSession({
        orgId,
        tier: "pro",
        userId: c.var.userId,
        successUrl,
        cancelUrl,
      })
    ).url
  }

  return c.json({
    success: true,
    data: computeBillingState({ plan, usage, checkoutUrl, portalUrl }),
  })
})

/**
 * POST /:id/billing/checkout — owner/admin. Upgrade to pro only (free comes
 * via downgrade). Returns the hosted Checkout URL (T-03-12 role gate).
 */
billingRoutes.post(
  "/:id/billing/checkout",
  requireOrg,
  requireRole("owner", "admin"),
  rateLimiter(10, 60_000),
  validateBody(checkoutTierSchema),
  async (c) => {
    const orgId = c.var.orgId
    const { tier } = c.var.body as { tier: "free" | "pro" }
    if (tier !== "pro") {
      throw httpError(
        "Upgrade is pro-only; downgrade via /billing/downgrade",
        400
      )
    }
    const successUrl = `${CLIENT_URL}/orgs/${orgId}/billing?checkout=success`
    const cancelUrl = `${CLIENT_URL}/orgs/${orgId}/billing`
    const { url } = await billingProvider.createCheckoutSession({
      orgId,
      tier: "pro",
      userId: c.var.userId,
      successUrl,
      cancelUrl,
    })
    return c.json({ success: true, data: { url } }, 201)
  }
)

/** POST /:id/billing/downgrade — owner/admin. Immediate plan flip to free. */
billingRoutes.post(
  "/:id/billing/downgrade",
  requireOrg,
  requireRole("owner", "admin"),
  rateLimiter(10, 60_000),
  async (c) => {
    const orgId = c.var.orgId
    await setOrgPlan(orgId, "free")
    const usage = await getUsage(orgId)
    const successUrl = `${CLIENT_URL}/orgs/${orgId}/billing?checkout=success`
    const cancelUrl = `${CLIENT_URL}/orgs/${orgId}/billing`
    const checkoutUrl = (
      await billingProvider.createCheckoutSession({
        orgId,
        tier: "pro",
        userId: c.var.userId,
        successUrl,
        cancelUrl,
      })
    ).url
    return c.json({
      success: true,
      data: computeBillingState({
        plan: "free",
        usage,
        checkoutUrl,
        portalUrl: null,
      }),
    })
  }
)

/** GET /:id/billing/portal — owner/admin. Customer Portal url (pro only). */
billingRoutes.get(
  "/:id/billing/portal",
  requireOrg,
  requireRole("owner", "admin"),
  rateLimiter(10, 60_000),
  async (c) => {
    const orgId = c.var.orgId
    const { url } = await billingProvider.createPortalSession(orgId)
    return c.json({ success: true, data: { url } })
  }
)

/**
 * POST /api/stripe/webhook — no session auth; the Stripe signature IS the
 * auth. The provider rejects unverifiable payloads with { handled: false },
 * which becomes a 400 here (T-03-10: no state change on unverified bodies).
 */
export const stripeWebhookRoutes = new Hono<AppEnv>()
stripeWebhookRoutes.onError(errorHandler)

stripeWebhookRoutes.post("/webhook", async (c) => {
  const result = await billingProvider.handleWebhook(c.req.raw)
  if (!result.handled) {
    return c.json({ success: false, error: "Invalid signature" }, 400)
  }
  return c.json({ success: true }, 200)
})
