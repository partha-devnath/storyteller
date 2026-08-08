import { Hono } from "hono"
import { eq, and } from "drizzle-orm"
import { auth } from "@workspace/auth"
import { db } from "@workspace/db"
import {
  epic,
  card,
  cardRelation,
  proposal,
  proposalChange,
} from "@workspace/schemas"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { errorHandler } from "../middleware/error-handler"
import { httpError } from "../middleware/org-scope"
import {
  buildGraphPayload,
  buildProposalGraphPayload,
} from "../services/graph-payload"
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
  const proposalId = c.req.query("proposal")

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

  const base = buildGraphPayload(epics, cards, relations)

  if (proposalId) {
    const [proposalRow] = await db
      .select()
      .from(proposal)
      .where(
        and(eq(proposal.id, proposalId), eq(proposal.projectId, projectId))
      )
      .limit(1)
    if (!proposalRow) throw httpError("Not Found", 404)

    const changes = await db
      .select({
        id: proposalChange.id,
        changeType: proposalChange.changeType,
        targetCardId: proposalChange.targetCardId,
        newData: proposalChange.newData,
        relationSummary: proposalChange.relationSummary,
      })
      .from(proposalChange)
      .where(eq(proposalChange.proposalId, proposalId))
      .orderBy(proposalChange.createdAt)

    const payload = buildProposalGraphPayload(base, changes)
    return c.json({ success: true, data: payload })
  }

  return c.json({ success: true, data: base })
})
