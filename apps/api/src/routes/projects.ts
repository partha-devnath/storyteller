import { Hono } from "hono"
import {
  eq,
  sql,
  and,
  asc,
  desc,
  isNull,
  inArray,
  notInArray,
} from "drizzle-orm"
import { auth } from "@workspace/auth"
import { db } from "@workspace/db"
import {
  project,
  epic,
  card,
  organizationMember,
  proposal,
  proposalChange,
  integrationCredential,
} from "@workspace/schemas"
import {
  createProjectSchema,
  updateCardSectionsSchema,
  updateProjectColumnsSchema,
  connectColumnSchema,
} from "@workspace/schemas/validations/project"
import type { ConnectColumnInput } from "@workspace/schemas/validations/project"
import { requireOrg } from "../middleware/org-scope"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { requireRole } from "../middleware/role-guard"
import { validateBody } from "../middleware/validate"
import { errorHandler } from "../middleware/error-handler"
import { httpError } from "../middleware/org-scope"
import { assertLimitTx } from "../services/plan-limits"
import {
  assertConnectableColumn,
  storeCredential,
} from "../services/column-integration"
import { realProviders, githubAuthFromConfig } from "../services/providers"
import { generateId, slugify } from "../utils"
import type { AppEnv } from "../middleware/env"

function githubErrorMessage(e: unknown): string {
  const message = e instanceof Error ? e.message : ""
  if (message.includes("401"))
    return "invalid credentials — check your token or GitHub App installation"
  if (message.includes("404"))
    return "repository not found, or the credentials lack access to it"
  return message
}

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
      externalLinks: card.externalLinks,
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
    .select()
    .from(proposal)
    .innerJoin(proposalChange, eq(proposalChange.proposalId, proposal.id))
    .where(
      and(
        eq(proposal.projectId, projectId!),
        eq(proposal.status, "pending"),
        isNull(proposalChange.approvedAt),
        isNull(proposalChange.rejectedAt)
      )
    )
    .orderBy(asc(proposalChange.createdAt))

  const targetIds = rows
    .filter((r) => r.proposal_change.changeType === "update")
    .map((r) => r.proposal_change.targetCardId)
    .filter((t): t is string => Boolean(t))
  const targets = new Map<string, typeof card.$inferSelect>()
  if (targetIds.length > 0) {
    const cards = await db
      .select()
      .from(card)
      .where(and(eq(card.projectId, projectId!), inArray(card.id, targetIds)))
    for (const c of cards) targets.set(c.id, c)
  }

  const proposed = rows.flatMap(({ proposal_change: change }) => {
    const data = (change.newData ?? {}) as Record<string, unknown>
    const base = {
      proposalId: change.proposalId,
      changeId: change.id,
      changeType: change.changeType as "create" | "update",
      targetCardId: change.targetCardId,
    }
    if (change.changeType === "close") return []
    if (change.changeType === "create") {
      return [
        {
          ...base,
          id: `${change.id}__proposed`,
          keyNo: 0,
          title: String(data.title ?? "Untitled"),
          slug: `${change.id}__proposed`,
          status: "proposed",
          priority:
            (data.priority as "low" | "medium" | "high" | "critical") ??
            "medium",
          isClosed: false,
          assigneeId: null,
          epicId: null,
          acceptanceCriteriaCount: Array.isArray(data.acceptanceCriteria)
            ? (data.acceptanceCriteria as unknown[]).length
            : 0,
        },
      ]
    }
    const target = change.targetCardId
      ? targets.get(change.targetCardId)
      : undefined
    return [
      {
        ...base,
        id: `${change.id}__proposed`,
        keyNo: 0,
        title: String(data.title ?? target?.title ?? "Untitled"),
        slug: `${change.id}__proposed`,
        status: String(data.status ?? target?.status ?? "backlog"),
        priority:
          (data.priority as "low" | "medium" | "high" | "critical") ??
          target?.priority ??
          "medium",
        isClosed: false,
        assigneeId: null,
        epicId: null,
        acceptanceCriteriaCount: Array.isArray(data.acceptanceCriteria)
          ? (data.acceptanceCriteria as unknown[]).length
          : (target?.acceptanceCriteria.length ?? 0),
      },
    ]
  })

  return c.json({ success: true, data: proposed })
})

