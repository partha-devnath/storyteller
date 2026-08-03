import { Hono } from "hono"
import { db } from "@workspace/db"
import { templateCreateSchema } from "@workspace/schemas/validations/billing"
import { errorHandler } from "../middleware/error-handler"
import { requireOrg } from "../middleware/org-scope"
import { requireRole } from "../middleware/role-guard"
import { validateBody } from "../middleware/validate"
import { assertLimitTx } from "../services/plan-limits"
import { seedTemplateProject } from "../services/template-seed"
import type { AppEnv } from "../middleware/env"

export const templatesRoutes = new Hono<AppEnv>()
templatesRoutes.onError(errorHandler)

/**
 * POST /:id/projects/template — owner/admin/member (matches the project
 * create role set, T-03-22). templateId validated as a zod enum before
 * seeding (400 on unknown, T-03-21); content is a compile-time constant.
 * Respects the projects plan limit: a template creates a project, so it
 * goes through the same assertLimit gate as POST /api/projects.
 */
templatesRoutes.post(
  "/:id/projects/template",
  requireOrg,
  requireRole("owner", "admin", "member"),
  validateBody(templateCreateSchema),
  async (c) => {
    const orgId = c.var.orgId
    const body = c.var.body as { templateId: "product-launch" }
    const result = await db.transaction(async (tx) => {
      await assertLimitTx(tx, orgId, "projects")
      return seedTemplateProject(orgId, c.var.userId, body.templateId, tx)
    })
    return c.json({ success: true, data: result }, 201)
  }
)
