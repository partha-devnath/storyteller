import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { auth } from "@workspace/auth"
import { db } from "@workspace/db"
import { epic, card, cardRelation } from "@workspace/schemas"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { errorHandler } from "../middleware/error-handler"
import { httpError } from "../middleware/org-scope"
import { buildGraphPayload } from "../services/graph-payload"
import type { AppEnv } from "../middleware/env"

export const graphRoutes = new Hono<AppEnv>()
graphRoutes.onError(errorHandler)

// Route-level middleware (not use("*")): sibling sub-apps mounted at the same
// /api/projects prefix each register their own auth; a use("*") here would
// intercept every /api/projects/* request, including export and events paths.
graphRoutes.get("/:slug/graph", resolveOrgFromProject, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) throw httpError("Unauthorized", 401)
  const projectId = c.var.projectId!

  const epics = await db
    .select()
    .from(epic)
    .where(eq(epic.projectId, projectId))

  const cards = await db
    .select({
      id: card.id,
      keyNo: card.keyNo,
      title: card.title,
      slug: card.slug,
      status: card.status,
      priority: card.priority,
      isClosed: card.isClosed,
      epicId: card.epicId,
    })
    .from(card)
    .where(eq(card.projectId, projectId))

  const relations = await db
    .select()
    .from(cardRelation)
    .where(eq(cardRelation.projectId, projectId))

  const payload = buildGraphPayload(epics, cards, relations)
  return c.json({ success: true, data: payload })
})
