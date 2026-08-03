import { Hono } from "hono"
import { eq, sql, and, desc } from "drizzle-orm"
import { auth } from "@workspace/auth"
import { db } from "@workspace/db"
import { project, epic, card, organizationMember } from "@workspace/schemas"
import { createProjectSchema } from "@workspace/schemas/validations/project"
import { requireOrg } from "../middleware/org-scope"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { validateBody } from "../middleware/validate"
import { errorHandler } from "../middleware/error-handler"
import { httpError } from "../middleware/org-scope"
import { assertLimit } from "../services/plan-limits"
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

  await assertLimit(body.orgId, "projects")

  const slug = body.slug ?? slugify(body.name)
  const projectId = generateId()
  await db.insert(project).values({
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
