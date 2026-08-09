import { Hono } from "hono"
import { eq, sql, and, asc, desc } from "drizzle-orm"
import { auth } from "@workspace/auth"
import { db } from "@workspace/db"
import {
  project,
  epic,
  card,
  organizationMember,
  proposal,
  proposalChange,
} from "@workspace/schemas"
import {
  createProjectSchema,
  updateCardSectionsSchema,
} from "@workspace/schemas/validations/project"
import { requireOrg } from "../middleware/org-scope"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { requireRole } from "../middleware/role-guard"
import { validateBody } from "../middleware/validate"
import { errorHandler } from "../middleware/error-handler"
import { httpError } from "../middleware/org-scope"
import { assertLimitTx } from "../services/plan-limits"
import { generateId, slugify } from "../utils"
import type { AppEnv } from "../middleware/env"

export const projectsRoutes = new Hono<AppEnv>()
projectsRoutes.onError(errorHandler)

projectsRoutes.post("/", validateBody(createProjectSchema), async (c) => {
  const body = c.var.body as {
    orgId: string
    name: string
    slug?: string
    description?: string
    columns?: { key: string; title: string }[]
    customFields?: unknown
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    throw httpError("Unauthorized", 401)
  }

  const [member] = await db
    .select()
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.orgId, body.orgId),
        eq(organizationMember.userId, session.user.id),
        eq(organizationMember.inviteStatus, "accepted")
      )
    )
    .limit(1)
  if (!member) {
    throw httpError("Forbidden", 403)
  }
  if (!["owner", "admin", "member"].includes(member.role)) {
    throw httpError("Forbidden: insufficient role", 403)
  }

  await db.transaction(async (tx) => {
    await assertLimitTx(tx, body.orgId, "projects")

    const slug = body.slug ?? slugify(body.name)
    const projectId = generateId()
    await tx.insert(project).values({
      id: projectId,
      orgId: body.orgId,
      name: body.name,
      slug,
      description: body.description ?? null,
      columns: body.columns ?? [
        { key: "backlog", title: "Backlog" },
        { key: "todo", title: "To Do" },
        { key: "in_progress", title: "In Progress" },
        { key: "review", title: "Review" },
        { key: "done", title: "Done" },
      ],
      customFields:
        (body.customFields as typeof project.$inferSelect.customFields) ?? [],
    })

    return c.json(
      { success: true, data: { id: projectId, name: body.name, slug } },
      201
    )
  })
})

projectsRoutes.get("/", requireOrg, async (c) => {
  const orgId = c.var.orgId
  const rows = await db
    .select({
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      columns: project.columns,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      cardCount: sql<number>`(SELECT COUNT(*)::int FROM ${card} WHERE ${card.projectId} = ${project.id})`,
      frozenCount: sql<number>`(SELECT COUNT(*)::int FROM ${card} WHERE ${card.projectId} = ${project.id} AND ${card.isClosed})`,
      pendingProposals: sql<number>`(SELECT COUNT(*)::int FROM ${proposal} WHERE ${proposal.projectId} = ${project.id} AND ${proposal.status} = 'pending')`,
      lastActivity: sql<Date>`(SELECT MAX(${card.updatedAt}) FROM ${card} WHERE ${card.projectId} = ${project.id})`,
    })
    .from(project)
    .where(eq(project.orgId, orgId))
    .orderBy(desc(project.updatedAt))

  return c.json({ success: true, data: rows })
})

projectsRoutes.get("/:slug", resolveOrgFromProject, async (c) => {
  const projectId = c.var.projectId
  const [projectRow] = await db
    .select()
    .from(project)
    .where(eq(project.id, projectId!))
    .limit(1)
  if (!projectRow) {
    throw httpError("Not Found", 404)
  }

  const epics = await db
    .select()
    .from(epic)
    .where(eq(epic.projectId, projectId!))

  const cards = await db
    .select({
      id: card.id,
      keyNo: card.keyNo,
      title: card.title,
      slug: card.slug,
      status: card.status,
      priority: card.priority,
      isClosed: card.isClosed,
      assigneeId: card.assigneeId,
      epicId: card.epicId,
      acceptanceCriteriaCount: sql<number>`json_array_length(${card.acceptanceCriteria})::int`,
      updatedAt: card.updatedAt,
    })
    .from(card)
    .where(eq(card.projectId, projectId!))

  return c.json({
    success: true,
    data: { project: projectRow, epics, cards },
  })
})

// Proposed cards: the create changes of pending proposals. They render in a
// dedicated "Proposed" lane before Backlog until their proposal is approved.
projectsRoutes.get("/:slug/proposed", resolveOrgFromProject, async (c) => {
  const projectId = c.var.projectId
  const rows = await db
    .select({
      proposalId: proposal.id,
      proposalStatus: proposal.status,
      changeId: proposalChange.id,
      changeType: proposalChange.changeType,
      targetCardId: proposalChange.targetCardId,
      newData: proposalChange.newData,
      createdAt: proposalChange.createdAt,
    })
    .from(proposal)
    .innerJoin(proposalChange, eq(proposalChange.proposalId, proposal.id))
    .where(
      and(eq(proposal.projectId, projectId!), eq(proposal.status, "pending"))
    )
    .orderBy(asc(proposalChange.createdAt))

  const proposed = rows
    .filter((r) => r.changeType === "create")
    .map((r) => {
      const data = (r.newData ?? {}) as Record<string, unknown>
      const id = `${r.changeId}__proposed`
      return {
        id,
        keyNo: 0,
        title: String(data.title ?? "Untitled"),
        slug: id,
        status: "proposed",
        priority:
          (data.priority as "low" | "medium" | "high" | "critical") ?? "medium",
        isClosed: false,
        assigneeId: null,
        epicId: null,
        acceptanceCriteriaCount: Array.isArray(data.acceptanceCriteria)
          ? (data.acceptanceCriteria as unknown[]).length
          : 0,
        proposalId: r.proposalId,
        changeId: r.changeId,
        updatedAt: r.createdAt,
      }
    })

  return c.json({ success: true, data: proposed })
})

projectsRoutes.patch(
  "/:slug",
  resolveOrgFromProject,
  requireRole("owner", "admin", "member"),
  validateBody(updateCardSectionsSchema),
  async (c) => {
    const projectId = c.var.projectId!
    const body = c.var.body as {
      cardSections: typeof project.$inferSelect.cardSections
    }
    const [updated] = await db
      .update(project)
      .set({ cardSections: body.cardSections, updatedAt: new Date() })
      .where(eq(project.id, projectId))
      .returning()
    if (!updated) {
      throw httpError("Not Found", 404)
    }
    return c.json({ success: true, data: { project: updated } })
  }
)

// Delete a board. Deletes proposals first (their changes reference cards via
// an FK without cascade), then epics, then the project (cascades cards,
// relations, chat, sessions, embeddings).
projectsRoutes.delete(
  "/:slug",
  resolveOrgFromProject,
  requireRole("owner", "admin"),
  async (c) => {
    const projectId = c.var.projectId!
    await db.transaction(async (tx) => {
      await tx.delete(proposal).where(eq(proposal.projectId, projectId))
      await tx.delete(epic).where(eq(epic.projectId, projectId))
      await tx.delete(project).where(eq(project.id, projectId))
    })
    return c.json({ success: true, data: { deleted: projectId } })
  }
)
