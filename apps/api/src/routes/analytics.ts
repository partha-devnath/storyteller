import { Hono } from "hono"
import { analyticsRangeSchema } from "@workspace/schemas/validations/billing"
import { errorHandler } from "../middleware/error-handler"
import { httpError, requireOrg } from "../middleware/org-scope"
import { getAnalytics } from "../services/analytics"
import type { AppEnv } from "../middleware/env"

export const analyticsRoutes = new Hono<AppEnv>()
analyticsRoutes.onError(errorHandler)

/**
 * GET /:id/analytics — any org member (requireOrg resolves membership before
 * any query; all aggregations are filtered by the org's project ids, so a
 * second org's rows can never appear — T-03-20). Range enum-locked to 30d,
 * no user-controlled expansion (T-03-23).
 */
analyticsRoutes.get("/:id/analytics", requireOrg, async (c) => {
  const orgId = c.var.orgId
  const parsed = analyticsRangeSchema.safeParse({
    range: c.req.query("range") ?? "30d",
  })
  if (!parsed.success) {
    throw httpError("Invalid range", 400)
  }
  const data = await getAnalytics(orgId, 30)
  return c.json({ success: true, data })
})
