import { Hono } from "hono"
import { eq, and, asc, desc, max } from "drizzle-orm"
import { auth } from "@workspace/auth"
import { db } from "@workspace/db"
import {
  card,
  cardVersion,
  cardRelation,
  comment,
  cardAttachment,
  file as fileSchema,
  user as userSchema,
  organizationMember,
} from "@workspace/schemas"
import {
  createCardSchema,
  updateCardSchema,
  closeCardSchema,
} from "@workspace/schemas/validations/card"
import { z } from "zod"
import { aiProvider } from "@workspace/ai"
import { semanticSearch } from "@workspace/vector"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { requireRole } from "../middleware/role-guard"
import { errorHandler } from "../middleware/error-handler"
import { httpError } from "../middleware/org-scope"
import { publish } from "../services/event-bus"
import { assertLimit } from "../services/plan-limits"
import { generateId, slugify } from "../utils"
import type { AppEnv } from "../middleware/env"

export const cardsRoutes = new Hono<AppEnv>()
cardsRoutes.onError(errorHandler)

const commentSchema = z.object({
  body: z.string().min(1).max(5000),
  parentId: z.string().optional(),
  mentions: z.array(z.string()).optional(),
})

cardsRoutes.use("*", resolveOrgFromProject)

async function nextVersionNo(cardId: string): Promise<number> {
  const [row] = await db
    .select({ maxNo: max(cardVersion.versionNo) })
    .from(cardVersion)
    .where(eq(cardVersion.cardId, cardId))
  return (row?.maxNo ?? 0) + 1
}

async function loadCardInProject(cardId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(card)
    .where(and(eq(card.id, cardId), eq(card.projectId, projectId)))
    .limit(1)
  return row
}

cardsRoutes.post("/", requireRole("owner", "admin", "member"), async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) throw httpError("Unauthorized", 401)
  const projectId = c.var.projectId!
  const body = createCardSchema.parse(await c.req.json())

  await assertLimit(c.var.orgId!, "cards")

  const cardId = generateId()
  const slug = slugify(body.title) || "card"
  await db.insert(card).values({
    id: cardId,
    projectId,
    epicId: body.epicId ?? null,
    title: body.title,
    description: body.description ?? "",
    acceptanceCriteria: body.acceptanceCriteria ?? [],
    status: body.status,
    priority: body.priority,
    assigneeId: body.assigneeId ?? null,
    customFields: body.customFields ?? null,
    slug,
  })
  await db.insert(cardVersion).values({
    id: generateId(),
    cardId,
    versionNo: 1,
    title: body.title,
    description: body.description ?? "",
    acceptanceCriteria: body.acceptanceCriteria ?? [],
    status: body.status,
    priority: body.priority,
    customFields: body.customFields ?? null,
    changeType: "create",
    createdBy: session.user.id,
  })
  for (const fileId of body.attachmentFileIds ?? []) {
    const [owned] = await db
      .select({ id: fileSchema.id })
      .from(fileSchema)
      .innerJoin(
        organizationMember,
        eq(fileSchema.userId, organizationMember.userId)
      )
      .where(
        and(
          eq(fileSchema.id, fileId),
          eq(organizationMember.orgId, c.var.orgId!)
        )
      )
      .limit(1)
    if (!owned) throw httpError("Forbidden", 403)
    await db.insert(cardAttachment).values({
      id: generateId(),
      cardId,
      fileId,
      uploadedBy: session.user.id,
    })
  }

  publish(projectId, {
    type: "card.created",
    card: { id: cardId, title: body.title, slug, status: body.status },
  })

  return c.json({ success: true, data: { id: cardId, slug } }, 201)
})

cardsRoutes.patch(
  "/:id",
  requireRole("owner", "admin", "member"),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw httpError("Unauthorized", 401)
    const projectId = c.var.projectId!
    const cardId = c.req.param("id")
    const target = await loadCardInProject(cardId, projectId)
    if (!target) throw httpError("Not Found", 404)
    if (target.isClosed) throw httpError("Closed cards are immutable", 409)

    const body = updateCardSchema.parse(await c.req.json())
    const updates: Partial<typeof card.$inferInsert> = { updatedAt: new Date() }
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.acceptanceCriteria !== undefined) {
      updates.acceptanceCriteria = body.acceptanceCriteria
    }
    if (body.status !== undefined) updates.status = body.status
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.customFields !== undefined)
      updates.customFields = body.customFields
    if (body.assigneeId !== undefined) updates.assigneeId = body.assigneeId

    await db.update(card).set(updates).where(eq(card.id, cardId))

    await db.insert(cardVersion).values({
      id: generateId(),
      cardId,
      versionNo: await nextVersionNo(cardId),
      title: updates.title ?? target.title,
      description: updates.description ?? target.description,
      acceptanceCriteria:
        (updates.acceptanceCriteria as string[]) ?? target.acceptanceCriteria,
      status:
        (updates.status as typeof cardVersion.$inferSelect.status) ??
        target.status,
      priority:
        (updates.priority as typeof cardVersion.$inferSelect.priority) ??
        target.priority,
      customFields:
        (updates.customFields as Record<string, string>) ?? target.customFields,
      changeType: "update",
      createdBy: session.user.id,
    })

    publish(projectId, {
      type: "card.updated",
      card: {
        id: cardId,
        title: updates.title ?? target.title,
        slug: target.slug,
        status: (updates.status as string) ?? target.status,
        isClosed: target.isClosed,
      },
    })

    return c.json({ success: true, data: { id: cardId } })
  }
)

