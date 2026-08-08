import { Hono } from "hono"
import { eq, and, asc, desc, count, inArray } from "drizzle-orm"
import { auth } from "@workspace/auth"
import { db } from "@workspace/db"
import { proposal, proposalChange, card } from "@workspace/schemas"
import { rejectProposalSchema } from "@workspace/schemas/validations/proposal"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { requireRole } from "../middleware/role-guard"
import { errorHandler } from "../middleware/error-handler"
import { httpError } from "../middleware/org-scope"
import { applyProposal } from "../services/apply-proposal"
import type { AppEnv } from "../middleware/env"

export const proposalsRoutes = new Hono<AppEnv>()
proposalsRoutes.onError(errorHandler)

proposalsRoutes.use("*", resolveOrgFromProject)

proposalsRoutes.get("/", async (c) => {
  const projectId = c.var.projectId
  const rows = await db
    .select({
      id: proposal.id,
      instruction: proposal.instruction,
      status: proposal.status,
      createdAt: proposal.createdAt,
      changeCount: count(proposalChange.id),
    })
    .from(proposal)
    .where(eq(proposal.projectId, projectId!))
    .leftJoin(proposalChange, eq(proposalChange.proposalId, proposal.id))
    .groupBy(proposal.id)
    .orderBy(asc(proposal.status), desc(proposal.createdAt))

  return c.json({ success: true, data: rows })
})

proposalsRoutes.get("/:id", async (c) => {
  const projectId = c.var.projectId
  const id = c.req.param("id")
  const [proposalRow] = await db
    .select()
    .from(proposal)
    .where(and(eq(proposal.id, id), eq(proposal.projectId, projectId!)))
    .limit(1)
  if (!proposalRow) throw httpError("Not Found", 404)

  const changes = await db
    .select()
    .from(proposalChange)
    .where(eq(proposalChange.proposalId, id))
    .orderBy(asc(proposalChange.createdAt))

  // Attach the current card state for update/close targets so the UI can
  // render a before/after diff per change.
  const targetIds = changes
    .map((c) => c.targetCardId)
    .filter((t): t is string => Boolean(t))
  const targets = new Map<string, typeof card.$inferSelect>()
  if (targetIds.length > 0) {
    const rows = await db
      .select()
      .from(card)
      .where(and(eq(card.projectId, projectId!), inArray(card.id, targetIds)))
    for (const row of rows) targets.set(row.id, row)
  }

  const diffedChanges = changes.map((change) => {
    const before = change.targetCardId
      ? (targets.get(change.targetCardId) ?? null)
      : null
    return { ...change, before }
  })

  return c.json({
    success: true,
    data: { proposal: proposalRow, changes: diffedChanges },
  })
})

proposalsRoutes.post(
  "/:id/approve",
  requireRole("owner", "admin", "member"),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw httpError("Unauthorized", 401)
    const id = c.req.param("id")
    const result = await applyProposal({
      proposalId: id,
      approverId: session.user.id,
    })
    return c.json({ success: true, data: result })
  }
)

proposalsRoutes.post(
  "/:id/reject",
  requireRole("owner", "admin", "member"),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw httpError("Unauthorized", 401)
    const id = c.req.param("id")
    const body = rejectProposalSchema.safeParse(await c.req.json())
    if (!body.success) {
      throw httpError(body.error.issues.map((i) => i.message).join("; "), 400)
    }

    const [proposalRow] = await db
      .select()
      .from(proposal)
      .where(eq(proposal.id, id))
      .limit(1)
    if (!proposalRow) throw httpError("Not Found", 404)
    if (proposalRow.status !== "pending")
      throw httpError("Proposal already resolved", 409)

    await db
      .update(proposal)
      .set({
        status: "rejected",
        approvedBy: session.user.id,
        rejectedAt: new Date(),
        rejectionReason: body.data.reason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(proposal.id, id))

    return c.json({ success: true, data: { rejected: id } })
  }
)