projectsRoutes.patch(
  "/:slug",
  resolveOrgFromProject,
  requireRole("owner", "admin", "member"),
  async (c) => {
    const projectId = c.var.projectId!
    const body = (await c.req.json()) as {
      cardSections?: unknown
      columns?: unknown
    }

    if (body.columns !== undefined) {
      const parsed = updateProjectColumnsSchema.safeParse({
        columns: body.columns,
      })
      if (!parsed.success) {
        throw httpError(
          parsed.error.issues.map((i) => i.message).join("; "),
          400
        )
      }
      const nextColumns = parsed.data.columns
      const kept = new Set(nextColumns.map((col) => col.key))
      let updatedRow: typeof project.$inferSelect | undefined
      await db.transaction(async (tx) => {
        await tx
          .update(card)
          .set({ status: "backlog", updatedAt: new Date() })
          .where(
            and(
              eq(card.projectId, projectId),
              notInArray(card.status, [...kept])
            )
          )
        const [current] = await tx
          .select()
          .from(project)
          .where(eq(project.id, projectId))
          .limit(1)
        const existingByKey = new Map(
          (current?.columns ?? []).map((col) => [
            col.key,
            col.integration ?? null,
          ])
        )
        const columns = nextColumns.map((col) => ({
          key: col.key,
          title: col.title,
          locked: col.locked ?? false,
          integration: existingByKey.get(col.key) ?? null,
        }))
        const [updated] = await tx
          .update(project)
          .set({ columns, updatedAt: new Date() })
          .where(eq(project.id, projectId))
          .returning()
        updatedRow = updated
      })
      if (!updatedRow) {
        throw httpError("Not Found", 404)
      }
      return c.json({ success: true, data: { project: updatedRow } })
    }

    const sections = updateCardSectionsSchema.safeParse(body)
    if (!sections.success) {
      throw httpError(
        sections.error.issues.map((i) => i.message).join("; "),
        400
      )
    }
    const [updated] = await db
      .update(project)
      .set({
        cardSections: sections.data.cardSections,
        updatedAt: new Date(),
      })
      .where(eq(project.id, projectId))
      .returning()
    if (!updated) {
      throw httpError("Not Found", 404)
    }
    return c.json({ success: true, data: { project: updated } })
  }
)

projectsRoutes.post(
  "/:slug/columns/:key/connect",
  resolveOrgFromProject,
  requireRole("owner", "admin"),
  validateBody(connectColumnSchema),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw httpError("Unauthorized", 401)
    const projectId = c.var.projectId!
    const key = c.req.param("key")
    const body = c.var.body as ConnectColumnInput
    const [proj] = await db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)
    if (!proj) throw httpError("Not Found", 404)
    assertConnectableColumn(proj.columns, key)
    const oldCredentialId = proj.columns.find((col) => col.key === key)
      ?.integration?.credentialId

    let storedConfig: Record<string, string> = { ...body.config }
    if (body.provider === "github") {
      storedConfig = { ...body.config, auth: body.auth }
    }

    try {
      if (body.provider === "github") {
        await realProviders.github.fetchRepo({
          auth: githubAuthFromConfig(storedConfig),
          repo: body.target,
        })
      } else {
        await realProviders.trello.fetchList({
          apiKey: body.config.apiKey,
          token: body.config.token,
          listId: body.target,
        })
      }
    } catch (e) {
      const message = githubErrorMessage(e)
      throw httpError(
        body.provider === "github" && message
          ? `GitHub connection failed: ${message}`
          : `Trello connection failed: ${(e as Error).message ?? "unknown error"}`,
        400
      )
    }

    const credentialId = await storeCredential({
      projectId,
      provider: body.provider,
      config: storedConfig,
    })
    const nextColumns = proj.columns.map((col) =>
      col.key === key
        ? {
            ...col,
            integration: {
              type: body.provider,
              credentialId,
              target: body.target,
              boardName: body.boardName,
              listName: body.listName,
            },
          }
        : col
    )
    await db
      .update(project)
      .set({ columns: nextColumns, updatedAt: new Date() })
      .where(eq(project.id, projectId))
    if (
      oldCredentialId &&
      !nextColumns.some(
        (col) => col.integration?.credentialId === oldCredentialId
      )
    ) {
      await db
        .delete(integrationCredential)
        .where(eq(integrationCredential.id, oldCredentialId))
    }
    return c.json({ success: true, data: { key } })
  }
)

projectsRoutes.delete(
  "/:slug/columns/:key/connect",
  resolveOrgFromProject,
  requireRole("owner", "admin"),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw httpError("Unauthorized", 401)
    const projectId = c.var.projectId!
    const key = c.req.param("key")
    const [proj] = await db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)
    if (!proj) throw httpError("Not Found", 404)
    const column = proj.columns.find((col) => col.key === key)
    const credentialId = column?.integration?.credentialId
    const nextColumns = proj.columns.map((col) =>
      col.key === key ? { ...col, integration: null } : col
    )
    await db
      .update(project)
      .set({ columns: nextColumns, updatedAt: new Date() })
      .where(eq(project.id, projectId))
    if (credentialId) {
      const stillUsed = nextColumns.some(
        (col) => col.integration?.credentialId === credentialId
      )
      if (!stillUsed) {
        await db
          .delete(integrationCredential)
          .where(eq(integrationCredential.id, credentialId))
      }
    }
    return c.json({ success: true, data: { key } })
  }
)

projectsRoutes.get(
  "/:slug/integrations/trello/boards",
  resolveOrgFromProject,
  async (c) => {
    const apiKey = c.req.query("apiKey")
    const token = c.req.query("token")
    if (!apiKey || !token) throw httpError("apiKey and token are required", 400)
    const boards = await realProviders.trello.fetchBoards({ apiKey, token })
    return c.json({ success: true, data: boards })
  }
)

projectsRoutes.get(
  "/:slug/integrations/trello/lists",
  resolveOrgFromProject,
  async (c) => {
    const apiKey = c.req.query("apiKey")
    const token = c.req.query("token")
    const board = c.req.query("board")
    if (!apiKey || !token || !board)
      throw httpError("apiKey, token and board are required", 400)
    const lists = await realProviders.trello.fetchLists({
      apiKey,
      token,
      boardId: board,
    })
    return c.json({ success: true, data: lists })
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