cardsRoutes.post(
  "/:id/close",
  requireRole("owner", "admin", "member"),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw httpError("Unauthorized", 401)
    const projectId = c.var.projectId!
    const cardId = c.req.param("id")
    const target = await loadCardInProject(cardId, projectId)
    if (!target) throw httpError("Not Found", 404)
    if (target.isClosed)
      return c.json({ success: true, data: { id: cardId, closed: true } })

    const body = closeCardSchema.safeParse(await c.req.json().catch(() => ({})))
    if (!body.success) {
      throw httpError(body.error.issues.map((i) => i.message).join("; "), 400)
    }

    await db
      .update(card)
      .set({
        isClosed: true,
        closedBy: session.user.id,
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(card.id, cardId))
    await db.insert(cardVersion).values({
      id: generateId(),
      cardId,
      versionNo: await nextVersionNo(cardId),
      title: target.title,
      description: target.description,
      acceptanceCriteria: target.acceptanceCriteria,
      status: target.status,
      priority: target.priority,
      customFields: target.customFields,
      changeType: "close",
      createdBy: session.user.id,
    })

    publish(projectId, {
      type: "card.updated",
      card: {
        id: cardId,
        title: target.title,
        slug: target.slug,
        status: target.status,
        isClosed: true,
      },
    })

    return c.json({ success: true, data: { id: cardId, closed: true } })
  }
)

cardsRoutes.get("/:id", async (c) => {
  const projectId = c.var.projectId!
  const cardId = c.req.param("id")
  const target = await loadCardInProject(cardId, projectId)
  if (!target) throw httpError("Not Found", 404)

  const [latest] = await db
    .select()
    .from(cardVersion)
    .where(eq(cardVersion.cardId, cardId))
    .orderBy(desc(cardVersion.versionNo))
    .limit(1)

  const relations = await db
    .select({
      id: cardRelation.id,
      type: cardRelation.type,
      sourceCardId: cardRelation.sourceCardId,
      targetCardId: cardRelation.targetCardId,
    })
    .from(cardRelation)
    .where(eq(cardRelation.projectId, projectId))

  const comments = await db
    .select({
      id: comment.id,
      body: comment.body,
      parentId: comment.parentId,
      mentions: comment.mentions,
      userId: userSchema.id,
      userName: userSchema.name,
      createdAt: comment.createdAt,
    })
    .from(comment)
    .innerJoin(userSchema, eq(comment.userId, userSchema.id))
    .where(eq(comment.cardId, cardId))
    .orderBy(asc(comment.createdAt))

  const attachments = await db
    .select({
      id: cardAttachment.id,
      fileId: fileSchema.id,
      url: fileSchema.url,
      originalName: fileSchema.originalName,
    })
    .from(cardAttachment)
    .innerJoin(fileSchema, eq(cardAttachment.fileId, fileSchema.id))
    .where(eq(cardAttachment.cardId, cardId))

  return c.json({
    success: true,
    data: {
      card: target,
      latestVersion: latest,
      relations,
      comments,
      attachments,
    },
  })
})

cardsRoutes.get("/:id/versions", async (c) => {
  const projectId = c.var.projectId!
  const cardId = c.req.param("id")
  const target = await loadCardInProject(cardId, projectId)
  if (!target) throw httpError("Not Found", 404)
  const versions = await db
    .select()
    .from(cardVersion)
    .where(eq(cardVersion.cardId, cardId))
    .orderBy(desc(cardVersion.versionNo))
  return c.json({ success: true, data: versions })
})

cardsRoutes.get("/:id/similar", async (c) => {
  const projectId = c.var.projectId!
  const cardId = c.req.param("id")
  const target = await loadCardInProject(cardId, projectId)
  if (!target) throw httpError("Not Found", 404)
  const query = `${target.title}\n${target.description ?? ""}`
  const matches = await semanticSearch({
    projectId,
    query,
    provider: aiProvider,
    limit: 7,
  })
  const filtered = matches.filter((m) => m.cardId !== cardId).slice(0, 6)
  return c.json({ success: true, data: filtered })
})

cardsRoutes.post(
  "/:id/comments",
  requireRole("owner", "admin", "member"),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw httpError("Unauthorized", 401)
    const projectId = c.var.projectId!
    const cardId = c.req.param("id")
    const target = await loadCardInProject(cardId, projectId)
    if (!target) throw httpError("Not Found", 404)
    const body = commentSchema.parse(await c.req.json())
    const id = generateId()
    await db.insert(comment).values({
      id,
      cardId,
      userId: session.user.id,
      body: body.body,
      parentId: body.parentId ?? null,
      mentions: body.mentions ?? [],
    })

    publish(projectId, {
      type: "comment.created",
      cardId,
      comment: {
        id,
        body: body.body,
        parentId: body.parentId ?? null,
        mentions: body.mentions ?? [],
        userId: session.user.id,
        userName: session.user.name,
        createdAt: new Date().toISOString(),
      },
    })

    return c.json({ success: true, data: { id } }, 201)
  }
)

cardsRoutes.get("/:id/comments", async (c) => {
  const projectId = c.var.projectId!
  const cardId = c.req.param("id")
  const target = await loadCardInProject(cardId, projectId)
  if (!target) throw httpError("Not Found", 404)
  const comments = await db
    .select({
      id: comment.id,
      body: comment.body,
      parentId: comment.parentId,
      mentions: comment.mentions,
      userId: userSchema.id,
      userName: userSchema.name,
      createdAt: comment.createdAt,
    })
    .from(comment)
    .innerJoin(userSchema, eq(comment.userId, userSchema.id))
    .where(eq(comment.cardId, cardId))
    .orderBy(asc(comment.createdAt))
  return c.json({ success: true, data: comments })
})
